
# Scribe AI Platform

Scribe is a multi-provider AI platform that learns your writing style from various communication sources (like Gmail and Facebook) to act as your digital scribe. It can generate responses in your unique voice, controlled via a secure, scalable, and production-ready application.

## 1. Architecture Overview

This application is built on a robust client-server model designed for security, scalability, and extensibility.

*   **Frontend**: A responsive React (TypeScript) single-page application that serves as the user interface. It is a "dumb" client; it contains no sensitive API keys and all major operations are delegated to the backend.
*   **Backend**: A Node.js (Express/TypeScript) server that acts as the core orchestration layer.
    *   **Authentication**: Securely handles all OAuth 2.0 flows (Google, Facebook) using Passport.js. The client never touches sensitive tokens.
    *   **Middleware**: Provides critical security and business logic checks on incoming API requests:
        1.  `isAuthenticated`: Ensures a user is logged in.
        2.  `hasActiveLicense`: Checks if the user has a valid license to use core features.
    *   **API Layer**: Exposes a RESTful API for the frontend to interact with.
    *   **AI Provider Service**: A modular service that securely communicates with third-party LLM providers (Google Gemini, OpenAI ChatGPT). It handles the full tool-calling loop, routing requests and executing functions on the server side.
    *   **Database Service**: Manages all data persistence.
*   **Database**: Uses `lowdb` (a simple, file-based JSON database) to store user information, style profiles, and license data. This can be easily swapped for a production database like PostgreSQL or MongoDB.

---

## 2. Setup and Deployment

### Prerequisites

*   Node.js (v18 or later)
*   npm or yarn

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### Step 2: Install Dependencies

This will install dependencies for both the root, client, and server.

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file inside the `server/` directory. Use the `server/.env.example` as a template.

```
# server/.env

# Session Management
SESSION_SECRET='REPLACE_WITH_A_LONG_RANDOM_STRING'

# Google Credentials (for Gmail Integration)
# Get from Google Cloud Console -> APIs & Services -> Credentials
GOOGLE_CLIENT_ID='YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
GOOGLE_CLIENT_SECRET='YOUR_GOOGLE_CLIENT_SECRET'

# Facebook Credentials (for Messenger Integration)
# Get from Meta for Developers -> App Dashboard
FACEBOOK_APP_ID='YOUR_FACEBOOK_APP_ID'
FACEBOOK_APP_SECRET='YOUR_FACEBOOK_APP_SECRET'

# AI Provider API Keys
# Get from Google AI Studio (ensure it's for Gemini)
API_KEY='YOUR_GOOGLE_GEMINI_API_KEY'
# Get from platform.openai.com
OPENAI_API_KEY='YOUR_OPENAI_API_KEY'

# Application URL (for OAuth Callbacks)
# For local development:
BASE_URL='http://localhost:3001'
```

### Step 4: Configure OAuth Redirect URIs

You must authorize the backend's callback URLs in your provider dashboards.

*   **Google Cloud Console:**
    *   Go to "APIs & Services" -> "Credentials".
    *   Select your OAuth 2.0 Client ID.
    *   Under "Authorized redirect URIs", add: `http://localhost:3001/auth/google/callback`
*   **Meta for Developers:**
    *   Go to your App -> "Facebook Login" -> "Settings".
    *   Under "Valid OAuth Redirect URIs", add: `http://localhost:3001/auth/facebook/callback`

### Step 5: Run the Application

This command will start the backend server. The frontend is served automatically by the backend in this setup.

```bash
npm run server
```

Navigate to `http://localhost:3001` in your browser.

---

## 3. API Documentation

All API endpoints are prefixed with the `BASE_URL`.

### Authentication

*   `GET /auth/google`
    *   Initiates the Google OAuth 2.0 sign-in flow. Redirects to Google.
*   `GET /auth/google/callback`
    *   Callback URL for Google to redirect to after user consent.
*   `GET /auth/facebook`
    *   Initiates the Facebook OAuth 2.0 sign-in flow.
*   `GET /auth/facebook/callback`
    *   Callback URL for Facebook.
*   `POST /auth/logout`
    *   Logs the user out and destroys the session.
*   `GET /auth/user`
    *   Retrieves the currently authenticated user's profile and license status.

### AI Chat

*   `POST /api/chat`
    *   **Middleware:** `isAuthenticated`, `hasActiveLicense`
    *   The main endpoint for communicating with the AI. The backend handles the full conversation, including any necessary tool calls (function calling), before returning a final response.
    *   **Body:** `{ prompt: string, history: ChatMessage[], provider: LLMProvider, context?: { activeProfileId: string } }`

### Integrations Data

*   `GET /api/emails`
    *   **Middleware:** `isAuthenticated`
    *   Fetches recent sent emails from the user's connected Gmail account.
*   `GET /api/messenger`
    *   **Middleware:** `isAuthenticated`
    *   Fetches recent messages from the user's connected Facebook account. (Note: Requires advanced permissions from Meta).

### Style Profiles

*   `GET /api/profiles`
    *   **Middleware:** `isAuthenticated`
    *   Fetches all style profiles for the current user.
*   `POST /api/profiles`
    *   **Middleware:** `isAuthenticated`
    *   Creates a new style profile.
    *   **Body:** `{ name: string, style: string }`

### Licensing

*   `POST /api/license/activate`
    *   **Middleware:** `isAuthenticated`
    *   Activates a license for the current user. (Simulated for this scaffold).
