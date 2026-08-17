document.addEventListener('DOMContentLoaded', function () {

  // ============================================================
  // BUILDER PREVIEW MODE DETECTION
  // If opened from exercise builder, load builder slides instead
  // ============================================================
  var isBuilderPreview = sessionStorage.getItem('builderPreviewMode') === 'true';
  var builderPreviewSlides = null;
  var builderCurrentSlideIndex = 0;
  var builderPreviewThemeBg = '#ffffff';

  if (isBuilderPreview) {
    try {
      builderPreviewSlides = JSON.parse(sessionStorage.getItem('builderPreviewSlides'));
      builderCurrentSlideIndex = parseInt(sessionStorage.getItem('builderCurrentSlideIndex')) || 0;
      builderPreviewThemeBg = sessionStorage.getItem('builderPreviewThemeBg') || '#ffffff';
      document.body.classList.add('builder-preview-mode');
    } catch (e) {
      console.error('Failed to load builder preview data:', e);
      isBuilderPreview = false;
    }
  }

  // ------------------------------------------------------------
  // Builder slide rendering — reproduces the authored slide (layout
  // placeholders, text boxes, tables, images) using the same markup/
  // CSS as the builder canvas (css/builder.css), so the preview shows
  // slides exactly as they appear in the builder. Static/non-
  // interactive versions of the builder's own render functions.
  // ------------------------------------------------------------
  var BUILDER_PICTURE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5.5-5.5L11 15l-3-3-4 4"/></svg>';

  var BUILDER_LAYOUTS = [
    {
      id: 'title-slide',
      placeholders: [
        { top: 18, left: 13, width: 74, height: 32, text: 'Click to add title', variant: 'title-center' },
        { top: 52, left: 13, width: 74, height: 26, text: 'Click to add subtitle', variant: 'subtitle' }
      ]
    },
    {
      id: 'title-content',
      placeholders: [
        { top: 10, left: 6, width: 88, height: 18, text: 'Click to add title', variant: 'title' },
        { top: 31, left: 6, width: 88, height: 62, text: '• Click to add text', variant: 'content' }
      ]
    },
    {
      id: 'section-header',
      placeholders: [
        { top: 48, left: 6, width: 70, height: 16, text: 'Click to add title', variant: 'title-bottom' },
        { top: 67, left: 6, width: 70, height: 20, text: 'Click to add text', variant: 'section-body' }
      ]
    },
    {
      id: 'two-content',
      placeholders: [
        { top: 10, left: 6, width: 88, height: 18, text: 'Click to add title', variant: 'title' },
        { top: 31, left: 6, width: 41, height: 62, text: '• Click to add text', variant: 'content' },
        { top: 31, left: 53, width: 41, height: 62, text: '• Click to add text', variant: 'content' }
      ]
    },
    {
      id: 'title-only',
      placeholders: [
        { top: 10, left: 6, width: 88, height: 18, text: 'Click to add title', variant: 'title' }
      ]
    },
    {
      id: 'picture-caption',
      placeholders: [
        { top: 10, left: 6, width: 34, height: 18, text: 'Click to add title', variant: 'title' },
        { top: 31, left: 6, width: 34, height: 62, text: 'Click to add text', variant: 'subtitle' },
        { top: 10, left: 43, width: 51, height: 83, text: 'Click to add picture', variant: 'picture' }
      ]
    },
    {
      id: 'blank',
      placeholders: []
    }
  ];

  function getBuilderLayoutById(id) {
    for (var i = 0; i < BUILDER_LAYOUTS.length; i++) {
      if (BUILDER_LAYOUTS[i].id === id) return BUILDER_LAYOUTS[i];
    }
    return BUILDER_LAYOUTS[BUILDER_LAYOUTS.length - 1]; // 'blank'
  }

  function buildStaticTextBox(boxData) {
    var el = document.createElement('div');
    el.className = 'text-box';
    if (boxData.fromLayout) {
      el.classList.add('from-layout');
      if (boxData.variant) el.classList.add('variant-' + boxData.variant);
      el.style.width = boxData.widthPct + '%';
      el.style.height = boxData.heightPct + '%';
    }
    el.style.left = boxData.leftPct + '%';
    el.style.top = boxData.topPct + '%';
    el.textContent = boxData.text || '';
    if (!boxData.text) {
      el.classList.add('is-empty');
      el.setAttribute('data-placeholder', boxData.placeholder || 'Click to add text');
    }
    return el;
  }

  function buildStaticTable(data) {
    var wrap = document.createElement('div');
    wrap.className = 'canvas-table-wrap';
    wrap.style.left = data.leftPct + '%';
    wrap.style.top = data.topPct + '%';

    var table = document.createElement('table');
    table.className = 'canvas-table';
    (data.rows || []).forEach(function (rowValues) {
      var tr = document.createElement('tr');
      rowValues.forEach(function (cellText) {
        var td = document.createElement('td');
        td.textContent = cellText || '';
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    wrap.appendChild(table);
    return wrap;
  }

  function buildStaticImage(data) {
    var wrap = document.createElement('div');
    wrap.className = 'canvas-image-wrap';
    wrap.style.left = data.leftPct + '%';
    wrap.style.top = data.topPct + '%';
    wrap.style.width = data.widthPct + '%';
    wrap.style.height = data.heightPct + '%';

    var img = document.createElement('img');
    img.className = 'canvas-image-el';
    img.src = data.src;
    img.alt = '';
    img.draggable = false;
    wrap.appendChild(img);
    return wrap;
  }

  // Picks out the first hex colour in a background value (solid or
  // linear-gradient string) and judges whether it's dark enough that
  // the logo needs to switch to its light/contrast variant — mirrors
  // isDarkBackground in exercise-builder.js so the preview matches
  // whatever the builder itself would show.
  function isDarkBackground(bgValue) {
    if (!bgValue) return false;
    var match = bgValue.match(/#([0-9a-f]{6}|[0-9a-f]{3})/i);
    if (!match) return false;
    var hex = match[1];
    if (hex.length === 3) {
      hex = hex.split('').map(function (c) { return c + c; }).join('');
    }
    var r = parseInt(hex.substr(0, 2), 16);
    var g = parseInt(hex.substr(2, 2), 16);
    var b = parseInt(hex.substr(4, 2), 16);
    var luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 140;
  }

  function renderBuilderSlideCanvas(slide) {
    var canvasEl = document.getElementById('builderSlideCanvas');
    canvasEl.style.background = builderPreviewThemeBg;
    canvasEl.classList.toggle('dark-bg', isDarkBackground(builderPreviewThemeBg));

    var layoutRenderEl = document.getElementById('builderSlideLayoutRender');
    layoutRenderEl.innerHTML = '';
    var layout = getBuilderLayoutById(slide.layout);
    layout.placeholders.forEach(function (ph) {
      if (ph.variant !== 'picture') return;
      var box = document.createElement('div');
      box.className = 'slide-ph slide-ph-' + ph.variant;
      box.style.top = ph.top + '%';
      box.style.left = ph.left + '%';
      box.style.width = ph.width + '%';
      box.style.height = ph.height + '%';
      box.innerHTML = BUILDER_PICTURE_ICON + '<span>' + ph.text + '</span>';
      layoutRenderEl.appendChild(box);
    });

    var objectLayerEl = document.getElementById('builderObjectLayer');
    objectLayerEl.innerHTML = '';
    (slide.objects || []).forEach(function (obj) {
      var el;
      if (obj.type === 'table') el = buildStaticTable(obj);
      else if (obj.type === 'image') el = buildStaticImage(obj);
      else el = buildStaticTextBox(obj);
      objectLayerEl.appendChild(el);
    });
  }

  // ============================================================
  // Placeholder slide deck — titles only, no real slide artwork
  // (the black canvas just shows the slide number/title). Used for
  // every exercise except the ones below with a real deck.
  // Prompts are per-slide facilitator talking points.
  // ============================================================
  var DEFAULT_SLIDE_TITLES = [
    'Exercise Title / Welcome', 'About Us', 'What is a Cyber Incident Exercise?',
    'How Do We Deliver CIE?', 'Introducing Excyte', 'Exercise Format',
    'Exercise Roles', 'Inject 1 \u2013 Detection', 'Inject 2 \u2013 Initial Response',
    'Inject 3 \u2013 Containment', 'Inject 4 \u2013 Recovery', 'End Slide \u2013 Thanks for Taking Part'
  ];

  var DEFAULT_SLIDE_PROMPTS = [
    ['Welcome participants and introduce the facilitator team.', 'Explain exercise objectives and ground rules.', 'Confirm roles and confirm recording consent if applicable.'],
    ["Explain the organisation's background and assured status.", 'Note any relevant experience specific to this sector.'],
    ['Ask: has the group participated in a cyber exercise before?', 'Clarify the difference between a TTX and live-play.', 'Emphasise the "safe to fail" environment.'],
    ['Check understanding of TTX vs LPX.', 'Ask which format they currently use internally.', 'Have you considered the reputational impact of each action?'],
    ['Demonstrate the platform briefly if time allows.', 'Note that exercises are fully customisable.'],
    ['Confirm participant count and role assignments.', 'Distribute any physical handout materials at this point.', 'Check A/V and comms channels are working.'],
    ['Confirm each role is assigned to at least one person.', 'Allow participants to briefly introduce themselves in role.', 'Remind participants: there are no wrong answers.'],
    ['Read out Inject 1 clearly. Pause for questions.', 'Observe who speaks first \u2014 note for debrief.', "Ask: What is your team's immediate priority?"],
    ['Escalate the scenario with energy.', 'Monitor cross-team communication.', "Prompt: Who do you need to inform? What happens if you don't?"],
    ['Apply time pressure \u2014 announce a 5-minute countdown.', 'Challenge containment decisions: is that enough?', 'Probe the decision-making process, not just the outcome.'],
    ['Explore recovery assumptions \u2014 are they realistic?', 'Ask: What regulatory notifications are required?', 'How will you communicate with staff and customers?'],
    ['Facilitate a brief hot-debrief: what went well?', 'Identify 3 key learning points from the group.', 'Outline next steps.']
  ];

  // Observation checklist questions, pre-authored by GDAK per slide of
  // this exercise (this is why "Create New Event" doesn't ask for any
  // exercise content — the exercise, its slides, and its observation
  // questions already exist; creating an event just schedules a run of it).
  var DEFAULT_SLIDE_OBSERVATION_QUESTIONS = [
    ['Facilitator introduced the exercise clearly', 'Participants understood the objectives'],
    ['Organisational context was explained clearly', 'Relevant sector experience was clearly conveyed'],
    ['Participants engaged with the format explanation', 'The "safe to fail" environment was clearly explained'],
    ['Questions about delivery format were addressed', 'The TTX vs LPX distinction was clearly understood'],
    ['Participants understood how the platform works', 'The platform demo added value where shown'],
    ['Roles and responsibilities were clearly assigned', 'Logistics (A/V, comms channels) were confirmed working'],
    ['All participants understood their role', 'Participants felt comfortable asking questions about their role'],
    ['The team identified the incident promptly', 'Initial triage was appropriate'],
    ['Communication was timely and effective', 'Escalation procedures were followed'],
    ['Containment actions were appropriate', 'Decision-making was appropriate under pressure'],
    ['Recovery planning was realistic', 'Regulatory and legal considerations were addressed'],
    ['Overall participant engagement was strong', 'Key learning points were clearly identified in the debrief']
  ];

  // ============================================================
  // Real per-exercise slide decks. Falls back to the generic
  // placeholder deck above for every exercise not listed here.
  // ============================================================
  var EXERCISE_SLIDE_DECKS = {

    'Blackline Breaker': {
      images: [
        '../assets/exercises/blackline-breaker/slide-01-title.jpg',
        '../assets/exercises/blackline-breaker/slide-02-guidance.jpg',
        '../assets/exercises/blackline-breaker/slide-03-context.jpg',
        '../assets/exercises/blackline-breaker/slide-04-inject1.jpg',
        '../assets/exercises/blackline-breaker/slide-05-inject2.jpg',
        '../assets/exercises/blackline-breaker/slide-06-inject3.jpg',
        '../assets/exercises/blackline-breaker/slide-07-inject4.jpg',
        '../assets/exercises/blackline-breaker/slide-08-inject5.jpg',
        '../assets/exercises/blackline-breaker/slide-09-inject6.jpg',
        '../assets/exercises/blackline-breaker/slide-10-end.jpg'
      ],
      titles: [
        'Remote Hands \u2013 Welcome', 'Guidance for Participants', 'Context',
        'Inject 1 \u2013 Unexpected Vendor Session', 'Inject 2 \u2013 Operator Screens Drift',
        'Inject 3 \u2013 Supplier Uncertainty', 'Inject 4 \u2013 Manual Operation Pressure',
        'Inject 5 \u2013 External Confidence Drops', 'Inject 6 \u2013 Recovering Under Scrutiny',
        'Remote Hands \u2013 Thank You'
      ],
      prompts: [
        ['Welcome participants and introduce the "Remote Hands" scenario.', 'Confirm the 2-hour running time and check logistics.', 'Note this is an Operational Technology (OT) exercise \u2014 remind the group why OT incidents carry safety as well as cyber risk.'],
        ['Explain the Participant role: respond as you would in reality, with limited prior knowledge of the scenario.', 'Clarify that facilitators may pause the exercise to highlight a learning point.', 'Confirm any teams or external entities not present will be roleplayed.'],
        ['Set the scene: 07:20 on a weekday morning at an OT production site.', 'Introduce Northbridge Controls as the long-standing, approved remote maintenance vendor.', 'Highlight the unexplained remote sessions between 02:10 and 03:40 \u2014 no approved change, no one recalls authorising it.'],
        ['Read out the alert: a Northbridge support account connected overnight and browsed PLC project files, network diagrams and maintenance documentation.', 'Stress the account is legitimate and MFA-enabled \u2014 this is a judgement call, not a clear-cut breach.', "Run the Bonus Task: Declare or Monitor? Give small groups time to weigh what facts support declaration, what's still uncertain, who needs informing, and what to do in the next 30 minutes."],
        ['Escalate: HMI latency, delayed alarm acknowledgements, one tank level briefly showing an impossible value.', 'Reference the TRITON malware parallel (safety controllers at a petrochemical facility) from "Why is this relevant".', 'Ask the group: how do you verify displayed OT data can still be trusted when confidence is falling?'],
        ['Northbridge confirms it\u2019s investigating but cannot rule its engineer in or out, and wants the remote gateway kept open in case support is needed.', 'Reveal failed login attempts against a second engineering workstation, plus a historian and file share query from the same account.', 'Run the Bonus Task: Access Review \u2014 have the group list every route a supplier could use to access or influence OT systems (gateway, VPN, jump host, shared accounts, privileged vendor accounts).'],
        ['Security recommends disabling the supplier account, closing the gateway, and isolating the workstation for forensics.', 'OT engineering agrees but warns a critical process change is due later that day, and may need rarely-used manual procedures without vendor support.', 'Run the Bonus Task: Executive Decision Brief \u2014 60 seconds, must cover recommended option, operational impact, cyber risk, safety consideration, evidence still needed, and decision owner.'],
        ['Confirm containment: supplier account disabled, workstation isolated, process change delayed, production continuing at reduced capacity.', 'Reveal Northbridge now confirms other customer accounts may have been misused via its own compromised support system.', 'Run the Bonus Task: One Version of the Truth \u2014 in small groups, draft an internal staff update, a customer holding line, and a board summary that don\u2019t contradict each other.'],
        ['The organisation remains at reduced capacity \u2014 the customer wants a timeline for normal service, the regulator wants evidence recovery won\u2019t introduce safety or operational risk.', 'Surface the tension: Operations wants capacity restored quickly; OT engineering and security insist recovery must be controlled, evidenced and monitored.', 'Ask: what evidence would actually satisfy the regulator here?'],
        ['Facilitate a brief hot debrief: what went well?', 'Identify 2\u20133 key learning points about third-party access to OT systems.', 'Thank participants and point them to the Excyte library for more scenarios.']
      ],
      observationQuestions: [
        ['Facilitator introduced the exercise and its objectives clearly', 'The 2-hour running time and logistics were confirmed clearly'],
        ['Participants understood their role and the exercise ground rules', 'Facilitators clarified how paused or roleplayed elements would work'],
        ['Participants engaged with the scenario context', 'The overnight vendor session timeline was clearly understood'],
        ['The team identified the incident promptly', 'Initial triage was appropriate given the ambiguity'],
        ['The team questioned the reliability of OT data appropriately', 'Communication was timely and effective'],
        ['The team assessed supplier access risk thoroughly', 'Escalation procedures were followed'],
        ['The trade-off between security and operational continuity was handled well', 'Decision-making was appropriate under pressure'],
        ['Containment actions were appropriate', 'Communication to customers, regulators and staff was consistent'],
        ['Recovery planning was realistic', 'Regulatory and safety considerations were addressed'],
        ['Overall participant engagement was strong', 'The debrief surfaced clear, actionable learning points']
      ]
    }

  };

  // ============================================================
  // Demo event attendee data (mirrors the hardcoded entry in
  // js/exercise-events.js — same id, so the play buttons there
  // link straight through to this).
  // ============================================================
  var demoEvents = {
    'demo-silent-sender': {
      exercise: 'Silent Sender (ERMM L1)',
      org: 'ASYAD',
      facilitators: ['Ben Okafor'],
      observers: ['Beth Crawford'],
      participants: ['Louis Tucker']
    }
  };

  var STORAGE_KEY = 'excyteCustomEvents';

  function findCustomEvent(eventId) {
    var all = {};
    try {
      all = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      all = {};
    }
    for (var exerciseName in all) {
      var rows = all[exerciseName] || [];
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].id === eventId) {
          return {
            exercise: exerciseName,
            org: rows[i].org,
            facilitators: rows[i].facilitators || [],
            observers: rows[i].observers || [],
            participants: rows[i].participants || []
          };
        }
      }
    }
    return null;
  }

  // ------------------------------------------------------------
  // Work out role + which event this is
  // ------------------------------------------------------------
  var params = new URLSearchParams(window.location.search);

  var role = params.get('role') || 'facilitator';
  if (['facilitator', 'observer', 'participant'].indexOf(role) === -1) {
    role = 'facilitator';
  }
  document.body.setAttribute('data-role', role);

  var eventId = params.get('eventId') || '';
  var eventInfo = demoEvents[eventId] || findCustomEvent(eventId);

  if (!eventInfo) {
    eventInfo = {
      exercise: params.get('exercise') || 'Cyber Incident Exercise',
      org: params.get('org') || '',
      facilitators: [],
      observers: [],
      participants: []
    };
  }

  document.title = 'Excyte | ' + eventInfo.exercise;
  document.getElementById('eventTitle').textContent =
    eventInfo.exercise + (eventInfo.org ? ' \u00b7 ' + eventInfo.org : '');

  // This exercise's real deck if one exists, otherwise the generic
  // placeholder deck. Everything else in this file reads from these
  // three "active" variables rather than the DEFAULT_/EXERCISE_ ones
  // directly.
  var activeDeck = EXERCISE_SLIDE_DECKS[eventInfo.exercise] || null;
  var activeTitles = activeDeck ? activeDeck.titles : DEFAULT_SLIDE_TITLES;
  var activePrompts = activeDeck ? activeDeck.prompts : DEFAULT_SLIDE_PROMPTS;
  var activeObservationQuestions = activeDeck ? activeDeck.observationQuestions : DEFAULT_SLIDE_OBSERVATION_QUESTIONS;

  // ------------------------------------------------------------
  // Elapsed timer — counts up from page load
  // ------------------------------------------------------------
  var startTime = Date.now();

  function pad(n) { return String(n).padStart(2, '0'); }

  function updateClock() {
    var elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('elapsed').textContent =
      pad(Math.floor(elapsed / 3600)) + ':' + pad(Math.floor((elapsed % 3600) / 60)) + ':' + pad(elapsed % 60);
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ------------------------------------------------------------
  // Attendees panel
  // ------------------------------------------------------------
  function renderList(containerId, names, dotClass) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';

    if (names.length === 0) {
      var none = document.createElement('div');
      none.className = 'attendee-name empty';
      none.textContent = 'None listed';
      container.appendChild(none);
      return;
    }

    names.forEach(function (name) {
      var row = document.createElement('div');
      row.className = 'attendee-name';
      var dot = document.createElement('span');
      dot.className = 'attendee-dot ' + dotClass;
      row.appendChild(dot);
      row.appendChild(document.createTextNode(name));
      container.appendChild(row);
    });
  }

  renderList('facilitatorsList', eventInfo.facilitators, 'dot-facilitator');
  renderList('observersList', eventInfo.observers, 'dot-observer');
  document.getElementById('participantCount').textContent = eventInfo.participants.length;
  renderList('participantsInner', eventInfo.participants, 'dot-participant');

  document.getElementById('participantsToggle').addEventListener('click', function () {
    document.getElementById('participantsList').classList.toggle('open');
    this.classList.toggle('open');
  });

  // ------------------------------------------------------------
  // Observations (observer input) — both the checklist AND the
  // notes are per-slide (GDAK pre-authors a couple of questions
  // against each slide, and the observer's free-text notes are
  // captured per-slide too), auto-saved on every change so it's
  // available whenever Finish gets clicked, regardless of which
  // browser tab/session that happens in.
  // ------------------------------------------------------------
  var OBS_STORAGE_KEY = 'excyteObservations';
  var observationNotesEl = document.getElementById('observationNotes');

  function loadAllObservations() {
    try {
      return JSON.parse(localStorage.getItem(OBS_STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveObservations() {
    if (!eventId) return;
    var all = loadAllObservations();
    if (!all[eventId]) all[eventId] = { slideChecks: {}, slideNotes: {} };

    var checks = [];
    document.querySelectorAll('#observationChecklist input').forEach(function (input) {
      checks.push(input.checked);
    });
    all[eventId].slideChecks[currentSlide] = checks;
    all[eventId].slideNotes[currentSlide] = observationNotesEl.value;
    try {
      localStorage.setItem(OBS_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function renderObservationChecklist() {
    var container = document.getElementById('observationChecklist');
    container.innerHTML = '';

    // Builder preview mode - the Observation Points panel (below)
    // already renders these per their authored type and saves
    // answers, so this legacy checklist panel sits out entirely
    // rather than showing a duplicate freetext-only view.
    if (isBuilderPreview && builderPreviewSlides && builderPreviewSlides.length > 0) {
      return;
    }

    // Normal mode - use default questions
    var questions = activeObservationQuestions[currentSlide] || [];
    var saved = loadAllObservations()[eventId];
    var savedChecks = (saved && saved.slideChecks && saved.slideChecks[currentSlide]) || [];

    questions.forEach(function (question, i) {
      var label = document.createElement('label');
      label.className = 'observation-check';

      var input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!savedChecks[i];
      input.addEventListener('change', saveObservations);

      var box = document.createElement('span');
      box.className = 'obs-checkbox';

      label.appendChild(input);
      label.appendChild(box);
      label.appendChild(document.createTextNode(question));
      container.appendChild(label);
    });
  }

  // ------------------------------------------------------------
  // Observation Points panel — in builder preview mode each item
  // renders per its authored type (freetext / checkbox /
  // multiplechoice) and answers are captured and persisted
  // (sessionStorage, keyed per-slide, since a preview has no real
  // eventId to save against). Outside the builder there is no type
  // data available, so questions fall back to a read-only freetext
  // rendering (unchanged legacy behavior — normal-mode answers are
  // captured via the observationChecklist panel instead).
  // ------------------------------------------------------------
  var PREVIEW_OBS_ANSWERS_KEY = 'excytePreviewObsAnswers';

  function loadPreviewObsAnswers() {
    try {
      return JSON.parse(sessionStorage.getItem(PREVIEW_OBS_ANSWERS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function savePreviewObsAnswer(obsId, value) {
    var all = loadPreviewObsAnswers();
    var slideKey = String(builderCurrentSlideIndex);
    if (!all[slideKey]) all[slideKey] = {};
    all[slideKey][obsId] = value;
    try {
      sessionStorage.setItem(PREVIEW_OBS_ANSWERS_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function renderObservationPointsList() {
    var list = document.getElementById('observationPointsList');
    if (!list) return;
    list.innerHTML = '';

    var isPreview = isBuilderPreview && builderPreviewSlides && builderPreviewSlides.length > 0;
    var savedAnswers = isPreview ? (loadPreviewObsAnswers()[String(builderCurrentSlideIndex)] || {}) : {};

    function renderItem(obsId, text, obsType, options) {
      var item = document.createElement('div');
      item.className = 'obs-point-item';
      var saved = obsId ? savedAnswers[obsId] : null;

      if (obsType === 'checkbox') {
        var row = document.createElement('div');
        row.className = 'obs-point-checkbox-row';

        var textSpan = document.createElement('span');
        textSpan.className = 'obs-point-text';
        textSpan.textContent = text;

        var label = document.createElement('label');
        label.className = 'observation-check obs-point-check';
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!saved;
        if (isPreview && obsId) {
          input.addEventListener('change', function () {
            savePreviewObsAnswer(obsId, input.checked);
          });
        }
        var box = document.createElement('span');
        box.className = 'obs-checkbox';
        label.appendChild(input);
        label.appendChild(box);

        row.appendChild(textSpan);
        row.appendChild(label);
        item.appendChild(row);
      } else if (obsType === 'multiplechoice') {
        var textEl = document.createElement('div');
        textEl.className = 'obs-point-text';
        textEl.textContent = text;
        item.appendChild(textEl);

        var optionsWrap = document.createElement('div');
        optionsWrap.className = 'obs-point-options';
        if (options && options.length > 0) {
          options.forEach(function (opt) {
            var optLabel = document.createElement('label');
            optLabel.className = 'observation-check';
            var optInput = document.createElement('input');
            optInput.type = 'radio';
            if (obsId) optInput.name = 'obs-mc-' + obsId;
            optInput.checked = saved === opt.id;
            if (isPreview && obsId) {
              optInput.addEventListener('change', function () {
                savePreviewObsAnswer(obsId, opt.id);
              });
            }
            var optBox = document.createElement('span');
            optBox.className = 'obs-checkbox obs-radio';
            optLabel.appendChild(optInput);
            optLabel.appendChild(optBox);
            optLabel.appendChild(document.createTextNode(opt.text || '(empty option)'));
            optionsWrap.appendChild(optLabel);
          });
        } else {
          optionsWrap.innerHTML = '<p style="font-size:12px; color:rgba(255,255,255,0.4);">No options added</p>';
        }
        item.appendChild(optionsWrap);
      } else {
        // freetext (default)
        var freeTextEl = document.createElement('div');
        freeTextEl.className = 'obs-point-text';
        freeTextEl.textContent = text;
        item.appendChild(freeTextEl);

        var freeInput = document.createElement('input');
        freeInput.type = 'text';
        freeInput.className = 'obs-point-input';
        freeInput.placeholder = 'Response';
        if (typeof saved === 'string') freeInput.value = saved;
        if (isPreview && obsId) {
          freeInput.addEventListener('input', function () {
            savePreviewObsAnswer(obsId, freeInput.value);
          });
        }
        item.appendChild(freeInput);
      }

      list.appendChild(item);
    }

    // Builder preview mode - render builder observations with their authored type
    if (isPreview) {
      var slide = builderPreviewSlides[builderCurrentSlideIndex];
      if (!slide.observations || slide.observations.length === 0) {
        list.innerHTML = '<p style="color: #9AA3B2; font-size: 13px; font-style: italic;">No observations added for this slide.</p>';
        return;
      }
      slide.observations.forEach(function (obs) {
        renderItem(obs.id, obs.text || '(empty observation)', obs.obsType || 'freetext', obs.options);
      });
      return;
    }

    // Normal mode - use default questions (no type data, so freetext)
    var questions = activeObservationQuestions[currentSlide] || [];
    questions.forEach(function (question) {
      renderItem(null, question, 'freetext', null);
    });
  }

  function restoreSlideNotes() {
    var saved = loadAllObservations()[eventId];
    var note = (saved && saved.slideNotes && saved.slideNotes[currentSlide]) || '';
    observationNotesEl.value = note;
  }

  observationNotesEl.addEventListener('input', saveObservations);

  // ------------------------------------------------------------
  // Slides — dots, nav arrows, prompts, Finish button
  // ------------------------------------------------------------
  var currentSlide = 0;
  var totalSlides = activeTitles.length;

  function renderDots() {
    var track = document.getElementById('dotTrack');
    track.innerHTML = '';
    for (var i = 0; i < totalSlides; i++) {
      (function (idx) {
        var d = document.createElement('div');
        d.className = 'dot' + (idx === currentSlide ? ' active' : '');
        d.title = 'Slide ' + (idx + 1);
        d.addEventListener('click', function () { goToSlide(idx); });
        track.appendChild(d);
      })(i);
    }
  }

  function goToSlide(idx) {
    if (isBuilderPreview && builderPreviewSlides) {
      // Builder preview mode
      builderCurrentSlideIndex = Math.max(0, Math.min(builderPreviewSlides.length - 1, idx));
      var slide = builderPreviewSlides[builderCurrentSlideIndex];

      var imageEl = document.getElementById('slideImage');
      var content = document.getElementById('slideContent');
      var builderCanvasEl = document.getElementById('builderSlideCanvas');

      imageEl.style.display = 'none';
      content.style.display = 'none';
      builderCanvasEl.style.opacity = '0';
      setTimeout(function () {
        renderBuilderSlideCanvas(slide);
        builderCanvasEl.style.display = 'block';
        builderCanvasEl.style.opacity = '1';
      }, 150);

      document.getElementById('slideCounter').textContent = 'Slide ' + (builderCurrentSlideIndex + 1) + ' / ' + builderPreviewSlides.length;
      document.getElementById('prevBtn').disabled = builderCurrentSlideIndex === 0;
      document.getElementById('nextBtn').disabled = builderCurrentSlideIndex === builderPreviewSlides.length - 1;
      renderDots();
      renderPromptsList();
      renderObservationChecklist();
      renderObservationPointsList();
    } else {
      // Normal mode
      currentSlide = Math.max(0, Math.min(totalSlides - 1, idx));

      var imageEl = document.getElementById('slideImage');
      var content = document.getElementById('slideContent');

      if (activeDeck) {
        content.style.display = 'none';
        imageEl.style.opacity = '0';
        setTimeout(function () {
          imageEl.src = activeDeck.images[currentSlide];
          imageEl.style.display = 'block';
          imageEl.style.opacity = '1';
        }, 150);
      } else {
        imageEl.style.display = 'none';
        content.style.display = 'block';
        content.style.opacity = '0';
        setTimeout(function () {
          document.getElementById('slideNumber').textContent = currentSlide + 1;
          document.getElementById('slideTitleText').textContent = activeTitles[currentSlide];
          content.style.opacity = '1';
        }, 150);
      }

      document.getElementById('slideCounter').textContent = 'Slide ' + (currentSlide + 1) + ' / ' + totalSlides;
      document.getElementById('prevBtn').disabled = currentSlide === 0;
      document.getElementById('nextBtn').disabled = currentSlide === totalSlides - 1;
      document.getElementById('finishBtn').classList.toggle('visible', currentSlide === totalSlides - 1);
      renderDots();

      renderPromptsList();

      renderObservationChecklist();
      renderObservationPointsList();
      restoreSlideNotes();
    }
  }

  function renderPromptsList() {
    var list = document.getElementById('promptsList');
    list.innerHTML = '';

    // Builder preview mode - render builder discussion points as plain bullets
    if (isBuilderPreview && builderPreviewSlides && builderPreviewSlides.length > 0) {
      var slide = builderPreviewSlides[builderCurrentSlideIndex];
      if (!slide.discussionPoints || slide.discussionPoints.length === 0) {
        list.innerHTML = '<p style="color: #9AA3B2; font-size: 13px; font-style: italic;">No discussion points added for this slide.</p>';
        return;
      }

      slide.discussionPoints.forEach(function (dp) {
        var div = document.createElement('div');
        div.className = 'prompt-item';
        div.textContent = dp.text || '(empty discussion point)';
        list.appendChild(div);
      });
      return;
    }

    // Normal mode - use default prompts
    var prompts = activePrompts[currentSlide] || [];
    prompts.forEach(function (p) {
      var div = document.createElement('div');
      div.className = 'prompt-item';
      div.textContent = p;
      list.appendChild(div);
    });
  }

  document.getElementById('prevBtn').addEventListener('click', function () { goToSlide(currentSlide - 1); });
  document.getElementById('nextBtn').addEventListener('click', function () { goToSlide(currentSlide + 1); });

  // Note: keyboard navigation works for every role here (even though
  // Observer/Participant have no visible arrows/dots) so each role's
  // finish flow can actually be reached and tested in this single-
  // session demo. In a real multi-user session, Observer/Participant
  // would just follow whatever slide the Facilitator is on.
  document.addEventListener('keydown', function (e) {
    if (document.querySelector('.modal-overlay.open')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToSlide(currentSlide + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToSlide(currentSlide - 1);
  });

  // ------------------------------------------------------------
  // Panel collapse toggles
  // ------------------------------------------------------------
  function setupToggle(panelId, toggleId) {
    var panel = document.getElementById(panelId);
    var btn = document.getElementById(toggleId);
    // Without this, the toggle button's mousedown bubbles up to the
    // header's drag handler (see makeDraggable below), which
    // immediately pins the panel to a fixed top/left position —
    // permanently detaching it from its anchored bottom/right CSS
    // spot on the very first collapse/expand click, which is what
    // let expanding panels grow downward off the bottom of the
    // screen instead of staying anchored and growing upward.
    btn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    btn.addEventListener('click', function () {
      panel.classList.toggle('collapsed');
    });
  }
  setupToggle('attendeesPanel', 'attendeesToggle');
  setupToggle('promptsPanel', 'promptsToggle');
  setupToggle('observationsPanel', 'observationsToggle');
  setupToggle('observationPointsPanel', 'observationPointsToggle');

  // ------------------------------------------------------------
  // Draggable panels (drag by header)
  // ------------------------------------------------------------
  function makeDraggable(panelId, handleId) {
    var panel = document.getElementById(panelId);
    var handle = document.getElementById(handleId);
    var sx = 0, sy = 0;

    handle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var r = panel.getBoundingClientRect();
      panel.style.left = r.left + 'px';
      panel.style.top = r.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      sx = e.clientX;
      sy = e.clientY;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    function onMove(e) {
      var r = panel.getBoundingClientRect();
      panel.style.left = (r.left + e.clientX - sx) + 'px';
      panel.style.top = (r.top + e.clientY - sy) + 'px';
      sx = e.clientX;
      sy = e.clientY;
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
  }
  makeDraggable('attendeesPanel', 'attendeesPanelHeader');
  makeDraggable('promptsPanel', 'promptsPanelHeader');
  makeDraggable('observationsPanel', 'observationsPanelHeader');
  makeDraggable('observationPointsPanel', 'observationPointsPanelHeader');

  // Only true when this page is the iframe the builder's own Preview
  // button opened — a "Deliver" launch from the Exercise Library also
  // sets isBuilderPreview (to reuse the same slide-rendering code) but
  // runs as a normal top-level page, so it needs Exit/Finish to behave
  // like a real delivery instead of posting to a parent that doesn't
  // exist.
  var isEmbeddedBuilderPreview = isBuilderPreview && window.parent && window.parent !== window;

  // A top-level "Deliver" run (isBuilderPreview but not embedded) has
  // no parent builder page to clear these on the way out the way
  // closeBuilderPreview() does for the embedded/iframe preview — so
  // this page has to clear them itself before leaving, or the next
  // exercise-delivery.html visit in this tab (e.g. a real scheduled
  // event) would wrongly pick up stale builder-preview slide data.
  function clearBuilderPreviewSessionStorage() {
    if (isEmbeddedBuilderPreview) return;
    try {
      sessionStorage.removeItem('builderPreviewMode');
      sessionStorage.removeItem('builderPreviewSlides');
      sessionStorage.removeItem('builderCurrentSlideIndex');
      sessionStorage.removeItem('builderPreviewThemeBg');
    } catch (e) {}
  }

  // ------------------------------------------------------------
  // Exit modal
  // ------------------------------------------------------------
  var exitModal = document.getElementById('exitModal');
  document.getElementById('exitBtn').addEventListener('click', function () {
    if (isEmbeddedBuilderPreview) {
      // Close preview modal and return to builder
      window.parent.postMessage({ type: 'closePreview' }, '*');
    } else {
      exitModal.classList.add('open');
    }
  });
  document.getElementById('exitCancelBtn').addEventListener('click', function () {
    exitModal.classList.remove('open');
  });
  document.getElementById('exitConfirmBtn').addEventListener('click', function () {
    clearBuilderPreviewSessionStorage();
    window.history.back();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var openModal = document.querySelector('.modal-overlay.open');
      if (openModal) {
        document.querySelectorAll('.modal-overlay').forEach(function (m) {
          m.classList.remove('open');
        });
      } else if (isEmbeddedBuilderPreview) {
        // Not in a modal — close the builder preview itself
        window.parent.postMessage({ type: 'closePreview' }, '*');
      }
    }
  });

  // ------------------------------------------------------------
  // Finish flow: confirm -> loading screen -> role-based outcome
  //   Participant : review/rating modal -> back to app home
  //   Observer/Facilitator : straight back to the events list
  // ------------------------------------------------------------
  var finishModal = document.getElementById('finishModal');
  var finishLoadingScreen = document.getElementById('finishLoadingScreen');
  var reviewModal = document.getElementById('reviewModal');

  document.getElementById('finishBtn').addEventListener('click', function () {
    if (isEmbeddedBuilderPreview) {
      // Close preview modal and return to builder
      window.parent.postMessage({ type: 'closePreview' }, '*');
    } else {
      finishModal.classList.add('open');
    }
  });
  document.getElementById('finishCancelBtn').addEventListener('click', function () {
    finishModal.classList.remove('open');
  });
  document.getElementById('finishConfirmBtn').addEventListener('click', function () {
    finishModal.classList.remove('open');
    createReportForThisEvent();
    runFinishFlow();
  });

  function goToReport() {
    clearBuilderPreviewSessionStorage();
    window.location.href = 'report-detail.html?exercise=' + encodeURIComponent(eventInfo.exercise);
  }

  // ------------------------------------------------------------
  // Report creation — only for custom (user-created) events; the
  // bundled demo events already have their own hand-written report.
  // ------------------------------------------------------------
  var REPORTS_STORAGE_KEY = 'excyteCustomReports';

  function formatCompletionNow() {
    var d = new Date();
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function formatDurationMs(ms) {
    var totalMinutes = Math.max(1, Math.round(ms / 60000));
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    if (hours === 0) return minutes + (minutes === 1 ? ' minute' : ' minutes');
    return hours + (hours === 1 ? ' hour' : ' hours') + ' ' + minutes + (minutes === 1 ? ' minute' : ' minutes');
  }

  function buildGroupedChecklist(savedObs) {
    var slideChecks = (savedObs && savedObs.slideChecks) || {};
    var slideNotes = (savedObs && savedObs.slideNotes) || {};
    var groups = [];

    activeObservationQuestions.forEach(function (questions, slideIdx) {
      if (questions.length === 0) return;
      var checks = slideChecks[slideIdx] || [];
      groups.push({
        slideNumber: slideIdx + 1,
        slideTitle: activeTitles[slideIdx],
        items: questions.map(function (question, i) {
          return { label: question, ticked: !!checks[i] };
        }),
        notes: slideNotes[slideIdx] || ''
      });
    });

    return groups;
  }

  function createReportForThisEvent() {
    if (!eventId || demoEvents[eventId]) return;

    var savedObs = loadAllObservations()[eventId];
    var hasObserver = eventInfo.observers.length > 0;

    var report = {
      exercise: eventInfo.exercise,
      org: eventInfo.org,
      completedAt: formatCompletionNow(),
      duration: formatDurationMs(Date.now() - startTime),
      totalSlides: totalSlides,
      facilitators: eventInfo.facilitators,
      observers: eventInfo.observers,
      participants: eventInfo.participants,
      checklist: hasObserver ? buildGroupedChecklist(savedObs) : null
    };

    try {
      var allReports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY)) || {};
      allReports[eventInfo.exercise] = report;
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(allReports));
    } catch (e) {}

    // Mark the source event as no longer active
    try {
      var allEvents = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      var rows = allEvents[eventInfo.exercise] || [];
      rows.forEach(function (row) {
        if (row.id === eventId) row.status = 'Ended';
      });
      allEvents[eventInfo.exercise] = rows;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allEvents));
    } catch (e) {}
  }

  function runFinishFlow() {
    finishLoadingScreen.classList.add('open');
    setTimeout(function () {
      finishLoadingScreen.classList.remove('open');
      if (role === 'participant') {
        reviewModal.classList.add('open');
      } else {
        goToReport();
      }
    }, 1400);
  }

  // Star rating (mandatory) + optional comment
  var selectedRating = 0;
  var starButtons = document.querySelectorAll('.star');
  var starRatingEl = document.getElementById('starRating');
  var ratingError = document.getElementById('ratingError');

  function paintStars(value) {
    starButtons.forEach(function (star) {
      star.classList.toggle('filled', parseInt(star.dataset.value, 10) <= value);
    });
  }

  starButtons.forEach(function (star) {
    star.addEventListener('click', function () {
      selectedRating = parseInt(star.dataset.value, 10);
      paintStars(selectedRating);
      ratingError.classList.remove('show');
    });
    star.addEventListener('mouseenter', function () {
      paintStars(parseInt(star.dataset.value, 10));
    });
  });
  starRatingEl.addEventListener('mouseleave', function () {
    paintStars(selectedRating);
  });

  document.getElementById('submitReviewBtn').addEventListener('click', function () {
    if (selectedRating === 0) {
      ratingError.classList.add('show');
      return;
    }
    reviewModal.classList.remove('open');
    clearBuilderPreviewSessionStorage();
    // "Back to home screen for participant" — the app's main landing page
    window.location.href = '../index.html';
  });

  goToSlide(0);

});
