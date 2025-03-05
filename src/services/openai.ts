import OpenAI from 'openai';
import { Message, OpenAIConfig } from '../types';

class OpenAIService {
  private openai: OpenAI;
  private assistantId: string;
  private threadId: string | null = null;

  constructor(config: OpenAIConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.assistantId = config.assistantId;
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
