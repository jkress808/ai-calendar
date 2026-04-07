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

type Tab = "recurring" | "onetime" | "calendar";

const STORAGE_KEY = "ai_calendar_events";
const RECURRING_KEY = "ai_calendar_recurring";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function loadEvents(): CalEvent[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveEvents(events: CalEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function loadRecurring(): RecurringEvent[] {
  try {
    return JSON.parse(localStorage.getItem(RECURRING_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecurring(events: RecurringEvent[]) {
  localStorage.setItem(RECURRING_KEY, JSON.stringify(events));
}

function expandRecurring(recurring: RecurringEvent[]): CalEvent[] {
  const now = new Date();
  const result: CalEvent[] = [];
  for (let d = 0; d < 7; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const dow = day.getDay();
    for (const r of recurring) {
      if (r.daysOfWeek.includes(dow)) {
        const [sh, sm] = r.startTime.split(":").map(Number);
        const [eh, em] = r.endTime.split(":").map(Number);
        const start = new Date(day);
        start.setHours(sh, sm, 0, 0);
        const end = new Date(day);
        end.setHours(eh, em, 0, 0);
        result.push({
          id: `${r.id}-${d}`,
          title: r.title,
          start: start.toISOString(),
          end: end.toISOString(),
        });
      }
    }
  }
  return result;
}

export default function CalendarApp() {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [recurring, setRecurring] = useState<RecurringEvent[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("calendar");

  // One-time AI scheduling
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastReason, setLastReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recurring form
  const [rTitle, setRTitle] = useState("");
  const [rDay, setRDay] = useState<number>(1);
  const [rStart, setRStart] = useState("09:00");
  const [rEnd, setREnd] = useState("10:00");

  useEffect(() => {
    setEvents(loadEvents());
    setRecurring(loadRecurring());
  }, []);

  function handleAddRecurring(e: React.FormEvent) {
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
    const updated = [...recurring, newEvent];
    setRecurring(updated);
    saveRecurring(updated);
    setRTitle("");
  }

  function handleDeleteRecurring(id: string) {
    const updated = recurring.filter((r) => r.id !== id);
    setRecurring(updated);
    saveRecurring(updated);
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setError(null);
    setLastReason(null);

    let res: Response;
    let data: { event?: CalEvent; reason?: string; error?: string };
    try {
      res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: input, events: [...events, ...expandRecurring(recurring)] }),
      });
      data = await res.json();
    } catch {
      setLoading(false);
      setError("Network error — please try again");
      return;
    }

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    const updated = [...events, data.event!];
    setEvents(updated);
    saveEvents(updated);
    setLastReason(data.reason ?? null);
    setInput("");

    const calApi = calendarRef.current?.getApi();
    if (calApi) {
      calApi.gotoDate(data.event!.start);
      calApi.changeView("timeGridWeek");
    }

    setActiveTab("calendar");
  }

  function handleEventClick(info: { event: { id: string; title: string; startStr: string; endStr: string } }) {
    const confirmed = window.confirm(
      `"${info.event.title}"\n${info.event.startStr} → ${info.event.endStr}\n\nDelete this event?`
    );
    if (confirmed) {
      const updated = events.filter((e) => e.id !== info.event.id);
      setEvents(updated);
      saveEvents(updated);
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "recurring", label: "Recurring Events", icon: "↻" },
    { id: "onetime", label: "One-Time Event", icon: "✦" },
    { id: "calendar", label: "View Calendar", icon: "▦" },
  ];

  return (
    <div className="app-shell">
      {/* Background overlay */}
      <div className="bg-overlay" />

      <div className="app-content">
        {/* Header */}
        <header className="glass-card app-header">
          <div className="header-inner">
            <div className="header-brand">
              <span className="header-icon">◈</span>
              <div>
                <h1 className="header-title">AI Calendar</h1>
                <p className="header-sub">Intelligent scheduling, powered by Claude</p>
              </div>
            </div>
            <div className="header-badge">Claude AI</div>
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
            </button>
          ))}
        </nav>

        {/* Panel */}
        <main className="panel-area">
          {/* ── Recurring Events Tab ── */}
          {activeTab === "recurring" && (
            <div className="glass-card panel">
              <h2 className="panel-title">Weekly Recurring Events</h2>
              <p className="panel-desc">
                These events repeat every week and are shared with the AI when scheduling new events.
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
                            {DAY_NAMES[r.daysOfWeek[0]]} · {r.startTime} – {r.endTime}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteRecurring(r.id)}
                          className="btn-delete"
                          aria-label="Remove event"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recurring.length === 0 && (
                <div className="empty-state">
                  <span className="empty-icon">↻</span>
                  <p>No recurring events yet. Add one above.</p>
                </div>
              )}
            </div>
          )}

          {/* ── One-Time Event Tab ── */}
          {activeTab === "onetime" && (
            <div className="glass-card panel">
              <h2 className="panel-title">Schedule with AI</h2>
              <p className="panel-desc">
                Describe an event in plain language and Claude will find the best time for it based on your existing schedule.
              </p>

              <form onSubmit={handleSchedule} className="onetime-form">
                <div className="form-group">
                  <label className="form-label">Describe your event</label>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder='e.g. "1 hour gym session this week" or "dentist appointment Tuesday afternoon"'
                    className="glass-input"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="btn-primary"
                >
                  {loading ? (
                    <span className="btn-loading">
                      <span className="spinner" /> Scheduling…
                    </span>
                  ) : (
                    "Schedule with AI"
                  )}
                </button>
              </form>

              {lastReason && (
                <div className="status-msg status-msg--success">
                  <span className="status-icon">✓</span>
                  <span>{lastReason}</span>
                </div>
              )}
              {error && (
                <div className="status-msg status-msg--error">
                  <span className="status-icon">✗</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="tips-box">
                <h3 className="tips-title">Tips</h3>
                <ul className="tips-list">
                  <li>Mention day, duration, or time of day for best results</li>
                  <li>Claude avoids conflicts with your existing events</li>
                  <li>After scheduling, you&apos;ll be taken to the calendar</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Calendar Tab ── */}
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
