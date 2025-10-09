import { Router } from 'express';
// FIX: Corrected import path for middleware to point to the directory's index file.
import { isAuthenticated } from '../middleware/index';
import { db } from '../db';
import { continueConversation, countWritingSamples } from '../services/ai-providers';
import { ChatMessage, MessageAuthor, StyleProfile } from '../../types';

const router = Router();

// Middleware to ensure user is authenticated for all API routes
router.use(isAuthenticated);

// --- PROFILE ROUTES ---

// FIX: Removed explicit Request/Response types to allow for correct type inference.
router.get('/profiles', (req, res) => {
    const userId = (req.user as any).id;
    const profiles = db.data.style_profiles.filter(p => p.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(profiles);
});

// FIX: Removed explicit Request/Response types to allow for correct type inference.
router.post('/profiles/active', (req, res) => {
    const { id } = req.body;
    if (req.session) {
        req.session.activeProfileId = id;
    }
    res.json({ activeProfileId: id });
});

// This endpoint is now primarily used by the AI tool `createStyleProfile`, not directly by the client.
// It's a manual override if needed. The client now sends a natural language prompt instead.
// FIX: Removed explicit Request/Response types to allow for correct type inference.
router.post('/profiles', async (req, res) => {
    const { name, source, style } = req.body;
    const user = req.user as any;
    
    const newProfile: StyleProfile = {
        id: `profile_${Date.now()}`,
        userId: user.id,
        name,
        style: style || 'Style not yet analyzed.', // AI tool will provide this
        source: source.type,
        createdAt: new Date().toISOString()
    };
    db.data.style_profiles.push(newProfile);
    await db.write();

    res.status(201).json({ message: `Profile ${name} created.`, profile: newProfile });
});

// --- CHAT ROUTES ---

// FIX: Removed explicit Request/Response types to allow for correct type inference.
router.post('/chat/continue', async (req, res) => {
    const { prompt, history } = req.body;
    const user = req.user;
    const activeProfileId = req.session.activeProfileId;

    try {
        const responseMessage = await continueConversation({
            prompt,
            history,
            provider: 'gemini',
            context: { user, activeProfileId }
        });
        res.json(responseMessage);
    } catch (error) {
        console.error('Error in conversation:', error);
        res.status(500).json({ author: MessageAuthor.SYSTEM, text: 'Sorry, I encountered an error. Please try again.' });
    }
});


// --- INTEGRATIONS & EXTERNAL DATA ---

// FIX: Removed explicit Request/Response types to allow for correct type inference.
router.get('/sample-count', async (req, res) => {
    const source = req.query.source as 'gmail' | 'facebook';
    const user = req.user as any;

    if (!source || (source !== 'gmail' && source !== 'facebook')) {
        return res.status(400).json({ message: 'Invalid source specified.' });
    }

    let accessToken;
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

// FIX: Removed explicit Request/Response types to allow for correct type inference.
router.post('/integrations/disconnect', async (req, res) => {
    const { integration } = req.body as { integration: 'google' | 'facebook' };
    const userId = (req.user as any).id;
    const user = db.data.users.find(u => u.id === userId);

    if (!user) {
        return res.status(404).json({ message: "User not found." });
    }

    if (integration === 'google') {
        user.google = undefined;
    } else if (integration === 'facebook') {
        user.facebook = undefined;
    } else {
        return res.status(400).json({ message: "Invalid integration specified." });
    }

    await db.write();
    res.json({ message: `Successfully disconnected ${integration}.` });
});


export default router;