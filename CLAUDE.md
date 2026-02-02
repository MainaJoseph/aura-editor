# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aura is an AI-powered code editor with in-browser project runtime. Users can create projects, edit code with AI assistance, and preview running applications directly in the browser using WebContainer.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

Note: No test suite is currently configured.

## Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Convex (serverless database with real-time subscriptions)
- **Auth**: Clerk (JWT-based)
- **AI**: Vercel AI SDK with Anthropic Claude (primary), plus OpenAI, Google, Groq, DeepSeek
- **Background Jobs**: Inngest with Agent Kit for AI agent orchestration
- **Editor**: CodeMirror 6 with extensive language support
- **Runtime**: WebContainer API for in-browser project execution
- **Monitoring**: Sentry

### Directory Structure

```
convex/              # Backend: schema, mutations, queries
  schema.ts          # Database tables: projects, files, conversations, messages

src/
  app/               # Next.js App Router pages and API routes
    api/             # REST endpoints (messages, explain, suggestion, quick-edit)

  components/
    ui/              # shadcn/ui components
    ai-elements/     # AI-specific UI (message bubbles, code blocks, artifacts)

  features/          # Feature modules (self-contained)
    auth/            # Authentication views
    projects/        # Project management, file explorer
    editor/          # CodeMirror integration, editor extensions
    conversations/   # AI chat, Inngest agents and tools
    preview/         # WebContainer terminal and preview

  lib/               # Shared utilities (convex-client, firecrawl, utils)
  inngest/           # Inngest client setup
```

### Key Patterns

**Feature-Based Architecture**: Each feature in `src/features/` is self-contained with its own components, hooks, and stores. Cross-feature dependencies are minimal.

**Convex Data Layer**: All data operations go through Convex. Queries provide real-time updates. Mutations are authenticated via `verifyAuth()` helper in `convex/auth.ts`.

**AI Agent System**: Located in `src/features/conversations/inngest/`. The agent uses Inngest's step API for reliable execution with tools for file operations (list, read, create, update, delete, rename) and web scraping.

**Editor Extensions**: CodeMirror extensions in `src/features/editor/extensions/` follow a pattern where each feature (explain, suggestion, quick-edit) has an `index.ts` for logic and `fetcher.ts` for API calls.

**State Management**: Zustand for local client state (editor tabs in `src/features/editor/store/`), Convex hooks for server state.

### Database Schema (Convex)

- **projects**: User projects with import/export status and settings
- **files**: Hierarchical file structure with `parentId` for nesting, supports text content or binary via storage
- **conversations**: AI chat sessions per project
- **messages**: Individual messages with processing status

### API Routes

- `POST /api/messages` - Send user message, triggers Inngest agent
- `POST /api/messages/cancel` - Cancel processing message
- `POST /api/explain` - Get code explanation
- `POST /api/suggestion` - Get code suggestions
- `POST /api/quick-edit` - AI-powered code modifications

### Environment Variables

Required:
- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL
- `CLERK_JWT_ISSUER_DOMAIN` - Clerk authentication domain
- `AURA_CONVEX_INTERNAL_KEY` - Internal Convex operations key
- `ANTHROPIC_API_KEY` - Primary AI model
- `INNGEST_EVENT_KEY` - Background job events

### AI Models

- **Claude Opus 4** (`claude-opus-4-20250514`) - Main coding agent
- **Claude 3.5 Haiku** - Conversation title generation
- **Gemini 2.5 Flash** - Demo generation
