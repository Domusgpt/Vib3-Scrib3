# Scribe AI: Development Handoff & Project Vision

## 1. Project Overview

### 1.1. Core Concept

**Scribe AI** is a personalized AI writing assistant. Its core purpose is to act as a "digital twin" for a user's communication style. Unlike generic AI chatbots, Scribe learns a user's unique voice—their tone, diction, phrasing, and sentence structure—by analyzing their past writings (emails, messages, etc.). It then uses this learned "style profile" to draft new content, ensuring that the AI-generated text sounds authentically like the user.

### 1.2. User Value Proposition

The primary goal is to save users time on routine communication without sacrificing their personal touch.

*   **Efficiency:** Automate the drafting of common replies, announcements, and messages.
*   **Authenticity:** Generate content that is indistinguishable from what the user would write themselves.
*   **Consistency:** Maintain a consistent voice across different platforms and contexts.

## 2. Architecture Deep Dive

The application is built on a robust **"smart server, dumb client"** model. This architecture was chosen deliberately for security, scalability, and maintainability.

### 2.1. Frontend (React + TypeScript)

*   **Role:** The frontend is responsible exclusively for rendering the UI and capturing user input. It is a single-page application built with React and styled with TailwindCSS.
*   **State Management:** It holds UI state (e.g., which modals are open, the content of the chat history) but contains **no sensitive information** like API keys or user access tokens.
*   **API Interaction:** All significant actions (sending messages, creating profiles, authenticating) are handled through asynchronous API calls to the backend server. The client simply displays the final results or errors returned by the server.

### 2.2. Backend (Node.js + Express + TypeScript)

The backend is the brain of the application, orchestrating all logic, authentication, and communication with third-party services.

*   **Authentication & Session Management:**
    *   Uses `passport.js` to handle all OAuth 2.0 flows (Google, Facebook).
    *   **Crucially, the client never handles access tokens.** The OAuth dance happens entirely between the server and the provider (e.g., Google). The server stores the tokens securely in the database, associated with the user's session.
    *   This makes the frontend secure and simplifies its logic immensely.

*   **API & Security Middleware:**
    *   The API layer is split into feature routers (`auth`, `profiles`, `chat`, `integrations`, `billing`, `organizations`, `api-keys`, `webhooks`, `audit`).
    *   All sensitive endpoints are protected by middleware:
        1.  `isAuthenticated`: Checks for a valid user session before allowing the request to proceed.
        2.  `hasActiveLicense`: Enforces business logic, ensuring a user has an active license or subscription to use core features.

*   **AI Service Layer (`server/modules/chat/llm.service.ts`):**
    *   This is the most important component. It abstracts all interactions with Large Language Models (LLMs) like Google Gemini.
    *   **Server-Side Tool-Calling Loop:** The frontend does not engage in a multi-step conversation with the AI. Instead, it sends a single, high-level user prompt (e.g., *"Create a new style profile named "My Project Emails" by analyzing my writing samples from Gmail."*).
    *   The backend receives this prompt and initiates a loop with the Gemini model:
        1.  It sends the prompt and a list of available `tools` (e.g., `createStyleProfile`, `fetchWritingSamples`).
        2.  The model responds not with text, but with a `functionCall` telling the server which tool to use and with what arguments (e.g., `fetchWritingSamples({ source: 'gmail' })`).
        3.  The server executes this function, using the authenticated user's stored access tokens to securely fetch data from the provider (e.g., the Gmail API).
        4.  The server sends the result of the tool execution back to the model.
        5.  The model processes this result and generates a final, human-readable text response (e.g., *"Successfully fetched 85 samples from Gmail and created a new style profile named "My Project Emails". I've made it the active profile."*).
    *   This entire complex interaction is hidden from the user and the frontend, which simply receives the final text response. This makes the system incredibly powerful and the frontend code clean and simple.

*   **Database (`lowdb`):**
    *   Currently uses `lowdb`, a simple file-based JSON database for rapid development.
    *   It stores users, style profiles, licenses, subscriptions, usage telemetry, organizations, memberships, invitations, API keys, webhooks, audit logs, and encrypted tokens.
    *   This is designed to be easily swappable with a production-grade database like PostgreSQL or MongoDB without changing the application's core logic.

