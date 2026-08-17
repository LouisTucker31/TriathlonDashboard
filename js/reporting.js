document.addEventListener('DOMContentLoaded', function () {

  // ============================================================
  // Demo report reviews. Rows aren't clickable yet — the report
  // detail view is a separate build coming after this page.
  // ============================================================
  var reportsData = [
    {
      exercise: 'Silent Sender (ERMM L1)',
      org: 'GDAK',
      date: '27/07/2026 09:41',
      facilitators: 1,
      observers: 1,
      participants: 1
    },
    {
      exercise: 'Blackout Weekend (ERMM L2)',
      org: 'GDAK',
      date: '10/07/2026 10:00',
      facilitators: 2,
      observers: 1,
      participants: 8
    },
    {
      exercise: 'Clickbait Crisis',
      org: 'GDAK',
      date: '05/07/2026 09:15',
      facilitators: 1,
      observers: 2,
      participants: 12
    },
    {
      exercise: 'Exercise Donor Shield',
      org: 'ASYAD',
      date: '28/06/2026 13:00',
      facilitators: 1,
      observers: 0,
      participants: 6
    }
  ];

  reportsData.forEach(function (r) {
    r.total = r.facilitators + r.observers + r.participants;
    r.summary = r.total + ' Attendee' + (r.total === 1 ? '' : 's');
  });

  // Reports created by actually finishing a custom exercise (via
  // js/exercise-delivery.js) are stored here, keyed by exercise name.
  var CUSTOM_REPORTS_KEY = 'excyteCustomReports';
  try {
    var customReports = JSON.parse(localStorage.getItem(CUSTOM_REPORTS_KEY)) || {};
    for (var exerciseName in customReports) {
      var cr = customReports[exerciseName];
      reportsData.push({
        exercise: cr.exercise,
        org: cr.org,
        date: cr.completedAt,
        facilitators: cr.facilitators.length,
        observers: cr.observers.length,
        participants: cr.participants.length,
        total: cr.facilitators.length + cr.observers.length + cr.participants.length,
        summary: (cr.facilitators.length + cr.observers.length + cr.participants.length) + ' Attendee' +
          ((cr.facilitators.length + cr.observers.length + cr.participants.length) === 1 ? '' : 's')
      });
    }
  } catch (e) {}

  // ------------------------------------------------------------
  // Element references
  // ------------------------------------------------------------
  var tbody = document.getElementById('reportsTableBody');
  var tablePanel = document.getElementById('tablePanel');
  var nameFilter = document.getElementById('exerciseNameFilter');
  var orgFilter = document.getElementById('orgFilter');

  var sortState = { field: 'date', dir: -1 };

  // Parses "DD/MM/YYYY HH:MM" into a timestamp for sorting
  function parseDate(str) {
    var parts = str.split(' ');
    var d = parts[0].split('/');
    var t = (parts[1] || '00:00').split(':');
    return new Date(d[2], d[1] - 1, d[0], t[0], t[1]).getTime();
  }

  function compareValues(field, a, b) {
    if (field === 'date') {
      return parseDate(a.date) - parseDate(b.date);
    }
    if (field === 'total') {
      return a.total - b.total;
    }
    return String(a[field]).localeCompare(String(b[field]), undefined, { sensitivity: 'base' });
  }

  // ------------------------------------------------------------
  // Populate the Organisations dropdown from whatever orgs exist
  // ------------------------------------------------------------
  function populateOrgOptions() {
    var orgs = [];
    reportsData.forEach(function (r) {
      if (orgs.indexOf(r.org) === -1) orgs.push(r.org);
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

  // ------------------------------------------------------------
  // Build rows (sorted); filters are applied on top of the result
  // ------------------------------------------------------------
  function buildRows() {
    var rows = reportsData.slice();

    if (sortState.field) {
      rows.sort(function (a, b) {
        return compareValues(sortState.field, a, b) * sortState.dir;
      });
    }

    tbody.innerHTML = '';

    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.dataset.exercise = r.exercise;
      tr.dataset.org = r.org;

      var exerciseTd = document.createElement('td');
      exerciseTd.textContent = r.exercise;

      var orgTd = document.createElement('td');
      orgTd.textContent = r.org;

      var dateTd = document.createElement('td');
      dateTd.textContent = r.date;

      var summaryTd = document.createElement('td');
      summaryTd.textContent = r.summary;

      tr.appendChild(exerciseTd);
      tr.appendChild(orgTd);
      tr.appendChild(dateTd);
      tr.appendChild(summaryTd);

      tr.addEventListener('click', function () {
        window.location.href = 'report-detail.html?exercise=' + encodeURIComponent(r.exercise);
      });

      tbody.appendChild(tr);
    });
  }

  // ------------------------------------------------------------
  // Live filtering — no search button needed
  // ------------------------------------------------------------
  function applyFilters() {
    var nameVal = nameFilter.value.trim().toLowerCase();
    var orgVal = orgFilter.value;
    var visibleCount = 0;

    tbody.querySelectorAll('tr').forEach(function (tr) {
      var matchesName = nameVal === '' || tr.dataset.exercise.toLowerCase().indexOf(nameVal) !== -1;
      var matchesOrg = orgVal === 'all' || tr.dataset.org === orgVal;
      var show = matchesName && matchesOrg;
      tr.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    tablePanel.classList.toggle('is-empty', visibleCount === 0);
  }

  nameFilter.addEventListener('input', applyFilters);
  orgFilter.addEventListener('change', applyFilters);

  // ------------------------------------------------------------
  // Sortable column headers
  // ------------------------------------------------------------
  document.querySelectorAll('#reportsTable th[data-sort]').forEach(function (th) {
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
    });
  });

  function updateSortHeaders() {
    document.querySelectorAll('#reportsTable th[data-sort]').forEach(function (th) {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.sort === sortState.field) {
        th.classList.add(sortState.dir === 1 ? 'sort-asc' : 'sort-desc');
      }
    });
  }

  populateOrgOptions();
  buildRows();
  applyFilters();
  updateSortHeaders();

});
