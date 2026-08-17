document.addEventListener('DOMContentLoaded', function () {

  // ------------------------------------------------------------
  // Demo option lists (from the real app's dropdowns)
  // ------------------------------------------------------------
  var ORG_OPTIONS = [
    'GDAK', 'Excyte', 'Test Org', 'Dens org', 'GDAK Test Org', 'Testable',
    "Der'a", 'Marcus', '<b>Test Org</b>', 'Ed Org 2',
    'Southern Gas- Poole Branch', 'Excyte Live', 'ASYAD', 'Test Subscription'
  ];

  var PEOPLE_OPTIONS = [
    'Saleh Qadeer', 'Geeks Admin', 'Wali Ziai', 'Dennis Bastable-House',
    'Ewan E', 'Nate W', 'Mansour Nazifiasl', 'Mason', 'TEST',
    'Marcus Stanislawski', 'Wajiha Khalid', 'Louis Tucker', 'Atir',
    'Zainab Fatima', 'Imran Zabih', 'Zainab - S', 'Joely Butler', 'DaveH'
  ];

  // ------------------------------------------------------------
  // Page title — reused for every exercise via ?exercise=
  // ------------------------------------------------------------
  var params = new URLSearchParams(window.location.search);
  var exerciseName = params.get('exercise') || 'Silent Sender (ERMM L1)';
  var pageTitle = document.getElementById('pageTitle');
  pageTitle.textContent = 'Setup Exercise - ' + exerciseName;
  document.title = 'Excyte | Setup Exercise';

  // ------------------------------------------------------------
  // Reusable searchable dropdown (single or multi select)
  // ------------------------------------------------------------
  function initDropdown(fieldEl, options, placeholder) {
    var mode = fieldEl.dataset.mode; // 'single' | 'multi'
    var trigger = fieldEl.querySelector('.dropdown-trigger');
    var valueEl = fieldEl.querySelector('.dropdown-value');
    var searchInput = fieldEl.querySelector('.dropdown-search');
    var listEl = fieldEl.querySelector('.dropdown-list');
    var selected = [];

    function buildList(filterText) {
      listEl.innerHTML = '';
      var term = (filterText || '').trim().toLowerCase();
      var matches = options.filter(function (opt) {
        return opt.toLowerCase().indexOf(term) !== -1;
      });

      if (matches.length === 0) {
        var empty = document.createElement('li');
        empty.className = 'no-match';
        empty.textContent = 'No matches';
        listEl.appendChild(empty);
        return;
      }

      matches.forEach(function (opt) {
        var li = document.createElement('li');
        li.textContent = opt;
        var isSelected = selected.indexOf(opt) !== -1;
        if (mode === 'multi') {
          var check = document.createElement('span');
          check.className = 'item-check';
          if (isSelected) {
            check.innerHTML = '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>';
          }
          li.prepend(check);
        }
        if (isSelected) {
          li.classList.add('selected');
        }
        li.addEventListener('click', function () {
          selectOption(opt);
        });
        listEl.appendChild(li);
      });
    }

    function updateTriggerLabel() {
      if (selected.length === 0) {
        valueEl.textContent = placeholder;
        trigger.classList.remove('has-value');
      } else if (mode === 'single') {
        valueEl.textContent = selected[0];
        trigger.classList.add('has-value');
      } else {
        valueEl.textContent = selected.length === 1
          ? selected[0]
          : selected.length + ' selected';
        trigger.classList.add('has-value');
      }
    }

    function selectOption(opt) {
      if (mode === 'single') {
        selected = [opt];
        updateTriggerLabel();
        closePanel();
      } else {
        var idx = selected.indexOf(opt);
        if (idx === -1) {
          selected.push(opt);
        } else {
          selected.splice(idx, 1);
        }
        updateTriggerLabel();
        buildList(searchInput.value);
      }
    }

    function openPanel() {
      closeAllDropdowns();
      fieldEl.classList.add('open');
      buildList('');
      searchInput.value = '';
      searchInput.focus();
    }

    function closePanel() {
      fieldEl.classList.remove('open');
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (fieldEl.classList.contains('open')) {
        closePanel();
      } else {
        openPanel();
      }
    });

    searchInput.addEventListener('input', function () {
      buildList(searchInput.value);
    });

    searchInput.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    fieldEl._closeDropdown = closePanel;
    updateTriggerLabel();

    return {
      getSelected: function () {
        return selected.slice();
      }
    };
  }

  var allDropdowns = [];

  function closeAllDropdowns() {
    allDropdowns.forEach(function (fieldEl) {
      fieldEl.classList.remove('open');
    });
  }

  var orgField = document.getElementById('orgField');
  var facilitatorField = document.getElementById('facilitatorField');
  var observersField = document.getElementById('observersField');
  var participantsField = document.getElementById('participantsField');

  allDropdowns = [orgField, facilitatorField, observersField, participantsField];

  var orgDropdown = initDropdown(orgField, ORG_OPTIONS, 'Nothing selected');
  var facilitatorDropdown = initDropdown(facilitatorField, PEOPLE_OPTIONS, 'Search facilitators');
  var observersDropdown = initDropdown(observersField, PEOPLE_OPTIONS, 'Nothing selected');
  var participantsDropdown = initDropdown(participantsField, PEOPLE_OPTIONS, 'Nothing selected');

  // Clicking anywhere outside a dropdown closes it
  document.addEventListener('click', function () {
    closeAllDropdowns();
  });

  // ------------------------------------------------------------
  // Date & time — native picker, plus a Today shortcut
  // ------------------------------------------------------------
  var dateTimeInput = document.getElementById('exerciseDateTime');
  var todayBtn = document.getElementById('todayBtn');

  todayBtn.addEventListener('click', function () {
    var now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dateTimeInput.value = now.toISOString().slice(0, 16);
  });

  // ------------------------------------------------------------
  // Save — stores the new event (browser-local, via localStorage)
  // and drops you back on that exercise's events table to see it.
  // This is a demo: only Date/Time, Organisation and Status feed the
  // table — Facilitator/Observers/Participants are captured but the
  // Facilitate/Observe/Join/Edit/End columns stay as placeholders,
  // same as the rest of the mockup data.
  // ------------------------------------------------------------
  var STORAGE_KEY = 'excyteCustomEvents';

  function formatDateTime(value) {
    if (!value) return '';
    var parts = value.split('T');
    var dateParts = parts[0].split('-'); // [YYYY, MM, DD]
    var time = parts[1] || '00:00';
    return dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0] + ' ' + time;
  }

  var saveBtn = document.getElementById('saveBtn');
  saveBtn.addEventListener('click', function () {
    if (!dateTimeInput.value || facilitatorDropdown.getSelected().length === 0) {
      alert('Please fill in the required fields (Date and time of Exercise, Facilitator).');
      return;
    }

    var orgSelected = orgDropdown.getSelected();

    var newEvent = {
      id: 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      date: formatDateTime(dateTimeInput.value),
      org: orgSelected.length > 0 ? orgSelected.join(', ') : '—',
      status: 'Active',
      facilitators: facilitatorDropdown.getSelected(),
      observers: observersDropdown.getSelected(),
      participants: participantsDropdown.getSelected()
    };

    var allCustomEvents = {};
    try {
      allCustomEvents = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      allCustomEvents = {};
    }

    if (!allCustomEvents[exerciseName]) {
      allCustomEvents[exerciseName] = [];
    }
    allCustomEvents[exerciseName].push(newEvent);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allCustomEvents));
    } catch (e) {}

    window.location.href = 'exercise-events.html?exercise=' + encodeURIComponent(exerciseName);
  });

  // ------------------------------------------------------------
  // Cancel returns to wherever the person came from.
  // ------------------------------------------------------------
  var cancelBtn = document.getElementById('cancelBtn');
  cancelBtn.addEventListener('click', function () {
    window.history.back();
  });

});