*   **Workspace Governance:**
    *   Every user receives a personal workspace automatically on first login. Additional team workspaces can be created from the `/workspace` control center.
    *   Workspaces manage seat limits, role-based access (owner, admin, author, viewer), and invitations. Session state tracks the active workspace to scope usage, billing, and chat enforcement.
    *   API keys and webhooks are issued per workspace with signed deliveries and scope-based secrets; all actions are captured in an immutable audit log.

## 3. Goals & Vision for Integration and Ease of Use

Our success hinges on making the application feel effortless and intelligent. The user should feel like they have a capable assistant, not that they are operating a complex piece of software.

### 3.1. Primary Goal: Seamless & Valuable Integrations

Connecting an account like Gmail should be a "fire and forget" action with immediate, obvious benefits.

*   **What is Here:**
    *   Secure OAuth 2.0 flows for Google and Facebook.
    *   The ability to create style profiles from connected sources with a single natural language command.
    *   The UI provides feedback on connection status and the approximate number of available writing samples, giving users confidence before they commit to an action.
    *   A dedicated `/integrations` hub that surfaces health, sample counts, and quick actions for each connector.
    *   Workspace administration for teams: multi-seat management, invitations, scoped API keys, webhooks, and a live audit trail to integrate Scribe with external systems.

*   **What We Intend (The Path Forward):**
    *   **Deeper Contextual Awareness:** The AI should do more than just fetch samples. It should be able to operate within the context of the integrated service. For example: *"Draft a reply to the last email from Jane Doe using my professional style."* The backend would need to fetch that specific email, provide its content to the LLM along with the style profile, and generate a relevant draft.
    *   **Expand Integrations:** The architecture is built to easily add more sources. The next logical steps are professional and team-based platforms like **Slack, Microsoft Teams, and LinkedIn**. Each new integration should follow the same pattern: secure server-side auth and server-side tool execution.
    *   **Proactive Assistance:** The ultimate goal is for Scribe to act proactively. For instance, it could monitor incoming emails and, based on user-defined rules, automatically draft replies for review. This transforms the tool from reactive to proactive.

### 3.2. Primary Goal: An Effortless User Experience

The user should never be confused about what to do next or what the system is doing.

*   **What is Here:**
    *   The chat interface serves as a natural language command line, which is highly intuitive.
    *   The UI provides constant, clear feedback: loading states, system messages confirming actions (`"Style profile 'X' is now active."`), and tooltips that preview a style profile's characteristics on hover.
    *   Error handling is specific and user-friendly, distinguishing between network issues and application errors (e.g., expired license).

*   **What We Intend (The Path Forward):**
    *   **Guided Onboarding:** A new user should be guided through their first integration connection and style profile creation, demonstrating the core value proposition within the first 60 seconds of use.
    *   **Editable Style Profiles:** After the AI generates a style profile, users should be able to review and manually tweak its characteristics (e.g., "Tone: Make 10% more formal"). This gives users final control and builds trust.
    *   **"One-Click" Actions:** While the natural language interface is powerful, common actions should also be available as buttons. For example, next to a connected Gmail integration, a "Create Style Profile" button could trigger the entire analysis process without the user needing to type anything.
    *   **Advanced Governance:** Expand workspace tooling with usage-based billing dashboards, seat overage alerts, and integration templates (Zapier, Make, Slack bots) that leverage the webhook and API key infrastructure.

## 4. Summary for the Development Team

You are inheriting a project with a strong, secure, and scalable architectural foundation. The key principle to maintain is the **separation of concerns between the client and the server**. The frontend should remain a lean, responsive view layer, while all complex logic, security, and third-party interactions should be orchestrated by the backend.

Our roadmap is focused on deepening the intelligence and utility of our integrations while continuously refining the user experience to make it as intuitive and effortless as possible. The current codebase provides a solid and well-documented starting point for achieving this vision.
