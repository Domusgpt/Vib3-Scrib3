import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type, Content } from "@google/genai";
import OpenAI from 'openai';
import { google } from 'googleapis';
import { ChatMessage, FunctionCall, LLMProvider, MessageAuthor, ProfileSourceType } from '../../types';
import { db } from '../db';

// Per guidelines, API key must come from process.env.API_KEY
const geminiAI = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Tool Definitions ---
const scribeTools: FunctionDeclaration[] = [
    {
        name: 'createStyleProfile',
        description: 'Analyzes a body of text to create a detailed writing style profile. This should be used when a user provides text and asks to create a profile, analyze their style, or learn how they write.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                writingSamples: {
                    type: Type.STRING,
                    description: 'A string containing a large sample of the user\'s writing (e.g., concatenated emails or messages).'
                },
                profileName: {
                    type: Type.STRING,
                    description: 'A descriptive name for the new profile, like "My Professional Email Style".'
                }
            },
            required: ['writingSamples', 'profileName']
        }
    },
    {
        name: 'writeWithStyle',
        description: 'Writes a new piece of text based on a user\'s request, adhering to the currently active style profile. Use this for requests like "write an email", "draft a response", or "rewrite this for me".',
        parameters: {
            type: Type.OBJECT,
            properties: {
                prompt: {
                    type: Type.STRING,
                    description: 'The user\'s specific writing request, e.g., "An email to decline a meeting invite."'
                }
            },
            required: ['prompt']
        }
    },
    {
        name: 'fetchWritingSamples',
        description: 'Fetches writing samples from a connected external service like Gmail or Facebook and automatically creates a new style profile from them. This should be used if the user asks to analyze their style from a specific source, e.g., "Analyze my emails".',
        parameters: {
            type: Type.OBJECT,
            properties: {
                source: {
                    type: Type.STRING,
                    description: 'The service to fetch from. Supported values: "gmail", "facebook".'
                }
            },
            required: ['source']
        }
    }
];

// --- Tool Execution Logic ---
export const executeTool = async (functionCall: FunctionCall, context: any): Promise<any> => {
    const { name, args } = functionCall;
    const { user } = context;

    if (name === 'createStyleProfile') {
        const style = await createStyleProfile(args.writingSamples);
        const newProfile = {
            id: `profile_${Date.now()}`,
            userId: user.id,
            name: args.profileName,
            style, // The detailed style description from the LLM
            source: 'text' as ProfileSourceType,
            createdAt: new Date().toISOString()
        };
        db.data.style_profiles.push(newProfile);
        await db.write();
        return { success: true, message: `Successfully created the new style profile named "${newProfile.name}".` };
    }
    if (name === 'writeWithStyle') {
        if (!context.activeProfileId) {
            return { success: false, error: "No active style profile selected. Please ask the user to select one." };
        }
        const profile = db.data.style_profiles.find(p => p.id === context.activeProfileId);
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
                 return { success: true, message: "Could not find any sent emails to analyze. Please try sending a few emails and try again." };
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
                createdAt: new Date().toISOString()
            };
            db.data.style_profiles.push(newProfile);
            await db.write();
            return { success: true, message: `Successfully fetched ${samples.length} samples from ${source} and created a new style profile named "${profileName}". I've made it the active profile.` };
        } else if (source === 'facebook') {
            return { success: true, message: "Fetched placeholder Facebook messages. Due to Meta's privacy policies, live message fetching is a complex process and is not fully implemented in this demo." };
        } else {
            return { success: false, error: `Could not fetch samples. The user may not be connected to ${source} or the source is unsupported.` };
        }
    }
    return { success: false, error: 'Unknown function' };
};


// --- Main Conversation Handler ---
export const continueConversation = async (requestBody: any): Promise<ChatMessage> => {
    const { prompt, history, provider, context } = requestBody;
    const model = provider === LLMProvider.OPENAI ? 'gpt-4-turbo' : 'gemini-2.5-flash';

    const contents = history.map(messageToContent);
    if (prompt) {
        contents.push({ role: 'user', parts: [{ text: prompt }] });
    }

    // Loop to handle potential tool calls, up to 5 times to prevent infinite loops
    for (let i = 0; i < 5; i++) {
        const response = await geminiAI.models.generateContent({
            model,
            contents,
            config: {
                tools: [{ functionDeclarations: scribeTools }],
            },
        });

        const functionCalls = response.functionCalls;

        if (!functionCalls || functionCalls.length === 0) {
            // No function call, just return the text response
            return { author: MessageAuthor.BOT, text: response.text };
        }

        const fc = functionCalls[0];
        const toolResult = await executeTool({ name: fc.name, args: fc.args }, context);

        // Append the model's function call and our tool's response to the history
        contents.push({ role: 'model', parts: [{ functionCall: fc }] });
        contents.push({
            role: 'user', // In Gemini, tool responses are from the 'user' role
            parts: [{ functionResponse: { name: fc.name, response: toolResult } }]
        });
        
        // Loop continues, sending the tool result back to the model for a final text response.
    }

    // If we exit the loop, it means we hit the tool call limit.
    return { author: MessageAuthor.BOT, text: "I seem to be stuck in a loop. Could you please rephrase your request?" };
};

// --- Helper Functions ---
function messageToContent(message: ChatMessage): Content {
    const role = message.author === MessageAuthor.USER ? 'user' : 'model';
    if (message.text) return { role, parts: [{ text: message.text }] };
    if (message.functionCall) return { role: 'model', parts: [{ functionCall: message.functionCall }] };
    if (message.functionResponse) {
        return {
            role: 'user', // In Gemini, tool responses are from the 'user'
            parts: [{ functionResponse: { name: message.functionResponse.name, response: message.functionResponse.response } }]
        };
    }
    return { role, parts: [] };
}


// --- External Data Fetching & Counting ---
export async function countWritingSamples(source: 'gmail' | 'facebook', accessToken: string): Promise<number> {
    if (source === 'gmail') {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const res = await gmail.users.messages.list({ userId: 'me', q: 'in:sent', maxResults: 100 });
        return res.data.messages?.length || 0;
    }
    if (source === 'facebook') {
        return 50; // Placeholder for demonstration
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
        const emailContents = await Promise.all(messages.map(async (msg) => {
            const email = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' });
            const snippet = email.data.snippet;
            return snippet || "";
        }));
        return emailContents.filter(Boolean);
    }
    return [];
}


// --- Core AI Logic ---
export async function createStyleProfile(samples: string): Promise<string> {
    const model = 'gemini-2.5-flash';
    const prompt = `Analyze the following writing samples and create a detailed, structured profile of the author's writing style. The profile should be a list of key-value pairs. Cover these aspects: Tone (e.g., Formal, Casual, Witty), Diction (e.g., Simple, Complex, Technical), Sentence Structure (e.g., Short and direct, Long and flowing), Common Phrases, and Overall Vibe.

SAMPLES:
---
${samples}
---
`;
    const response = await geminiAI.models.generateContent({ model, contents: prompt });
    return response.text;
}

export async function writeWithStyle(prompt: string, style: string): Promise<string> {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `You are a writing assistant. Your task is to write a response to the user's prompt, but you MUST strictly adhere to the provided writing style profile.

WRITING STYLE PROFILE:
---
${style}
---
`;
    const response = await geminiAI.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction }
    });
    return response.text;
}