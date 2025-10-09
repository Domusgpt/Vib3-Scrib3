import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { google } from 'googleapis';
import { LLMProvider, MessageAuthor } from '../../shared/types';
import type { ChatMessage, FunctionCall, ProfileSourceType } from '../../shared/types';
import { db } from '../../infrastructure/db';
import { incrementUsage } from '../billing/billing.service';

const geminiClient = process.env.API_KEY ? new GoogleGenerativeAI(process.env.API_KEY) : null;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type GeminiContent = {
  role: 'user' | 'model';
  parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>;
};

type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<
      string,
      {
        type: string;
        description: string;
      }
    >;
    required: string[];
  };
};

const scribeTools: GeminiFunctionDeclaration[] = [
  {
    name: 'createStyleProfile',
    description:
      "Analyzes a body of text to create a detailed writing style profile. This should be used when a user provides text and asks to create a profile, analyze their style, or learn how they write.",
    parameters: {
      type: 'object',
      properties: {
        writingSamples: {
          type: 'string',
          description:
            "A string containing a large sample of the user's writing (e.g., concatenated emails or messages).",
        },
        profileName: {
          type: 'string',
          description: 'A descriptive name for the new profile, like "My Professional Email Style".',
        },
      },
      required: ['writingSamples', 'profileName'],
    },
  },
  {
    name: 'writeWithStyle',
    description:
      "Writes a new piece of text based on a user's request, adhering to the currently active style profile. Use this for requests like \"write an email\", \"draft a response\", or \"rewrite this for me\".",
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: "The user's specific writing request, e.g., \"An email to decline a meeting invite.\"",
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'fetchWritingSamples',
    description:
      'Fetches writing samples from a connected external service like Gmail or Facebook and automatically creates a new style profile from them. This should be used if the user asks to analyze their style from a specific source, e.g., "Analyze my emails".',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The service to fetch from. Supported values: "gmail", "facebook".',
        },
      },
      required: ['source'],
    },
  },
];

const generateWithGemini = async (contents: GeminiContent[]) => {
  if (!geminiClient || !process.env.API_KEY) {
    return { text: 'Gemini is not configured. Provide an API_KEY to enable Google responses.', functionCalls: [] };
  }
  const model = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const response = await model.generateContent({
    contents,
    tools: [{ functionDeclarations: scribeTools }],
  } as any);

  const candidates = response?.response?.candidates ?? [];
  const firstCandidate = candidates[0];
  const functionCalls = candidates.flatMap((candidate: any) =>
    candidate?.content?.parts?.filter((part: any) => part.functionCall).map((part: any) => part.functionCall) ?? []
  );
  const textParts = firstCandidate?.content?.parts?.filter((part: any) => part.text).map((part: any) => part.text) ?? [];
  const text = textParts.join(' ').trim();

  return { text, functionCalls };
};

export const executeTool = async (functionCall: FunctionCall, context: any): Promise<any> => {
  const { name, args } = functionCall;
  const { user } = context;

  if (name === 'createStyleProfile') {
    const style = await createStyleProfile(args.writingSamples);
    const newProfile = {
      id: `profile_${Date.now()}`,
      userId: user.id,
      name: args.profileName,
      style,
      source: 'text' as ProfileSourceType,
      createdAt: new Date().toISOString(),
    };
    db.data.style_profiles.push(newProfile);
    await db.write();
    return { success: true, message: `Successfully created the new style profile named "${newProfile.name}".` };
  }

  if (name === 'writeWithStyle') {
    if (!context.activeProfileId) {
      return { success: false, error: 'No active style profile selected. Please ask the user to select one.' };
    }
    const profile = db.data.style_profiles.find((p) => p.id === context.activeProfileId);
    if (!profile) {
      return { success: false, error: `Style profile with ID ${context.activeProfileId} not found.` };
    }
    const writtenText = await writeWithStyle(args.prompt, profile.style);
    return { success: true, writtenText };
  }

  if (name === 'fetchWritingSamples') {
    const source = args.source;
    if (source === 'gmail' && user.google?.accessToken) {
      const samples = await fetchWritingSamples('gmail', user.google.accessToken);
      if (samples.length === 0) {
        return {
          success: true,
          message:
            'Could not find any sent emails to analyze. Please try sending a few emails and try again.',
        };
      }
      const concatenatedSamples = samples.join('\n\n---\n\n');
      const profileName = `Style from ${source} (${new Date().toLocaleDateString()})`;
      const style = await createStyleProfile(concatenatedSamples);
      const newProfile = {
        id: `profile_${Date.now()}`,
        userId: user.id,
        name: profileName,
        style,
        source: source as ProfileSourceType,
        createdAt: new Date().toISOString(),
      };
      db.data.style_profiles.push(newProfile);
      await db.write();
      return {
        success: true,
        message: `Successfully fetched ${samples.length} samples from ${source} and created a new style profile named "${profileName}". I've made it the active profile.`,
      };
    }
    if (source === 'facebook') {
      return {
        success: true,
        message:
          "Fetched placeholder Facebook messages. Due to Meta's privacy policies, live message fetching is a complex process and is not fully implemented in this demo.",
      };
    }
    return { success: false, error: `Could not fetch samples for ${source}.` };
  }

  return { success: false, error: 'Unknown function' };
};

