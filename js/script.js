document.addEventListener('DOMContentLoaded', function () {

  var themeFilter = document.getElementById('themeFilter');
  var statusInputs = document.querySelectorAll('input[name="status"]');
  var cards = document.querySelectorAll('.card');
  var cardsPanel = document.querySelector('.cards-panel');

  // ------------------------------------------------------------
  // "My Exercises" only makes sense once you've actually built and
  // saved something in the Exercise Builder — hide the tile (and its
  // filter option) entirely until excyteCustomExercises has at least
  // one entry, rather than showing an always-empty theme.
  // ------------------------------------------------------------
  (function hideMyExercisesIfEmpty() {
    var hasCustomExercises = false;
    try {
      var all = JSON.parse(localStorage.getItem('excyteCustomExercises')) || {};
      hasCustomExercises = Object.keys(all).length > 0;
    } catch (e) {}

    if (hasCustomExercises) return;

    var myExercisesCard = document.querySelector('.card[data-theme="My Exercises"]');
    if (myExercisesCard) myExercisesCard.remove();

    // restoreFilterState() (below) only re-applies a saved theme if a
    // matching <option> still exists, so removing this one is enough
    // to make it fall back to "all" on its own if that was saved.
    var myExercisesOption = themeFilter.querySelector('option[value="My Exercises"]');
    if (myExercisesOption) myExercisesOption.remove();

    cards = document.querySelectorAll('.card');
  })();

  // ------------------------------------------------------------
  // Remember filter choices across back/forward navigation, but
  // start fresh on an actual page refresh.
  // ------------------------------------------------------------
  var STATE_KEY = 'excyteExercisesFilterState';

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

  function saveFilterState() {
    var state = {
      theme: themeFilter.value,
      status: document.querySelector('input[name="status"]:checked').value
    };
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function restoreFilterState() {
    var saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(STATE_KEY));
    } catch (e) {
      saved = null;
    }
    if (!saved) return;

    if ([].slice.call(themeFilter.options).some(function (o) { return o.value === saved.theme; })) {
      themeFilter.value = saved.theme;
    }
    var statusInput = document.querySelector('input[name="status"][value="' + saved.status + '"]');
    if (statusInput) statusInput.checked = true;
  }

  function applyFilters() {
    var themeVal = themeFilter.value;
    var statusVal = document.querySelector('input[name="status"]:checked').value;
    var visibleCount = 0;

    cards.forEach(function (card) {
      var matchesTheme = themeVal === 'all' || card.dataset.theme === themeVal;
      var matchesStatus = statusVal === 'all' || card.dataset.status === statusVal;
      var show = matchesTheme && matchesStatus;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    cardsPanel.classList.toggle('is-empty', visibleCount === 0);
  }

  // Live filtering — no search button needed
  themeFilter.addEventListener('change', function () {
    applyFilters();
    saveFilterState();
  });
  statusInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      applyFilters();
      saveFilterState();
    });
  });

  // Restore whatever was selected before navigating away, then sync the
  // grid to match (also covers browsers that restore dropdown values
  // on their own).
  restoreFilterState();
  applyFilters();

  // ------------------------------------------------------------
  // Live theme highlighting — if any exercise within a theme has a
  // live event (either one of the two hardcoded demo exercises with
  // a baked-in Active event, or a custom event someone's created and
  // not yet ended), that theme's tile gets a subtle highlight + badge
  // and moves to the front of the grid. Re-evaluated fresh on every
  // load, so it always reflects whatever's actually live right now.
  // ------------------------------------------------------------
  var THEME_EXERCISES = {
    'Phishing & Social Engineering': ['Clickbait Crisis', 'Operation Hook, Line & Sinker', 'Operation Open Door', 'Operation Silver Tongue', 'Phantom Inbox', 'Phantom Inbox - Copy', 'Silent Sender (ERMM L1)', 'The Human Firewall Test', 'Trust Exploit'],
    'Ransomware & Extortion': ['Blackout Weekend (ERMM L2)', 'Building Resilience- Royal Omani Police', 'Exercise Donor Shield', 'Exercise Grid Fault', 'Exercise Pipeline Storm (ERMM Level 2)', 'Exercise SCADA Blackout (ERMM Level 2)', 'Exercise Silent Terminal', 'Exercise Veiled Hydra', 'Fuel Supplier Ransomware (ERMM Level 2)', 'New Term, New Threat (ERMM Level 2)'],
    'Test Theme': ['Final Test', 'Final Test - Copy 2', 'Final Test - Copy 4', 'Final Test - Copy 5', 'final test review', 'Final test- newly created to test discuss', 'own ex test', 'test cases', 'test ex for org users creating discuss', 'test ex new'],
    'Communications, Media & Stakeholder Management': ['Crisis Broadcast', 'Echo Chamber', 'Flashpoint Press', 'Open Mic', 'Reputation Under Fire', 'Signal & Noise- Managing the Message in a Cyber Incident', 'Signal Control', 'sshshshsh', 'Stakeholder Storm', 'testtest'],
    'Cyber Assessment Framework (CAF)': ['Assurance Matrix', 'Baseline Resolve', 'CAF Vanguard', 'ControlPoint', 'Operation Benchmark', 'Steady State'],
    'Education and Safeguarding': ['Classroom Containment', 'Digital Duty', 'Guardian Protocol', 'Operation Pastoral', 'Operation SafeHaven', 'Project Shielded Learning', 'Project Shielded Learning - Copy', 'Safeguard Sentinel', 'The Protection Test'],
    'Excyte Live': ['Cheltenhan 2026'],
    'Executive & Leadership': [],
    'How to Exercise': ['Fifth Exercise', 'Fifth Exercise - Copy', 'Fifth Exercise - Copy 2', 'First Exercise', 'First Exercise - Copy 2', 'Forth Exercise', 'Introduction to Cyber Incident Exercising (CIE)', 'Introduction to Cyber Incident Exercising (CIE) - Copy', 'Introduction to Cyber Incident Exercising (CIE) - Copy 2', 'Second Exercise'],
    'Incident of the Month': ['Month 1'],
    'Insider Threat': ['Breach of Trust', 'Hidden Hand', 'Internal Exposure', 'Operation Shadow Account', 'Operation Trojan Within', 'Privilege Escalation', 'Silent Breach', 'The Inside Line', 'Trusted Access', 'Trusted Access - Copy'],
    'National Security': ['Critical Dawn', 'Defence Line Alpha', 'Homeland Resolve', 'Iron Sentinel', 'Operation Silent Frontier', 'Operation Sovereign Shield', 'Project Red Horizon', 'Sentinel Grid'],
    'NCSC Exercise in a Box': ['test 1'],
    'Operational Technology (OT)': ['Blackline Breaker', 'Control Room Crisis', 'Industrial Fallout', 'Iron Circuit', 'Operation Gridlock', 'Operation Power Surge', 'Project Steel Current', 'Sentinel SCADA'],
    'PYOA (BETA)': ['PYOA Excyte Live POC v3', 'PYOA: Excyte Live Path V2', 'PYOA: Excyte Path'],
    'Supply Chain & Third-Party Compromise': ['Exercise Silent Partner (ERMM Level 2)', 'Exercise Silent Partner (ERMM Level 2) - Copy 3', 'Ghost Vendor', 'Hidden Dependency', 'Interlock Exposure', 'Joint Venture Jeopardy', 'Logistics Breach', 'Mutual Risk', 'Networked Trust', 'TEsting'],
    'Website Defacement & Brand Abuse': ['Brand Under Siege', 'Digital Graffiti', 'Face of the Organisation', 'Front Page Fallout', 'Nate Test Org', 'Operation False Front', 'Reputation Hijack', 'tets 333', 'The Spoofed Identity']
  };

  // The one demo exercise with a permanently-baked-in Active event
  var DEMO_LIVE_EXERCISES = ['Silent Sender (ERMM L1)'];

  var CUSTOM_EVENTS_KEY = 'excyteCustomEvents';

  function themeHasLiveEvent(themeName) {
    var exerciseNames = THEME_EXERCISES[themeName] || [];

    if (exerciseNames.some(function (name) { return DEMO_LIVE_EXERCISES.indexOf(name) !== -1; })) {
      return true;
    }

    var allCustomEvents = {};
    try {
      allCustomEvents = JSON.parse(localStorage.getItem(CUSTOM_EVENTS_KEY)) || {};
    } catch (e) {}

    return exerciseNames.some(function (name) {
      var rows = allCustomEvents[name] || [];
      return rows.some(function (row) { return row.status === 'Active'; });
    });
  }

  (function highlightLiveThemes() {
    var liveCards = [];
    var otherCards = [];

    cards.forEach(function (card) {
      var isLive = themeHasLiveEvent(card.dataset.theme);
      card.classList.toggle('live-theme', isLive);
      // Keep the Active/Inactive status filter in sync with the same
      // live-event check driving the highlight/badge above — this was
      // previously left at its hardcoded HTML value ("inactive" on
      // every card), so the "Active" filter never matched anything
      // even when a theme genuinely had a live exercise.
      card.dataset.status = isLive ? 'active' : 'inactive';

      var existingBadge = card.querySelector('.live-badge');
      if (isLive && !existingBadge) {
        var badge = document.createElement('span');
        badge.className = 'live-badge';
        badge.innerHTML = '<span class="live-badge-dot"></span>Live';
        card.appendChild(badge);
      } else if (!isLive && existingBadge) {
        existingBadge.remove();
      }

      if (isLive) liveCards.push(card); else otherCards.push(card);
    });

    // Re-append in order (live first) — appendChild on an element already
    // in the DOM moves it rather than duplicating it.
    var grid = document.getElementById('cardsGrid');
    liveCards.concat(otherCards).forEach(function (card) {
      grid.appendChild(card);
    });

    // applyFilters() already ran once above using each card's
    // hardcoded-in-HTML data-status — now that live status has
    // actually been computed and written onto the cards, re-run it
    // so the Active/Inactive filter reflects reality if it's
    // selected (e.g. restored from a previous visit's filter state).
    applyFilters();
  })();

  // Clicking a theme tile opens the (single, reused) exercise detail page,
  // passing the theme name through so the title there can update itself.
  // A plain 'click' listener would also fire after dragging to select
  // text inside the tile (mousedown and mouseup on the same element
  // still counts as a click, even if the pointer moved between them),
  // so track the mousedown position and only navigate on mouseup if
  // the pointer barely moved — a real click, not a text-selection drag.
  cards.forEach(function (card) {
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

      var theme = encodeURIComponent(card.dataset.theme);
      window.location.href = 'pages/exercise-theme.html?theme=' + theme;
    });
  });

});
