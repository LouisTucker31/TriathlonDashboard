window.App = window.App || {};

(function () {
  let onSessionClick = null;
  let onLogClick = null;
  let onAddForToday = null;

  App.initDashboard = function initDashboard({ onSessionClickCb, onLogClickCb, onAddForTodayCb }) {
    onSessionClick = onSessionClickCb;
    onLogClick = onLogClickCb;
    onAddForToday = onAddForTodayCb;
  };

  App.renderDashboard = function renderDashboard() {
    renderToday();
    renderWeeklyVolume();
  };

  function renderToday() {
    const today = App.todayISO();
    const container = document.getElementById("today-card-body");
    container.innerHTML = "";
    document.getElementById("today-date").textContent = App.formatDateLong(today);

    const sessions = App.getSessionsForDate(today);

    if (sessions.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `<p>Rest day. Nothing planned.</p>`;
      const addBtn = document.createElement("button");
      addBtn.className = "btn btn-secondary";
      addBtn.textContent = "+ Add workout for today";
      addBtn.addEventListener("click", () => onAddForToday && onAddForToday(today));
      empty.appendChild(addBtn);
      container.appendChild(empty);
      return;
    }

    sessions.forEach((s) => {
      const card = document.createElement("div");
      card.className =
        "today-session" +
        (s.status === "completed" ? " completed" : "") +
        (s.status === "missed" ? " missed" : "");
      card.style.setProperty("--sport-color", App.SPORT_COLORS[s.sport]);

      const unit = App.SPORT_UNITS[s.sport];
      const planned = [
        s.plannedDuration ? App.formatDuration(s.plannedDuration) : null,
        s.plannedDistance ? `${s.plannedDistance}${unit}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      card.innerHTML = `
        <div class="today-session-head">
          <span class="sport-badge" style="color:${App.SPORT_COLORS[s.sport]}">${s.sport}</span>
          <span class="today-session-title">${escapeHtml(s.title)}</span>
        </div>
        <div class="today-session-meta">${planned || "No target set"}</div>
        ${s.description ? `<div class="today-session-desc">${escapeHtml(s.description)}</div>` : ""}
        ${s.status === "completed" ? `<div class="today-session-status">Logged: ${s.actual.duration ? App.formatDuration(s.actual.duration) : ""}${s.actual.rpe ? ` · RPE ${s.actual.rpe}` : ""}</div>` : ""}
        ${s.status === "missed" ? `<div class="today-session-status missed-status">Missed</div>` : ""}
      `;

      const actions = document.createElement("div");
      actions.className = "today-session-actions";

      const viewBtn = document.createElement("button");
      viewBtn.className = "btn btn-ghost";
      viewBtn.textContent = "View details";
      viewBtn.addEventListener("click", () => onSessionClick && onSessionClick(s.id));
      actions.appendChild(viewBtn);

      if (s.status !== "missed") {
        const logBtn = document.createElement("button");
        logBtn.className = "btn btn-primary";
        logBtn.textContent = s.status === "completed" ? "Edit log" : "Log actual";
        logBtn.addEventListener("click", () => onLogClick && onLogClick(s.id));
        actions.appendChild(logBtn);
      }

      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  function renderWeeklyVolume() {
    const monday = App.getVisibleWeekStart ? App.getVisibleWeekStart() : App.startOfWeek(App.todayISO());
    const { plannedTotal, actualTotal, bySport } = App.getWeeklyVolume(monday);

    const subtitle = document.getElementById("volume-week-label");
    if (subtitle) {
      const sunday = App.addDays(monday, 6);
      const isCurrentWeek = monday === App.startOfWeek(App.todayISO());
      subtitle.textContent = isCurrentWeek
        ? "This week"
        : `${App.formatDateShort(monday)} to ${App.formatDateShort(sunday)}`;
    }

    document.getElementById("volume-planned-total").textContent = App.formatDuration(plannedTotal);
    document.getElementById("volume-actual-total").textContent = App.formatDuration(actualTotal);

    const bars = document.getElementById("volume-bars");
    bars.innerHTML = "";

    const sports = App.SPORTS.filter((sp) => bySport[sp]);
    if (sports.length === 0) {
      bars.innerHTML = `<p class="empty-state-inline">No sessions this week.</p>`;
      return;
    }

    const maxVal = Math.max(...sports.map((sp) => Math.max(bySport[sp].planned, bySport[sp].actual)), 1);

    sports.forEach((sport) => {
      const { planned, actual } = bySport[sport];
      const row = document.createElement("div");
      row.className = "volume-row";
      row.innerHTML = `
        <div class="volume-label" style="color:${App.SPORT_COLORS[sport]}">${sport}</div>
        <div class="volume-bar-line">
          <span class="volume-bar-tag">Planned</span>
          <div class="volume-track">
            <div class="volume-bar planned" style="width:${(planned / maxVal) * 100}%; background:${App.SPORT_COLORS[sport]}"></div>
          </div>
          <span class="volume-bar-value">${App.formatDuration(planned)}</span>
        </div>
        <div class="volume-bar-line">
          <span class="volume-bar-tag">Actual</span>
          <div class="volume-track">
            <div class="volume-bar actual" style="width:${(actual / maxVal) * 100}%; background:${App.SPORT_COLORS[sport]}"></div>
          </div>
          <span class="volume-bar-value">${App.formatDuration(actual)}</span>
        </div>
      `;
      bars.appendChild(row);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
