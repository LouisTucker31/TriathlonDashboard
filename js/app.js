window.App = window.App || {};

(function () {
  function renderAll() {
    App.renderDashboard();
    App.renderCalendar();
  }

  function showDaySessions(iso) {
    const sessions = App.getSessionsForDate(iso);
    if (sessions.length === 0) {
      App.openCreateSession(iso);
      return;
    }
    if (sessions.length === 1) {
      App.openViewSession(sessions[0].id);
      return;
    }
    showDayPopover(iso, sessions);
  }

  function showDayPopover(iso, sessions) {
    const overlay = document.getElementById("modal-overlay");
    const modal = document.getElementById("modal");
    const el = document.createElement("div");
    el.className = "modal-content";
    el.innerHTML = `
      <div class="modal-header">
        <h2>${App.formatDateLong(iso)}</h2>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="day-session-list"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" data-action="add">+ Add workout</button>
      </div>
    `;
    const list = el.querySelector(".day-session-list");
    sessions.forEach((s) => {
      const item = document.createElement("div");
      item.className = "day-session-item";
      item.style.setProperty("--sport-color", App.SPORT_COLORS[s.sport]);
      item.innerHTML = `<span class="sport-badge" style="color:${App.SPORT_COLORS[s.sport]}">${s.sport}</span>
        <span>${s.title}</span>
        <span class="day-session-item-meta">${s.plannedDuration ? App.formatDuration(s.plannedDuration) : ""}</span>`;
      item.addEventListener("click", () => App.openViewSession(s.id));
      list.appendChild(item);
    });

    function close() {
      document.removeEventListener("keydown", onKeydown);
      overlay.classList.remove("open");
      modal.innerHTML = "";
    }
    function onKeydown(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeydown);

    el.querySelector(".modal-close").addEventListener("click", close);
    el.querySelector('[data-action="add"]').addEventListener("click", () => App.openCreateSession(iso));

    modal.innerHTML = "";
    modal.appendChild(el);
    overlay.classList.add("open");
  }

  function showImportChoiceModal({ importedCount, skippedCount }) {
    return new Promise((resolve) => {
      const overlay = document.getElementById("modal-overlay");
      const modal = document.getElementById("modal");
      const el = document.createElement("div");
      el.className = "modal-content";
      el.innerHTML = `
        <div class="modal-header">
          <h2>Import CSV</h2>
          <button class="modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Parsed <strong>${importedCount}</strong> session(s)${skippedCount ? `, <strong>${skippedCount}</strong> skipped` : ""}.</p>
          <p>How would you like to import these?</p>
        </div>
        <div class="modal-footer import-choice-footer">
          <button class="btn btn-ghost" data-choice="cancel">Cancel</button>
          <button class="btn btn-secondary" data-choice="add">Add to existing plan</button>
          <button class="btn btn-danger" data-choice="replace">Replace entire plan</button>
        </div>
      `;

      function finish(choice) {
        document.removeEventListener("keydown", onKeydown);
        overlay.classList.remove("open");
        modal.innerHTML = "";
        resolve(choice);
      }
      function onKeydown(e) {
        if (e.key === "Escape") finish("cancel");
      }
      document.addEventListener("keydown", onKeydown);

      el.querySelector(".modal-close").addEventListener("click", () => finish("cancel"));
      el.querySelectorAll("[data-choice]").forEach((btn) => {
        btn.addEventListener("click", () => finish(btn.dataset.choice));
      });

      modal.innerHTML = "";
      modal.appendChild(el);
      overlay.classList.add("open");
    });
  }

  function initHeaderControls() {
    document.getElementById("add-workout-btn").addEventListener("click", () => App.openCreateSession());

    document.getElementById("csv-import-input").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = App.parseCSV(reader.result);
        handleImportResult(result);
        e.target.value = "";
      };
      reader.readAsText(file);
    });

    document.getElementById("export-backup-btn").addEventListener("click", () => App.exportBackup());

    document.getElementById("import-backup-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await App.importBackupFile(file);
        renderAll();
        await App.alertModal("Backup restored.", { title: "Backup Restored" });
      } catch (err) {
        await App.alertModal("Failed to import backup: " + err.message, { title: "Import Failed" });
      } finally {
        e.target.value = "";
      }
    });

    document.getElementById("clear-data-btn").addEventListener("click", async () => {
      const confirmed = await App.confirmModal(
        "This will permanently delete all your training plan data and logged actuals from this browser. This cannot be undone.\n\nConsider exporting a backup first. Continue?",
        { title: "Clear All Data", confirmLabel: "Clear Data", danger: true }
      );
      if (!confirmed) return;
      App.clearAllData();
      App.replaceAllSessions([]);
      renderAll();
      await App.alertModal("All local data cleared.", { title: "Data Cleared" });
    });
  }

  async function handleImportResult(result) {
    if (result.importedCount === 0 && result.errors.length > 0) {
      await App.alertModal(result.errors.join("\n"), { title: "Import Failed" });
      return;
    }

    const choice = await showImportChoiceModal({
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
    });

    if (choice === "cancel") return;

    if (choice === "replace") {
      App.replaceAllSessions(result.sessions);
    } else {
      App.appendSessions(result.sessions);
    }

    renderAll();

    if (result.errors.length > 0) {
      console.warn("CSV import issues:", result.errors);
      await App.alertModal(
        `Import complete with ${result.errors.length} skipped row(s). See browser console for details.`,
        { title: "Import Complete" }
      );
    }
  }

  function init() {
    initHeaderControls();

    App.initDashboard({
      onSessionClickCb: (id) => App.openViewSession(id),
      onLogClickCb: (id) => App.openLogActual(id),
      onAddForTodayCb: (iso) => App.openCreateSession(iso),
    });

    App.initCalendar({
      onDayClickCb: (iso) => showDaySessions(iso),
      onSessionClickCb: (id) => App.openViewSession(id),
      onWeekChangeCb: () => App.renderDashboard(),
    });

    App.initSessionModal({
      onChangedCb: () => renderAll(),
    });

    App.subscribe(() => renderAll());

    renderAll();

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.error("Service worker registration failed", err);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
