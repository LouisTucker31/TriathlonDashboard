window.App = window.App || {};

(function () {
  const SESSIONS_KEY = "triathlon.sessions";
  const META_KEY = "triathlon.meta";

  App.loadSessions = function loadSessions() {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("Stored sessions data is not an array");
      return parsed;
    } catch (e) {
      console.error("Failed to load sessions", e);
      setTimeout(() => {
        if (App.alertModal) {
          App.alertModal(
            "Your saved training plan could not be read (it may be corrupted). Starting with an empty plan. Your old data is still in browser storage but was not loaded.",
            { title: "Could Not Load Data" }
          );
        }
      }, 0);
      return [];
    }
  };

  App.saveSessions = function saveSessions(sessions) {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to save sessions", e);
      if (App.alertModal) {
        App.alertModal(
          "Your changes could not be saved to this browser's storage. It may be full or unavailable (e.g. private browsing). Export a backup and free up space if possible.",
          { title: "Save Failed" }
        );
      }
    }
  };

  App.loadMeta = function loadMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  };

  App.saveMeta = function saveMeta(meta) {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  };

  App.clearAllData = function clearAllData() {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(META_KEY);
  };

  App.exportBackup = function exportBackup() {
    const data = {
      sessions: App.loadSessions(),
      meta: App.loadMeta(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `triathlon-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  App.importBackupFile = function importBackupFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data.sessions)) throw new Error("Invalid backup file: missing sessions array");
          App.saveSessions(data.sessions);
          if (data.meta) App.saveMeta(data.meta);
          resolve(data.sessions);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };
})();
