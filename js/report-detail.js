document.addEventListener('DOMContentLoaded', function () {

  // ============================================================
  // Demo report data — this is a full on-screen overview, not the
  // final layout of the downloaded report. Each entry is keyed by
  // the exact exercise name shown on the Reporting list.
  //
  // Each checklist entry is grouped by slide (GDAK pre-authors a
  // couple of observation questions per slide of the exercise),
  // and each slide group can carry its own observer notes — notes
  // are per-slide, same as the checklist, not one block for the
  // whole exercise.
  // ============================================================
  var reportsData = {

    'Silent Sender (ERMM L1)': {
      org: 'GDAK',
      theme: 'Phishing & Social Engineering',
      completedAt: '27/07/2026 09:41',
      duration: '47 minutes',
      totalSlides: 12,
      facilitators: ['Ben Okafor'],
      observers: ['Beth Crawford'],
      participants: ['Louis Tucker'],
      checklist: [
        { slideNumber: 1, slideTitle: 'Exercise Title / Welcome', items: [
          { label: 'Facilitator introduced the exercise clearly', ticked: true },
          { label: 'Participants understood the objectives', ticked: true }
        ]},
        { slideNumber: 2, slideTitle: 'About Us', items: [
          { label: 'Organisational context was explained clearly', ticked: true },
          { label: 'Relevant sector experience was clearly conveyed', ticked: true }
        ]},
        { slideNumber: 3, slideTitle: 'What is a Cyber Incident Exercise?', items: [
          { label: 'Participants engaged with the format explanation', ticked: true },
          { label: 'The "safe to fail" environment was clearly explained', ticked: false }
        ]},
        { slideNumber: 4, slideTitle: 'How Do We Deliver CIE?', items: [
          { label: 'Questions about delivery format were addressed', ticked: true },
          { label: 'The TTX vs LPX distinction was clearly understood', ticked: true }
        ]},
        { slideNumber: 5, slideTitle: 'Introducing Excyte', items: [
          { label: 'Participants understood how the platform works', ticked: true },
          { label: 'The platform demo added value where shown', ticked: true }
        ]},
        { slideNumber: 6, slideTitle: 'Exercise Format', items: [
          { label: 'Roles and responsibilities were clearly assigned', ticked: true },
          { label: 'Logistics (A/V, comms channels) were confirmed working', ticked: true }
        ]},
        { slideNumber: 7, slideTitle: 'Exercise Roles', items: [
          { label: 'All participants understood their role', ticked: true },
          { label: 'Participants felt comfortable asking questions about their role', ticked: true }
        ]},
        { slideNumber: 8, slideTitle: 'Inject 1 \u2013 Detection', items: [
          { label: 'The team identified the incident promptly', ticked: true },
          { label: 'Initial triage was appropriate', ticked: true }
        ], notes: 'Louis engaged well with the phishing scenario, correctly identifying the suspicious email within the first two minutes.' },
        { slideNumber: 9, slideTitle: 'Inject 2 \u2013 Initial Response', items: [
          { label: 'Communication was timely and effective', ticked: true },
          { label: 'Escalation procedures were followed', ticked: true }
        ], notes: 'Communication with the (simulated) IT team was clear and structured. No issues with escalation timing.' },
        { slideNumber: 10, slideTitle: 'Inject 3 \u2013 Containment', items: [
          { label: 'Containment actions were appropriate', ticked: true },
          { label: 'Decision-making was appropriate under pressure', ticked: true }
        ], notes: 'Containment decisions were made quickly and communicated clearly, with no confusion over next steps.' },
        { slideNumber: 11, slideTitle: 'Inject 4 \u2013 Recovery', items: [
          { label: 'Recovery planning was realistic', ticked: true },
          { label: 'Regulatory and legal considerations were addressed', ticked: true }
        ], notes: "Recovery steps were outlined confidently, though the group didn't dwell long on regulatory notification requirements." },
        { slideNumber: 12, slideTitle: 'End Slide \u2013 Thanks for Taking Part', items: [
          { label: 'Overall participant engagement was strong', ticked: true },
          { label: 'Key learning points were clearly identified in the debrief', ticked: false }
        ], notes: 'Strong overall performance for a Level 1 exercise.' }
      ]
    },

    'Blackout Weekend (ERMM L2)': {
      org: 'GDAK',
      theme: 'Ransomware & Extortion',
      completedAt: '10/07/2026 10:00',
      duration: '1 hour 35 minutes',
      totalSlides: 12,
      facilitators: ['Ben Okafor', 'Nate W'],
      observers: ['Beth Crawford'],
      participants: ['Saleh Qadeer', 'Wali Ziai', 'Dennis Bastable-House', 'Ewan E', 'Mansour Nazifiasl', 'Mason', 'Wajiha Khalid', 'Atir'],
      checklist: [
        { slideNumber: 1, slideTitle: 'Exercise Title / Welcome', items: [
          { label: 'Facilitator introduced the exercise clearly', ticked: true },
          { label: 'Participants understood the objectives', ticked: true }
        ]},
        { slideNumber: 2, slideTitle: 'About Us', items: [
          { label: 'Organisational context was explained clearly', ticked: true },
          { label: 'Relevant sector experience was clearly conveyed', ticked: true }
        ]},
        { slideNumber: 3, slideTitle: 'What is a Cyber Incident Exercise?', items: [
          { label: 'Participants engaged with the format explanation', ticked: true },
          { label: 'The "safe to fail" environment was clearly explained', ticked: true }
        ]},
        { slideNumber: 4, slideTitle: 'How Do We Deliver CIE?', items: [
          { label: 'Questions about delivery format were addressed', ticked: true },
          { label: 'The TTX vs LPX distinction was clearly understood', ticked: true }
        ]},
        { slideNumber: 5, slideTitle: 'Introducing Excyte', items: [
          { label: 'Participants understood how the platform works', ticked: true },
          { label: 'The platform demo added value where shown', ticked: true }
        ]},
        { slideNumber: 6, slideTitle: 'Exercise Format', items: [
          { label: 'Roles and responsibilities were clearly assigned', ticked: true },
          { label: 'Logistics (A/V, comms channels) were confirmed working', ticked: false }
        ]},
        { slideNumber: 7, slideTitle: 'Exercise Roles', items: [
          { label: 'All participants understood their role', ticked: false },
          { label: 'Participants felt comfortable asking questions about their role', ticked: true }
        ]},
        { slideNumber: 8, slideTitle: 'Inject 1 \u2013 Detection', items: [
          { label: 'The team identified the incident promptly', ticked: true },
          { label: 'Initial triage was appropriate', ticked: true }
        ], notes: 'Detection was prompt, with the team quickly recognising the anomaly as unusual account activity rather than routine noise.' },
        { slideNumber: 9, slideTitle: 'Inject 2 \u2013 Initial Response', items: [
          { label: 'Communication was timely and effective', ticked: false },
          { label: 'Escalation procedures were followed', ticked: true }
        ], notes: "With a larger group, communication between workstreams broke down slightly \u2014 some participants weren't aware ransom negotiation was being handled by a separate subgroup. Escalation to the (simulated) board was well-timed." },
        { slideNumber: 10, slideTitle: 'Inject 3 \u2013 Containment', items: [
          { label: 'Containment actions were appropriate', ticked: true },
          { label: 'Decision-making was appropriate under pressure', ticked: true }
        ], notes: 'Overall decision-making under pressure was solid here.' },
        { slideNumber: 11, slideTitle: 'Inject 4 \u2013 Recovery', items: [
          { label: 'Recovery planning was realistic', ticked: true },
          { label: 'Regulatory and legal considerations were addressed', ticked: true }
        ], notes: 'Particularly strong planning around the recovery phase.' },
        { slideNumber: 12, slideTitle: 'End Slide \u2013 Thanks for Taking Part', items: [
          { label: 'Overall participant engagement was strong', ticked: true },
          { label: 'Key learning points were clearly identified in the debrief', ticked: true }
        ]}
      ]
    },

    'Clickbait Crisis': {
      org: 'GDAK',
      theme: 'Phishing & Social Engineering',
      completedAt: '05/07/2026 09:15',
      duration: '2 hours 10 minutes',
      totalSlides: 12,
      facilitators: ['Nate W'],
      observers: ['Beth Crawford', 'Zainab Fatima'],
      participants: ['Saleh Qadeer', 'Geeks Admin', 'Wali Ziai', 'Dennis Bastable-House', 'Ewan E', 'Mansour Nazifiasl', 'Mason', 'TEST', 'Wajiha Khalid', 'Atir', 'Imran Zabih', 'Joely Butler'],
      checklist: [
        { slideNumber: 1, slideTitle: 'Exercise Title / Welcome', items: [
          { label: 'Facilitator introduced the exercise clearly', ticked: true },
          { label: 'Participants understood the objectives', ticked: true }
        ], notes: 'Strong engagement across a large participant group from the outset.' },
        { slideNumber: 2, slideTitle: 'About Us', items: [
          { label: 'Organisational context was explained clearly', ticked: true },
          { label: 'Relevant sector experience was clearly conveyed', ticked: true }
        ]},
        { slideNumber: 3, slideTitle: 'What is a Cyber Incident Exercise?', items: [
          { label: 'Participants engaged with the format explanation', ticked: true },
          { label: 'The "safe to fail" environment was clearly explained', ticked: true }
        ]},
        { slideNumber: 4, slideTitle: 'How Do We Deliver CIE?', items: [
          { label: 'Questions about delivery format were addressed', ticked: false },
          { label: 'The TTX vs LPX distinction was clearly understood', ticked: true }
        ]},
        { slideNumber: 5, slideTitle: 'Introducing Excyte', items: [
          { label: 'Participants understood how the platform works', ticked: true },
          { label: 'The platform demo added value where shown', ticked: true }
        ]},
        { slideNumber: 6, slideTitle: 'Exercise Format', items: [
          { label: 'Roles and responsibilities were clearly assigned', ticked: true },
          { label: 'Logistics (A/V, comms channels) were confirmed working', ticked: false }
        ]},
        { slideNumber: 7, slideTitle: 'Exercise Roles', items: [
          { label: 'All participants understood their role', ticked: true },
          { label: 'Participants felt comfortable asking questions about their role', ticked: true }
        ]},
        { slideNumber: 8, slideTitle: 'Inject 1 \u2013 Detection', items: [
          { label: 'The team identified the incident promptly', ticked: true },
          { label: 'Initial triage was appropriate', ticked: true }
        ], notes: 'The larger group split into sub-teams effectively to triage the volume of reports coming in.' },
        { slideNumber: 9, slideTitle: 'Inject 2 \u2013 Initial Response', items: [
          { label: 'Communication was timely and effective', ticked: true },
          { label: 'Escalation procedures were followed', ticked: false }
        ], notes: 'Escalation procedures were not followed consistently \u2014 several participants attempted to resolve the issue internally before notifying the incident response lead, which delayed containment slightly.' },
        { slideNumber: 10, slideTitle: 'Inject 3 \u2013 Containment', items: [
          { label: 'Containment actions were appropriate', ticked: true },
          { label: 'Decision-making was appropriate under pressure', ticked: true }
        ], notes: 'Decision-making quality remained high throughout, and communication across the group was clear and well-coordinated.' },
        { slideNumber: 11, slideTitle: 'Inject 4 \u2013 Recovery', items: [
          { label: 'Recovery planning was realistic', ticked: true },
          { label: 'Regulatory and legal considerations were addressed', ticked: true }
        ], notes: 'Recovery planning was thorough, with clear ownership assigned for each remediation step.' },
        { slideNumber: 12, slideTitle: 'End Slide \u2013 Thanks for Taking Part', items: [
          { label: 'Overall participant engagement was strong', ticked: true },
          { label: 'Key learning points were clearly identified in the debrief', ticked: true }
        ]}
      ]
    },

    'Exercise Donor Shield': {
      org: 'ASYAD',
      theme: 'Ransomware & Extortion',
      completedAt: '28/06/2026 13:00',
      duration: '1 hour 5 minutes',
      totalSlides: 12,
      facilitators: ['Ben Okafor'],
      observers: ['Wajiha Khalid'],
      participants: ['DaveH', 'Zainab - S', 'Marcus Stanislawski', 'Joely Butler', 'Imran Zabih', 'TEST'],
      checklist: [
        { slideNumber: 1, slideTitle: 'Exercise Title / Welcome', items: [
          { label: 'Facilitator introduced the exercise clearly', ticked: true },
          { label: 'Participants understood the objectives', ticked: true }
        ]},
        { slideNumber: 2, slideTitle: 'About Us', items: [
          { label: 'Organisational context was explained clearly', ticked: true },
          { label: 'Relevant sector experience was clearly conveyed', ticked: false }
        ]},
        { slideNumber: 3, slideTitle: 'What is a Cyber Incident Exercise?', items: [
          { label: 'Participants engaged with the format explanation', ticked: true },
          { label: 'The "safe to fail" environment was clearly explained', ticked: true }
        ]},
        { slideNumber: 4, slideTitle: 'How Do We Deliver CIE?', items: [
          { label: 'Questions about delivery format were addressed', ticked: false },
          { label: 'The TTX vs LPX distinction was clearly understood', ticked: true }
        ]},
        { slideNumber: 5, slideTitle: 'Introducing Excyte', items: [
          { label: 'Participants understood how the platform works', ticked: true },
          { label: 'The platform demo added value where shown', ticked: true }
        ]},
        { slideNumber: 6, slideTitle: 'Exercise Format', items: [
          { label: 'Roles and responsibilities were clearly assigned', ticked: true },
          { label: 'Logistics (A/V, comms channels) were confirmed working', ticked: true }
        ]},
        { slideNumber: 7, slideTitle: 'Exercise Roles', items: [
          { label: 'All participants understood their role', ticked: true },
          { label: 'Participants felt comfortable asking questions about their role', ticked: true }
        ]},
        { slideNumber: 8, slideTitle: 'Inject 1 \u2013 Detection', items: [
          { label: 'The team identified the incident promptly', ticked: true },
          { label: 'Initial triage was appropriate', ticked: true }
        ], notes: 'Detection was quick given the small team size, with the facilitator on hand to keep the group focused.' },
        { slideNumber: 9, slideTitle: 'Inject 2 \u2013 Initial Response', items: [
          { label: 'Communication was timely and effective', ticked: true },
          { label: 'Escalation procedures were followed', ticked: true }
        ], notes: 'The team handled detection and escalation well for a smaller group.' },
        { slideNumber: 10, slideTitle: 'Inject 3 \u2013 Containment', items: [
          { label: 'Containment actions were appropriate', ticked: true },
          { label: 'Decision-making was appropriate under pressure', ticked: false }
        ], notes: 'Decision-making slowed noticeably here \u2014 there was some hesitation before committing to the recovery plan, though it was resolved without lasting impact.' },
        { slideNumber: 11, slideTitle: 'Inject 4 \u2013 Recovery', items: [
          { label: 'Recovery planning was realistic', ticked: true },
          { label: 'Regulatory and legal considerations were addressed', ticked: true }
        ], notes: 'Recovery planning was kept simple and pragmatic, appropriate for the scale of the exercise.' },
        { slideNumber: 12, slideTitle: 'End Slide \u2013 Thanks for Taking Part', items: [
          { label: 'Overall participant engagement was strong', ticked: true },
          { label: 'Key learning points were clearly identified in the debrief', ticked: false }
        ], notes: 'Overall a solid exercise given the reduced participant count.' }
      ]
    }

  };

  // Reports created by actually finishing a custom exercise (via
  // js/exercise-delivery.js) are stored here, keyed by exercise name —
  // merge them in so they're viewable the same way as the demo reports.
  var CUSTOM_REPORTS_KEY = 'excyteCustomReports';
  try {
    var customReports = JSON.parse(localStorage.getItem(CUSTOM_REPORTS_KEY)) || {};
    for (var exName in customReports) {
      reportsData[exName] = customReports[exName];
    }
  } catch (e) {}

  var DEFAULT_EXERCISE = 'Silent Sender (ERMM L1)';

  var params = new URLSearchParams(window.location.search);
  var exerciseName = params.get('exercise') || DEFAULT_EXERCISE;
  var report = reportsData[exerciseName] || reportsData[DEFAULT_EXERCISE];

  if (!reportsData[exerciseName]) {
    exerciseName = DEFAULT_EXERCISE;
  }

  document.title = 'Excyte | ' + exerciseName + ' Report';
  document.getElementById('pageTitle').textContent = 'Exercise Report';
  document.getElementById('reportSubtitle').textContent = exerciseName + ' \u00b7 ' + report.org;

  // ------------------------------------------------------------
  // Summary — rule-based, not AI. Just tallies the observation
  // checklist and turns the numbers into plain sentences.
  // ------------------------------------------------------------
  (function renderSummary() {
    var allItems = [];
    if (report.checklist) {
      report.checklist.forEach(function (group) {
        group.items.forEach(function (item) { allItems.push(item); });
      });
    }

    var totalAttendees = report.facilitators.length + report.observers.length + report.participants.length;
    var attendanceSentence = 'The session ran for ' + report.duration + ' across ' + report.totalSlides + ' slides, with ' +
      totalAttendees + ' ' + (totalAttendees === 1 ? 'person' : 'people') + ' involved (' +
      report.facilitators.length + ' facilitator' + (report.facilitators.length === 1 ? '' : 's') + ', ' +
      report.observers.length + ' observer' + (report.observers.length === 1 ? '' : 's') + ', ' +
      report.participants.length + ' participant' + (report.participants.length === 1 ? '' : 's') + ').';

    var headlineEl = document.getElementById('summaryHeadline');
    var contextEl = document.getElementById('summaryContext');
    var statEl = document.getElementById('summaryStat');
    var improvementsEl = document.getElementById('summaryImprovements');

    // Attendance/duration is now folded into the main paragraph below
    contextEl.style.display = 'none';
    contextEl.textContent = '';

    if (report.observers.length === 0 || allItems.length === 0) {
      headlineEl.textContent = 'No observer was assigned to this exercise, so a detailed performance breakdown isn\u2019t available. ' + attendanceSentence;
      statEl.style.display = 'none';
      return;
    }

    var tickedCount = allItems.filter(function (item) { return item.ticked; }).length;
    var pct = Math.round((tickedCount / allItems.length) * 100);
    var improvements = allItems.filter(function (item) { return !item.ticked; }).map(function (item) { return item.label; });

    var headline, strength, barColor;
    if (pct >= 90) {
      headline = 'This was a strong exercise, with excellent adherence to expected practices across the session.';
      strength = 'Facilitation, participant engagement and adherence to expected practices were consistently strong throughout.';
      barColor = 'var(--teal)';
    } else if (pct >= 75) {
      headline = 'This was a solid exercise overall, with good performance against most observation criteria.';
      strength = 'Most phases of the exercise were handled well, with participants demonstrating a good working understanding of their roles and responsibilities.';
      barColor = 'var(--teal)';
    } else if (pct >= 50) {
      headline = 'This exercise showed mixed results, with several areas performing well and others needing attention.';
      strength = 'Some phases were handled confidently, though performance varied noticeably across the session.';
      barColor = '#E8A33D';
    } else {
      headline = 'This exercise highlighted significant areas for improvement across multiple observation criteria.';
      strength = 'While the exercise surfaced valuable learning points, performance was inconsistent across several phases of the session.';
      barColor = '#D64545';
    }

    var elaboration;
    if (improvements.length === 0) {
      elaboration = 'Every observation criterion was met in full, with no specific concerns raised by the observer.';
    } else if (improvements.length === 1) {
      elaboration = 'The only criterion not fully met was \u201c' + improvements[0] + '\u201d, which is worth reviewing before the next run of this exercise.';
    } else {
      elaboration = improvements.length + ' criteria were not fully met, most notably \u201c' + improvements[0] + '\u201d and \u201c' + improvements[1] + '\u201d' +
        (improvements.length > 2 ? ', among others' : '') + ' \u2014 see the full breakdown below for details.';
    }

    var closing;
    if (pct >= 90) {
      closing = 'Overall, this was a strong, well-executed exercise that met its objectives.';
    } else if (pct >= 75) {
      closing = 'Overall, this was a solid exercise that met most of its objectives, with minor refinements worth considering for next time.';
    } else if (pct >= 50) {
      closing = 'Overall, the exercise met some of its objectives but highlighted specific areas the team should revisit before the next run.';
    } else {
      closing = 'Overall, this exercise surfaced significant gaps that should be addressed before repeating similar scenarios.';
    }

    headlineEl.textContent = '';
    var leadEl = document.createElement('strong');
    leadEl.textContent = headline;
    headlineEl.appendChild(leadEl);
    headlineEl.appendChild(document.createTextNode(' ' + strength + ' Of the ' + allItems.length +
      ' observation criteria assessed across the ' + report.totalSlides + '-slide session, ' + tickedCount +
      ' were fully met (' + pct + '%). ' + elaboration + ' ' + attendanceSentence + ' ' + closing));

    statEl.style.display = '';
    document.getElementById('summaryStatFill').style.width = pct + '%';
    document.getElementById('summaryStatFill').style.background = barColor;
    document.getElementById('summaryStatLabel').textContent =
      pct + '% of observation criteria met (' + tickedCount + ' of ' + allItems.length + ')';

    if (improvements.length > 0) {
      var heading = document.createElement('div');
      heading.className = 'observer-notes-heading';
      heading.textContent = 'Areas for Improvement';
      improvementsEl.appendChild(heading);

      var ul = document.createElement('ul');
      ul.className = 'summary-improvement-list';
      improvements.forEach(function (label) {
        var li = document.createElement('li');
        li.textContent = label;
        ul.appendChild(li);
      });
      improvementsEl.appendChild(ul);
    } else {
      var none = document.createElement('p');
      none.className = 'summary-no-improvements';
      none.textContent = 'No specific areas for improvement were flagged \u2014 every observation criterion was met.';
      improvementsEl.appendChild(none);
    }
  })();

  // ------------------------------------------------------------
  // Exercise Overview
  // ------------------------------------------------------------
  document.getElementById('ovOrg').textContent = report.org;
  document.getElementById('ovExercise').textContent = exerciseName;
  document.getElementById('ovTheme').textContent = report.theme;
  document.getElementById('ovCompleted').textContent = report.completedAt;
  document.getElementById('ovDuration').textContent = report.duration;
  document.getElementById('ovSlides').textContent = report.totalSlides;

  // ------------------------------------------------------------
  // Attendance Summary
  // ------------------------------------------------------------
  function renderAttendanceList(listId, countId, names) {
    document.getElementById(countId).textContent = names.length;
    var list = document.getElementById(listId);
    list.innerHTML = '';

    if (names.length === 0) {
      var li = document.createElement('li');
      li.className = 'attendance-empty';
      li.textContent = 'None';
      list.appendChild(li);
      return;
    }

    names.forEach(function (name) {
      var item = document.createElement('li');
      item.textContent = name;
      list.appendChild(item);
    });
  }

  renderAttendanceList('facilitatorList', 'facilitatorCount', report.facilitators);
  renderAttendanceList('observerList', 'observerCount', report.observers);
  renderAttendanceList('participantListReport', 'participantCount', report.participants);

  // ------------------------------------------------------------
  // Observations — checklist grouped by slide, with that slide's
  // observer notes (if any) shown right after its questions. Shows
  // a placeholder if no observer was present for this exercise.
  // ------------------------------------------------------------
  var observationsContent = document.getElementById('observationsContent');

  if (report.observers.length === 0 || !report.checklist) {
    var empty = document.createElement('p');
    empty.className = 'observations-empty';
    empty.textContent = 'No observer was assigned to this exercise, so no observation data is available.';
    observationsContent.appendChild(empty);
  } else {
    report.checklist.forEach(function (group, groupIdx) {
      var block = document.createElement('div');
      block.className = 'observation-slide-block';

      var header = document.createElement('div');
      header.className = 'observation-slide-header';

      var number = document.createElement('span');
      number.className = 'observation-slide-number';
      number.textContent = 'Slide ' + (group.slideNumber || groupIdx + 1);

      var title = document.createElement('span');
      title.className = 'observation-slide-title';
      title.textContent = group.slideTitle;

      header.appendChild(number);
      header.appendChild(title);
      block.appendChild(header);

      group.items.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'obs-item ' + (item.ticked ? 'ticked' : 'unticked');

        var icon = document.createElement('span');
        icon.className = 'obs-item-icon';
        icon.innerHTML = item.ticked
          ? '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>'
          : '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

        var label = document.createElement('span');
        label.className = 'obs-item-label';
        label.textContent = item.label;

        row.appendChild(icon);
        row.appendChild(label);
        block.appendChild(row);
      });

      if (group.notes) {
        var noteBox = document.createElement('p');
        noteBox.className = 'observation-slide-note';
        noteBox.textContent = group.notes;
        block.appendChild(noteBox);
      }

      observationsContent.appendChild(block);
    });
  }

  // ------------------------------------------------------------
  // Back button + footer links
  // ------------------------------------------------------------
  document.getElementById('backBtn').addEventListener('click', function () {
    window.location.href = 'reporting.html';
  });

  document.querySelectorAll('.footer-links a').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
    });
  });

});
