# AI Calendar - Improvements Log

## Improvement 1: Add input validation to API routes
**File(s) changed:** `app/api/events/route.ts`, `app/api/events/[id]/route.ts`, `app/api/recurring/route.ts`

**Problem:** API routes accepted any JSON body without validating required fields (title, start, end, etc.). Missing or malformed data could produce database errors or corrupt calendar state.

**Solution:** Added validation checks at the top of POST/PUT handlers that return 400 responses with descriptive error messages when required fields are missing or have wrong types.

---

## Improvement 2: Add error handling to initial data fetches
**File(s) changed:** `components/CalendarApp.tsx`

**Problem:** The `useEffect` that loads events and recurring events on mount used `.then()` chains with no `.catch()`, so network failures or server errors were silently swallowed. Users would see an empty calendar with no indication anything went wrong.

**Solution:** Replaced with an async function using `Promise.all`, response status checks, and a try/catch. On failure, a `loadError` state displays a visible error banner above the main panel.

---

## Improvement 3: Allow selecting multiple days for recurring events
**File(s) changed:** `components/CalendarApp.tsx`

**Problem:** The recurring event form only allowed selecting a single day of the week via a `<select>` dropdown. Users who wanted the same event on e.g. Mon/Wed/Fri had to create three separate entries.

**Solution:** Replaced the single-day dropdown with toggle buttons for each day of the week. Users can click multiple days to select/deselect them. The recurring event list now shows abbreviated day names (e.g. "Mon, Wed, Fri") instead of a single day name.

---

## Improvement 4: Persist chat history in sessionStorage
**File(s) changed:** `components/CalendarApp.tsx`

**Problem:** Chat messages were stored only in React state. Refreshing the page or navigating away wiped the entire conversation history, forcing users to re-explain context to the AI assistant.

**Solution:** Chat messages are now initialized from `sessionStorage` and synced back on every change. History persists across page refreshes within the same browser tab/session, while still clearing when the tab is closed (appropriate for ephemeral chat data).

---

## Improvement 5: Enhance AI system prompt with timezone and smarter scheduling guidance
**File(s) changed:** `app/api/chat/route.ts`

**Problem:** The AI system prompt lacked timezone context (so Claude couldn't reason about the user's local time correctly) and had minimal scheduling heuristics. It didn't instruct the model to always check existing events before creating new ones, didn't define "this week" vs "next week", and had no guidance on event duration defaults or buffer time.

**Solution:** Added the server's timezone name (via `Intl.DateTimeFormat`) to the prompt. Added clearer guidelines: always list events before creating, define "this week"/"next week" semantics, use 15-minute buffers between events, and apply sensible default durations (meetings = 1hr, gym = 1hr, lunch = 45min, quick tasks = 30min). The AI now confirms exact dates/times after taking actions.
