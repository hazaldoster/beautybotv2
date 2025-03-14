export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface OpenAIConfig {
  apiKey: string;
  assistantId: string;
  qdrantUrl?: string;
  qdrantApiKey?: string;
  qdrantCollection?: string;
  enableQdrant?: boolean;
}
