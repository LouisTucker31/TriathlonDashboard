document.addEventListener('DOMContentLoaded', function () {

  // ============================================================
  // Real per-theme exercise data, taken from the live screenshots.
  // Add/edit a theme here and the tile grid, filters, and pagination
  // all update themselves automatically — nothing else to touch.
  // ============================================================
  var exerciseData = {

    'Phishing & Social Engineering': [
      { name: 'Clickbait Crisis', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation Hook, Line & Sinker', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation Open Door', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation Silver Tongue', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Phantom Inbox', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Phantom Inbox - Copy', active: 0, author: 'QA', org: 'Excyte' },
      { name: 'Silent Sender (ERMM L1)', active: 1, author: 'Nate W', org: 'GDAK' },
      { name: 'The Human Firewall Test', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Trust Exploit', active: 0, author: 'Nate W', org: 'GDAK' }
    ],

    'Ransomware & Extortion': [
      { name: 'Blackout Weekend (ERMM L2)', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Building Resilience- Royal Omani Police', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Exercise Donor Shield', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Exercise Grid Fault', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Exercise Pipeline Storm (ERMM Level 2)', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Exercise SCADA Blackout (ERMM Level 2)', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Exercise Silent Terminal', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Exercise Veiled Hydra', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Fuel Supplier Ransomware (ERMM Level 2)', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'New Term, New Threat (ERMM Level 2)', active: 0, author: 'Nate W', org: 'GDAK' }
    ],

    'Test Theme': [
      { name: 'Final Test', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Final Test - Copy 2', active: 0, author: 'Nathan Walker', org: '<b>Test Org</b>' },
      { name: 'Final Test - Copy 4', active: 0, author: 'TestAdmin', org: 'GDAK Test Org' },
      { name: 'Final Test - Copy 5', active: 0, author: 'Nathan Walker', org: '<b>Test Org</b>' },
      { name: 'final test review', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Final test- newly created to test discuss', active: 0, author: 'Nathan Walker', org: '<b>Test Org</b>' },
      { name: 'own ex test', active: 0, author: 'Nathan Walker', org: '<b>Test Org</b>' },
      { name: 'test cases', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'test ex for org users creating discuss', active: 0, author: 'TestAdmin', org: 'GDAK Test Org' },
      { name: 'test ex new', active: 0, author: 'Nate W', org: 'GDAK' }
    ],

    'Communications, Media & Stakeholder Management': [
      { name: 'Crisis Broadcast', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Echo Chamber', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Flashpoint Press', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Open Mic', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Reputation Under Fire', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Signal & Noise- Managing the Message in a Cyber Incident', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Signal Control', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'sshshshsh', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Stakeholder Storm', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'testtest', active: 0, author: 'Marcus Stanislawski', org: 'GDAK' }
    ],

    'Cyber Assessment Framework (CAF)': [
      { name: 'Assurance Matrix', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Baseline Resolve', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'CAF Vanguard', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'ControlPoint', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation Benchmark', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Steady State', active: 0, author: 'Nate W', org: 'GDAK' }
    ],

    'Education and Safeguarding': [
      { name: 'Classroom Containment', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Digital Duty', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Guardian Protocol', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation Pastoral', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation SafeHaven', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Project Shielded Learning', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Project Shielded Learning - Copy', active: 0, author: 'QA', org: 'Excyte' },
      { name: 'Safeguard Sentinel', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'The Protection Test', active: 0, author: 'Nate W', org: 'GDAK' }
    ],

    'Excyte Live': [
      { name: 'Cheltenhan 2026', active: 0, author: 'Louis Tucker', org: 'GDAK' }
    ],

    'Executive & Leadership': [],

    'How to Exercise': [
      { name: 'Fifth Exercise', active: 0, author: 'QA', org: 'Excyte' },
      { name: 'Fifth Exercise - Copy', active: 0, author: 'QA', org: 'Excyte' },
      { name: 'Fifth Exercise - Copy 2', active: 0, author: 'QA', org: 'Excyte' },
      { name: 'First Exercise', active: 0, author: 'QA', org: 'Excyte' },
      { name: 'First Exercise - Copy 2', active: 0, author: 'QA', org: 'Excyte' },
      { name: 'Forth Exercise', active: 0, author: 'QA', org: 'Excyte' },
      { name: 'Introduction to Cyber Incident Exercising (CIE)', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Introduction to Cyber Incident Exercising (CIE) - Copy', active: 0, author: 'QA', org: 'Excyte' },
      { name: 'Introduction to Cyber Incident Exercising (CIE) - Copy 2', active: 0, author: 'QA', org: 'Excyte' },
      { name: 'Second Exercise', active: 0, author: 'QA', org: 'Excyte' }
    ],

    'Incident of the Month': [
      { name: 'Month 1', active: 0, author: 'Nate W', org: 'GDAK' }
    ],

    'Insider Threat': [
      { name: 'Breach of Trust', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Hidden Hand', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Internal Exposure', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation Shadow Account', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation Trojan Within', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Privilege Escalation', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Silent Breach', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'The Inside Line', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Trusted Access', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Trusted Access - Copy', active: 0, author: 'QA', org: 'Excyte' }
    ],

    'National Security': [
      { name: 'Critical Dawn', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Defence Line Alpha', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Homeland Resolve', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Iron Sentinel', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation Silent Frontier', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation Sovereign Shield', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Project Red Horizon', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Sentinel Grid', active: 0, author: 'Nate W', org: 'GDAK' }
    ],

    'NCSC Exercise in a Box': [
      { name: 'test 1', active: 0, author: 'Nate W', org: 'GDAK' }
    ],

    'Operational Technology (OT)': [
      { name: 'Blackline Breaker', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Control Room Crisis', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Industrial Fallout', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Iron Circuit', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation Gridlock', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Operation Power Surge', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Project Steel Current', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Sentinel SCADA', active: 0, author: 'Nate W', org: 'GDAK' }
    ],

    'PYOA (BETA)': [
      { name: 'PYOA Excyte Live POC v3', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'PYOA: Excyte Live Path V2', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'PYOA: Excyte Path', active: 0, author: 'Nate W', org: 'GDAK' }
    ],

    'Supply Chain & Third-Party Compromise': [
      { name: 'Exercise Silent Partner (ERMM Level 2)', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Exercise Silent Partner (ERMM Level 2) - Copy 3', active: 0, author: 'QA', org: 'Excyte' },
      { name: 'Ghost Vendor', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Hidden Dependency', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Interlock Exposure', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Joint Venture Jeopardy', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Logistics Breach', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Mutual Risk', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Networked Trust', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'TEsting', active: 0, author: 'QA', org: 'Excyte' }
    ],

    'Website Defacement & Brand Abuse': [
      { name: 'Brand Under Siege', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Digital Graffiti', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Face of the Organisation', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Front Page Fallout', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Nate Test Org', active: 0, author: 'TestAdmin', org: 'GDAK Test Org' },
      { name: 'Operation False Front', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'Reputation Hijack', active: 0, author: 'Nate W', org: 'GDAK' },
      { name: 'tets 333', active: 0, author: 'TestAdmin', org: 'GDAK Test Org' },
      { name: 'The Spoofed Identity', active: 0, author: 'Nate W', org: 'GDAK' }
    ]

  };

  var DEFAULT_THEME = 'Ransomware & Extortion';

  // Neutral document/exercise glyph shown in every exercise tile's
  // icon-box — there's no per-exercise icon asset (unlike themes,
  // which each have their own SVG under assets/icons/), so this is
  // shared across every tile on this page rather than implying any
  // particular exercise belongs to one theme's icon. viewBox matches
  // .icon-box's own 240:140 aspect ratio exactly (rather than a
  // square one) so the background fill spans the full box edge to
  // edge instead of being letterboxed down to fit within it. The
  // glyph is the original 48x48 design scaled up by one uniform
  // factor (140/48, tied to the box's height) and centred, so its
  // proportions/stroke weight stay correct instead of stretching.
  var EXERCISE_TILE_ICON =
    '<svg viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="240" height="140" fill="#E7F7F4"/>' +
      '<g transform="translate(120, 70) scale(2.9167) translate(-24, -24)">' +
        '<rect x="14" y="9" width="20" height="30" rx="2" fill="#ffffff" stroke="#1AA694" stroke-width="1.6"/>' +
        '<path d="M18.5 17h11M18.5 22.5h11M18.5 28h7" stroke="#1AA694" stroke-width="1.6" stroke-linecap="round"/>' +
      '</g>' +
    '</svg>';

  // Every valid theme name — the hardcoded ones above (as exerciseData
  // keys) plus 'My Exercises', which has no hardcoded rows of its own
  // and is populated entirely from saved custom exercises below. Used
  // so an unrecognised ?theme= still falls back to DEFAULT_THEME while
  // 'My Exercises' (legitimately empty in exerciseData) does not.
  var VALID_THEMES = Object.keys(exerciseData).concat(['My Exercises']);

  // Exercises saved from the Exercise Builder ("Save" button) — kept
  // entirely separate from the hardcoded exerciseData above. Every
  // custom exercise carries the theme it was saved under, and always
  // additionally appears under 'My Exercises' regardless of that
  // theme, so it's easy to find again later.
  var CUSTOM_EXERCISES_KEY = 'excyteCustomExercises';

  function getCustomExerciseRows(themeName) {
    var all = {};
    try {
      all = JSON.parse(localStorage.getItem(CUSTOM_EXERCISES_KEY)) || {};
    } catch (e) {}

    var rows = [];
    Object.keys(all).forEach(function (id) {
      var ex = all[id];
      if (!ex) return;
      if (themeName === 'My Exercises' || ex.theme === themeName) {
        rows.push({ name: ex.name, active: 0, author: 'You', org: '—', baseActive: 0 });
      }
    });
    return rows;
  }

  // Custom events created via Setup Exercise are stored separately
  // (keyed by exercise name), so the hardcoded "active" counts above
  // need topping up with any live custom events before rows are used
  // for sorting, display, or the live-row highlight.
  var CUSTOM_EVENTS_KEY = 'excyteCustomEvents';

  function mergeLiveCustomEvents(rows) {
    var allCustomEvents = {};
    try {
      allCustomEvents = JSON.parse(localStorage.getItem(CUSTOM_EVENTS_KEY)) || {};
    } catch (e) {}

    rows.forEach(function (row) {
      if (row.baseActive === undefined) row.baseActive = row.active;
      var customRows = allCustomEvents[row.name] || [];
      var liveCustomCount = customRows.filter(function (r) { return r.status === 'Active'; }).length;
      row.active = row.baseActive + liveCustomCount;
    });
  }

  // ------------------------------------------------------------
  // Work out which theme to show
  // ------------------------------------------------------------
  var params = new URLSearchParams(window.location.search);
  var theme = params.get('theme') || DEFAULT_THEME;

  document.getElementById('pageTitle').textContent = theme;
  document.title = 'Excyte | ' + theme;

  // ------------------------------------------------------------
  // Element references
  // ------------------------------------------------------------
  var cardsGrid = document.getElementById('exerciseCardsGrid');
  var tablePanel = document.getElementById('tablePanel');
  var pagination = document.getElementById('pagination');
  var nameFilter = document.getElementById('exerciseNameFilter');
  var authorFilter = document.getElementById('authorFilter');
  var orgFilter = document.getElementById('orgFilter');

  var currentThemeRows = [];
  // Fixed default order (live exercises first) — there's no sort UI
  // any more, so this is no longer user-adjustable or persisted.
  var sortState = { field: 'active', dir: -1 };

  // ------------------------------------------------------------
  // Remember filter choices per theme across back/forward
  // navigation, but start fresh on an actual page refresh.
  // ------------------------------------------------------------
  var STATE_KEY = 'excyteThemeFilterState';

  function isReload() {
    try {
      var entries = performance.getEntriesByType('navigation');
      if (entries.length > 0) return entries[0].type === 'reload';
    } catch (e) {}
    return false;
  }

  if (isReload()) {
    sessionStorage.removeItem(STATE_KEY);
  }

  function loadAllStates() {
    try {
      return JSON.parse(sessionStorage.getItem(STATE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveState() {
    var all = loadAllStates();
    all[theme] = {
      name: nameFilter.value,
      author: authorFilter.value,
      org: orgFilter.value
    };
    sessionStorage.setItem(STATE_KEY, JSON.stringify(all));
  }

  // ------------------------------------------------------------
  // Build the tile grid + filter dropdowns for the current theme
  // ------------------------------------------------------------
  function renderTheme(themeName) {
    // Unknown theme name (typo'd URL, etc.) — fall back gracefully.
    // 'My Exercises' is deliberately absent from exerciseData (it's
    // populated entirely from custom exercises below) so it must be
    // checked against VALID_THEMES rather than "does exerciseData
    // have rows for this", or it would wrongly fall back too.
    if (VALID_THEMES.indexOf(themeName) === -1) {
      themeName = DEFAULT_THEME;
    }

    var rows = (exerciseData[themeName] || []).slice().concat(getCustomExerciseRows(themeName));

    mergeLiveCustomEvents(rows);
    currentThemeRows = rows;

    if (rows.length === 0) {
      cardsGrid.innerHTML = '';
      tablePanel.classList.add('no-data');
      tablePanel.classList.remove('is-empty');
      pagination.style.display = 'none';
      resetFilterOptions([]);
      return;
    }

    tablePanel.classList.remove('no-data');

    var saved = loadAllStates()[themeName];

    buildCards();

    // Only show pagination when this looks like a full page of results
    pagination.style.display = rows.length >= 10 ? 'flex' : 'none';

    resetFilterOptions(rows);

    if (saved) {
      nameFilter.value = saved.name || '';
      if ([].slice.call(authorFilter.options).some(function (o) { return o.value === saved.author; })) {
        authorFilter.value = saved.author;
      }
      if ([].slice.call(orgFilter.options).some(function (o) { return o.value === saved.org; })) {
        orgFilter.value = saved.org;
      }
    }

    applyFilters();
  }

  function buildCards() {
    var rows = currentThemeRows.slice();

    if (sortState.field) {
      rows.sort(function (a, b) {
        return compareValues(a[sortState.field], b[sortState.field]) * sortState.dir;
      });
    }

    cardsGrid.innerHTML = '';

    rows.forEach(function (row) {
      var card = document.createElement('div');
      card.className = 'card';
      card.dataset.name = row.name;
      card.dataset.author = row.author;
      card.dataset.org = row.org;
      if (row.active > 0) card.classList.add('live-theme');

      var title = document.createElement('h3');
      title.textContent = row.name;
      title.title = row.name; // full name on hover, since long ones are now clamped to 2 lines
      card.appendChild(title);

      if (row.active > 0) {
        var badge = document.createElement('span');
        badge.className = 'live-badge';
        badge.innerHTML = '<span class="live-badge-dot"></span>Live';
        card.appendChild(badge);
      }

      // Same role as a theme tile's description paragraph — reuses
      // .card p styling directly rather than a bespoke class, so the
      // font size/colour/spacing matches exactly.
      var descText = row.active + ' active event' + (row.active === 1 ? '' : 's') +
        ' · ' + row.author + ' · ' + row.org;
      var desc = document.createElement('p');
      desc.textContent = descText;
      desc.title = descText;
      card.appendChild(desc);

      // Same icon-box proportions as a theme tile, with a neutral
      // exercise glyph — there's no per-exercise icon asset, and
      // reusing one theme's icon on every card would misleadingly
      // imply that exercise belongs to that theme.
      var iconBox = document.createElement('div');
      iconBox.className = 'icon-box exercise-icon-box';
      iconBox.innerHTML = EXERCISE_TILE_ICON;
      card.appendChild(iconBox);

      // mousedown/mouseup distance check rather than a plain 'click'
      // listener, so dragging to select text inside the tile doesn't
      // also count as clicking it (see js/script.js's theme tiles,
      // same fix, same reasoning).
      (function () {
        var downX = null;
        var downY = null;

        card.addEventListener('mousedown', function (e) {
          downX = e.clientX;
          downY = e.clientY;
        });

        card.addEventListener('mouseup', function (e) {
          if (downX === null) return;
          var moved = Math.abs(e.clientX - downX) > 5 || Math.abs(e.clientY - downY) > 5;
          downX = null;
          downY = null;
          if (moved) return;

          window.location.href = 'exercise-events.html?exercise=' + encodeURIComponent(row.name);
        });
      })();

      cardsGrid.appendChild(card);
    });
  }

  // Generic comparator — works for numbers and strings alike
  function compareValues(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
  }

  // Rebuild the Author/Organisation dropdowns from whatever is actually
  // present for this theme, so "nothing selected" is always a real option.
  function resetFilterOptions(rows) {
    var authors = [];
    var orgs = [];

    rows.forEach(function (row) {
      if (authors.indexOf(row.author) === -1) authors.push(row.author);
      if (orgs.indexOf(row.org) === -1) orgs.push(row.org);
    });

    authors.sort();
    orgs.sort();

    authorFilter.innerHTML = '<option value="all">Nothing selected</option>';
    authors.forEach(function (author) {
      var opt = document.createElement('option');
      opt.value = author;
      opt.textContent = author;
      authorFilter.appendChild(opt);
    });

    orgFilter.innerHTML = '<option value="all">Nothing selected</option>';
    orgs.forEach(function (org) {
      var opt = document.createElement('option');
      opt.value = org;
      opt.textContent = org;
      orgFilter.appendChild(opt);
    });
  }

  // ------------------------------------------------------------
  // Live filtering — no search button needed
  // ------------------------------------------------------------
  function applyFilters() {
    var nameVal = nameFilter.value.trim().toLowerCase();
    var authorVal = authorFilter.value;
    var orgVal = orgFilter.value;
    var visibleCount = 0;

    var cards = cardsGrid.querySelectorAll('.card');
    cards.forEach(function (card) {
      var matchesName = nameVal === '' || card.dataset.name.toLowerCase().indexOf(nameVal) !== -1;
      var matchesAuthor = authorVal === 'all' || card.dataset.author === authorVal;
      var matchesOrg = orgVal === 'all' || card.dataset.org === orgVal;
      var show = matchesName && matchesAuthor && matchesOrg;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    tablePanel.classList.toggle('is-empty', visibleCount === 0);
  }

  nameFilter.addEventListener('input', function () {
    applyFilters();
    saveState();
  });
  authorFilter.addEventListener('change', function () {
    applyFilters();
    saveState();
  });
  orgFilter.addEventListener('change', function () {
    applyFilters();
    saveState();
  });

  renderTheme(theme);

  // ------------------------------------------------------------
  // Back button returns to wherever the person came from
  // ------------------------------------------------------------
  var backBtn = document.querySelector('.back-btn');
  backBtn.addEventListener('click', function () {
    window.history.back();
  });

  // Static mockup — pagination doesn't do anything yet, and nothing else
  // on this page navigates except the "Exercises" sidebar link
  // (handled in js/menu.js) and the Back button above.
  document.querySelectorAll('.page-btn').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
    });
  });

});
