@AGENTS.md

## Project: AI Calendar

A Next.js 16 app where users describe events in plain language and Claude Haiku finds the best open time slot.

### Architecture
- `components/CalendarApp.tsx` — all UI (client component, three tabs: recurring, one-time, calendar view)
- `app/api/schedule/route.ts` — POST endpoint that calls Claude Haiku and returns a scheduled event
- Storage: `localStorage` only — no database. Keys: `ai_calendar_events`, `ai_calendar_recurring`

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
- Deleting an event from the calendar only removes it from `ai_calendar_events`, not recurring
