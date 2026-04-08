"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color?: string;
}

interface RecurringEvent {
  id: string;
  title: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  color?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatAction {
  type: "created" | "updated" | "deleted";
  event: CalEvent;
}

type Tab = "recurring" | "chat" | "calendar";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function CalendarApp({ userEmail }: { userEmail: string }) {
  const calendarRef = useRef<FullCalendar>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [recurring, setRecurring] = useState<RecurringEvent[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("calendar");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Recurring form
  const [rTitle, setRTitle] = useState("");
  const [rDay, setRDay] = useState<number>(1);
  const [rStart, setRStart] = useState("09:00");
  const [rEnd, setREnd] = useState("10:00");

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then(setEvents);
    fetch("/api/recurring").then((r) => r.json()).then(setRecurring);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function handleAddRecurring(e: React.FormEvent) {
    e.preventDefault();
    if (!rTitle.trim()) return;
    if (rStart >= rEnd) {
      alert("End time must be after start time");
      return;
    }
    const newEvent: RecurringEvent = {
      id: crypto.randomUUID(),
      title: rTitle.trim(),
      daysOfWeek: [rDay],
      startTime: rStart,
      endTime: rEnd,
      color: "#6366f1",
    };
    await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEvent),
    });
    setRecurring((prev) => [...prev, newEvent]);
    setRTitle("");
  }

  async function handleDeleteRecurring(id: string) {
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleChatSend(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();

      if (!res.ok) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Something went wrong. Please try again." },
        ]);
        setChatLoading(false);
        return;
      }

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);

      // Apply actions to local state
      if (data.actions?.length) {
        for (const action of data.actions as ChatAction[]) {
          if (action.type === "created") {
            setEvents((prev) => [...prev, action.event]);
          } else if (action.type === "updated") {
            setEvents((prev) =>
              prev.map((ev) => (ev.id === action.event.id ? action.event : ev))
            );
          } else if (action.type === "deleted") {
            setEvents((prev) => prev.filter((ev) => ev.id !== action.event.id));
          }
        }
        // Also refresh recurring events in case those changed
        fetch("/api/recurring").then((r) => r.json()).then(setRecurring);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error — please try again." },
      ]);
    }

    setChatLoading(false);
  }

  async function handleEventClick(info: { event: { id: string; title: string; startStr: string; endStr: string } }) {
    const confirmed = window.confirm(
      `"${info.event.title}"\n${info.event.startStr} → ${info.event.endStr}\n\nDelete this event?`
    );
    if (confirmed) {
      await fetch(`/api/events/${info.event.id}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e.id !== info.event.id));
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "recurring", label: "Recurring Events", icon: "\u21BB" },
    { id: "chat", label: "AI Assistant", icon: "\u2726" },
    { id: "calendar", label: "View Calendar", icon: "\u25A6" },
  ];

  return (
    <div className="app-shell">
      <div className="bg-overlay" />

      <div className="app-content">
        {/* Header */}
        <header className="glass-card app-header">
          <div className="header-inner">
            <div className="header-brand">
              <span className="header-icon">{"\u25C8"}</span>
              <div>
                <h1 className="header-title">AI Calendar</h1>
                <p className="header-sub">Intelligent scheduling, powered by Claude</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{userEmail}</span>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="header-badge"
                style={{ cursor: "pointer", background: "rgba(248, 113, 113, 0.15)", borderColor: "rgba(248, 113, 113, 0.4)", color: "#f87171" }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Tab bar */}
        <nav className="glass-card tab-bar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn${activeTab === tab.id ? " tab-btn--active" : ""}`}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tab.id === "recurring" && recurring.length > 0 && (
                <span className="tab-badge">{recurring.length}</span>
              )}
              {tab.id === "chat" && chatMessages.length > 0 && (
                <span className="tab-badge">{chatMessages.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Panel */}
        <main className="panel-area">
          {/* Recurring Events Tab */}
          {activeTab === "recurring" && (
            <div className="glass-card panel">
              <h2 className="panel-title">Weekly Recurring Events</h2>
              <p className="panel-desc">
                These events repeat every week and are visible to the AI assistant when scheduling.
              </p>

              <form onSubmit={handleAddRecurring} className="recurring-form">
                <div className="form-group">
                  <label className="form-label">Event Name</label>
                  <input
                    type="text"
                    value={rTitle}
                    onChange={(e) => setRTitle(e.target.value)}
                    placeholder="e.g. Morning Run, Team Standup"
                    className="glass-input"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Day of Week</label>
                    <select
                      value={rDay}
                      onChange={(e) => setRDay(Number(e.target.value))}
                      className="glass-input"
                    >
                      {DAY_NAMES.map((name, i) => (
                        <option key={i} value={i}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      value={rStart}
                      onChange={(e) => setRStart(e.target.value)}
                      className="glass-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      value={rEnd}
                      onChange={(e) => setREnd(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                </div>

                <button type="submit" disabled={!rTitle.trim()} className="btn-primary">
                  Add Recurring Event
                </button>
              </form>

              {recurring.length > 0 && (
                <div className="recurring-list">
                  <h3 className="list-heading">Saved Recurring Events</h3>
                  <ul className="event-list">
                    {recurring.map((r) => (
                      <li key={r.id} className="event-item">
                        <div className="event-dot" />
                        <div className="event-info">
                          <span className="event-name">{r.title}</span>
                          <span className="event-meta">
                            {DAY_NAMES[r.daysOfWeek[0]]} &middot; {r.startTime} &ndash; {r.endTime}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteRecurring(r.id)}
                          className="btn-delete"
                          aria-label="Remove event"
                        >
                          &times;
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recurring.length === 0 && (
                <div className="empty-state">
                  <span className="empty-icon">{"\u21BB"}</span>
                  <p>No recurring events yet. Add one above.</p>
                </div>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === "chat" && (
            <div className="glass-card panel panel--chat">
              <h2 className="panel-title">AI Assistant</h2>
              <p className="panel-desc">
                Chat with Claude to create, move, edit, or delete events on your calendar.
              </p>

              <div className="chat-messages">
                {chatMessages.length === 0 && (
                  <div className="chat-empty">
                    <span className="chat-empty-icon">{"\u2726"}</span>
                    <p>Start a conversation to manage your calendar.</p>
                    <div className="chat-suggestions">
                      {[
                        "Schedule a gym session this week",
                        "What's on my calendar tomorrow?",
                        "Move my dentist appointment to Friday",
                        "Delete all events on Monday",
                      ].map((s) => (
                        <button
                          key={s}
                          className="chat-suggestion"
                          onClick={() => {
                            setChatInput(s);
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
                    <div className="chat-bubble-label">
                      {msg.role === "user" ? "You" : "Claude"}
                    </div>
                    <div className="chat-bubble-text">{msg.content}</div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="chat-bubble chat-bubble--assistant">
                    <div className="chat-bubble-label">Claude</div>
                    <div className="chat-bubble-text chat-typing">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSend} className="chat-input-bar">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Claude to manage your calendar..."
                  className="glass-input chat-input"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="btn-primary chat-send"
                >
                  {chatLoading ? (
                    <span className="spinner" />
                  ) : (
                    "\u2191"
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === "calendar" && (
            <div className="glass-card panel panel--calendar">
              <div className="calendar-wrap">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                  }}
                  events={[...events, ...recurring]}
                  height="100%"
                  nowIndicator
                  eventClick={handleEventClick}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
