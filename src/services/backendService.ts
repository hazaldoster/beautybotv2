/**
 * Backend Service
 * 
 * This service handles communication with our backend API,
 * which proxies requests to OpenAI to avoid CORS issues.
 */

interface ChatRequest {
  message: string;
  assistantId?: string;
  threadId?: string;
}

interface ChatResponse {
  threadId: string;
  message: {
    id: string;
    role: string;
    content: string;
  };
}

export class BackendService {
  private baseUrl: string;
  
  constructor() {
    // Use the current origin as the base URL
    this.baseUrl = window.location.origin;
  }
  
  /**
   * Send a message to the OpenAI assistant via our backend API
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      if (!request.assistantId) {
        console.warn('No assistantId provided to backendService.sendMessage. The backend will use the server-side Assistant ID.');
      }
      
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending message to backend:', error);
      throw error;
    }
  }
} 