import { ChatMessage, LLMProvider, User } from '../../types';
import { billingService } from '../billing/billing.service';
import { continueConversation as runConversation } from './llm.service';

interface ConversationPayload {
  prompt: string;
  history: ChatMessage[];
  provider?: LLMProvider;
  context: {
    activeProfileId?: string | null;
    user: User;
  };
}

class ChatService {
  async continueConversation(
    userId: string,
    payload: ConversationPayload,
    organizationId?: string,
  ): Promise<ChatMessage> {
    const response = await runConversation({
      ...payload,
      provider: payload.provider ?? LLMProvider.GEMINI,
    });

    const tokenEstimate = this.estimateTokens(response.text ?? '');
    await billingService.recordMessageUsage(userId, tokenEstimate, organizationId);

    return response;
  }

  private estimateTokens(text: string): number {
    if (!text) {
      return 0;
    }
    return Math.ceil(text.length / 4);
  }
}

export const chatService = new ChatService();
