import OpenAI from 'openai';
import { Message, OpenAIConfig } from '../types';
import ProductQueryService from './ProductQueryService';
import { v4 as uuidv4 } from 'uuid';

class OpenAIService {
  private openai: OpenAI;
  private assistantId: string;
  private threadId: string | null = null;
  private productQueryService: ProductQueryService | null = null;
  private useProductQueryProcessor: boolean = false;

  constructor(config: OpenAIConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.assistantId = config.assistantId;
    
    // Initialize ProductQueryService if Qdrant credentials are provided and explicitly enabled
    if (config.enableQdrant && config.qdrantUrl && config.qdrantApiKey && config.qdrantCollection) {
      try {
        console.log(`OpenAIService: Initializing ProductQueryService with Qdrant URL: ${config.qdrantUrl}`);
        
        this.productQueryService = new ProductQueryService({
          qdrantUrl: config.qdrantUrl,
          qdrantApiKey: config.qdrantApiKey,
          openaiApiKey: config.apiKey,
          collectionName: config.qdrantCollection
        });
        
        // Test connection to Qdrant
        this.testQdrantConnection();
        
        // Enable product query processor
        this.useProductQueryProcessor = true;
        console.log('Product query processor enabled');
      } catch (error) {
        console.error('Error initializing ProductQueryService:', error);
      }
    } else {
      console.log('Product query processor disabled: Missing Qdrant credentials or explicitly disabled');
      if (!config.enableQdrant) console.log('Reason: enableQdrant is false');
      if (!config.qdrantUrl) console.log('Reason: qdrantUrl is missing');
      if (!config.qdrantApiKey) console.log('Reason: qdrantApiKey is missing');
      if (!config.qdrantCollection) console.log('Reason: qdrantCollection is missing');
    }
  }
  
  private async testQdrantConnection() {
    if (!this.productQueryService) return;
    
    try {
      const connectionOk = await this.productQueryService.testConnection();
      if (connectionOk) {
        console.log("Successfully connected to Qdrant");
        this.useProductQueryProcessor = true;
      } else {
        console.warn("Could not connect to Qdrant or collection is not properly set up");
        this.useProductQueryProcessor = false;
      }
    } catch (error) {
      console.error("Error connecting to Qdrant:", {
        description: error instanceof Error ? error.message : String(error)
      });
      
      // Disable product query processor on connection error
      this.useProductQueryProcessor = false;
      
      // Log additional information for debugging
      if (error instanceof Error && error.stack) {
        console.debug("Error stack:", error.stack);
      }
    }
  }

  async createThread() {
    try {
      const thread = await this.openai.beta.threads.create();
      this.threadId = thread.id;
      return thread.id;
    } catch (error) {
      console.error('Error creating thread:', error);
      throw error;
    }
  }

  async sendMessage(content: string) {
    try {
      // If ProductQueryService is available and connected, use it
      if (this.useProductQueryProcessor && this.productQueryService) {
        console.log("Using ProductQueryService to process query");
        
        const result = await this.productQueryService.processQuery(content);
        
        return {
          id: uuidv4(),
          role: 'assistant' as const,
          content: result.answer,
          timestamp: new Date(),
        };
      }
      
      // Otherwise, fall back to OpenAI Assistant API
      console.log("Using OpenAI Assistant API to process query");
      
      if (!this.threadId) {
        await this.createThread();
      }

      // Add the user message to the thread
      await this.openai.beta.threads.messages.create(
        this.threadId!,
        {
          role: 'user',
          content,
        }
      );

      // Run the assistant
      const run = await this.openai.beta.threads.runs.create(
        this.threadId!,
        {
          assistant_id: this.assistantId,
        }
      );

      // Poll for the run completion
      let runStatus = await this.openai.beta.threads.runs.retrieve(
        this.threadId!,
        run.id
      );

      while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(
          this.threadId!,
          run.id
        );
      }

      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed');
      }

      // Get the messages from the thread
      const messages = await this.openai.beta.threads.messages.list(
        this.threadId!
      );

      // Return the latest assistant message
      const assistantMessages = messages.data
        .filter((msg: any) => msg.role === 'assistant')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (assistantMessages.length > 0) {
        const latestMessage = assistantMessages[0];
        const content = latestMessage.content[0].type === 'text' 
          ? latestMessage.content[0].text.value 
          : 'Content not available';
          
        return {
          id: latestMessage.id,
          role: 'assistant' as const,
          content,
          timestamp: new Date(latestMessage.created_at),
        };
      }

      return null;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
}

export default OpenAIService;
