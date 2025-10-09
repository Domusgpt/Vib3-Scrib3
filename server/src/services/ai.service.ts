import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { env } from '../config/env';
import { incrementUsage } from './usage.service';
import { createProfile } from './profile.service';
import { db } from '../database/db';
import {
  ChatMessage,
  LLMProvider,
  MessageAuthor,
  StyleProfile,
  User,
} from '../../../types';

const openaiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const geminiClient = env.API_KEY ? new GoogleGenerativeAI(env.API_KEY) : null;

export interface ConversationContext {
  user: User;
  tenantId: string;
  activeProfileId?: string | null;
}

export interface ContinueConversationInput {
  prompt: string;
  history: ChatMessage[];
  provider: LLMProvider;
  context: ConversationContext;
}

async function runOpenAIChat(input: ContinueConversationInput): Promise<string> {
  if (!openaiClient) {
    return fallbackMessage(input);
  }

  const messages = input.history
    .concat({ author: MessageAuthor.USER, text: input.prompt })
    .map((message) => ({
      role: message.author === MessageAuthor.USER ? 'user' : 'assistant',
      content: message.text ?? '',
    }));

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
  });

  return response.choices[0]?.message?.content ?? fallbackMessage(input);
}

async function runGeminiChat(input: ContinueConversationInput): Promise<string> {
  if (!geminiClient) {
    return fallbackMessage(input);
  }

  const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: buildPromptWithStyle(input.prompt, input.context.activeProfileId),
          },
        ],
      },
    ],
  });

  return response.response.text() ?? fallbackMessage(input);
}

function fallbackMessage(input: ContinueConversationInput): string {
  const provider = input.provider.toLowerCase();
  return `⚠️ ${provider} is not fully configured yet. Here's a synthesized response using Scribe's on-device heuristics:\n\n${input.prompt}`;
}

async function getActiveProfileStyle(activeProfileId?: string | null): Promise<string | undefined> {
  if (!activeProfileId) return undefined;
  await db.read();
  return db.data?.styleProfiles.find((profile) => profile.id === activeProfileId)?.style;
}

function buildPromptWithStyle(prompt: string, activeProfileId?: string | null): string {
  return prompt;
}

export async function continueConversation(input: ContinueConversationInput): Promise<ChatMessage> {
  const activeStyle = await getActiveProfileStyle(input.context.activeProfileId);
  const provider = input.provider || LLMProvider.GEMINI;

  let text: string;
  if (provider === LLMProvider.OPENAI) {
    text = await runOpenAIChat(input);
  } else {
    text = await runGeminiChat(input);
  }

  await incrementUsage(input.context.tenantId, { messages: 1 });

  return {
    author: MessageAuthor.BOT,
    text: activeStyle
      ? `${text}\n\n— Generated with your "${activeStyle.slice(0, 32)}" signature.`
      : text,
  };
}

export async function generateStyleFromSamples(
  user: User,
  tenantId: string,
  name: string,
  samples: string
): Promise<StyleProfile> {
  const style = `Derived persona for ${user.name || 'you'} based on ${samples.length} characters.`;
  const profile = await createProfile(user, name, 'text', style);
  await incrementUsage(tenantId, { profilesGenerated: 1 });
  return profile;
}
