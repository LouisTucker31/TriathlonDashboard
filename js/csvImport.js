window.App = window.App || {};

(function () {
  const REQUIRED_COLUMNS = ["Date", "Sport", "Title", "Duration", "Distance", "Description"];

  function parseCSVText(text) {
    // Simple RFC4180-ish parser: handles quoted fields with embedded commas/newlines.
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ",") {
          row.push(field);
          field = "";
        } else if (c === "\n" || c === "\r") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
        } else {
          field += c;
        }
      }
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  App.parseCSV = function parseCSV(text) {
    const rows = parseCSVText(text);
    if (rows.length === 0) {
      return { sessions: [], errors: ["File is empty."], importedCount: 0, skippedCount: 0 };
    }

    const header = rows[0].map((h) => h.trim());
    const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
    if (missing.length > 0) {
      return {
        sessions: [],
        errors: [`Missing required column(s): ${missing.join(", ")}. Expected header: ${REQUIRED_COLUMNS.join(",")}`],
        importedCount: 0,
        skippedCount: 0,
      };
    }

    const colIdx = {};
    header.forEach((h, i) => (colIdx[h] = i));

    const sessions = [];
    const errors = [];

    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const lineNum = r + 1;
      const get = (col) => (cells[colIdx[col]] || "").trim();

      const date = get("Date");
      const sport = get("Sport");
      const title = get("Title");
      const durationRaw = get("Duration");
      const distanceRaw = get("Distance");
      const description = get("Description");

      if (!DATE_RE.test(date)) {
        errors.push(`Line ${lineNum}: invalid date "${date}" (expected YYYY-MM-DD), skipped.`);
        continue;
      }
      const normalizedSport = App.SPORTS.find((s) => s.toLowerCase() === sport.toLowerCase());
      if (!normalizedSport) {
        errors.push(`Line ${lineNum}: unknown sport "${sport}" (expected one of ${App.SPORTS.join(", ")}), skipped.`);
        continue;
      }
      if (!title) {
        errors.push(`Line ${lineNum}: missing title, skipped.`);
        continue;
      }

      const duration = durationRaw === "" ? null : Number(durationRaw);
      if (duration !== null && Number.isNaN(duration)) {
        errors.push(`Line ${lineNum}: invalid duration "${durationRaw}", skipped.`);
        continue;
      }
      const distance = distanceRaw === "" ? null : Number(distanceRaw);
      if (distance !== null && Number.isNaN(distance)) {
        errors.push(`Line ${lineNum}: invalid distance "${distanceRaw}", skipped.`);
        continue;
      }

      sessions.push({
        id: App.uid(),
        date,
        sport: normalizedSport,
        title,
        plannedDuration: duration,
        plannedDistance: distance,
        description,
        actual: null,
        status: "planned",
        createdManually: false,
        order: r,
      });
    }

    return { sessions, errors, importedCount: sessions.length, skippedCount: errors.length };
  };
})();
