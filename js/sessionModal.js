window.App = window.App || {};

(function () {
  let overlay, modal;
  let onChanged = null;

  App.initSessionModal = function initSessionModal({ onChangedCb }) {
    onChanged = onChangedCb;
    overlay = document.getElementById("modal-overlay");
    modal = document.getElementById("modal");

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
    });
  };

  function closeModal() {
    overlay.classList.remove("open");
    modal.innerHTML = "";
  }

  function openModal(contentEl) {
    modal.innerHTML = "";
    modal.appendChild(contentEl);
    overlay.classList.add("open");
  }

  App.openViewSession = function openViewSession(id) {
    const s = App.getSessionById(id);
    if (!s) return;
    const unit = App.SPORT_UNITS[s.sport];

    const el = document.createElement("div");
    el.className = "modal-content";
    el.innerHTML = `
      <div class="modal-header">
        <span class="sport-badge" style="color:${App.SPORT_COLORS[s.sport]}">${s.sport}</span>
        <h2>${escapeHtml(s.title)}</h2>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <p class="modal-date">${App.formatDateLong(s.date)}</p>
        ${s.status === "missed" ? `<p class="modal-missed-tag">Missed</p>` : ""}
        <div class="modal-planned">
          <strong>Planned:</strong>
          ${s.plannedDuration ? App.formatDuration(s.plannedDuration) : "-"}
          ${s.plannedDistance ? ` · ${s.plannedDistance}${unit}` : ""}
        </div>
        ${s.description ? `<p class="modal-desc">${escapeHtml(s.description)}</p>` : ""}
        ${
          s.actual
            ? `<div class="modal-actual">
                <strong>Actual:</strong>
                ${s.actual.duration ? App.formatDuration(s.actual.duration) : "-"}
                ${s.actual.distance ? ` · ${s.actual.distance}${unit}` : ""}
                ${s.actual.rpe ? ` · RPE ${s.actual.rpe}/10` : ""}
                ${s.actual.notes ? `<p class="modal-notes">${escapeHtml(s.actual.notes)}</p>` : ""}
              </div>`
            : ""
        }
      </div>
      <div class="modal-footer">
        <button class="btn btn-danger" data-action="delete">Delete</button>
        <button class="btn btn-ghost" data-action="edit">Edit</button>
        ${
          s.status === "missed"
            ? `<button class="btn btn-ghost" data-action="unmiss">Unmark missed</button>`
            : `<button class="btn btn-ghost" data-action="miss">Mark missed</button>`
        }
        <button class="btn btn-primary" data-action="log">${s.actual ? "Edit log" : "Log actual"}</button>
      </div>
    `;

    el.querySelector(".modal-close").addEventListener("click", closeModal);
    el.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      const confirmed = await App.confirmModal("Delete this session? This cannot be undone.", {
        title: "Delete Session",
        confirmLabel: "Delete",
        danger: true,
      });
      if (confirmed) {
        App.deleteSession(id);
        closeModal();
        onChanged && onChanged();
      }
    });
    el.querySelector('[data-action="edit"]').addEventListener("click", () => App.openEditSession(id));
    el.querySelector('[data-action="log"]').addEventListener("click", () => App.openLogActual(id));
    const missBtn = el.querySelector('[data-action="miss"]');
    if (missBtn) {
      missBtn.addEventListener("click", () => {
        App.markMissed(id);
        closeModal();
        onChanged && onChanged();
      });
    }
    const unmissBtn = el.querySelector('[data-action="unmiss"]');
    if (unmissBtn) {
      unmissBtn.addEventListener("click", () => {
        App.unmarkMissed(id);
        closeModal();
        onChanged && onChanged();
      });
    }

    openModal(el);
  };

  App.openEditSession = function openEditSession(id) {
    const s = App.getSessionById(id);
    buildForm({ mode: "edit", session: s });
  };

  App.openCreateSession = function openCreateSession(date) {
    buildForm({ mode: "create", session: { date: date || App.todayISO() } });
  };

  function buildForm({ mode, session }) {
    const el = document.createElement("div");
    el.className = "modal-content";

    const sportOptions = App.SPORTS.map(
      (sp) => `<option value="${sp}" ${session.sport === sp ? "selected" : ""}>${sp}</option>`
    ).join("");

    el.innerHTML = `
      <div class="modal-header">
        <h2>${mode === "create" ? "Add Workout" : "Edit Workout"}</h2>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <form id="session-form" class="form">
          <label>Date
            <input type="date" name="date" value="${session.date || App.todayISO()}" required />
          </label>
          <label>Sport
            <select name="sport" required>${sportOptions}</select>
          </label>
          <label>Title
            <input type="text" name="title" value="${escapeAttr(session.title || "")}" required />
          </label>
          <div class="form-row">
            <label>Duration
              <input type="text" name="plannedDuration" placeholder="MM:SS or H:MM:SS" value="${session.plannedDuration != null ? App.formatDurationClock(session.plannedDuration) : ""}" />
            </label>
            <label>Distance
              <input type="number" step="0.01" min="0" name="plannedDistance" value="${session.plannedDistance ?? ""}" />
            </label>
          </div>
          <label>Description
            <textarea name="description" rows="4">${escapeHtml(session.description || "")}</textarea>
          </label>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-action="cancel">Cancel</button>
        <button class="btn btn-primary" data-action="save">Save</button>
      </div>
    `;

    el.querySelector(".modal-close").addEventListener("click", closeModal);
    el.querySelector('[data-action="cancel"]').addEventListener("click", closeModal);
    el.querySelector('[data-action="save"]').addEventListener("click", async () => {
      const form = el.querySelector("#session-form");
      if (!form.reportValidity()) return;
      const fd = new FormData(form);

      let plannedDuration;
      try {
        plannedDuration = App.parseDurationClock(fd.get("plannedDuration"));
      } catch (err) {
        await App.alertModal(err.message, { title: "Invalid Duration" });
        return;
      }

      const payload = {
        date: fd.get("date"),
        sport: fd.get("sport"),
        title: fd.get("title"),
        plannedDuration,
        plannedDistance: fd.get("plannedDistance") ? Number(fd.get("plannedDistance")) : null,
        description: fd.get("description"),
      };
      if (mode === "create") {
        App.addSession(payload);
      } else {
        App.updateSession(session.id, payload);
      }
      closeModal();
      onChanged && onChanged();
    });

    openModal(el);
  }

  App.openLogActual = function openLogActual(id) {
    const s = App.getSessionById(id);
    if (!s) return;
    const actual = s.actual || { duration: "", distance: "", rpe: "", notes: "" };

    const el = document.createElement("div");
    el.className = "modal-content";
    el.innerHTML = `
      <div class="modal-header">
        <h2>Log Actual: ${escapeHtml(s.title)}</h2>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <form id="log-form" class="form">
          <div class="form-row">
            <label>Duration
              <input type="text" name="duration" placeholder="MM:SS or H:MM:SS" value="${actual.duration != null ? App.formatDurationClock(actual.duration) : ""}" />
            </label>
            <label>Distance
              <input type="number" step="0.01" min="0" name="distance" value="${actual.distance ?? ""}" />
            </label>
          </div>
          <label>RPE (1 to 10)
            <input type="range" name="rpe" min="1" max="10" value="${actual.rpe || 5}" id="rpe-slider" />
            <output id="rpe-output">${actual.rpe || 5}</output>
          </label>
          <label>Notes
            <textarea name="notes" rows="4">${escapeHtml(actual.notes || "")}</textarea>
          </label>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-action="cancel">Cancel</button>
        <button class="btn btn-primary" data-action="save">Save Log</button>
      </div>
    `;

    const slider = el.querySelector("#rpe-slider");
    const output = el.querySelector("#rpe-output");
    slider.addEventListener("input", () => (output.textContent = slider.value));

    el.querySelector(".modal-close").addEventListener("click", closeModal);
    el.querySelector('[data-action="cancel"]').addEventListener("click", closeModal);
    el.querySelector('[data-action="save"]').addEventListener("click", async () => {
      const form = el.querySelector("#log-form");
      const fd = new FormData(form);

      let duration;
      try {
        duration = App.parseDurationClock(fd.get("duration"));
      } catch (err) {
        await App.alertModal(err.message, { title: "Invalid Duration" });
        return;
      }

      App.logActual(id, {
        duration,
        distance: fd.get("distance") ? Number(fd.get("distance")) : null,
        rpe: fd.get("rpe") ? Number(fd.get("rpe")) : null,
        notes: fd.get("notes"),
      });
      closeModal();
      onChanged && onChanged();
    });

    openModal(el);
  };

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }
})();
