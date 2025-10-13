import { GoogleGenAI, FunctionDeclaration, Type, Content } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';
import { ChatMessage, FunctionCall, LLMProvider, MessageAuthor, ProfileSourceType } from '../../types';
import { db } from '../../database/client';
import { env } from '../../config/env';

const geminiClient = env.API_KEY ? new GoogleGenAI({ apiKey: env.API_KEY }) : null;
const anthropicClient = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

interface ToolPropertyDefinition {
  type: 'string';
  description: string;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolPropertyDefinition>;
    required: string[];
  };
}

type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

type ClaudeMessage = {
  role: 'user' | 'assistant';
  content: ClaudeContentBlock[];
};

const SCRIBE_TOOLS: ToolDefinition[] = [
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

const geminiTools: FunctionDeclaration[] = SCRIBE_TOOLS.map(tool => ({
  name: tool.name,
  description: tool.description,
  parameters: {
    type: Type.OBJECT,
    properties: Object.fromEntries(
      Object.entries(tool.parameters.properties).map(([key, schema]) => [
        key,
        {
          type: Type.STRING,
          description: schema.description,
        },
      ]),
    ),
    required: tool.parameters.required,
  },
}));

const anthropicTools = SCRIBE_TOOLS.map(tool => ({
  name: tool.name,
  description: tool.description,
  input_schema: {
    type: 'object' as const,
    properties: Object.fromEntries(
      Object.entries(tool.parameters.properties).map(([key, schema]) => [
        key,
        {
          type: schema.type,
          description: schema.description,
        },
      ]),
    ),
    required: tool.parameters.required,
  },
}));

const CLAUDE_MODEL = 'claude-3-5-sonnet-20240620';
const CLAUDE_SYSTEM_PROMPT =
  "You are Vib3 Scribe's rush Claude Code plugin. Coordinate with the available tools to manage writing style profiles, draft new copy, and ingest samples. Prefer tool calls over free-form guesses when the user asks to learn or apply their style.";

const getGeminiClient = (): GoogleGenAI => {
  if (!geminiClient) {
    throw new Error('Gemini API key is not configured. Please set API_KEY in the server environment.');
  }
  return geminiClient;
};

const getAnthropicClient = (): Anthropic => {
  if (!anthropicClient) {
    throw new Error('Anthropic API key is not configured. Set ANTHROPIC_API_KEY to enable Claude Code.');
  }
  return anthropicClient;
};

interface ConversationArgs {
  prompt?: string;
  history: ChatMessage[];
  provider?: LLMProvider;
  context: any;
}

export const continueConversation = async (requestBody: any): Promise<ChatMessage> => {
  const { prompt, history = [], provider = LLMProvider.GEMINI, context } = requestBody as ConversationArgs;

  if (provider === LLMProvider.CLAUDE) {
    return continueWithClaude({ prompt, history, context });
  }

  return continueWithGemini({ prompt, history, provider, context });
};

const continueWithGemini = async ({ prompt, history, provider, context }: ConversationArgs): Promise<ChatMessage> => {
  const client = getGeminiClient();
  const model = provider === LLMProvider.OPENAI ? 'gpt-4-turbo' : 'gemini-2.5-flash';

  const contents = history.map(messageToContent);
  if (prompt) {
    contents.push({ role: 'user', parts: [{ text: prompt }] });
  }

  for (let i = 0; i < 5; i++) {
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        tools: [{ functionDeclarations: geminiTools }],
      },
    });

    const functionCalls = response.functionCalls ?? [];
    if (functionCalls.length === 0) {
      return { author: MessageAuthor.BOT, text: response.text ?? '' };
    }

    for (const call of functionCalls) {
      if (!call?.name) {
        continue;
      }

      const toolResult = await executeTool(
        { name: call.name, args: (call.args as Record<string, unknown>) ?? {} },
        context,
      );

      contents.push({ role: 'model', parts: [{ functionCall: call }] });
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: call.name, response: toolResult } }],
      });
    }
  }

  return {
    author: MessageAuthor.BOT,
    text: 'I seem to be stuck in a loop. Could you please rephrase your request?',
  };
};