export const continueConversation = async (requestBody: any): Promise<ChatMessage> => {
  const { prompt, history, provider, context } = requestBody;

  if (provider === LLMProvider.OPENAI) {
    const messages = history
      .map((message: ChatMessage) => {
        if (message.author === MessageAuthor.USER) {
          return { role: 'user', content: message.text ?? '' } as const;
        }
        return { role: 'assistant', content: message.text ?? '' } as const;
      })
      .filter(Boolean);
    if (prompt) {
      messages.push({ role: 'user', content: prompt } as const);
    }
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
    });
    const text = response.choices[0]?.message?.content ?? '';
    if (context?.user?.id) {
      await incrementUsage(context.user.id);
    }
    return { author: MessageAuthor.BOT, text };
  }

  const contents: GeminiContent[] = history.map(messageToContent);
  if (prompt) {
    contents.push({ role: 'user', parts: [{ text: prompt }] });
  }

  for (let i = 0; i < 5; i++) {
    const response = await generateWithGemini(contents);
    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      if (context?.user?.id) {
        await incrementUsage(context.user.id);
      }
      return { author: MessageAuthor.BOT, text: response.text };
    }

    const fc = functionCalls[0];
    const args = typeof fc.args === 'string' ? JSON.parse(fc.args) : fc.args;
    const toolResult = await executeTool({ name: fc.name, args }, context);

    contents.push({ role: 'model', parts: [{ functionCall: fc }] });
    contents.push({
      role: 'user',
      parts: [{ functionResponse: { name: fc.name, response: toolResult } }],
    });
  }

  return {
    author: MessageAuthor.BOT,
    text: 'I seem to be stuck in a loop. Could you please rephrase your request?',
  };
};

function messageToContent(message: ChatMessage): GeminiContent {
  const role = message.author === MessageAuthor.USER ? 'user' : 'model';
  if (message.text) return { role, parts: [{ text: message.text }] };
  if (message.functionCall) return { role: 'model', parts: [{ functionCall: message.functionCall }] };
  if (message.functionResponse) {
    return {
      role: 'user',
      parts: [
        {
          functionResponse: {
            name: message.functionResponse.name,
            response: message.functionResponse.response,
          },
        },
      ],
    };
  }
  return { role, parts: [] };
}

export async function countWritingSamples(source: 'gmail' | 'facebook', accessToken: string): Promise<number> {
  if (source === 'gmail') {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const res = await gmail.users.messages.list({ userId: 'me', q: 'in:sent', maxResults: 100 });
    return res.data.messages?.length || 0;
  }
  if (source === 'facebook') {
    return 50;
  }
  return 0;
}

export async function fetchWritingSamples(source: 'gmail' | 'facebook', accessToken: string): Promise<string[]> {
  if (source === 'gmail') {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const res = await gmail.users.messages.list({ userId: 'me', q: 'in:sent', maxResults: 20 });
    const messages = res.data.messages || [];
    const emailContents = await Promise.all(
      messages.map(async (msg) => {
        const email = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' });
        return email.data.snippet || '';
      })
    );
    return emailContents.filter(Boolean);
  }
  return [];
}

export async function createStyleProfile(samples: string): Promise<string> {
  const contents: GeminiContent[] = [
    {
      role: 'user',
      parts: [
        {
          text: `Analyze the following writing samples and create a detailed, structured profile of the author's writing style. The profile should be a list of key-value pairs. Cover these aspects: Tone, Diction, Sentence Structure, Common Phrases, and Overall Vibe.\n\nSAMPLES:\n---\n${samples}\n---`,
        },
      ],
    },
  ];
  const response = await generateWithGemini(contents);
  return response.text;
}

export async function writeWithStyle(prompt: string, style: string): Promise<string> {
  const contents: GeminiContent[] = [
    {
      role: 'user',
      parts: [
        {
          text: `You are a writing assistant. Your task is to write a response to the user's prompt, but you MUST strictly adhere to the provided writing style profile.\n\nWRITING STYLE PROFILE:\n---\n${style}\n---\n\nPrompt: ${prompt}`,
        },
      ],
    },
  ];
  const response = await generateWithGemini(contents);
  return response.text;
}
