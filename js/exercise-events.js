document.addEventListener('DOMContentLoaded', function () {

  // ============================================================
  // Per-exercise event data. Add an entry here (keyed by the exact
  // exercise name) once there are real events to show. Any exercise
  // not listed here — i.e. still empty — falls back to the
  // "no exercise events" message automatically.
  // ============================================================
  var eventsData = {

    'Silent Sender (ERMM L1)': [
      { id: 'demo-silent-sender', date: '27/07/2026 09:41', org: 'ASYAD', status: 'Active' },
      { date: '21/07/2026 09:38', org: 'ASYAD', status: 'GDAK report required' },
      { date: '21/07/2026 07:29', org: 'ASYAD', status: 'GDAK report required' },
      { date: '20/07/2026 16:24', org: 'ASYAD', status: 'GDAK report required' },
      { date: '20/07/2026 15:41', org: 'ASYAD', status: 'GDAK report required' },
      { date: '02/07/2026 12:22', org: 'GDAK Test Org', status: 'Not active' },
      { date: '01/07/2026 16:37', org: 'GDAK', status: 'GDAK report required' }
    ]

  };

  var DEFAULT_EXERCISE = 'Silent Sender (ERMM L1)';

  var params = new URLSearchParams(window.location.search);
  var exerciseName = params.get('exercise') || DEFAULT_EXERCISE;

  document.getElementById('pageTitle').textContent = exerciseName;
  document.title = 'Excyte | ' + exerciseName;

  var tbody = document.getElementById('eventsTableBody');
  var tablePanel = document.getElementById('tablePanel');
  var statusFilter = document.getElementById('statusFilter');
  var orgFilter = document.getElementById('orgFilter');

  var PLAY_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

  // Builds a play-icon that opens the Exercise Delivery page for this
  // event, in the given role (facilitator / observer / participant)
  function makePlayIcon(eventId, role) {
    var icon = document.createElement('span');
    icon.className = 'play-icon';
    icon.innerHTML = PLAY_ICON;
    icon.addEventListener('click', function () {
      window.location.href = 'exercise-delivery.html?eventId=' + encodeURIComponent(eventId) + '&role=' + role;
    });
    return icon;
  }

  // Events created via the Setup Exercise page are stored here (browser-local)
  var STORAGE_KEY = 'excyteCustomEvents';

  function getCustomEvents(name) {
    var allCustomEvents = {};
    try {
      allCustomEvents = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      allCustomEvents = {};
    }
    return allCustomEvents[name] || [];
  }

  function saveCustomEvents(name, events) {
    var allCustomEvents = {};
    try {
      allCustomEvents = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      allCustomEvents = {};
    }
    allCustomEvents[name] = events;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allCustomEvents));
    } catch (e) {}
  }

  function endCustomEvent(eventId) {
    var events = getCustomEvents(exerciseName).map(function (evt) {
      if (evt.id === eventId) {
        evt.status = 'Ended';
      }
      return evt;
    });
    saveCustomEvents(exerciseName, events);
  }

  // Parses "DD/MM/YYYY HH:MM" into a timestamp for sorting
  function parseEventDate(str) {
    var parts = str.split(' ');
    var d = parts[0].split('/'); // [DD, MM, YYYY]
    var t = (parts[1] || '00:00').split(':');
    return new Date(d[2], d[1] - 1, d[0], t[0], t[1]).getTime();
  }

  var currentRows = [];
  var sortState = { field: 'date', dir: -1 };
  var optionsPopulated = false;

  // ------------------------------------------------------------
  // Remember filter/sort choices per exercise across back/forward
  // navigation, but start fresh on an actual page refresh.
  // ------------------------------------------------------------
  var STATE_KEY = 'excyteEventsFilterState';

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
    all[exerciseName] = {
      status: statusFilter.value,
      org: orgFilter.value,
      sortField: sortState.field,
      sortDir: sortState.dir
    };
    sessionStorage.setItem(STATE_KEY, JSON.stringify(all));
  }

  function renderEvents() {
    var customRows = getCustomEvents(exerciseName).map(function (row) {
      row.isCustom = true;
      return row;
    });
    // Newly-created events show up first, ahead of the demo data
    currentRows = customRows.concat(eventsData[exerciseName] || []);

    if (currentRows.length === 0) {
      tbody.innerHTML = '';
      tablePanel.classList.add('no-data');
      return;
    }

    tablePanel.classList.remove('no-data');

    if (!optionsPopulated) {
      populateOrgOptions(currentRows);
      optionsPopulated = true;
    }

    buildRows();
    applyFilters();
  }

  function buildRows() {
    var rows = currentRows.slice();

    if (sortState.field) {
      rows.sort(function (a, b) {
        var result;
        if (sortState.field === 'date') {
          result = parseEventDate(a.date) - parseEventDate(b.date);
        } else {
          result = String(a[sortState.field]).localeCompare(String(b[sortState.field]), undefined, { sensitivity: 'base' });
        }
        return result * sortState.dir;
      });
    }

    tbody.innerHTML = '';

    rows.forEach(function (row) {
      var isLive = row.status === 'Active';
      var tr = document.createElement('tr');
      tr.dataset.status = row.status;
      tr.dataset.org = row.org;
      if (isLive) tr.classList.add('live-row');

      var dateTd = document.createElement('td');
      dateTd.textContent = row.date;

      var orgTd = document.createElement('td');
      orgTd.textContent = row.org;

      var statusTd = document.createElement('td');
      statusTd.textContent = row.status;

      var facilitateTd = document.createElement('td');
      var observeTd = document.createElement('td');
      var joinTd = document.createElement('td');
      var editTd = document.createElement('td');
      var endTd = document.createElement('td');

      // Only a live (Active) event exposes the facilitate/observe/join/end controls
      if (isLive) {
        facilitateTd.appendChild(makePlayIcon(row.id, 'facilitator'));
        observeTd.appendChild(makePlayIcon(row.id, 'observer'));
        joinTd.appendChild(makePlayIcon(row.id, 'participant'));

        // End is only wired up for events created in this browser —
        // the pre-existing demo data stays as an inert placeholder.
        if (row.isCustom) {
          var endLink = document.createElement('span');
          endLink.className = 'end-link';
          endLink.textContent = 'End';
          endLink.dataset.eventId = row.id;
          endTd.appendChild(endLink);
        } else {
          endTd.innerHTML = '<span class="end-link disabled">End</span>';
        }
      }

      tr.appendChild(dateTd);
      tr.appendChild(orgTd);
      tr.appendChild(statusTd);
      tr.appendChild(facilitateTd);
      tr.appendChild(observeTd);
      tr.appendChild(joinTd);
      tr.appendChild(editTd);
      tr.appendChild(endTd);
      tbody.appendChild(tr);
    });
  }

  // Rebuild the Organisations dropdown from whatever orgs actually show up
  // for this exercise, so "Nothing selected" is always joined by real options
  function populateOrgOptions(rows) {
    var orgs = [];
    rows.forEach(function (row) {
      if (orgs.indexOf(row.org) === -1) orgs.push(row.org);
    });
    orgs.sort();

    orgFilter.innerHTML = '<option value="all">Nothing selected</option>';
    orgs.forEach(function (org) {
      var opt = document.createElement('option');
      opt.value = org;
      opt.textContent = org;
      orgFilter.appendChild(opt);
    });
  }

  // Live filtering — no search button needed
  function applyFilters() {
    var statusVal = statusFilter.value; // 'all' | 'active' | 'completed'
    var orgVal = orgFilter.value;
    var visibleCount = 0;

    tbody.querySelectorAll('tr').forEach(function (tr) {
      var matchesStatus = statusVal === 'all' ||
        (statusVal === 'active' && tr.dataset.status === 'Active') ||
        (statusVal === 'completed' && tr.dataset.status !== 'Active');
      var matchesOrg = orgVal === 'all' || tr.dataset.org === orgVal;
      var show = matchesStatus && matchesOrg;
      tr.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    tablePanel.classList.toggle('is-empty', visibleCount === 0);
  }

  statusFilter.addEventListener('change', function () {
    applyFilters();
    saveState();
  });
  orgFilter.addEventListener('change', function () {
    applyFilters();
    saveState();
  });

  // Restore sort before the first render so it applies immediately;
  // filter select values get restored after (their options don't
  // exist until renderEvents populates them).
  var savedState = loadAllStates()[exerciseName];
  if (savedState) {
    sortState.field = savedState.sortField || null;
    sortState.dir = savedState.sortDir || 1;
  }

  renderEvents();
  updateSortHeaders();

  if (savedState) {
    if ([].slice.call(statusFilter.options).some(function (o) { return o.value === savedState.status; })) {
      statusFilter.value = savedState.status;
    }
    if ([].slice.call(orgFilter.options).some(function (o) { return o.value === savedState.org; })) {
      orgFilter.value = savedState.org;
    }
    applyFilters();
  }

  // ------------------------------------------------------------
  // Sortable column headers (Date, Organisations, Status)
  // ------------------------------------------------------------
  document.querySelectorAll('#eventsTable th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var field = th.dataset.sort;
      if (sortState.field === field) {
        sortState.dir *= -1;
      } else {
        sortState.field = field;
        sortState.dir = 1;
      }
      updateSortHeaders();
      buildRows();
      applyFilters();
      saveState();
    });
  });

  function updateSortHeaders() {
    document.querySelectorAll('#eventsTable th[data-sort]').forEach(function (th) {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.sort === sortState.field) {
        th.classList.add(sortState.dir === 1 ? 'sort-asc' : 'sort-desc');
      }
    });
  }

  // ------------------------------------------------------------
  // End Event — only functional for events created in this browser.
  // Shows a branded confirmation modal before actually deleting.
  // ------------------------------------------------------------
  var endEventModal = document.getElementById('endEventModal');
  var modalCancelBtn = document.getElementById('modalCancelBtn');
  var modalConfirmBtn = document.getElementById('modalConfirmBtn');
  var pendingEventId = null;

  function openEndModal(eventId) {
    pendingEventId = eventId;
    endEventModal.classList.add('open');
  }

  function closeEndModal() {
    pendingEventId = null;
    endEventModal.classList.remove('open');
  }

  tbody.addEventListener('click', function (e) {
    var link = e.target.closest('.end-link:not(.disabled)');
    if (link) {
      openEndModal(link.dataset.eventId);
    }
  });

  modalCancelBtn.addEventListener('click', closeEndModal);

  modalConfirmBtn.addEventListener('click', function () {
    if (pendingEventId) {
      endCustomEvent(pendingEventId);
      renderEvents();
    }
    closeEndModal();
  });

  // Clicking the dimmed backdrop also cancels
  endEventModal.addEventListener('click', function (e) {
    if (e.target === endEventModal) closeEndModal();
  });

  // Back button returns to wherever the person came from
  var backBtn = document.querySelector('.back-btn');
  backBtn.addEventListener('click', function () {
    window.history.back();
  });

  // "Create New Event" opens the (single, reused) Setup Exercise page
  // for whichever exercise this events list belongs to.
  var createBtn = document.querySelector('.create-btn');
  createBtn.addEventListener('click', function () {
    window.location.href = 'setup-exercise.html?exercise=' + encodeURIComponent(exerciseName);
  });

  // ------------------------------------------------------------
  // Edit / Deliver — only shown when this events list belongs to an
  // exercise saved from the Exercise Builder (as opposed to one of
  // the bundled demo exercises, which have no builder record to edit
  // or slides to deliver from).
  // ------------------------------------------------------------
  var CUSTOM_EXERCISES_KEY = 'excyteCustomExercises';

  function findCustomExerciseByName(name) {
    var all = {};
    try {
      all = JSON.parse(localStorage.getItem(CUSTOM_EXERCISES_KEY)) || {};
    } catch (e) {}
    var found = null;
    Object.keys(all).forEach(function (id) {
      if (all[id] && all[id].name === name) found = all[id];
    });
    return found;
  }

  var customExercise = findCustomExerciseByName(exerciseName);
  if (customExercise) {
    var editExerciseBtn = document.getElementById('editExerciseBtn');
    editExerciseBtn.style.display = '';

    editExerciseBtn.addEventListener('click', function () {
      window.location.href = 'exercise-builder.html?editId=' + encodeURIComponent(customExercise.id);
    });

    // ------------------------------------------------------------
    // Delete — same "only for custom exercises" gating as Edit, with
    // its own confirmation modal (same shell/pattern as End Event
    // above). Removing the record just means dropping its key from
    // the saved-exercises object; there's nowhere sensible to stay
    // on this page afterwards since the exercise it's about no
    // longer exists, so it navigates back to the theme it belonged to.
    // ------------------------------------------------------------
    var deleteExerciseBtn = document.getElementById('deleteExerciseBtn');
    var deleteExerciseModal = document.getElementById('deleteExerciseModal');
    var deleteExerciseCancelBtn = document.getElementById('deleteExerciseCancelBtn');
    var deleteExerciseConfirmBtn = document.getElementById('deleteExerciseConfirmBtn');
    deleteExerciseBtn.style.display = '';

    function closeDeleteExerciseModal() {
      deleteExerciseModal.classList.remove('open');
    }

    deleteExerciseBtn.addEventListener('click', function () {
      deleteExerciseModal.classList.add('open');
    });

    deleteExerciseCancelBtn.addEventListener('click', closeDeleteExerciseModal);

    deleteExerciseModal.addEventListener('click', function (e) {
      if (e.target === deleteExerciseModal) closeDeleteExerciseModal();
    });

    deleteExerciseConfirmBtn.addEventListener('click', function () {
      var all = {};
      try {
        all = JSON.parse(localStorage.getItem(CUSTOM_EXERCISES_KEY)) || {};
      } catch (e) {}
      delete all[customExercise.id];
      try {
        localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(all));
      } catch (e) {}

      var theme = customExercise.theme || 'My Exercises';
      window.location.href = 'exercise-theme.html?theme=' + encodeURIComponent(theme);
    });
  }

});
