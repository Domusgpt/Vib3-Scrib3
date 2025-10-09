import { Router } from 'express';
import passport from 'passport';

const router = Router();

// --- AUTH ROUTES ---
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'] }));
// FIX: Removed explicit types from handler arguments to fix type errors.
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => res.redirect('/'));

router.get('/facebook', passport.authenticate('facebook', { scope: ['email', 'read_mailbox'] }));
// FIX: Removed explicit types from handler arguments to fix type errors.
router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), (req, res) => res.redirect('/'));

// FIX: Removed explicit types from handler arguments to fix type errors.
router.post('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) { return next(err); }
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.json({ message: 'Logged out' });
        });
    });
});

// FIX: Removed explicit types from handler arguments to fix type errors.
router.get('/user', (req, res) => {
    if (req.user) {
        const userId = (req.user as any).id;
        const { db } = require('../db');
        const license = db.data.licenses.find(l => l.userId === userId);
        res.json({ user: req.user, license: license || { status: 'inactive' } });
    } else {
        res.status(404).json({ message: 'No user session found' });
    }
});

export default router;