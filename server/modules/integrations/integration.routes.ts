import { Router, Request, Response } from 'express';
import { countWritingSamples } from '../chat/llm.service';
import { userService } from '../users/user.service';
import { IntegrationHealthStatus, IntegrationName, IntegrationSummary } from '../../types';

const integrationCatalog: Array<{
  name: IntegrationName;
  title: string;
  description: string;
  connectPath: string;
  docsUrl: string;
  categories: string[];
  beta?: boolean;
}> = [
  {
    name: 'google',
    title: 'Gmail & Google Workspace',
    description: 'Ingest sent mail to teach Scribe your tone, vocabulary, and cadence.',
    connectPath: '/auth/google',
    docsUrl: 'https://docs.vib3.ai/integrations/google-workspace',
    categories: ['Email', 'Productivity'],
  },
  {
    name: 'facebook',
    title: 'Facebook Pages & Messenger',
    description: 'Blend social replies and DMs into your brand style models.',
    connectPath: '/auth/facebook',
    docsUrl: 'https://docs.vib3.ai/integrations/facebook',
    categories: ['Social', 'Community'],
  },
  {
    name: 'messages',
    title: 'SMS & WhatsApp (Beta Waitlist)',
    description: 'Upcoming direct message pipeline for premium concierge teams.',
    connectPath: 'https://forms.gle/vib3-messages-beta',
    docsUrl: 'https://docs.vib3.ai/integrations/messages-beta',
    categories: ['Mobile', 'Automation'],
    beta: true,
  },
];

const buildIntegrationSummary = async (req: Request): Promise<IntegrationSummary[]> => {
  const user = req.user!;
  const generatedAt = new Date().toISOString();

  const summaries = await Promise.all(
    integrationCatalog.map(async catalogEntry => {
      const base: Omit<IntegrationSummary, 'connected' | 'status' | 'statusMessage' | 'sampleCount' | 'lastCheckedAt'> = {
        name: catalogEntry.name,
        title: catalogEntry.title,
        description: catalogEntry.description,
        connectPath: catalogEntry.connectPath,
        docsUrl: catalogEntry.docsUrl,
        categories: catalogEntry.categories,
        beta: catalogEntry.beta,
      };

      if (catalogEntry.name === 'messages') {
        return {
          ...base,
          connected: false,
          status: 'coming_soon' as IntegrationHealthStatus,
          statusMessage: 'Join the waitlist to pilot SMS + WhatsApp ingestion.',
          sampleCount: null,
          lastCheckedAt: null,
        };
      }

      const connection = catalogEntry.name === 'google' ? user.google : user.facebook;
      const isConnected = Boolean(connection);

      if (!isConnected) {
        return {
          ...base,
          connected: false,
          status: 'disconnected' as IntegrationHealthStatus,
          statusMessage: 'Connect to import writing samples.',
          sampleCount: null,
          lastCheckedAt: null,
        };
      }

      let sampleCount: number | null = null;
      let status: IntegrationHealthStatus = 'connected';
      let statusMessage = 'Connection verified.';

      try {
        if (catalogEntry.name === 'google' && connection?.accessToken) {
          sampleCount = await countWritingSamples('gmail', connection.accessToken);
        }
        if (catalogEntry.name === 'facebook' && connection?.accessToken) {
          sampleCount = await countWritingSamples('facebook', connection.accessToken);
        }

        if (!sampleCount) {
          status = 'action_required';
          statusMessage = 'Connected · awaiting first sync.';
        } else {
          statusMessage = `${sampleCount} samples indexed.`;
        }
      } catch (error) {
        console.error(`Failed to refresh ${catalogEntry.name} samples`, error);
        status = 'action_required';
        statusMessage = 'Connected · refresh authorization to resume syncing.';
      }

      return {
        ...base,
        connected: true,
        status,
        statusMessage,
        sampleCount,
        lastCheckedAt: generatedAt,
      };
    }),
  );

  return summaries;
};

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const integrations = await buildIntegrationSummary(req);
    res.json({ integrations, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to load integration overview', error);
    res.status(500).json({ message: 'Unable to load integration overview.' });
  }
});

router.get('/sample-count', async (req: Request, res: Response) => {
  const source = req.query.source as 'gmail' | 'facebook';
  const user = req.user!;

  if (!source || (source !== 'gmail' && source !== 'facebook')) {
    return res.status(400).json({ message: 'Invalid source specified.' });
  }

  let accessToken: string | undefined;
  if (source === 'gmail') accessToken = user.google?.accessToken;
  if (source === 'facebook') accessToken = user.facebook?.accessToken;

  if (!accessToken) {
    return res.status(403).json({ message: `User is not connected to ${source}.` });
  }

  try {
    const count = await countWritingSamples(source, accessToken);
    res.json({ source, count });
  } catch (error) {
    console.error(`Error counting ${source} samples:`, error);
    res.status(500).json({ message: `Failed to count samples from ${source}.` });
  }
});

router.post('/disconnect', async (req: Request, res: Response) => {
  const { integration } = req.body as { integration: 'google' | 'facebook' };
  try {
    await userService.disconnectIntegration(req.user!.id, integration);
    res.json({ message: `Successfully disconnected ${integration}.` });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to disconnect integration.' });
  }
});

export default router;
