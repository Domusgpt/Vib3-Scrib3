import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { verifyApiKeySecret } from '../../api-keys/api-key.auth';
import { ApiScope, ChatMessage, LLMProvider, MessageAuthor, StyleProfile } from '../../../types';
import { chatService } from '../../chat/chat.service';
import { db } from '../../../database/client';
import { userService } from '../../users/user.service';
import { createStyleProfile } from '../../chat/llm.service';

const router = Router();

const messageSchema = z.object({
  author: z.nativeEnum(MessageAuthor),
  text: z.string().optional().nullable(),
});

const conversationSchema = z.object({
  userId: z.string().min(1),
  prompt: z.string().min(1),
  history: z.array(messageSchema).optional(),
  profileId: z.string().optional(),
  provider: z.nativeEnum(LLMProvider).optional(),
});

const profileRequestSchema = z.object({
  userId: z.string().min(1),
});

const profileFromTextSchema = z.object({
  userId: z.string().min(1),
  profileName: z.string().min(1),
  samples: z.string().min(50, 'Provide at least a few sentences to train the style profile.'),
});

const extractApiKey = (req: Request): string | null => {
  const headerKey = req.get('x-api-key');
  if (headerKey) {
    return headerKey.trim();
  }
  const authHeader = req.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
};

const requireApiKey = async (
  req: Request,
  res: Response,
  scopes: ApiScope[],
) => {
  const secret = extractApiKey(req);
  if (!secret) {
    res.status(401).json({ message: 'API key header (X-API-Key or Authorization: Bearer) is required.' });
    return null;
  }

  try {
    return await verifyApiKeySecret(secret, scopes);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid API key.';
    res.status(401).json({ message });
    return null;
  }
};

const ensureMembership = async (
  userId: string,
  organizationId: string,
): Promise<boolean> => {
  await db.read();
  if (!db.data) {
    throw new Error('Database not initialized');
  }
  return db.data.memberships.some(
    membership =>
      membership.userId === userId &&
      membership.organizationId === organizationId &&
      membership.status === 'active',
  );
};

router.get('/manifest.json', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    schema_version: 'v1',
    name_for_humans: 'Vib3 Scribe Claude Code',
    name_for_model: 'vib3_scribe_claude_code',
    description_for_humans:
      'Rush MVP plugin that lets Claude Code orchestrate style-aware drafting through Vib3 Scribe.',
    description_for_model:
      'Use this plugin to fetch a user\'s writing style profiles, create new ones from raw text, and run chat prompts that honor their voice. Always send the workspace API key via X-API-Key.',
    auth: {
      type: 'service_http',
      authorization_type: 'api_key',
      verification_tokens: {},
    },
    api: {
      type: 'openapi',
      url: `${baseUrl}/api/claude-code/openapi.json`,
    },
    logo_url: 'https://avatars.githubusercontent.com/u/130164202?s=200&v=4',
    contact_email: 'ops@vib3scribe.example',
    legal_info_url: 'https://example.com/legal',
    capabilities: {
      text: { input: true, output: true },
    },
  });
});

router.get('/openapi.json', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Vib3 Scribe Claude Code Plugin',
      version: '1.0.0',
      description:
        'Endpoints that allow the Claude Code rush MVP to read and write Vib3 Scribe style assets.',
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
      schemas: {
        ChatMessage: {
          type: 'object',
          properties: {
            author: { type: 'string', enum: Object.values(MessageAuthor) },
            text: { type: ['string', 'null'] },
          },
          required: ['author'],
        },
        StyleProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            style: { type: 'string' },
            source: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'name', 'style', 'source', 'createdAt'],
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/api/claude-code/messages': {
        post: {
          summary: 'Continue a Claude Code conversation using Vib3 Scribe tools',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                    prompt: { type: 'string' },
                    profileId: { type: 'string' },
                    provider: { type: 'string', enum: Object.values(LLMProvider) },
                    history: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ChatMessage' },
                    },
                  },
                  required: ['userId', 'prompt'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Assistant response respecting the user\'s style',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { $ref: '#/components/schemas/ChatMessage' },
                      provider: { type: 'string' },
                      organizationId: { type: 'string' },
                    },
                    required: ['message', 'provider', 'organizationId'],
                  },
                },
              },
            },
            '401': { description: 'Missing or invalid API key' },
            '403': { description: 'User is not a member of the organization associated with the API key' },
          },
        },
      },
      '/api/claude-code/profiles': {
        get: {
          summary: 'List style profiles available to a user',
          parameters: [
            {
              name: 'userId',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Accessible style profiles',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      profiles: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/StyleProfile' },
                      },
                    },
                    required: ['profiles'],
                  },
                },
              },
            },
            '401': { description: 'Missing or invalid API key' },
            '403': { description: 'User is not a member of the organization associated with the API key' },
          },
        },
      },
      '/api/claude-code/profiles/from-text': {
        post: {
          summary: 'Create a new style profile from raw writing samples',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                    profileName: { type: 'string' },
                    samples: { type: 'string' },
                  },
                  required: ['userId', 'profileName', 'samples'],
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'New style profile created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      profile: { $ref: '#/components/schemas/StyleProfile' },
                    },
                    required: ['profile'],
                  },
                },
              },
            },
            '401': { description: 'Missing or invalid API key' },
            '403': { description: 'User is not a member of the organization associated with the API key' },
          },
        },
      },
    },
  };

  res.json(spec);
});

