import Anthropic from "@anthropic-ai/sdk";
import { sql, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";

export const maxDuration = 60;

const anthropic = new Anthropic();

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Action {
  type: "created" | "updated" | "deleted";
  event: CalEvent;
}

const tools: Anthropic.Tool[] = [
  {
    name: "list_events",
    description:
      "List all one-time events on the user's calendar. Returns an array of events with id, title, start, and end times.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "list_recurring_events",
    description:
      "List all recurring weekly events. Returns events with id, title, daysOfWeek (0=Sun..6=Sat), startTime, and endTime.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "create_event",
    description:
      "Create a new one-time calendar event. Pick the best available time based on the user's existing schedule. Avoid conflicts.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Event title" },
        start: {
          type: "string",
          description: "Start time as ISO 8601 string (e.g. 2026-04-08T14:00:00)",
        },
        end: {
          type: "string",
          description: "End time as ISO 8601 string (e.g. 2026-04-08T15:00:00)",
        },
      },
      required: ["title", "start", "end"],
    },
  },
  {
    name: "update_event",
    description:
      "Update an existing one-time event. You can change its title, start time, and/or end time. Only provide the fields you want to change.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The event ID to update" },
        title: { type: "string", description: "New title (optional)" },
        start: { type: "string", description: "New start time as ISO 8601 (optional)" },
        end: { type: "string", description: "New end time as ISO 8601 (optional)" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_event",
    description: "Delete a one-time event by its ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The event ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_recurring_event",
    description:
      "Create a new weekly recurring event.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Event title" },
        daysOfWeek: {
          type: "array",
          items: { type: "number" },
          description: "Days of week (0=Sunday, 1=Monday, ..., 6=Saturday)",
        },
        startTime: { type: "string", description: "Start time in HH:mm format (e.g. 09:00)" },
        endTime: { type: "string", description: "End time in HH:mm format (e.g. 10:00)" },
      },
      required: ["title", "daysOfWeek", "startTime", "endTime"],
    },
  },
  {
    name: "delete_recurring_event",
    description: "Delete a recurring event by its ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The recurring event ID to delete" },
      },
      required: ["id"],
    },
  },
];

