@AGENTS.md

## Project: AI Calendar

A Next.js 16 app where users describe events in plain language and Claude Haiku finds the best open time slot.

### Architecture
- `components/CalendarApp.tsx` — all UI (client component, three tabs: recurring, one-time, calendar view)
- `app/api/schedule/route.ts` — POST endpoint that calls Claude Haiku and returns a scheduled event
- `app/login/page.tsx` — login/register page (client component)
- `lib/db.ts` — Neon Postgres connection via `@neondatabase/serverless`
- `lib/session.ts` — JWT session management via `jose` (cookie-based)
- Storage: Neon Postgres with `users`, `events`, and `recurring_events` tables. All data is scoped per user via `user_id`.

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

### Scheduling rules (enforced in the Claude prompt)
- Window: 8am–8pm only, next 7 days
- Recurring events are expanded into CalEvents before being sent to the API
- Claude returns JSON: `{ title, start, end, reason }` — do NOT change this shape without updating the parser in route.ts

### Key constraints
- The Claude model in route.ts is `claude-haiku-4-5-20251001` — keep it unless explicitly asked to change
- `expandRecurring()` only expands 7 days forward — recurring events beyond that window won't appear in conflict checks
- Deleting an event from the calendar only removes it from `events`, not recurring

### Environment variables
- `DATABASE_URL` — Neon Postgres connection string
- `AUTH_SECRET` — secret for JWT signing
- `ANTHROPIC_API_KEY` — Anthropic API key