router.post('/messages', async (req, res) => {
  const verification = await requireApiKey(req, res, ['chat:write']);
  if (!verification) {
    return;
  }

  const parseResult = conversationSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ message: 'Invalid request payload', issues: parseResult.error.format() });
    return;
  }

  const { userId, prompt, history: rawHistory = [], profileId, provider } = parseResult.data;

  try {
    const isMember = await ensureMembership(userId, verification.key.organizationId);
    if (!isMember) {
      res.status(403).json({ message: 'The provided user does not belong to this organization.' });
      return;
    }

    const user = await userService.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    await db.read();
    const history: ChatMessage[] = rawHistory.map(item => ({
      author: item.author,
      text: item.text ?? undefined,
    }));

    let activeProfileId: string | null | undefined = undefined;
    if (profileId) {
      const profile = db.data?.style_profiles.find(p => p.id === profileId && p.userId === userId);
      if (!profile) {
        res.status(404).json({ message: 'Style profile not found for this user.' });
        return;
      }
      activeProfileId = profileId;
    }

    const selectedProvider = provider ?? LLMProvider.CLAUDE;

    const responseMessage = await chatService.continueConversation(
      userId,
      {
        prompt,
        history,
        provider: selectedProvider,
        context: {
          activeProfileId,
          user,
        },
      },
      verification.key.organizationId,
    );

    res.json({
      message: responseMessage,
      provider: selectedProvider,
      organizationId: verification.key.organizationId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.status(500).json({ message });
  }
});

router.get('/profiles', async (req, res) => {
  const verification = await requireApiKey(req, res, ['profiles:read']);
  if (!verification) {
    return;
  }

  const parseResult = profileRequestSchema.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ message: 'userId query parameter is required.' });
    return;
  }

  const { userId } = parseResult.data;

  try {
    const isMember = await ensureMembership(userId, verification.key.organizationId);
    if (!isMember) {
      res.status(403).json({ message: 'The provided user does not belong to this organization.' });
      return;
    }

    await db.read();
    const profiles: StyleProfile[] = (db.data?.style_profiles ?? []).filter(profile => profile.userId === userId);
    const summaries = profiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      style: profile.style,
      source: profile.source,
      createdAt: profile.createdAt,
    }));

    res.json({ profiles: summaries });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.status(500).json({ message });
  }
});

router.post('/profiles/from-text', async (req, res) => {
  const verification = await requireApiKey(req, res, ['profiles:write']);
  if (!verification) {
    return;
  }

  const parseResult = profileFromTextSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ message: 'Invalid request payload', issues: parseResult.error.format() });
    return;
  }

  const { userId, profileName, samples } = parseResult.data;

  try {
    const isMember = await ensureMembership(userId, verification.key.organizationId);
    if (!isMember) {
      res.status(403).json({ message: 'The provided user does not belong to this organization.' });
      return;
    }

    const user = await userService.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const style = await createStyleProfile(samples);

    await db.read();
    const profile: StyleProfile = {
      id: `profile_${Date.now()}`,
      userId,
      name: profileName,
      style,
      source: 'text',
      createdAt: new Date().toISOString(),
    };
    db.data?.style_profiles.push(profile);
    await db.write();

    res.status(201).json({ profile: {
      id: profile.id,
      name: profile.name,
      style: profile.style,
      source: profile.source,
      createdAt: profile.createdAt,
    } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.status(500).json({ message });
  }
});

export default router;
