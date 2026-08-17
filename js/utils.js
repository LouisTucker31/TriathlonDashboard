window.App = window.App || {};

App.SPORTS = ["Swim", "Bike", "Run", "Strength", "Other"];

App.SPORT_COLORS = {
  Swim: "#1f5c73",
  Bike: "#a3542b",
  Run: "#3f6b3f",
  Strength: "#6b4a37",
  Other: "#7a6f5e",
};

App.SPORT_UNITS = {
  Swim: "m",
  Bike: "km",
  Run: "km",
  Strength: "",
  Other: "",
};

App.uid = function uid() {
  return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
};

App.todayISO = function todayISO() {
  return App.toISODate(new Date());
};

App.toISODate = function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

App.parseISODate = function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

App.addDays = function addDays(iso, days) {
  const d = App.parseISODate(iso);
  d.setDate(d.getDate() + days);
  return App.toISODate(d);
};

// Monday-start week. Returns ISO date of the Monday for the week containing `iso`.
App.startOfWeek = function startOfWeek(iso) {
  const d = App.parseISODate(iso);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return App.toISODate(d);
};

App.formatDateLong = function formatDateLong(iso) {
  const d = App.parseISODate(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
};

App.formatDateShort = function formatDateShort(iso) {
  const d = App.parseISODate(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

App.formatDuration = function formatDuration(mins) {
  if (mins == null) return "-";
  const totalSeconds = Math.round(mins * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// Formats minutes (may include fractional/seconds precision) as a clock
// string: "MM:SS" under an hour, "H:MM:SS" at or above an hour.
App.formatDurationClock = function formatDurationClock(mins) {
  if (mins == null) return "";
  const totalSeconds = Math.round(mins * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// Parses a clock string ("MM:SS" or "H:MM:SS") into minutes (may be
// fractional). Returns null for empty input, throws for invalid input.
App.parseDurationClock = function parseDurationClock(str) {
  const trimmed = String(str || "").trim();
  if (trimmed === "") return null;

  const parts = trimmed.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error('Duration must be in "MM:SS" or "H:MM:SS" format, e.g. 14:52 or 1:00:14.');
  }

  let h = 0, m = 0, s = 0;
  if (parts.length === 3) {
    [h, m, s] = parts.map(Number);
  } else {
    [m, s] = parts.map(Number);
  }
  if (s >= 60 || (parts.length === 3 && m >= 60)) {
    throw new Error('Duration must be in "MM:SS" or "H:MM:SS" format, e.g. 14:52 or 1:00:14.');
  }

  return h * 60 + m + s / 60;
};

App.clamp = function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
};
