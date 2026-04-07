import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic();

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
}

// POST /api/schedule  body: { description: string, events: CalEvent[] }
export async function POST(request: Request) {
  const { description, events = [] } = (await request.json()) as {
    description: string;
    events: CalEvent[];
  };

  if (!description?.trim()) {
    return Response.json({ error: "Description is required" }, { status: 400 });
  }

  const now = new Date();

  // Build a free/busy summary for the next 7 days (8am–8pm)
  const freeSlots: string[] = [];

  for (let d = 0; d < 7; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);

    const dayStr = day.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const workStart = new Date(day);
    workStart.setHours(8, 0, 0, 0);
    const workEnd = new Date(day);
    workEnd.setHours(20, 0, 0, 0);

    const dayBusy = events.filter((e) => {
      const s = new Date(e.start);
      const en = new Date(e.end);
      return s < workEnd && en > workStart;
    });

    if (dayBusy.length === 0) {
      freeSlots.push(`${dayStr}: 8:00 AM – 8:00 PM (fully free)`);
    } else {
      const busyDesc = dayBusy
        .map((e) => {
          const s = new Date(e.start).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
          const en = new Date(e.end).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
          return `${s}–${en} (${e.title})`;
        })
        .join(", ");
      freeSlots.push(`${dayStr}: busy ${busyDesc} (rest is free 8am–8pm)`);
    }
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `You are a smart calendar scheduling assistant. Given a user's schedule and an event they want to add, pick the best available time slot.

Rules:
- Only schedule within 8am–8pm
- Avoid scheduling during existing events
- Consider the nature of the event (e.g. gym = morning, meetings = business hours)
- Return ONLY valid JSON with no explanation, markdown, or code fences

Return this exact JSON format:
{
  "title": "Event title",
  "start": "2026-04-07T09:00:00",
  "end": "2026-04-07T10:00:00",
  "reason": "Brief reason for this time choice"
}`,
    messages: [
      {
        role: "user",
        content: `Today is ${now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}.

My schedule for the next 7 days:
${freeSlots.join("\n")}

Please schedule this event: "${description}"`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return Response.json({ error: "No response from Claude" }, { status: 500 });
  }

  let scheduled: { title: string; start: string; end: string; reason: string };
  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    scheduled = JSON.parse(jsonMatch[0]);
  } catch {
    return Response.json({ error: "Failed to parse Claude response" }, { status: 500 });
  }

  return Response.json({
    event: {
      id: crypto.randomUUID(),
      title: scheduled.title,
      start: scheduled.start,
      end: scheduled.end,
      color: "#10b981",
    },
    reason: scheduled.reason,
  });
}
