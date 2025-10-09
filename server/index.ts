import express from 'express';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import './config/passport-setup'; // Configure passport strategies
import authRoutes from './routes/auth';
import apiRoutes from './routes/api';
import { User } from '../types';

// Augment Express Request type to include properties from passport and express-session
// FIX: This declaration has been moved to types.ts to be applied globally.
// This helps resolve type conflicts and ensures consistency.


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
// Standard middleware setup. Overload errors here typically indicate a wider type definition issue in the project.
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES ---
// All routes are now modularized and handled in separate files.
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);


// --- SERVE FRONTEND ---
const clientBuildPath = path.resolve(__dirname, '../../dist');
app.use(express.static(clientBuildPath));

// FIX: Removed explicit types from handler to allow for correct type inference, resolving issues with Express types.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});