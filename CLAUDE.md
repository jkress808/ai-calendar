@AGENTS.md

## Project: AI Calendar

A Next.js 16 app with a conversational AI assistant (Claude Haiku) that helps users manage their calendar through natural language chat.

### Architecture
- `components/CalendarApp.tsx` — all UI (client component, three tabs: recurring, AI chat, calendar view)
- `app/api/chat/route.ts` — POST endpoint that runs a Claude tool-use loop for calendar CRUD operations
- `app/api/schedule/route.ts` — legacy POST endpoint for one-shot scheduling (kept for backwards compat)
- `app/api/events/route.ts` — GET/POST for one-time events
- `app/api/events/[id]/route.ts` — PUT/DELETE for single events
- `app/api/recurring/route.ts` — GET/POST for recurring events
- `app/api/recurring/[id]/route.ts` — DELETE for single recurring events
- `app/login/page.tsx` — login/register page (client component)
- `lib/db.ts` — Neon Postgres connection via `@neondatabase/serverless`
- `lib/session.ts` — JWT session management via `jose` (cookie-based)
- Storage: Neon Postgres with `users`, `events`, and `recurring_events` tables. All data is scoped per user via `user_id`.

### Chat agent (app/api/chat/route.ts)
The agent uses Claude's tool_use feature with these tools:
- `list_events` — list all one-time events
- `list_recurring_events` — list all recurring events
- `create_event` — create a one-time event
- `update_event` — update an event's title/time
- `delete_event` — delete a one-time event
- `create_recurring_event` — create a weekly recurring event
- `delete_recurring_event` — delete a recurring event

The tool loop runs server-side (up to 10 iterations). The response includes the assistant's text reply and an array of actions (created/updated/deleted events) so the frontend can update local state.

### Auth
- Custom JWT auth with `bcryptjs` for password hashing and `jose` for token signing
- Session stored as httpOnly cookie, 7-day expiry
- API routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- `app/page.tsx` is a server component that checks session and redirects to `/login` if unauthenticated

### Data shapes
```ts
CalEvent:       { id, title, start: ISO string, end: ISO string, color? }
RecurringEvent: { id, title, daysOfWeek: number[], startTime: "HH:mm", endTime: "HH:mm", color? }
```

### Key constraints
- The Claude model is `claude-haiku-4-5-20251001` — keep it unless explicitly asked to change
- `expandRecurring()` only expands 7 days forward — recurring events beyond that window won't appear in conflict checks
- Deleting an event from the calendar only removes it from `events`, not recurring

### Environment variables
- `DATABASE_URL` — Neon Postgres connection string
- `AUTH_SECRET` — secret for JWT signing
- `ANTHROPIC_API_KEY` — Anthropic API key

### Improvements log
All improvements and feature additions are documented in `IMPROVEMENTS.md`. Always log new improvements there when making changes.
