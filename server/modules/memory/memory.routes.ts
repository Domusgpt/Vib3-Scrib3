import { Router, Request, Response } from 'express';
import { ClaudeMemoryCategory, ClaudeMemorySourceArtifact } from '../../types';
import { memoryService } from './memory.service';

const router = Router();

const isValidCategory = (value: unknown): value is ClaudeMemoryCategory =>
  value === 'context' || value === 'style' || value === 'briefing';

const normalizeHighlights = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(item => item.length > 0);
};

const normalizeSourceArtifacts = (input: unknown): ClaudeMemorySourceArtifact[] => {
  if (!Array.isArray(input)) return [];
  const artifacts: ClaudeMemorySourceArtifact[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const url = typeof record.url === 'string' ? record.url : undefined;
    const excerpt = typeof record.excerpt === 'string' ? record.excerpt : undefined;
    if (!label && !url && !excerpt) {
      continue;
    }
    artifacts.push({ label: label || url || 'Untitled artifact', url, excerpt });
  }
  return artifacts;
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const category = req.query.category;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    if (limit !== undefined && (Number.isNaN(limit) || limit <= 0)) {
      return res.status(400).json({ message: 'limit must be a positive integer when provided.' });
    }

    if (category !== undefined && !isValidCategory(category)) {
      return res.status(400).json({ message: 'Invalid category specified.' });
    }

    const memories = await memoryService.list(req.user!.id, {
      category: isValidCategory(category) ? category : undefined,
      limit,
    });

    res.json({ memories });
  } catch (error) {
    console.error('Failed to list Claude memories', error);
    res.status(500).json({ message: 'Unable to load Claude memories.' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { category, title, summary, highlights, sourceArtifacts, metadata } = req.body ?? {};

    if (!isValidCategory(category)) {
      return res.status(400).json({ message: 'category must be one of context, style, or briefing.' });
    }

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ message: 'title is required.' });
    }

    if (!summary || typeof summary !== 'string') {
      return res.status(400).json({ message: 'summary is required.' });
    }

    const normalizedHighlights = normalizeHighlights(highlights);
    const normalizedSourceArtifacts = normalizeSourceArtifacts(sourceArtifacts);
    const normalizedMetadata =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : undefined;

    const memory = await memoryService.create(req.user!.id, {
      category,
      title: title.trim(),
      summary: summary.trim(),
      highlights: normalizedHighlights,
      sourceArtifacts: normalizedSourceArtifacts,
      metadata: normalizedMetadata,
    });

    res.status(201).json({ memory });
  } catch (error) {
    console.error('Failed to create Claude memory', error);
    res.status(500).json({ message: 'Unable to save Claude memory.' });
  }
});

router.get('/primer', async (req: Request, res: Response) => {
  try {
    const activeProfileId = req.session?.activeProfileId ?? null;
    const primer = await memoryService.buildPrimer(req.user!.id, activeProfileId);
    res.json(primer);
  } catch (error) {
    console.error('Failed to build Claude memory primer', error);
    res.status(500).json({ message: 'Unable to build Claude memory primer.' });
  }
});

export default router;
