window.App = window.App || {};

(function () {
  let anchorDate = App.todayISO(); // any date within the visible week
  let onDayClick = null;
  let onSessionClick = null;

  let onWeekChange = null;

  App.initCalendar = function initCalendar({ onDayClickCb, onSessionClickCb, onWeekChangeCb }) {
    onDayClick = onDayClickCb;
    onSessionClick = onSessionClickCb;
    onWeekChange = onWeekChangeCb;

    document.getElementById("cal-prev").addEventListener("click", () => navigate(-1));
    document.getElementById("cal-next").addEventListener("click", () => navigate(1));
    document.getElementById("cal-today").addEventListener("click", () => {
      anchorDate = App.todayISO();
      App.renderCalendar();
      onWeekChange && onWeekChange(App.getVisibleWeekStart());
    });

    App.renderCalendar();
  };

  App.getVisibleWeekStart = function getVisibleWeekStart() {
    return App.startOfWeek(anchorDate);
  };

  function navigate(delta) {
    anchorDate = App.addDays(anchorDate, delta * 7);
    App.renderCalendar();
    onWeekChange && onWeekChange(App.getVisibleWeekStart());
  }

  App.renderCalendar = function renderCalendar() {
    const label = document.getElementById("cal-label");
    const grid = document.getElementById("cal-grid");
    grid.innerHTML = "";
    grid.className = "cal-grid week";

    const monday = App.startOfWeek(anchorDate);
    const sunday = App.addDays(monday, 6);
    label.textContent = `${App.formatDateShort(monday)} to ${App.formatDateShort(sunday)}`;

    dayHeaderRow().forEach((el) => grid.appendChild(el));

    const today = App.todayISO();
    for (let i = 0; i < 7; i++) {
      const iso = App.addDays(monday, i);
      const d = App.parseISODate(iso);
      grid.appendChild(buildDayCell(iso, d.getDate(), { isToday: iso === today }));
    }
  };

  function dayHeaderRow() {
    const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return names.map((n) => {
      const el = document.createElement("div");
      el.className = "cal-day-header";
      el.textContent = n;
      return el;
    });
  }

  function buildDayCell(iso, dayNum, { isToday = false } = {}) {
    const cell = document.createElement("div");
    cell.className = "cal-cell" + (isToday ? " today" : "");
    cell.dataset.date = iso;

    const num = document.createElement("div");
    num.className = "cal-cell-num";
    num.textContent = dayNum;
    cell.appendChild(num);

    const sessions = App.getSessionsForDate(iso);
    const list = document.createElement("div");
    list.className = "cal-cell-sessions";

    sessions.forEach((s) => {
      const item = document.createElement("div");
      item.className = "cal-session-chip";
      item.style.setProperty("--sport-color", App.SPORT_COLORS[s.sport]);
      item.textContent = `${s.title}${s.plannedDuration ? " · " + App.formatDuration(s.plannedDuration) : ""}${s.status === "missed" ? " (missed)" : ""}`;
      if (s.status === "completed") item.classList.add("completed");
      if (s.status === "missed") item.classList.add("missed");
      item.draggable = true;
      item.dataset.sessionId = s.id;
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute(
        "aria-label",
        `${s.title}, ${s.sport}, ${App.formatDateLong(iso)}. Press Enter to open, or use Ctrl+Arrow keys to move or reorder.`
      );
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        onSessionClick && onSessionClick(s.id);
      });
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onSessionClick && onSessionClick(s.id);
          return;
        }
        if (!e.ctrlKey && !e.metaKey) return;
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
        e.preventDefault();
        e.stopPropagation();

        if (e.key === "ArrowLeft") {
          App.updateSession(s.id, { date: App.addDays(iso, -1) });
          focusSessionAfterRender(s.id);
        } else if (e.key === "ArrowRight") {
          App.updateSession(s.id, { date: App.addDays(iso, 1) });
          focusSessionAfterRender(s.id);
        } else if (e.key === "ArrowUp") {
          const idx = sessions.findIndex((sess) => sess.id === s.id);
          if (idx > 0) {
            App.reorderSession(s.id, sessions[idx - 1].id);
            focusSessionAfterRender(s.id);
          }
        } else if (e.key === "ArrowDown") {
          const idx = sessions.findIndex((sess) => sess.id === s.id);
          if (idx !== -1 && idx < sessions.length - 1) {
            App.reorderSession(s.id, nextSiblingId(sessions[idx + 1].id, sessions));
            focusSessionAfterRender(s.id);
          }
        }
      });
      item.addEventListener("dragstart", (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", s.id);
        item.classList.add("dragging");
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
      });
      item.addEventListener("dragover", (e) => {
        const draggedId = getDraggedIdHint();
        if (draggedId === s.id) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        const rect = item.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        item.classList.toggle("drop-before", before);
        item.classList.toggle("drop-after", !before);
      });
      item.addEventListener("dragleave", () => {
        item.classList.remove("drop-before", "drop-after");
      });
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        item.classList.remove("drop-before", "drop-after");
        cell.classList.remove("drop-target");
        const sessionId = e.dataTransfer.getData("text/plain");
        if (!sessionId || sessionId === s.id) return;
        const session = App.getSessionById(sessionId);
        if (!session) return;

        const rect = item.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;

        if (session.date !== iso) {
          App.updateSession(sessionId, { date: iso });
        }
        App.reorderSession(sessionId, before ? s.id : nextSiblingId(s.id, sessions));
      });
      list.appendChild(item);
    });

    cell.appendChild(list);
    cell.addEventListener("click", () => onDayClick && onDayClick(iso));

    cell.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      cell.classList.add("drop-target");
    });
    cell.addEventListener("dragleave", () => {
      cell.classList.remove("drop-target");
    });
    cell.addEventListener("drop", (e) => {
      e.preventDefault();
      cell.classList.remove("drop-target");
      const sessionId = e.dataTransfer.getData("text/plain");
      if (!sessionId) return;
      const session = App.getSessionById(sessionId);
      if (!session) return;
      if (session.date !== iso) {
        App.updateSession(sessionId, { date: iso });
      }
      // Dropped on empty cell space (not on a specific chip): send it to
      // the end of that day's list.
      App.reorderSession(sessionId, null);
    });

    return cell;
  }

  function nextSiblingId(sessionId, daySessions) {
    const idx = daySessions.findIndex((s) => s.id === sessionId);
    if (idx === -1 || idx === daySessions.length - 1) return null;
    return daySessions[idx + 1].id;
  }

  function getDraggedIdHint() {
    const dragging = document.querySelector(".cal-session-chip.dragging");
    return dragging ? dragging.dataset.sessionId : null;
  }

  function focusSessionAfterRender(sessionId) {
    // Store mutations notify subscribers synchronously (re-rendering the
    // whole calendar), so the originating chip is detached by the time this
    // runs; requestAnimationFrame lets the rebuilt DOM settle first.
    requestAnimationFrame(() => {
      const el = document.querySelector(`.cal-session-chip[data-session-id="${sessionId}"]`);
      if (el) el.focus();
    });
  }
})();