async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string
): Promise<{ result: string; action?: Action }> {
  await ensureTables();

  switch (toolName) {
    case "list_events": {
      const rows = await sql`
        SELECT id, title, start_time AS start, end_time AS "end", color
        FROM events WHERE user_id = ${userId}
        ORDER BY start_time
      `;
      return { result: JSON.stringify(rows) };
    }

    case "list_recurring_events": {
      const rows = await sql`
        SELECT id, title, days_of_week, start_time, end_time, color
        FROM recurring_events WHERE user_id = ${userId}
      `;
      const events = rows.map((r) => ({
        id: r.id,
        title: r.title,
        daysOfWeek: JSON.parse(r.days_of_week),
        startTime: r.start_time,
        endTime: r.end_time,
        color: r.color ?? undefined,
      }));
      return { result: JSON.stringify(events) };
    }

    case "create_event": {
      const id = crypto.randomUUID();
      const title = input.title as string;
      const start = input.start as string;
      const end = input.end as string;
      const color = "#10b981";
      await sql`
        INSERT INTO events (id, user_id, title, start_time, end_time, color)
        VALUES (${id}, ${userId}, ${title}, ${start}, ${end}, ${color})
      `;
      const event: CalEvent = { id, title, start, end, color };
      return {
        result: JSON.stringify({ ok: true, event }),
        action: { type: "created", event },
      };
    }

    case "update_event": {
      const id = input.id as string;
      const title = (input.title as string) ?? null;
      const start = (input.start as string) ?? null;
      const end = (input.end as string) ?? null;
      await sql`
        UPDATE events
        SET title = COALESCE(${title}, title),
            start_time = COALESCE(${start}, start_time),
            end_time = COALESCE(${end}, end_time)
        WHERE id = ${id} AND user_id = ${userId}
      `;
      const rows = await sql`
        SELECT id, title, start_time AS start, end_time AS "end", color
        FROM events WHERE id = ${id} AND user_id = ${userId}
      `;
      if (rows.length === 0) return { result: JSON.stringify({ error: "Event not found" }) };
      const event = rows[0] as unknown as CalEvent;
      return {
        result: JSON.stringify({ ok: true, event }),
        action: { type: "updated", event },
      };
    }

    case "delete_event": {
      const id = input.id as string;
      const rows = await sql`
        SELECT id, title, start_time AS start, end_time AS "end", color
        FROM events WHERE id = ${id} AND user_id = ${userId}
      `;
      if (rows.length === 0) return { result: JSON.stringify({ error: "Event not found" }) };
      await sql`DELETE FROM events WHERE id = ${id} AND user_id = ${userId}`;
      const event = rows[0] as unknown as CalEvent;
      return {
        result: JSON.stringify({ ok: true }),
        action: { type: "deleted", event },
      };
    }

    case "create_recurring_event": {
      const id = crypto.randomUUID();
      const title = input.title as string;
      const daysOfWeek = input.daysOfWeek as number[];
      const startTime = input.startTime as string;
      const endTime = input.endTime as string;
      const color = "#6366f1";
      await sql`
        INSERT INTO recurring_events (id, user_id, title, days_of_week, start_time, end_time, color)
        VALUES (${id}, ${userId}, ${title}, ${JSON.stringify(daysOfWeek)}, ${startTime}, ${endTime}, ${color})
      `;
      return {
        result: JSON.stringify({ ok: true, id, title, daysOfWeek, startTime, endTime }),
      };
    }

    case "delete_recurring_event": {
      const id = input.id as string;
      await sql`DELETE FROM recurring_events WHERE id = ${id} AND user_id = ${userId}`;
      return { result: JSON.stringify({ ok: true }) };
    }

    default:
      return { result: JSON.stringify({ error: "Unknown tool" }) };
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = (await request.json()) as { messages: ChatMessage[] };

  if (!messages?.length) {
    return Response.json({ error: "Messages required" }, { status: 400 });
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const systemPrompt = `You are a friendly and helpful AI calendar assistant. You help users manage their calendar through conversation.

You can:
- Create new events at optimal times
- Move/reschedule existing events
- Edit event details (title, time)
- Delete events
- View and discuss the user's schedule
- Create and manage recurring weekly events

Today is ${dateStr}. The current time is ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.

Guidelines:
- Schedule events between 8am and 8pm unless the user specifies otherwise
- Always check the user's existing events before creating new ones to avoid conflicts
- When the user asks to move or change an event, list events first to find the right one
- Be conversational and confirm actions you've taken
- When creating events, consider the nature of the event (gym = afternoon, meetings = business hours, etc.)
- Keep responses concise but friendly`;

  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const actions: Action[] = [];
  let finalText = "";

  // Tool-use loop: keep calling Claude until it stops using tools
  let currentMessages = apiMessages;
  for (let i = 0; i < 10; i++) {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: currentMessages,
    });

    // Collect any text from this response
    const textParts = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text);
    if (textParts.length > 0) {
      finalText = textParts.join("");
    }

    // If no tool use, we're done
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    if (toolUseBlocks.length === 0) break;

    // Execute tools and build tool_result messages
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolBlock of toolUseBlocks) {
      const { result, action } = await executeTool(
        toolBlock.name,
        toolBlock.input as Record<string, unknown>,
        session.userId
      );
      if (action) actions.push(action);
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolBlock.id,
        content: result,
      });
    }

    // Append assistant response + tool results for next iteration
    currentMessages = [
      ...currentMessages,
      { role: "assistant" as const, content: response.content },
      { role: "user" as const, content: toolResults },
    ];
  }

  return Response.json({
    reply: finalText,
    actions,
  });
}
