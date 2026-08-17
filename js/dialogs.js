window.App = window.App || {};

(function () {
  let overlay, dialog;

  function ensureInit() {
    if (overlay) return;
    overlay = document.getElementById("dialog-overlay");
    dialog = document.getElementById("dialog");
  }

  function close() {
    overlay.classList.remove("open");
    dialog.innerHTML = "";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // message may contain literal newlines; render as separate paragraphs.
  function renderMessage(message) {
    return String(message)
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("");
  }

  function withEscapeToClose(finish, resolveOnEscape) {
    function onKeydown(e) {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", onKeydown);
        finish(resolveOnEscape);
      }
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }

  App.alertModal = function alertModal(message, { title = "Notice", okLabel = "OK" } = {}) {
    ensureInit();
    return new Promise((resolve) => {
      const el = document.createElement("div");
      el.className = "modal-content";
      el.innerHTML = `
        <div class="modal-header">
          <h2>${escapeHtml(title)}</h2>
          <button class="modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">${renderMessage(message)}</div>
        <div class="modal-footer">
          <button class="btn btn-primary" data-action="ok">${escapeHtml(okLabel)}</button>
        </div>
      `;

      let removeEscapeListener;
      function finish() {
        removeEscapeListener();
        close();
        resolve();
      }
      removeEscapeListener = withEscapeToClose(finish);

      el.querySelector(".modal-close").addEventListener("click", finish);
      el.querySelector('[data-action="ok"]').addEventListener("click", finish);

      dialog.innerHTML = "";
      dialog.appendChild(el);
      overlay.classList.add("open");
    });
  };

  App.confirmModal = function confirmModal(
    message,
    { title = "Please confirm", confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false } = {}
  ) {
    ensureInit();
    return new Promise((resolve) => {
      const el = document.createElement("div");
      el.className = "modal-content";
      el.innerHTML = `
        <div class="modal-header">
          <h2>${escapeHtml(title)}</h2>
          <button class="modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">${renderMessage(message)}</div>
        <div class="modal-footer">
          <button class="btn btn-ghost" data-action="cancel">${escapeHtml(cancelLabel)}</button>
          <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-action="confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      `;

      let removeEscapeListener;
      function finish(result) {
        removeEscapeListener();
        close();
        resolve(result);
      }
      removeEscapeListener = withEscapeToClose(finish, false);

      el.querySelector(".modal-close").addEventListener("click", () => finish(false));
      el.querySelector('[data-action="cancel"]').addEventListener("click", () => finish(false));
      el.querySelector('[data-action="confirm"]').addEventListener("click", () => finish(true));

      dialog.innerHTML = "";
      dialog.appendChild(el);
      overlay.classList.add("open");
    });
  };
})();
