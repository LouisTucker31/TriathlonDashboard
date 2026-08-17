window.App = window.App || {};

(function () {
  let sessions = App.loadSessions();
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn());
  }

  App.subscribe = function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  function persist() {
    App.saveSessions(sessions);
    notify();
  }

  App.getSessions = function getSessions() {
    return sessions;
  };

  App.getSessionById = function getSessionById(id) {
    return sessions.find((s) => s.id === id) || null;
  };

  App.getSessionsForDate = function getSessionsForDate(iso) {
    return sessions
      .filter((s) => s.date === iso)
      .sort((a, b) => {
        const aOrder = a.order ?? 0;
        const bOrder = b.order ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.title.localeCompare(b.title);
      });
  };

  // Reorders `id` to sit immediately before `beforeId` within the same day
  // (pass beforeId = null to move it to the end of that day's list).
  App.reorderSession = function reorderSession(id, beforeId) {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;

    const dayIds = App.getSessionsForDate(session.date)
      .map((s) => s.id)
      .filter((sid) => sid !== id);

    const insertAt = beforeId ? dayIds.indexOf(beforeId) : -1;
    if (insertAt === -1) {
      dayIds.push(id);
    } else {
      dayIds.splice(insertAt, 0, id);
    }

    dayIds.forEach((sid, i) => {
      const idx = sessions.findIndex((s) => s.id === sid);
      if (idx !== -1) sessions[idx] = { ...sessions[idx], order: i };
    });

    persist();
  };

  App.getSessionsForWeek = function getSessionsForWeek(mondayISO) {
    const end = App.addDays(mondayISO, 6);
    return sessions.filter((s) => s.date >= mondayISO && s.date <= end);
  };

  App.addSession = function addSession(session) {
    const newSession = {
      id: App.uid(),
      date: session.date,
      sport: session.sport || "Other",
      title: session.title || "Workout",
      plannedDuration: session.plannedDuration ?? null,
      plannedDistance: session.plannedDistance ?? null,
      description: session.description || "",
      actual: session.actual || null,
      status: session.status || "planned",
      createdManually: session.createdManually ?? true,
      order: session.order ?? Date.now(),
    };
    sessions.push(newSession);
    persist();
    return newSession;
  };

  App.updateSession = function updateSession(id, updates) {
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    sessions[idx] = { ...sessions[idx], ...updates };
    persist();
    return sessions[idx];
  };

  App.logActual = function logActual(id, actual) {
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    sessions[idx] = {
      ...sessions[idx],
      actual: {
        duration: actual.duration ?? null,
        distance: actual.distance ?? null,
        rpe: actual.rpe ?? null,
        notes: actual.notes || "",
        completedAt: new Date().toISOString(),
      },
      status: "completed",
    };
    persist();
    return sessions[idx];
  };

  App.markMissed = function markMissed(id) {
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    sessions[idx] = { ...sessions[idx], status: "missed", actual: null };
    persist();
    return sessions[idx];
  };

  App.unmarkMissed = function unmarkMissed(id) {
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    sessions[idx] = { ...sessions[idx], status: "planned" };
    persist();
    return sessions[idx];
  };

  App.deleteSession = function deleteSession(id) {
    sessions = sessions.filter((s) => s.id !== id);
    persist();
  };

  App.replaceAllSessions = function replaceAllSessions(newSessions) {
    sessions = newSessions;
    persist();
  };

  App.appendSessions = function appendSessions(newSessions) {
    sessions = sessions.concat(newSessions);
    persist();
  };

  App.getWeeklyVolume = function getWeeklyVolume(mondayISO) {
    const weekSessions = App.getSessionsForWeek(mondayISO);
    const bySport = {};
    let plannedTotal = 0;
    let actualTotal = 0;
    for (const s of weekSessions) {
      const planned = s.plannedDuration || 0;
      const actual = s.actual?.duration || 0;
      plannedTotal += planned;
      actualTotal += actual;
      if (!bySport[s.sport]) bySport[s.sport] = { planned: 0, actual: 0 };
      bySport[s.sport].planned += planned;
      bySport[s.sport].actual += actual;
    }
    return { plannedTotal, actualTotal, bySport, sessionCount: weekSessions.length };
  };

  App.getMeta = App.loadMeta;
  App.setMeta = App.saveMeta;
})();