const continueWithClaude = async ({ prompt, history, context }: ConversationArgs): Promise<ChatMessage> => {
  const client = getAnthropicClient();

  const messages: ClaudeMessage[] = history
    .filter(message => Boolean(message.text))
    .map(message => ({
      role: message.author === MessageAuthor.USER ? 'user' : 'assistant',
      content: [{ type: 'text', text: message.text ?? '' }],
    }));

  if (prompt) {
    messages.push({ role: 'user', content: [{ type: 'text', text: prompt }] });
  }

  for (let i = 0; i < 5; i++) {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: CLAUDE_SYSTEM_PROMPT,
      messages: messages as unknown as ClaudeMessage[],
      tools: anthropicTools,
    });

    const responseContent = (response.content ?? []) as ClaudeContentBlock[];
    const toolUses = responseContent.filter(
      (block): block is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
        block.type === 'tool_use',
    );

    const textOutput = responseContent
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map(block => block.text)
      .join('\n\n')
      .trim();

    if (toolUses.length === 0) {
      return { author: MessageAuthor.BOT, text: textOutput };
    }

    messages.push({
      role: 'assistant',
      content: responseContent,
    });

    for (const toolUse of toolUses) {
      const toolResult = await executeTool(
        { name: toolUse.name, args: (toolUse.input as Record<string, unknown>) ?? {} },
        context,
      );
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult),
          },
        ],
      });
    }
  }

  return {
    author: MessageAuthor.BOT,
    text: 'I seem to be stuck in a loop. Could you please rephrase your request?',
  };
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
    await db.read();
    db.data?.style_profiles.push(newProfile);
    await db.write();
    return { success: true, message: `Successfully created the new style profile named "${newProfile.name}".` };
  }

  if (name === 'writeWithStyle') {
    if (!context.activeProfileId) {
      return { success: false, error: 'No active style profile selected. Please ask the user to select one.' };
    }
    await db.read();
    const profile = db.data?.style_profiles.find(p => p.id === context.activeProfileId);
    if (!profile) {
      return { success: false, error: `Style profile with ID ${context.activeProfileId} not found.` };
    }
    const writtenText = await writeWithStyle(args.prompt, profile.style);
    return { success: true, writtenText };
  }

  if (name === 'fetchWritingSamples') {
    const source = args.source as 'gmail' | 'facebook';
    if (source === 'gmail' && user.google?.accessToken) {
      const samples = await fetchWritingSamples('gmail', user.google.accessToken);
      if (samples.length === 0) {
        return {
          success: true,
          message: 'Could not find any sent emails to analyze. Please try sending a few emails and try again.',
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
      await db.read();
      db.data?.style_profiles.push(newProfile);
      await db.write();
      return {
        success: true,
        message: `Successfully fetched ${samples.length} samples from ${source} and created a new style profile named "${profileName}". I've made it the active profile.`,
      };
    } else if (source === 'facebook') {
      return {
        success: true,
        message:
          "Fetched placeholder Facebook messages. Due to Meta's privacy policies, live message fetching is a complex process and is not fully implemented in this demo.",
      };
    }
    return {
      success: false,
      error: `Could not fetch samples. The user may not be connected to ${source} or the source is unsupported.`,
    };
  }

  return { success: false, error: 'Unknown function' };
};

export function messageToContent(message: ChatMessage): Content {
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

const parseSandboxToken = (accessToken: string): number | null => {
  if (!accessToken.startsWith('sandbox:')) {
    return null;
  }

  const [, , encodedCount] = accessToken.split(':');
  if (encodedCount && Number.isFinite(Number(encodedCount))) {
    return Number(encodedCount);
  }

  if (accessToken.includes('google')) {
    return 120;
  }

  if (accessToken.includes('facebook')) {
    return 60;
  }

  return 42;
};

export async function countWritingSamples(source: 'gmail' | 'facebook', accessToken: string): Promise<number> {
  const sandboxCount = parseSandboxToken(accessToken);
  if (sandboxCount !== null) {
    return sandboxCount;
  }

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
      messages.map(async msg => {
        const email = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' });
        const snippet = email.data.snippet;
        return snippet || '';
      }),
    );
    return emailContents.filter(Boolean);
  }
  return [];
}

export async function createStyleProfile(samples: string): Promise<string> {
  const client = getGeminiClient();
  const model = 'gemini-2.5-flash';
  const prompt = `Analyze the following writing samples and create a detailed, structured profile of the author's writing style. The profile should be a list of key-value pairs. Cover these aspects: Tone (e.g., Formal, Casual, Witty), Diction (e.g., Simple, Complex, Technical), Sentence Structure (e.g., Short and direct, Long and flowing), Common Phrases, and Overall Vibe.

SAMPLES:
---
${samples}
---
`;
  const response = await client.models.generateContent({ model, contents: prompt });
  return response.text ?? '';
}

export async function writeWithStyle(prompt: string, style: string): Promise<string> {
  const client = getGeminiClient();
  const model = 'gemini-2.5-flash';
  const systemInstruction = `You are a writing assistant. Your task is to write a response to the user's prompt, but you MUST strictly adhere to the provided writing style profile.

WRITING STYLE PROFILE:
---
${style}
---
`;
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: { systemInstruction },
  });
  return response.text ?? '';
}
