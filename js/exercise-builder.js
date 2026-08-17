document.addEventListener('DOMContentLoaded', function () {

  // ============================================================
  // Exercise Builder — wireframe stage. Slides are tracked as a
  // simple in-memory array (no real content yet, just enough state
  // to demo add/switch/delete, theme-driven backgrounds, and
  // per-slide layouts).
  // ============================================================
  var slideCanvas = document.getElementById('slideCanvas');
  var slideCanvasLabel = document.getElementById('slideCanvasLabel');
  var slideLayoutRender = document.getElementById('slideLayoutRender');
  var slideThumbList = document.getElementById('slideThumbList');
  var objectLayer = document.getElementById('objectLayer');

  // Text boxes, tables (and soon images) all live in one ordered
  // array per slide — slide.objects — rather than separate arrays
  // per type. Order = stacking order: whatever's later in the array
  // renders later in the DOM, so it's on top. New objects are
  // pushed onto the end (added = on top). This is also what the
  // Arrange menu will eventually reorder.
  var nextObjectId = 1;
  var nextNoteId = 1;

  // Every slide starts with empty discussion points and observations arrays —
  // users can add items by clicking the "+ Add" buttons.
  function makeDefaultSlideNotes() {
    return {
      discussionPoints: [],
      observations: []
    };
  }

  var slides = [Object.assign({ layout: 'blank', objects: [], name: '' }, makeDefaultSlideNotes())]; // starts with a single blank slide
  var currentSlideIndex = 0;

  // The selected theme applies to every slide — past and future —
  // so this is the one source of truth for background colour rather
  // than something stored per-slide. Layout, unlike theme, IS stored
  // per-slide (see slides[i].layout above).
  var currentThemeBg = '#ffffff';

  // ============================================================
  // Save / Load — custom exercises saved from this builder live in
  // localStorage (browser-local, no backend), keyed by a generated
  // id. currentExerciseMeta tracks which saved record (if any) this
  // session corresponds to, so Save updates the same record instead
  // of creating a new one every time, and so the unsaved-changes
  // guard knows whether there's anything to save at all.
  // ============================================================
  var CUSTOM_EXERCISES_KEY = 'excyteCustomExercises';
  var currentExerciseMeta = { id: null, name: '', theme: '' };
  var lastSavedSnapshot = null;

  function loadCustomExercises() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_EXERCISES_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  // Returns true/false rather than swallowing the error — with no
  // backend, every exercise (including any images baked in as base64
  // — see downscaleImageFile) lives entirely inside localStorage's
  // shared ~5-10MB origin quota, so a large/image-heavy exercise can
  // genuinely fail to save. Callers need to know that happened rather
  // than silently proceeding as if the save succeeded (which is what
  // used to happen here, and would leave the very next refresh with
  // nothing to restore — see performSave).
  function saveCustomExercises(all) {
    try {
      localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(all));
      return true;
    } catch (e) {
      return false;
    }
  }

  function snapshotState() {
    return JSON.stringify({ slides: slides, themeBg: currentThemeBg });
  }

  function isDirty() {
    return snapshotState() !== lastSavedSnapshot;
  }

  // Object/note ids (obj1, dp2, obs3, opt4...) are assigned from
  // ever-incrementing counters that reset to 1 each page load —
  // loading a saved exercise back in means those counters need
  // fast-forwarding past whatever ids it already contains, or newly
  // added objects/notes could collide with existing ones.
  function resyncIdCountersFromSlides(loadedSlides) {
    var maxObjectNum = 0;
    var maxNoteNum = 0;

    function bump(id, currentMax) {
      var match = /^[a-z]+(\d+)$/.exec(id || '');
      if (!match) return currentMax;
      var n = parseInt(match[1], 10);
      return n > currentMax ? n : currentMax;
    }

    (loadedSlides || []).forEach(function (slide) {
      (slide.objects || []).forEach(function (obj) { maxObjectNum = bump(obj.id, maxObjectNum); });
      (slide.discussionPoints || []).forEach(function (dp) {
        maxNoteNum = bump(dp.id, maxNoteNum);
        (dp.options || []).forEach(function (opt) { maxNoteNum = bump(opt.id, maxNoteNum); });
      });
      (slide.observations || []).forEach(function (obs) {
        maxNoteNum = bump(obs.id, maxNoteNum);
        (obs.options || []).forEach(function (opt) { maxNoteNum = bump(opt.id, maxNoteNum); });
      });
    });

    nextObjectId = maxObjectNum + 1;
    nextNoteId = maxNoteNum + 1;
  }

  // If opened as exercise-builder.html?editId=..., load that saved
  // exercise's slides/theme back in instead of starting from the
  // single default blank slide declared above. Also remembered so the
  // "new vs. edit" entry prompt further down only shows on a genuinely
  // fresh visit, not one that already arrived with a specific exercise.
  var initialEditId = new URLSearchParams(window.location.search).get('editId');

  // ============================================================
  // In-progress draft — separate from the deliberate "Save" button
  // (which writes a named record to excyteCustomExercises/
  // localStorage). This is a silent, continuous snapshot of
  // whatever's currently on screen, kept in sessionStorage so a
  // browser refresh (or the native back/forward-triggered reload)
  // picks up exactly where you left off instead of losing anything —
  // sessionStorage is what makes it tab/session-scoped rather than
  // persisting forever like a real save would.
  // ============================================================
  var DRAFT_KEY = 'excyteBuilderDraft';
  var draftRestored = false;

  function saveDraftToSession() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        editId: initialEditId || null,
        slides: slides,
        themeBg: currentThemeBg,
        currentSlideIndex: currentSlideIndex,
        currentExerciseMeta: currentExerciseMeta,
        nextObjectId: nextObjectId,
        nextNoteId: nextNoteId
      }));
    } catch (e) {}
  }

  function clearDraft() {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  // Restores a draft left behind by a refresh/reload of this exact
  // same page — same editId (including both being "no editId", i.e.
  // a not-yet-saved new exercise). A draft for a *different* editId
  // means the URL changed (opened a different exercise to edit) since
  // the draft was written, so it's stale and gets discarded instead.
  (function restoreDraftFromSession() {
    var raw;
    try { raw = sessionStorage.getItem(DRAFT_KEY); } catch (e) { raw = null; }
    if (!raw) return;

    var draft;
    try { draft = JSON.parse(raw); } catch (e) { return; }
    if (!draft || (draft.editId || null) !== (initialEditId || null)) {
      clearDraft();
      return;
    }

    slides = draft.slides || slides;
    currentThemeBg = draft.themeBg || currentThemeBg;
    currentSlideIndex = draft.currentSlideIndex || 0;
    currentExerciseMeta = draft.currentExerciseMeta || currentExerciseMeta;
    nextObjectId = draft.nextObjectId || nextObjectId;
    nextNoteId = draft.nextNoteId || nextNoteId;
    draftRestored = true;
  })();

  (function loadFromEditId() {
    if (!initialEditId || draftRestored) return;

    var record = loadCustomExercises()[initialEditId];
    if (!record) return;

    slides = record.slides || slides;
    currentThemeBg = record.themeBg || currentThemeBg;
    currentExerciseMeta = { id: record.id, name: record.name, theme: record.theme };
    resyncIdCountersFromSlides(slides);
  })();

  lastSavedSnapshot = draftRestored ? null : snapshotState();

  var DELETE_ICON =
    '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var DUPLICATE_ICON =
    '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="13" height="13" rx="1.5"/><path d="M8 21h13V8"/></svg>';

  var PICTURE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5.5-5.5L11 15l-3-3-4 4"/></svg>';

  // ------------------------------------------------------------
  // Layout definitions — a handful of PowerPoint's own layouts,
  // copied for now. Placeholder positions are percentages of the
  // slide so they scale with the canvas at any size. Each layout's
  // placeholders render as static, non-interactive boxes on the
  // canvas — nothing here can be typed into, moved, or resized yet.
  // ------------------------------------------------------------
  var LAYOUTS = [
    {
      id: 'title-slide',
      name: 'Title Slide',
      placeholders: [
        { top: 18, left: 13, width: 74, height: 32, text: 'Click to add title', variant: 'title-center' },
        { top: 52, left: 13, width: 74, height: 26, text: 'Click to add subtitle', variant: 'subtitle' }
      ]
    },
    {
      id: 'title-content',
      name: 'Title and Content',
      placeholders: [
        { top: 10, left: 6, width: 88, height: 18, text: 'Click to add title', variant: 'title' },
        { top: 31, left: 6, width: 88, height: 62, text: '• Click to add text', variant: 'content' }
      ]
    },
    {
      id: 'section-header',
      name: 'Section Header',
      placeholders: [
        { top: 48, left: 6, width: 70, height: 16, text: 'Click to add title', variant: 'title-bottom' },
        { top: 67, left: 6, width: 70, height: 20, text: 'Click to add text', variant: 'section-body' }
      ]
    },
    {
      id: 'two-content',
      name: 'Two Content',
      placeholders: [
        { top: 10, left: 6, width: 88, height: 18, text: 'Click to add title', variant: 'title' },
        { top: 31, left: 6, width: 41, height: 62, text: '• Click to add text', variant: 'content' },
        { top: 31, left: 53, width: 41, height: 62, text: '• Click to add text', variant: 'content' }
      ]
    },
    {
      id: 'title-only',
      name: 'Title Only',
      placeholders: [
        { top: 10, left: 6, width: 88, height: 18, text: 'Click to add title', variant: 'title' }
      ]
    },
    {
      id: 'picture-caption',
      name: 'Picture with Caption',
      placeholders: [
        { top: 10, left: 6, width: 34, height: 18, text: 'Click to add title', variant: 'title' },
        { top: 31, left: 6, width: 34, height: 62, text: 'Click to add text', variant: 'subtitle' },
        { top: 10, left: 43, width: 51, height: 83, text: 'Click to add picture', variant: 'picture' }
      ]
    },
    {
      id: 'blank',
      name: 'Blank',
      placeholders: []
    }
  ];

  function getLayoutById(id) {
    for (var i = 0; i < LAYOUTS.length; i++) {
      if (LAYOUTS[i].id === id) return LAYOUTS[i];
    }
    for (var j = 0; j < LAYOUTS.length; j++) {
      if (LAYOUTS[j].id === 'blank') return LAYOUTS[j];
    }
    return LAYOUTS[0];
  }

  function layoutThumbPreviewHTML(layout) {
    var html = '';
    layout.placeholders.forEach(function (ph) {
      html += '<span class="layout-thumb-ph" style="top:' + ph.top + '%;left:' + ph.left + '%;width:' + ph.width + '%;height:' + ph.height + '%;"></span>';
    });
    return html;
  }

  // Picks out the first hex colour in a background value (solid or
  // linear-gradient string) and judges whether it's dark enough that
  // the logo needs to switch to its light/contrast variant — see
  // .slide-canvas.dark-bg .slide-canvas-logo-img in builder.css.
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

  // ------------------------------------------------------------
  // Canvas rendering
  // ------------------------------------------------------------
  function renderCanvas() {
    deselectTextBox();
    deselectTable();
    deselectImage();
    deselectShape();
    clearMultiSelection();
    closeHeaderFooterMode();
    slideCanvas.style.background = currentThemeBg;
    slideCanvas.classList.toggle('dark-bg', isDarkBackground(currentThemeBg));
    slideCanvasLabel.textContent = 'Slide ' + (currentSlideIndex + 1);
    renderSlideLayoutPlaceholders();
    renderObjects();
    renderSlideName();
    renderDiscussionPoints();
    renderObservations();
  }

  function renderSlideLayoutPlaceholders() {
    slideLayoutRender.innerHTML = '';
    var slide = slides[currentSlideIndex];
    var layout = getLayoutById(slide.layout);

    // Text-type placeholders (title/subtitle/content/etc.) become
    // real text boxes now — see applyLayoutTextBoxes(). Only the
    // picture region stays a static placeholder, since there's no
    // image tool yet to back it with.
    layout.placeholders.forEach(function (ph) {
      if (ph.variant !== 'picture') return;
      var box = document.createElement('div');
      box.className = 'slide-ph slide-ph-' + ph.variant;
      box.style.top = ph.top + '%';
      box.style.left = ph.left + '%';
      box.style.width = ph.width + '%';
      box.style.height = ph.height + '%';
      box.innerHTML = PICTURE_ICON + '<span>' + ph.text + '</span>';
      slideLayoutRender.appendChild(box);
    });
  }

  // ------------------------------------------------------------
  // Freeform text boxes — added via the toolbar button, draggable,
  // deletable, editable inline. Each slide keeps its objects (text
  // boxes, tables, ...) in one ordered array — slide.objects.
  //
  // Interaction model (deliberately mirrors PowerPoint/Canva):
  //   - click an idle box            -> select it (teal outline,
  //                                      draggable, Delete removes it)
  //   - click an already-selected box -> enter edit mode (cursor,
  //                                      type inline)
  //   - click+drag an idle/selected box -> move it
  //   - click anywhere else           -> deselect (commits any typed
  //                                      text; if left empty, shows
  //                                      the dashed "Click to add
  //                                      text" placeholder again)
  // ------------------------------------------------------------
  var activeTextBoxEl = null;
  var activeTextBoxEditStartText = null;
  var undoStack = [];
  var redoStack = [];
  var UNDO_LIMIT = 50;

  function pushUndo(action) {
    undoStack.push(action);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    redoStack.length = 0; // any new action invalidates the redo history
  }

  function findObjectData(slideIndex, id) {
    var list = slides[slideIndex].objects || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function findTextBoxData(slideIndex, boxId) { return findObjectData(slideIndex, boxId); }
  function findTableData(slideIndex, tableId) { return findObjectData(slideIndex, tableId); }

  // Each table cell is { html, align } rather than a plain string, so
  // it can carry rich formatting (bold/italic/font/colour — same
  // "html" idea as text boxes) and its own alignment, since a <td>
  // has no separate data object of its own to store settings on the
  // way a text box does. Row/column add/delete/reorder move these
  // whole cell objects around without inspecting them, so they don't
  // need any changes for this.
  function makeEmptyCell() { return { html: '', align: null }; }

  // Normalizes a possibly-legacy (plain string) cell in place into
  // the { html, align } shape, so callers can always safely read/
  // write .html / .align regardless of when the table was created.
  function normalizeCell(data, r, c) {
    var cell = data.rows[r][c];
    if (!cell || typeof cell !== 'object') {
      cell = { html: cell || '', align: null };
      data.rows[r][c] = cell;
    }
    return cell;
  }

  function setCellHtml(data, r, c, html) {
    normalizeCell(data, r, c).html = html;
  }

  function setCellAlign(data, r, c, align) {
    normalizeCell(data, r, c).align = align;
  }

  function updateEmptyState(el) {
    if (el.textContent.trim() === '') el.classList.add('is-empty');
    else el.classList.remove('is-empty');
  }

  function placeCursorAtEnd(el, atStart) {
    el.focus();
    if (window.getSelection && document.createRange) {
      var range = document.createRange();
      if (atStart) {
        range.setStart(el, 0);
        range.collapse(true);
      } else {
        range.selectNodeContents(el);
        range.collapse(false);
      }
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function selectTextBox(el) {
    deselectTable();
    deselectImage();
    clearMultiSelection();
    if (activeTextBoxEl && activeTextBoxEl !== el) deselectTextBox();
    activeTextBoxEl = el;
    el.classList.add('selected');
    el.focus();
    updateAlignButtons();
    updateBoxStyleBars();
    if (!el.classList.contains('from-layout')) showTextResizeOverlay(el);
  }

  function enterEditMode(el) {
    activeTextBoxEl = el;
    el.classList.add('selected');
    el.setAttribute('contenteditable', 'true');
    if (!el.classList.contains('from-layout')) showTextResizeOverlay(el);

    // Layout-derived boxes (title/subtitle/content) are flex containers
    // so their placeholder text can be centred — but an empty
    // contenteditable flex container has no line box yet, so browsers
    // plant the caret at the flex start instead of the centred spot,
    // until a character is typed. A throwaway <br> gives it a real
    // line box to centre against; it contributes nothing to
    // textContent, so it doesn't count as "changed" if nothing gets
    // typed, and disappears on the next full render regardless.
    // Freeform boxes are plain block elements, not flex, so they
    // don't have this centring problem and don't need the <br> —
    // adding it there just risks the caret landing on the wrong side
    // of it once typing starts (text going one-character-per-line).
    var wasEmpty = el.childNodes.length === 0;
    if (wasEmpty && el.classList.contains('from-layout')) el.appendChild(document.createElement('br'));
    activeTextBoxEditStartText = el.innerHTML;

    placeCursorAtEnd(el, wasEmpty);
    updateAlignButtons();
    updateBoxStyleBars();
  }

  function deselectTextBox() {
    if (!activeTextBoxEl) return;
    var el = activeTextBoxEl;
    var wasEditing = el.getAttribute('contenteditable') === 'true';

    if (wasEditing) {
      // Strip a lone leftover <br> (the empty-box caret trick from
      // enterEditMode) if nothing else was typed, so it never gets
      // saved as visible content.
      if (el.textContent.trim() === '' && el.innerHTML !== '') el.innerHTML = '';
      var finalHtml = el.innerHTML;
      if (finalHtml !== activeTextBoxEditStartText) {
        var boxData = findTextBoxData(currentSlideIndex, el.dataset.id);
        if (boxData) {
          pushUndo({
            type: 'edit',
            slideIndex: currentSlideIndex,
            boxId: el.dataset.id,
            fromText: activeTextBoxEditStartText,
            toText: finalHtml
          });
          boxData.html = finalHtml;
        }
      }
    }

    el.setAttribute('contenteditable', 'false');
    el.classList.remove('selected');
    updateEmptyState(el);
    el.blur();
    activeTextBoxEl = null;
    activeTextBoxEditStartText = null;
    lastEditableSelectionRange = null;
    updateAlignButtons();
    updateBoxStyleBars();
    hideTextResizeOverlay();
  }

  // Re-selects (but doesn't re-enter edit mode) a text box by id
  // after a fresh renderCanvas() rebuild — same idea as
  // reapplyTableSelection/reapplyImageSelection/reapplyShapeSelection,
  // used after reordering an object's stacking position.
  function reapplyTextBoxSelection(boxId) {
    var el = objectLayer.querySelector('.text-box[data-id="' + boxId + '"]');
    if (el) selectTextBox(el);
  }

  function deleteActiveTextBox() {
    if (!activeTextBoxEl) return;
    var el = activeTextBoxEl;
    var slide = slides[currentSlideIndex];
    var list = slide.objects || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === el.dataset.id) { idx = i; break; }
    }
    if (idx === -1) return;

    var boxData = list[idx];
    pushUndo({
      type: 'delete',
      slideIndex: currentSlideIndex,
      boxId: boxData.id,
      index: idx,
      boxData: Object.assign({}, boxData)
    });
    list.splice(idx, 1);
    activeTextBoxEl = null;
    activeTextBoxEditStartText = null;
    hideTextResizeOverlay();
    renderCanvas();
  }

  function attachTextBoxEvents(el) {
    el.addEventListener('mousedown', function (e) {
      if (el.getAttribute('contenteditable') === 'true') {
        // Already editing — let native text cursor/selection behaviour happen.
        return;
      }

      e.preventDefault();
      var wasSelected = el.classList.contains('selected');
      var isGroup = isGroupDrag(el.dataset.id);
      var startX = e.clientX;
      var startY = e.clientY;
      var startLeftPct = parseFloat(el.style.left);
      var startTopPct = parseFloat(el.style.top);
      var moved = false;
      var canvasRect = slideCanvas.getBoundingClientRect();

      function onMouseMove(e2) {
        var dx = e2.clientX - startX;
        var dy = e2.clientY - startY;
        if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          moved = true;
          if (isGroup) beginGroupDrag();
          else selectTextBox(el);
        }
        if (moved) {
          var dxPct = (dx / canvasRect.width) * 100;
          var dyPct = (dy / canvasRect.height) * 100;
          if (isGroup) {
            updateGroupDrag(dxPct, dyPct);
          } else {
            var tentativeLeftPct = Math.max(0, Math.min(100, startLeftPct + dxPct));
            var tentativeTopPct = Math.max(0, Math.min(100, startTopPct + dyPct));
            var snapped = applySnapToDrag(el, tentativeLeftPct, tentativeTopPct, canvasRect, [el.dataset.id]);
            el.style.left = snapped.leftPct + '%';
            el.style.top = snapped.topPct + '%';
            positionTextResizeOverlay();
          }
        }
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        hideSnapGuides();

        if (moved && isGroup) {
          commitGroupDrag();
        } else if (moved) {
          var newLeftPct = parseFloat(el.style.left);
          var newTopPct = parseFloat(el.style.top);
          var boxData = findTextBoxData(currentSlideIndex, el.dataset.id);
          if (boxData) {
            pushUndo({
              type: 'move',
              slideIndex: currentSlideIndex,
              boxId: el.dataset.id,
              fromLeft: startLeftPct,
              fromTop: startTopPct,
              toLeft: newLeftPct,
              toTop: newTopPct
            });
            boxData.leftPct = newLeftPct;
            boxData.topPct = newTopPct;
          }
        } else if (selectObjectOrGroup(el.dataset.id)) {
          // Grouped — selectObjectOrGroup already populated the
          // multi-selection with every member.
        } else if (!wasSelected) {
          selectTextBox(el);
        } else {
          enterEditMode(el);
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    el.addEventListener('input', function () {
      updateEmptyState(el);
    });

    // Tab/Shift+Tab indent or outdent the current list item, same as
    // Word/Google Docs/Canva — without this, Tab's default behaviour
    // is to move focus out of the box entirely (see the blur handler
    // below). Only intercepted when the caret is actually inside a
    // list; otherwise Tab is left alone (nothing else uses it here,
    // so there's no competing behaviour to preserve).
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      var node = sel.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      if (!node.closest || !node.closest('li')) return;

      e.preventDefault();
      var fromHtml = el.innerHTML;
      document.execCommand(e.shiftKey ? 'outdent' : 'indent', false, null);
      var toHtml = el.innerHTML;
      if (toHtml !== fromHtml) {
        var boxData = findTextBoxData(currentSlideIndex, el.dataset.id);
        if (boxData) {
          pushUndo({
            type: 'font-style',
            slideIndex: currentSlideIndex,
            boxId: el.dataset.id,
            fromHtml: fromHtml,
            toHtml: toHtml
          });
          boxData.html = toHtml;
        }
      }
    });

    // Safety net for focus leaving via non-mouse means (Tab, window
    // blur, etc.) — mouse-driven deselection is handled by the
    // document-level mousedown listener further down. Focus moving
    // to one of the formatting controls is not a "leave" — those
    // apply their style back onto this box and return focus to it,
    // so skip deselecting when that's where focus is headed.
    el.addEventListener('blur', function (e) {
      if (activeTextBoxEl !== el) return;
      if (e.relatedTarget && isFormattingControl(e.relatedTarget)) return;
      deselectTextBox();
    });
  }

  // Corner resize handles for freeform text boxes live OUTSIDE the
  // contenteditable box itself, as a single reusable overlay
  // positioned on top of whichever box is selected — unlike images
  // (plain, never-editable elements, where the handles can safely be
  // real children), nesting element children inside a contenteditable
  // div makes Chrome's editing engine treat them as part of the
  // editable flow: typed characters get interleaved with them, and
  // caret/backspace navigation walks through them as if they were
  // real content (confirmed by testing — even contenteditable="false"
  // on the children isn't enough to stop this). Kept as siblings, the
  // overlay never touches the editable DOM at all.
  var textResizeOverlay = document.createElement('div');
  textResizeOverlay.className = 'text-resize-overlay';
  var textResizeHandles = {};
  [
    { cls: 'tl', x: 'left', y: 'top' },
    { cls: 'tr', x: 'right', y: 'top' },
    { cls: 'bl', x: 'left', y: 'bottom' },
    { cls: 'br', x: 'right', y: 'bottom' }
  ].forEach(function (c) {
    var handle = document.createElement('div');
    handle.className = 'text-resize-handle handle-' + c.cls;
    attachTextResizeHandle(handle, c.x, c.y);
    textResizeOverlay.appendChild(handle);
    textResizeHandles[c.cls] = handle;
  });
  var textRotateStalk = document.createElement('div');
  textRotateStalk.className = 'shape-rotate-stalk';
  textResizeOverlay.appendChild(textRotateStalk);
  var textRotateHandle = document.createElement('div');
  textRotateHandle.className = 'shape-rotate-handle';
  attachTextRotateHandle(textRotateHandle);
  textResizeOverlay.appendChild(textRotateHandle);
  objectLayer.parentNode.appendChild(textResizeOverlay);

  // Aligns the overlay to whichever element it's currently tracking,
  // in canvas percentage terms — same centre point, width/height and
  // rotation as the real box, so the handles sit exactly on its
  // corners. Uses offsetWidth/offsetHeight (layout size, unaffected
  // by the box's own rotate() transform) rather than
  // getBoundingClientRect() (which would return the rotated,
  // axis-aligned — and therefore inflated/wrong — bounding box once
  // the box has any rotation), then re-applies that same rotation to
  // the overlay itself so it visually lines up.
  var textResizeTrackedEl = null;
  function positionTextResizeOverlay() {
    if (!textResizeTrackedEl) { textResizeOverlay.classList.remove('visible'); return; }
    var el = textResizeTrackedEl;
    var canvasRect = slideCanvas.getBoundingClientRect();
    var boxData = findTextBoxData(currentSlideIndex, el.dataset.id);
    var rotation = (boxData && boxData.rotation) || 0;

    // el's own left/top (as %, centre-anchored) are already correct
    // regardless of rotation — only width/height need the
    // rotation-immune offsetWidth/offsetHeight measurement.
    var leftPct = parseFloat(el.style.left) || 0;
    var topPct = parseFloat(el.style.top) || 0;
    var widthPct = (el.offsetWidth / canvasRect.width) * 100;
    var heightPct = (el.offsetHeight / canvasRect.height) * 100;

    textResizeOverlay.style.left = leftPct + '%';
    textResizeOverlay.style.top = topPct + '%';
    textResizeOverlay.style.width = widthPct + '%';
    textResizeOverlay.style.height = heightPct + '%';
    textResizeOverlay.style.transform = 'translate(-50%, -50%) rotate(' + rotation + 'deg)';
    textResizeOverlay.classList.add('visible');
  }

  function showTextResizeOverlay(el) {
    textResizeTrackedEl = el;
    positionTextResizeOverlay();
  }

  function hideTextResizeOverlay() {
    textResizeTrackedEl = null;
    textResizeOverlay.classList.remove('visible');
  }

  // Freeform text boxes start auto-sized to their content (no
  // widthPct/heightPct at all) — the first drag measures the box's
  // actual rendered size via getBoundingClientRect and "locks it in"
  // as an explicit widthPct/heightPct, same as a freshly-added image.
  // Unlike images, there's no aspect ratio to preserve, so each axis
  // resizes independently from the fixed opposite corner.
  function attachTextResizeHandle(handleEl, cornerX, cornerY) {
    handleEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var el = textResizeTrackedEl;
      if (!el) return;
      var boxId = el.dataset.id;
      var canvasRect = slideCanvas.getBoundingClientRect();
      var boxData = findTextBoxData(currentSlideIndex, boxId);
      if (!boxData) return;

      // offsetWidth/offsetHeight (layout size) rather than
      // getBoundingClientRect() — the latter returns the rotated,
      // axis-aligned bounding box once the box has any rotation,
      // which would size the drag math wrong.
      var startLeftPct = boxData.leftPct;
      var startTopPct = boxData.topPct;
      var startWidthPct = (el.offsetWidth / canvasRect.width) * 100;
      var startHeightPct = (el.offsetHeight / canvasRect.height) * 100;

      var centerXpx = canvasRect.left + (startLeftPct / 100) * canvasRect.width;
      var centerYpx = canvasRect.top + (startTopPct / 100) * canvasRect.height;
      var halfWpx = (startWidthPct / 100) * canvasRect.width / 2;
      var halfHpx = (startHeightPct / 100) * canvasRect.height / 2;

      var fixedX = cornerX === 'left' ? centerXpx + halfWpx : centerXpx - halfWpx;
      var fixedY = cornerY === 'top' ? centerYpx + halfHpx : centerYpx - halfHpx;

      var MIN_SIZE_PX = 60;

      el.classList.add('has-size-override');

      function onMouseMove(e2) {
        var newWidthPx = Math.max(MIN_SIZE_PX, cornerX === 'left' ? (fixedX - e2.clientX) : (e2.clientX - fixedX));
        var newHeightPx = Math.max(MIN_SIZE_PX, cornerY === 'top' ? (fixedY - e2.clientY) : (e2.clientY - fixedY));

        var draggedX = cornerX === 'left' ? fixedX - newWidthPx : fixedX + newWidthPx;
        var draggedY = cornerY === 'top' ? fixedY - newHeightPx : fixedY + newHeightPx;

        var newCenterXpx = (fixedX + draggedX) / 2;
        var newCenterYpx = (fixedY + draggedY) / 2;

        el.style.left = ((newCenterXpx - canvasRect.left) / canvasRect.width * 100) + '%';
        el.style.top = ((newCenterYpx - canvasRect.top) / canvasRect.height * 100) + '%';
        el.style.width = (newWidthPx / canvasRect.width * 100) + '%';
        el.style.height = (newHeightPx / canvasRect.height * 100) + '%';
        positionTextResizeOverlay();
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        var newLeftPct = parseFloat(el.style.left);
        var newTopPct = parseFloat(el.style.top);
        var newWidthPct = parseFloat(el.style.width);
        var newHeightPct = parseFloat(el.style.height);

        pushUndo({
          type: 'text-resize',
          slideIndex: currentSlideIndex,
          boxId: boxId,
          fromLeft: startLeftPct, fromTop: startTopPct,
          fromWidth: boxData.widthPct, fromHeight: boxData.heightPct,
          toLeft: newLeftPct, toTop: newTopPct, toWidth: newWidthPct, toHeight: newHeightPct
        });

        boxData.leftPct = newLeftPct;
        boxData.topPct = newTopPct;
        boxData.widthPct = newWidthPct;
        boxData.heightPct = newHeightPct;
        positionTextResizeOverlay();
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // Same drag-to-rotate math as shapes' attachShapeRotateHandle, but
  // operating through the overlay on whichever text box it's
  // currently tracking (freeform boxes only — from-layout boxes are
  // top-left anchored and don't rotate, see buildTextBoxElement).
  function attachTextRotateHandle(handleEl) {
    handleEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var el = textResizeTrackedEl;
      if (!el || el.classList.contains('from-layout')) return;
      var boxId = el.dataset.id;
      var boxData = findTextBoxData(currentSlideIndex, boxId);
      if (!boxData) return;
      var fromRotation = boxData.rotation || 0;

      function angleFromCenter(clientX, clientY) {
        var rect = el.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        var radians = Math.atan2(clientX - centerX, -(clientY - centerY));
        return radians * (180 / Math.PI);
      }

      var pendingRotation = fromRotation;

      function onMouseMove(e2) {
        var angle = angleFromCenter(e2.clientX, e2.clientY);
        if (e2.shiftKey) angle = Math.round(angle / 15) * 15;
        pendingRotation = angle;
        el.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'deg)';
        textResizeOverlay.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'deg)';
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (pendingRotation !== fromRotation) {
          pushUndo({
            type: 'text-rotate',
            slideIndex: currentSlideIndex,
            boxId: boxId,
            fromRotation: fromRotation,
            toRotation: pendingRotation
          });
          boxData.rotation = pendingRotation;
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function buildTextBoxElement(boxData) {
    var el = document.createElement('div');
    el.className = 'text-box';
    if (boxData.fromLayout) {
      el.classList.add('from-layout');
      if (boxData.variant) el.classList.add('variant-' + boxData.variant);
      el.style.width = boxData.widthPct + '%';
      el.style.height = boxData.heightPct + '%';
    } else if (boxData.widthPct != null && boxData.heightPct != null) {
      // Freeform box that's been explicitly resized (see
      // attachTextResizeHandle) — otherwise freeform boxes stay
      // auto-sized to their content, min-/max-width only.
      el.classList.add('has-size-override');
      el.style.width = boxData.widthPct + '%';
      el.style.height = boxData.heightPct + '%';
    }
    el.dataset.id = boxData.id;
    el.tabIndex = -1;
    el.setAttribute('contenteditable', 'false');
    el.setAttribute('data-placeholder', boxData.placeholder || 'Click to add text');
    el.style.left = boxData.leftPct + '%';
    el.style.top = boxData.topPct + '%';
    // Layout-derived boxes are top-left anchored (transform: none —
    // see .text-box.from-layout), so rotation is freeform-only, same
    // scoping as resize.
    if (!boxData.fromLayout && boxData.rotation) {
      el.style.transform = 'translate(-50%, -50%) rotate(' + boxData.rotation + 'deg)';
    }
    if (boxData.align) el.style.textAlign = boxData.align;
    el.style.backgroundColor = boxData.fillColor || 'transparent';
    el.style.border = '2px solid ' + (boxData.borderColor || 'transparent');
    el.innerHTML = boxData.html || '';
    updateEmptyState(el);
    attachTextBoxEvents(el);

    return el;
  }

  function addTextBox() {
    var boxData = { type: 'text', id: 'obj' + (nextObjectId++), leftPct: 50, topPct: 50, html: '' };
    slides[currentSlideIndex].objects.push(boxData);
    pushUndo({ type: 'add', slideIndex: currentSlideIndex, boxId: boxData.id });
    renderCanvas();

    var el = objectLayer.querySelector('[data-id="' + boxData.id + '"]');
    if (el) enterEditMode(el);
  }

  document.getElementById('addTextBoxBtn').addEventListener('click', addTextBox);

  // ------------------------------------------------------------
  // Font family / size — applied to the highlighted text within
  // whichever text box is currently being edited. The two <select>s
  // are always browsable; picking a value only has an effect if a
  // text box is in edit mode (it wraps the current selection in a
  // styled <span>, or restyles the whole box if nothing is
  // highlighted), the same way a minimal rich-text editor would,
  // since these are plain contenteditable divs with no rich-text
  // library backing them.
  // ------------------------------------------------------------
  var fontFamilySelect = document.getElementById('fontFamilySelect');
  var fontSizeSelect = document.getElementById('fontSizeSelect');
  var fontFamilyWrapper = fontFamilySelect.closest('.toolbar-select-wrapper');
  var fontSizeWrapper = fontSizeSelect.closest('.toolbar-select-wrapper');
  var boldBtn = document.getElementById('boldBtn');
  var italicBtn = document.getElementById('italicBtn');
  var underlineBtn = document.getElementById('underlineBtn');
  var textColorDropdownWrapper = document.getElementById('textColorDropdownWrapper');
  var highlightColorDropdownWrapper = document.getElementById('highlightColorDropdownWrapper');
  var formattingControls = [
    fontFamilyWrapper, fontSizeWrapper, boldBtn, italicBtn, underlineBtn,
    textColorDropdownWrapper, highlightColorDropdownWrapper
  ];
  var lastEditableSelectionRange = null;

  // True if `node` is (or is inside) one of the font/bold/italic/
  // underline toolbar controls — clicking these must not count as
  // "clicking away" from the text box being formatted.
  function isFormattingControl(node) {
    return formattingControls.some(function (ctrl) { return ctrl.contains(node); });
  }

  // Called whenever the caret/selection moves inside the active
  // text box, so the last known highlighted range survives the
  // <select>'s own mousedown/focus stealing focus away from the
  // contenteditable. Only overwrite the stored range with a real,
  // non-collapsed highlight — the mousedown/focus move onto the
  // <select> itself fires one more selectionchange with the
  // selection already collapsed (or moved into the <select>), and
  // that must NOT clobber the highlight we're about to apply a
  // style to.
  function captureEditableSelection() {
    var editable = (activeTextBoxEl && activeTextBoxEl.getAttribute('contenteditable') === 'true') ? activeTextBoxEl : activeEditingCell;
    if (!editable) return;
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    var range = sel.getRangeAt(0);
    if (editable.contains(range.commonAncestorContainer)) {
      lastEditableSelectionRange = range.cloneRange();
    }
  }

  document.addEventListener('selectionchange', captureEditableSelection);

  // Wraps every text node touched by `range` in its own <span>,
  // splitting boundary nodes so only the highlighted characters are
  // affected, then applies `styleProp`/`styleValue` to each span.
  // Returns the wrapping spans in document order so the caller can
  // rebuild a selection spanning exactly the restyled text.
  function applyStyleToRange(range, styleProp, styleValue) {
    if (range.collapsed) return [];

    // commonAncestorContainer is often the text node itself when the
    // whole highlight sits inside one run of text (the common case
    // for a single-line selection) — a text node has no children, so
    // rooting the walker there finds nothing. Walk from its parent
    // element instead.
    var walkRoot = range.commonAncestorContainer;
    if (walkRoot.nodeType === Node.TEXT_NODE) walkRoot = walkRoot.parentNode;

    var walker = document.createTreeWalker(
      walkRoot,
      NodeFilter.SHOW_TEXT,
      null
    );
    var textNodes = [];
    while (walker.nextNode()) {
      if (range.intersectsNode(walker.currentNode)) textNodes.push(walker.currentNode);
    }

    var spans = [];
    textNodes.forEach(function (node) {
      var start = node === range.startContainer ? range.startOffset : 0;
      var end = node === range.endContainer ? range.endOffset : node.length;
      if (start >= end) return;

      if (end < node.length) node.splitText(end);
      var middle = start > 0 ? node.splitText(start) : node;

      var span = document.createElement('span');
      span.style[styleProp] = styleValue;
      middle.parentNode.insertBefore(span, middle);
      span.appendChild(middle);
      spans.push(span);
    });
    return spans;
  }

  // Shared by every formatting control (font family/size, bold,
  // italic, underline): figures out whether to restyle the
  // highlighted text or the whole box, applies `mutate` (which does
  // the actual style-setting/spanning), records undo, and — if a
  // highlight was restyled — rebuilds the selection so the highlight
  // stays visible instead of collapsing. Targets either the active
  // text box, or (if a table cell is actively being edited) that
  // cell — a cell has no "selected, not editing" state the way a
  // text box does, so formatting it only ever makes sense while
  // actually typing in it.
  function applyFormatting(mutate) {
    var el = activeTextBoxEl || activeEditingCell;
    if (!el) return;
    var isCell = !activeTextBoxEl && !!activeEditingCell;
    var isEditing = isCell || el.getAttribute('contenteditable') === 'true';
    var fromHtml = el.innerHTML;

    var range = lastEditableSelectionRange;
    var hasHighlight = isEditing && range && !range.collapsed && el.contains(range.commonAncestorContainer);
    var newSpans = mutate(el, hasHighlight ? range : null);

    var toHtml = el.innerHTML;
    if (toHtml !== fromHtml) {
      if (isCell) {
        var r = parseInt(el.dataset.row, 10);
        var c = parseInt(el.dataset.col, 10);
        var tableData = findTableData(currentSlideIndex, activeTableId);
        if (tableData) {
          pushUndo({
            type: 'table-cell-edit',
            slideIndex: currentSlideIndex,
            tableId: activeTableId,
            row: r,
            col: c,
            fromText: fromHtml,
            toText: toHtml
          });
          setCellHtml(tableData, r, c, toHtml);
        }
      } else {
        var boxData = findTextBoxData(currentSlideIndex, el.dataset.id);
        if (boxData) {
          pushUndo({
            type: 'font-style',
            slideIndex: currentSlideIndex,
            boxId: el.dataset.id,
            fromHtml: fromHtml,
            toHtml: toHtml
          });
          boxData.html = toHtml;
        }
      }
    }

    if (isEditing) {
      el.focus();
      if (newSpans && newSpans.length) {
        // Rebuild the range from the freshly-wrapped spans rather than
        // reusing `range` — the mutation split/replaced the nodes it
        // pointed at, so its old boundaries aren't trustworthy.
        var restored = document.createRange();
        restored.setStart(newSpans[0], 0);
        var lastSpan = newSpans[newSpans.length - 1];
        restored.setEnd(lastSpan, lastSpan.childNodes.length);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(restored);
        lastEditableSelectionRange = restored.cloneRange();
      }
    }
  }

  function applyFontStyle(styleProp, styleValue) {
    applyFormatting(function (el, range) {
      if (range) return applyStyleToRange(range, styleProp, styleValue);
      // Not editing, or nothing highlighted while editing — apply to
      // the whole box so the control still does something useful
      // (mirrors "no selection = whole element" behaviour in most
      // editors, and lets font/size work from the "selected, not yet
      // editing" state too).
      el.style[styleProp] = styleValue;
    });
  }

  // Bold/italic/underline are toggles rather than fixed values, so
  // "on" is decided per click from the current state of the
  // highlight/box (fully already-on -> switch off, otherwise on).
  function isRangeFullyStyled(range, isOnFn) {
    var walkRoot = range.commonAncestorContainer;
    if (walkRoot.nodeType === Node.TEXT_NODE) walkRoot = walkRoot.parentNode;
    var walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_TEXT, null);
    var found = false;
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (!range.intersectsNode(node)) continue;
      if (node === range.startContainer && node === range.endContainer && range.startOffset === range.endOffset) continue;
      found = true;
      if (!isOnFn(node.parentNode)) return false;
    }
    return found;
  }

  function applyFontToggle(styleProp, onValue, offValue, isOnFn) {
    applyFormatting(function (el, range) {
      if (range) {
        var turnOff = isRangeFullyStyled(range, isOnFn);
        return applyStyleToRange(range, styleProp, turnOff ? offValue : onValue);
      }
      var turnOffWhole = isOnFn(el);
      el.style[styleProp] = turnOffWhole ? offValue : onValue;
    });
  }

  // Buttons default-focus on click, which would move focus away from
  // the contenteditable before the click handler runs and collapse
  // the live selection. preventDefault on mousedown stops that, the
  // same way it's avoided for the text box's own drag handling.
  [boldBtn, italicBtn, underlineBtn].forEach(function (btn) {
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  });

  boldBtn.addEventListener('click', function () {
    applyFontToggle('fontWeight', '700', '400', function (node) {
      var weight = window.getComputedStyle(node).fontWeight;
      return weight === 'bold' || parseInt(weight, 10) >= 700;
    });
  });

  italicBtn.addEventListener('click', function () {
    applyFontToggle('fontStyle', 'italic', 'normal', function (node) {
      return window.getComputedStyle(node).fontStyle === 'italic';
    });
  });

  underlineBtn.addEventListener('click', function () {
    applyFontToggle('textDecorationLine', 'underline', 'none', function (node) {
      return window.getComputedStyle(node).textDecorationLine.indexOf('underline') !== -1;
    });
  });

  fontFamilySelect.addEventListener('change', function () {
    applyFontStyle('fontFamily', fontFamilySelect.value);
  });

  fontSizeSelect.addEventListener('change', function () {
    applyFontStyle('fontSize', fontSizeSelect.value + 'px');
  });

  // ------------------------------------------------------------
  // Text colour / highlight colour — same dropdown shell as Theme
  // (toggle button + absolutely-positioned panel with a swatch
  // grid), but the swatches set `color` / `backgroundColor` on the
  // highlighted text (or whole box) via the shared applyFormatting
  // pipeline instead of picking a slide background.
  // ------------------------------------------------------------
  var TEXT_COLOR_SWATCHES = [
    '#000000', '#4A5FC1', '#1AA694', '#0F7A6B',
    '#E8A33D', '#D64545', '#7A7F8C', '#FFFFFF'
  ];
  var HIGHLIGHT_COLOR_SWATCHES = [
    '#F5C518', '#FFE58A', '#A7F0C2', '#9AE0D9',
    '#FFC299', '#FF9E9E', '#C9D6FF', '#E4E7EC'
  ];

  var textColorToggleBtn = document.getElementById('textColorToggleBtn');
  var textColorDropdownPanel = document.getElementById('textColorDropdownPanel');
  var textColorGrid = document.getElementById('textColorGrid');
  var textColorBar = document.getElementById('textColorBar');
  var textColorCustomInput = document.getElementById('textColorCustomInput');

  var highlightColorToggleBtn = document.getElementById('highlightColorToggleBtn');
  var highlightColorDropdownPanel = document.getElementById('highlightColorDropdownPanel');
  var highlightColorGrid = document.getElementById('highlightColorGrid');
  var highlightColorBar = document.getElementById('highlightColorBar');
  var highlightColorCustomInput = document.getElementById('highlightColorCustomInput');
  var highlightColorNoneBtn = document.getElementById('highlightColorNoneBtn');

  function buildColorSwatchGrid(grid, colors, onPick) {
    colors.forEach(function (hex) {
      var swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'color-swatch';
      swatch.style.background = hex;
      swatch.title = hex;
      swatch.addEventListener('mousedown', function (e) { e.preventDefault(); });
      swatch.addEventListener('click', function () { onPick(hex); });
      grid.appendChild(swatch);
    });
  }

  function openTextColorDropdown() {
    textColorDropdownPanel.classList.add('open');
    textColorToggleBtn.classList.add('active');
  }
  function closeTextColorDropdown() {
    textColorDropdownPanel.classList.remove('open');
    textColorToggleBtn.classList.remove('active');
  }
  function openHighlightColorDropdown() {
    highlightColorDropdownPanel.classList.add('open');
    highlightColorToggleBtn.classList.add('active');
  }
  function closeHighlightColorDropdown() {
    highlightColorDropdownPanel.classList.remove('open');
    highlightColorToggleBtn.classList.remove('active');
  }

  textColorToggleBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  textColorToggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (textColorDropdownPanel.classList.contains('open')) closeTextColorDropdown();
    else { closeAllDropdowns('textColor'); openTextColorDropdown(); }
  });

  highlightColorToggleBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  highlightColorToggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (highlightColorDropdownPanel.classList.contains('open')) closeHighlightColorDropdown();
    else { closeAllDropdowns('highlightColor'); openHighlightColorDropdown(); }
  });

  document.addEventListener('click', function (e) {
    if (textColorDropdownPanel.classList.contains('open') && !textColorDropdownWrapper.contains(e.target)) {
      closeTextColorDropdown();
    }
    if (highlightColorDropdownPanel.classList.contains('open') && !highlightColorDropdownWrapper.contains(e.target)) {
      closeHighlightColorDropdown();
    }
  });

  function setTextColor(hex) {
    applyFontStyle('color', hex);
    textColorBar.style.background = hex;
    closeTextColorDropdown();
  }

  // Unlike font family/size/colour, a highlight only ever means
  // "behind the highlighted text" — it should never paint the whole
  // box's background, so (unlike applyFontStyle) this does nothing
  // when there's no actual text highlighted.
  function applyHighlightColor(hex) {
    applyFormatting(function (el, range) {
      if (range) return applyStyleToRange(range, 'backgroundColor', hex);
    });
  }

  function setHighlightColor(hex) {
    applyHighlightColor(hex);
    highlightColorBar.style.background = hex;
    closeHighlightColorDropdown();
  }

  buildColorSwatchGrid(textColorGrid, TEXT_COLOR_SWATCHES, setTextColor);
  buildColorSwatchGrid(highlightColorGrid, HIGHLIGHT_COLOR_SWATCHES, setHighlightColor);

  // Deliberately no mousedown preventDefault here (unlike the other
  // controls) — that would stop the native colour dialog from
  // opening at all. Focus temporarily leaving the text box while the
  // dialog is open is covered by isFormattingControl in the blur
  // handler, and the highlighted range is preserved via
  // lastEditableSelectionRange.
  textColorCustomInput.addEventListener('input', function () {
    setTextColor(textColorCustomInput.value);
  });

  highlightColorCustomInput.addEventListener('input', function () {
    setHighlightColor(highlightColorCustomInput.value);
  });

  highlightColorNoneBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  highlightColorNoneBtn.addEventListener('click', function () {
    applyHighlightColor('transparent');
    highlightColorBar.style.background = 'transparent';
    closeHighlightColorDropdown();
  });

  // ------------------------------------------------------------
  // Box fill / border colour — unlike font/highlight colour, these
  // are whole-box properties (a box either has a background/border
  // or it doesn't — there's no "highlighted run" equivalent), so
  // they always apply to the whole box and work whether it's merely
  // selected or actively being edited. Both default to transparent/
  // none. Works on text boxes, shapes, and tables (see
  // applyBoxStyle) — same dropdown shell as text/highlight colour.
  // ------------------------------------------------------------
  var BOX_FILL_SWATCHES = [
    '#FFFFFF', '#F4F5F7', '#E7F7F4', '#1AA694',
    '#16264A', '#E8A33D', '#D64545', '#4A5FC1'
  ];
  var BOX_BORDER_SWATCHES = [
    '#16264A', '#1AA694', '#4A5FC1', '#0F7A6B',
    '#E8A33D', '#D64545', '#7A7F8C', '#000000'
  ];

  var boxFillToggleBtn = document.getElementById('boxFillToggleBtn');
  var boxFillDropdownPanel = document.getElementById('boxFillDropdownPanel');
  var boxFillGrid = document.getElementById('boxFillGrid');
  var boxFillBar = document.getElementById('boxFillBar');
  var boxFillCustomInput = document.getElementById('boxFillCustomInput');
  var boxFillNoneBtn = document.getElementById('boxFillNoneBtn');

  var boxBorderToggleBtn = document.getElementById('boxBorderToggleBtn');
  var boxBorderDropdownPanel = document.getElementById('boxBorderDropdownPanel');
  var boxBorderGrid = document.getElementById('boxBorderGrid');
  var boxBorderBar = document.getElementById('boxBorderBar');
  var boxBorderCustomInput = document.getElementById('boxBorderCustomInput');
  var boxBorderNoneBtn = document.getElementById('boxBorderNoneBtn');

  var boxFillDropdownWrapper = document.getElementById('boxFillDropdownWrapper');
  var boxBorderDropdownWrapper = document.getElementById('boxBorderDropdownWrapper');
  formattingControls.push(boxFillDropdownWrapper, boxBorderDropdownWrapper);

  function openBoxFillDropdown() {
    boxFillDropdownPanel.classList.add('open');
    boxFillToggleBtn.classList.add('active');
  }
  function closeBoxFillDropdown() {
    boxFillDropdownPanel.classList.remove('open');
    boxFillToggleBtn.classList.remove('active');
  }
  function openBoxBorderDropdown() {
    boxBorderDropdownPanel.classList.add('open');
    boxBorderToggleBtn.classList.add('active');
  }
  function closeBoxBorderDropdown() {
    boxBorderDropdownPanel.classList.remove('open');
    boxBorderToggleBtn.classList.remove('active');
  }

  boxFillToggleBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  boxFillToggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (boxFillDropdownPanel.classList.contains('open')) closeBoxFillDropdown();
    else { closeAllDropdowns('boxFill'); openBoxFillDropdown(); }
  });

  boxBorderToggleBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  boxBorderToggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (boxBorderDropdownPanel.classList.contains('open')) closeBoxBorderDropdown();
    else { closeAllDropdowns('boxBorder'); openBoxBorderDropdown(); }
  });

  document.addEventListener('click', function (e) {
    if (boxFillDropdownPanel.classList.contains('open') && !boxFillDropdownWrapper.contains(e.target)) {
      closeBoxFillDropdown();
    }
    if (boxBorderDropdownPanel.classList.contains('open') && !boxBorderDropdownWrapper.contains(e.target)) {
      closeBoxBorderDropdown();
    }
  });

  // Applies directly to the object's data + the live element's own
  // rendering — no highlighted-range branch needed since these are
  // always whole-object properties. Works on whichever object type
  // that carries a fillColor/borderColor is currently selected (text
  // boxes, shapes, and tables all use those same field names on
  // their data, see buildShapeElement/buildTableElement).
  function applyBoxStyle(field, cssProp, value) {
    var el = activeTextBoxEl || activeShapeEl || activeTableEl;
    if (!el) return;
    var isShape = !!activeShapeEl;
    var isTable = !!activeTableEl;
    var boxData = (isShape || isTable) ? findObjectData(currentSlideIndex, el.dataset.id) : findTextBoxData(currentSlideIndex, el.dataset.id);
    if (!boxData) return;
    var fromValue = boxData[field] || null;
    if (value === fromValue || (!value && !fromValue)) return;

    pushUndo({
      type: 'box-style',
      slideIndex: currentSlideIndex,
      boxId: el.dataset.id,
      field: field,
      fromValue: fromValue,
      toValue: value
    });
    boxData[field] = value;

    if (isShape) {
      var shapeBodyEl = el.querySelector('.canvas-shape-body').firstElementChild;
      var svgAttr = cssProp === 'backgroundColor' ? 'fill' : 'stroke';
      shapeBodyEl.setAttribute(svgAttr, value || 'transparent');
    } else if (isTable) {
      var tableEl = el.querySelector('.canvas-table');
      if (cssProp === 'backgroundColor') {
        tableEl.style.backgroundColor = value || 'transparent';
      } else {
        tableEl.style.border = '2px solid ' + (value || 'transparent');
      }
    } else {
      el.style[cssProp] = cssProp === 'border' ? '2px solid ' + (value || 'transparent') : (value || 'transparent');
      if (el.getAttribute('contenteditable') === 'true') el.focus();
    }
  }

  function setBoxFill(hex) {
    applyBoxStyle('fillColor', 'backgroundColor', hex);
    boxFillBar.style.background = hex;
    closeBoxFillDropdown();
  }

  function setBoxBorder(hex) {
    applyBoxStyle('borderColor', 'border', hex);
    boxBorderBar.style.background = hex;
    closeBoxBorderDropdown();
  }

  buildColorSwatchGrid(boxFillGrid, BOX_FILL_SWATCHES, setBoxFill);
  buildColorSwatchGrid(boxBorderGrid, BOX_BORDER_SWATCHES, setBoxBorder);

  boxFillCustomInput.addEventListener('input', function () {
    setBoxFill(boxFillCustomInput.value);
  });

  boxBorderCustomInput.addEventListener('input', function () {
    setBoxBorder(boxBorderCustomInput.value);
  });

  boxFillNoneBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  boxFillNoneBtn.addEventListener('click', function () {
    applyBoxStyle('fillColor', 'backgroundColor', null);
    boxFillBar.style.background = 'transparent';
    closeBoxFillDropdown();
  });

  boxBorderNoneBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  boxBorderNoneBtn.addEventListener('click', function () {
    applyBoxStyle('borderColor', 'border', null);
    boxBorderBar.style.background = 'transparent';
    closeBoxBorderDropdown();
  });

  // ------------------------------------------------------------
  // Text alignment — unlike font/colour, text-align is a block-level
  // property (it affects the whole paragraph, never just a
  // highlighted run of characters within it), so it always applies
  // to the whole box and there's no per-range span-wrapping here.
  // The four buttons act like a radio group: whichever alignment is
  // active gets the .active highlight, mirroring boxData.align
  // whenever a text box is selected/edited.
  // ------------------------------------------------------------
  var alignButtons = [
    document.getElementById('alignLeftBtn'),
    document.getElementById('alignCenterBtn'),
    document.getElementById('alignRightBtn'),
    document.getElementById('alignJustifyBtn')
  ];
  formattingControls.push.apply(formattingControls, alignButtons);

  function setTextAlign(align) {
    if (activeEditingCell) {
      applyCellAlign(align);
      return;
    }
    if (!activeTextBoxEl) return;
    var el = activeTextBoxEl;
    var boxData = findTextBoxData(currentSlideIndex, el.dataset.id);
    if (!boxData) return;
    var fromAlign = boxData.align || 'left';
    if (align === fromAlign) return;

    pushUndo({
      type: 'align',
      slideIndex: currentSlideIndex,
      boxId: el.dataset.id,
      fromAlign: fromAlign,
      toAlign: align
    });
    boxData.align = align;
    el.style.textAlign = align;

    updateAlignButtons();
    if (el.getAttribute('contenteditable') === 'true') el.focus();
  }

  // Cell alignment counterpart to the text-box path above — same
  // radio-group behaviour, but addressed by tableId/row/col instead
  // of boxId, and persisted onto the cell's own { html, align }
  // object rather than a text box's data.
  function applyCellAlign(align) {
    var cell = activeEditingCell;
    var r = parseInt(cell.dataset.row, 10);
    var c = parseInt(cell.dataset.col, 10);
    var data = findTableData(currentSlideIndex, activeTableId);
    if (!data) return;
    var cellData = normalizeCell(data, r, c);
    var fromAlign = cellData.align || 'left';
    if (align === fromAlign) return;

    pushUndo({
      type: 'table-cell-align',
      slideIndex: currentSlideIndex,
      tableId: activeTableId,
      row: r,
      col: c,
      fromAlign: fromAlign,
      toAlign: align
    });
    cellData.align = align;
    cell.style.textAlign = align;

    updateAlignButtons();
    cell.focus();
  }

  function updateAlignButtons() {
    var current = null;
    if (activeEditingCell) {
      var r = parseInt(activeEditingCell.dataset.row, 10);
      var c = parseInt(activeEditingCell.dataset.col, 10);
      var tableData = findTableData(currentSlideIndex, activeTableId);
      var cellData = tableData && tableData.rows[r] && tableData.rows[r][c];
      current = (cellData && typeof cellData === 'object' ? cellData.align : null) || 'left';
    } else if (activeTextBoxEl) {
      var boxData = findTextBoxData(currentSlideIndex, activeTextBoxEl.dataset.id);
      current = boxData ? (boxData.align || 'left') : null;
    }
    alignButtons.forEach(function (btn) {
      btn.classList.toggle('active', !!current && btn.dataset.align === current);
    });
  }

  alignButtons.forEach(function (btn) {
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function () { setTextAlign(btn.dataset.align); });
  });

  // Reflects the selected/edited box's actual fill+border colour on
  // the two toolbar swatch bars, so they always show this box's
  // current state rather than whatever was last picked globally.
  function updateBoxStyleBars() {
    var el = activeTextBoxEl || activeShapeEl || activeTableEl;
    var boxData = el ? findObjectData(currentSlideIndex, el.dataset.id) : null;
    boxFillBar.style.background = (boxData && boxData.fillColor) || 'transparent';
    boxBorderBar.style.background = (boxData && boxData.borderColor) || 'transparent';
  }

  // ------------------------------------------------------------
  // Bulleted / numbered / lettered lists — unlike the other text
  // controls, lists only make sense while actively editing (they
  // restructure lines/paragraphs, not a highlighted run or the whole
  // box), so these are no-ops unless a text box is in edit mode. Uses
  // the browser's native list commands rather than hand-rolling list
  // DOM/Enter-to-continue/merge behaviour ourselves — execCommand is
  // deprecated but still universally supported, and reimplementing
  // list editing is a lot of surface area to get subtly wrong versus
  // just wrapping/unwrapping <span> runs like the other controls do.
  // ------------------------------------------------------------
  var bulletListBtn = document.getElementById('bulletListBtn');
  var numberListBtn = document.getElementById('numberListBtn');
  var letterListBtn = document.getElementById('letterListBtn');
  formattingControls.push(bulletListBtn, numberListBtn, letterListBtn);

  function toggleList(command, olType) {
    var isCell = !!activeEditingCell;
    var el = isCell ? activeEditingCell : activeTextBoxEl;
    if (!el || el.getAttribute('contenteditable') !== 'true') return;
    var fromHtml = el.innerHTML;

    el.focus();
    document.execCommand(command, false, null);

    if (olType) {
      var lists = el.querySelectorAll('ol');
      lists.forEach(function (ol) { ol.type = olType; });
    }

    var toHtml = el.innerHTML;
    if (toHtml !== fromHtml) {
      if (isCell) {
        var r = parseInt(el.dataset.row, 10);
        var c = parseInt(el.dataset.col, 10);
        var tableData = findTableData(currentSlideIndex, activeTableId);
        if (tableData) {
          pushUndo({
            type: 'table-cell-edit',
            slideIndex: currentSlideIndex,
            tableId: activeTableId,
            row: r,
            col: c,
            fromText: fromHtml,
            toText: toHtml
          });
          setCellHtml(tableData, r, c, toHtml);
        }
      } else {
        var boxData = findTextBoxData(currentSlideIndex, el.dataset.id);
        if (boxData) {
          pushUndo({
            type: 'font-style',
            slideIndex: currentSlideIndex,
            boxId: el.dataset.id,
            fromHtml: fromHtml,
            toHtml: toHtml
          });
          boxData.html = toHtml;
        }
      }
    }
  }

  [bulletListBtn, numberListBtn, letterListBtn].forEach(function (btn) {
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  });

  bulletListBtn.addEventListener('click', function () {
    toggleList('insertUnorderedList', null);
  });

  numberListBtn.addEventListener('click', function () {
    toggleList('insertOrderedList', '1');
  });

  letterListBtn.addEventListener('click', function () {
    toggleList('insertOrderedList', 'a');
  });

  // Converts a layout's title/subtitle/content regions into real,
  // editable text boxes at the same position and size — replacing
  // whichever text boxes came from the previously-chosen layout
  // (tagged fromLayout: true), without touching any freeform boxes
  // the user added themselves. The picture region isn't converted —
  // there's no image tool yet, so it stays the static placeholder
  // rendered by renderSlideLayoutPlaceholders().
  function applyLayoutTextBoxes(layoutId) {
    var slide = slides[currentSlideIndex];
    var layout = getLayoutById(layoutId);

    slide.objects = slide.objects.filter(function (b) { return !b.fromLayout; });

    layout.placeholders.forEach(function (ph) {
      if (ph.variant === 'picture') return;
      slide.objects.push({
        type: 'text',
        id: 'obj' + (nextObjectId++),
        leftPct: ph.left,
        topPct: ph.top,
        widthPct: ph.width,
        heightPct: ph.height,
        html: '',
        fromLayout: true,
        variant: ph.variant,
        placeholder: ph.text
      });
    });
  }

  // ------------------------------------------------------------
  // Freeform tables — same idea as text boxes (drag, select, edit,
  // delete, undo), plus row/column controls that appear once the
  // table is selected: a "+" at the right edge adds a column, a "+"
  // at the bottom edge adds a row, and small "x" buttons in the
  // margins above each column / left of each row delete that one
  // (down to a minimum of 1x1). Default new table is 3 rows x 4
  // columns.
  // ------------------------------------------------------------
  var activeTableEl = null;
  var activeTableId = null;
  var activeEditingCell = null;
  var activeEditingCellStartText = null;

  var TABLE_DEL_ICON =
    '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var TABLE_GRIP_ICON =
    '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" stroke="none"><circle cx="8" cy="6" r="1.6"/><circle cx="16" cy="6" r="1.6"/><circle cx="8" cy="12" r="1.6"/><circle cx="16" cy="12" r="1.6"/><circle cx="8" cy="18" r="1.6"/><circle cx="16" cy="18" r="1.6"/></svg>';

  var HOLD_TO_DELETE_MS = 450;

  function clampPct(v) { return Math.max(0, Math.min(100, v)); }

  function commitCellEdit() {
    if (!activeEditingCell) return;
    var cell = activeEditingCell;
    // Strip a lone leftover <br> (same empty-cell caret situation as
    // text boxes — see deselectTextBox) if nothing else was typed.
    if (cell.textContent.trim() === '' && cell.innerHTML !== '') cell.innerHTML = '';
    var finalHtml = cell.innerHTML;
    if (finalHtml !== activeEditingCellStartText) {
      var r = parseInt(cell.dataset.row, 10);
      var c = parseInt(cell.dataset.col, 10);
      var data = findTableData(currentSlideIndex, activeTableId);
      if (data) {
        pushUndo({
          type: 'table-cell-edit',
          slideIndex: currentSlideIndex,
          tableId: activeTableId,
          row: r,
          col: c,
          fromText: activeEditingCellStartText,
          toText: finalHtml
        });
        setCellHtml(data, r, c, finalHtml);
      }
    }
    cell.setAttribute('contenteditable', 'false');
    cell.blur();
    activeEditingCell = null;
    activeEditingCellStartText = null;
    lastEditableSelectionRange = null;
    updateAlignButtons();
  }

  function selectTable(wrapEl, tableId) {
    deselectTextBox();
    deselectImage();
    clearMultiSelection();
    if (activeTableEl && activeTableEl !== wrapEl) deselectTable();
    activeTableEl = wrapEl;
    activeTableId = tableId;
    wrapEl.classList.add('selected');
    updateBoxStyleBars();
  }

  function enterCellEdit(wrapEl, tableId, cell) {
    if (activeEditingCell && activeEditingCell !== cell) commitCellEdit();
    activeTableEl = wrapEl;
    activeTableId = tableId;
    wrapEl.classList.add('selected');
    activeEditingCell = cell;
    cell.setAttribute('contenteditable', 'true');
    var wasEmpty = cell.childNodes.length === 0;
    activeEditingCellStartText = cell.innerHTML;
    placeCursorAtEnd(cell, wasEmpty);
    updateAlignButtons();
  }

  function deselectTable() {
    if (!activeTableEl) return;
    commitCellEdit();
    activeTableEl.classList.remove('selected');
    activeTableEl = null;
    activeTableId = null;
    updateBoxStyleBars();
  }

  function reapplyTableSelection(tableId) {
    var el = objectLayer.querySelector('.canvas-table-wrap[data-id="' + tableId + '"]');
    if (el) { activeTableEl = el; activeTableId = tableId; el.classList.add('selected'); }
  }

  function addTableRow(tableId) {
    var data = findTableData(currentSlideIndex, tableId);
    if (!data) return;
    var numCols = data.rows[0] ? data.rows[0].length : 4;
    var newRow = [];
    for (var i = 0; i < numCols; i++) newRow.push(makeEmptyCell());
    data.rows.push(newRow);
    pushUndo({ type: 'table-addrow', slideIndex: currentSlideIndex, tableId: tableId });
    renderCanvas();
    reapplyTableSelection(tableId);
  }

  function addTableColumn(tableId) {
    var data = findTableData(currentSlideIndex, tableId);
    if (!data) return;
    data.rows.forEach(function (row) { row.push(makeEmptyCell()); });
    pushUndo({ type: 'table-addcol', slideIndex: currentSlideIndex, tableId: tableId });
    renderCanvas();
    reapplyTableSelection(tableId);
  }

  function deleteTableRow(tableId, rowIndex) {
    var data = findTableData(currentSlideIndex, tableId);
    if (!data || data.rows.length <= 1) return;
    var removedRow = data.rows[rowIndex];
    pushUndo({ type: 'table-delrow', slideIndex: currentSlideIndex, tableId: tableId, rowIndex: rowIndex, removedRow: removedRow });
    data.rows.splice(rowIndex, 1);
    renderCanvas();
    reapplyTableSelection(tableId);
  }

  function deleteTableColumn(tableId, colIndex) {
    var data = findTableData(currentSlideIndex, tableId);
    if (!data || !data.rows[0] || data.rows[0].length <= 1) return;
    var removedCells = data.rows.map(function (row) { return row[colIndex]; });
    pushUndo({ type: 'table-delcol', slideIndex: currentSlideIndex, tableId: tableId, colIndex: colIndex, removedCells: removedCells });
    data.rows.forEach(function (row) { row.splice(colIndex, 1); });
    renderCanvas();
    reapplyTableSelection(tableId);
  }

  function reorderTableRow(tableId, fromIndex, rawTargetIndex) {
    var data = findTableData(currentSlideIndex, tableId);
    if (!data) return;
    var toIndex = rawTargetIndex > fromIndex ? rawTargetIndex - 1 : rawTargetIndex;
    if (toIndex === fromIndex) return;
    var row = data.rows.splice(fromIndex, 1)[0];
    data.rows.splice(toIndex, 0, row);
    pushUndo({ type: 'table-row-reorder', slideIndex: currentSlideIndex, tableId: tableId, fromIndex: fromIndex, toIndex: toIndex });
    renderCanvas();
    reapplyTableSelection(tableId);
  }

  function reorderTableColumn(tableId, fromIndex, rawTargetIndex) {
    var data = findTableData(currentSlideIndex, tableId);
    if (!data) return;
    var toIndex = rawTargetIndex > fromIndex ? rawTargetIndex - 1 : rawTargetIndex;
    if (toIndex === fromIndex) return;
    data.rows.forEach(function (row) {
      var cell = row.splice(fromIndex, 1)[0];
      row.splice(toIndex, 0, cell);
    });
    pushUndo({ type: 'table-col-reorder', slideIndex: currentSlideIndex, tableId: tableId, fromIndex: fromIndex, toIndex: toIndex });
    renderCanvas();
    reapplyTableSelection(tableId);
  }

  function deleteActiveTable() {
    if (!activeTableEl || !activeTableId) return;
    var slide = slides[currentSlideIndex];
    var list = slide.objects || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === activeTableId) { idx = i; break; }
    }
    if (idx === -1) return;

    var data = list[idx];
    var snapshot = Object.assign({}, data);
    snapshot.rows = data.rows.map(function (r) { return r.slice(); });
    pushUndo({
      type: 'table-delete',
      slideIndex: currentSlideIndex,
      tableId: data.id,
      index: idx,
      tableData: snapshot
    });
    list.splice(idx, 1);
    activeTableEl = null;
    activeTableId = null;
    renderCanvas();
  }

  function attachTableEvents(wrapEl, tableId) {
    wrapEl.addEventListener('mousedown', function (e) {
      if (e.target.closest('.table-edge-btn') || e.target.closest('.table-handle')) return;

      var cell = e.target.closest('td');
      if (!cell) return;

      if (cell.getAttribute('contenteditable') === 'true') return; // native cursor/selection

      e.preventDefault();
      var wasSelected = wrapEl.classList.contains('selected');
      var isGroup = isGroupDrag(tableId);
      var startX = e.clientX;
      var startY = e.clientY;
      var startLeftPct = parseFloat(wrapEl.style.left);
      var startTopPct = parseFloat(wrapEl.style.top);
      var moved = false;
      var canvasRect = slideCanvas.getBoundingClientRect();

      function onMouseMove(e2) {
        var dx = e2.clientX - startX;
        var dy = e2.clientY - startY;
        if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          moved = true;
          if (isGroup) beginGroupDrag();
          else selectTable(wrapEl, tableId);
        }
        if (moved) {
          if (isGroup) {
            updateGroupDrag((dx / canvasRect.width) * 100, (dy / canvasRect.height) * 100);
          } else {
            var tentativeLeftPct = clampPct(startLeftPct + (dx / canvasRect.width) * 100);
            var tentativeTopPct = clampPct(startTopPct + (dy / canvasRect.height) * 100);
            var snapped = applySnapToDrag(wrapEl, tentativeLeftPct, tentativeTopPct, canvasRect, [tableId]);
            wrapEl.style.left = snapped.leftPct + '%';
            wrapEl.style.top = snapped.topPct + '%';
          }
        }
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        hideSnapGuides();

        if (moved && isGroup) {
          commitGroupDrag();
        } else if (moved) {
          var data = findTableData(currentSlideIndex, tableId);
          var newLeftPct = parseFloat(wrapEl.style.left);
          var newTopPct = parseFloat(wrapEl.style.top);
          if (data) {
            pushUndo({
              type: 'table-move',
              slideIndex: currentSlideIndex,
              tableId: tableId,
              fromLeft: startLeftPct,
              fromTop: startTopPct,
              toLeft: newLeftPct,
              toTop: newTopPct
            });
            data.leftPct = newLeftPct;
            data.topPct = newTopPct;
          }
        } else if (selectObjectOrGroup(tableId)) {
          // Grouped — handled.
        } else if (!wasSelected) {
          selectTable(wrapEl, tableId);
        } else {
          enterCellEdit(wrapEl, tableId, cell);
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // Row/column handles: quick click does nothing, drag reorders,
  // press-and-hold-still arms a delete state (release while armed
  // to delete). Boundary positions are measured once at the start
  // of the gesture (table isn't rebuilt mid-drag, so they stay
  // valid throughout).
  function attachHandleInteraction(handleEl, wrap, table, tableId, axis, index, count, rowLine, colLine) {
    handleEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var isRow = axis === 'row';
      var tableRect = table.getBoundingClientRect();
      var trs = table.querySelectorAll('tr');
      var boundaries = [0];

      if (isRow) {
        trs.forEach(function (tr) {
          var r = tr.getBoundingClientRect();
          boundaries.push(r.bottom - tableRect.top);
        });
      } else {
        var firstRowCells = trs[0].querySelectorAll('td');
        firstRowCells.forEach(function (td) {
          var r = td.getBoundingClientRect();
          boundaries.push(r.right - tableRect.left);
        });
      }

      var moved = false;
      var armed = false;
      var targetBoundaryIndex = index;

      // Radial fill sweeps over the hold window via requestAnimationFrame
      // (rather than a single timeout) so there's continuous visible
      // progress the whole ~450ms, not just a state flip at the end.
      var holdStart = performance.now();
      var chargeFrame = null;
      handleEl.classList.add('charging');

      function tickCharge() {
        var elapsed = performance.now() - holdStart;
        var pct = Math.min(100, (elapsed / HOLD_TO_DELETE_MS) * 100);
        handleEl.style.setProperty('--charge-progress', pct);
        if (pct < 100 && !moved) {
          chargeFrame = requestAnimationFrame(tickCharge);
        }
      }
      chargeFrame = requestAnimationFrame(tickCharge);

      function stopCharging() {
        if (chargeFrame) cancelAnimationFrame(chargeFrame);
        chargeFrame = null;
        handleEl.classList.remove('charging');
        handleEl.style.removeProperty('--charge-progress');
      }

      var holdTimer = setTimeout(function () {
        if (!moved) {
          armed = true;
          stopCharging();
          handleEl.classList.add('armed');
          handleEl.innerHTML = TABLE_DEL_ICON;
        }
      }, HOLD_TO_DELETE_MS);

      function nearestBoundary(coord) {
        var best = 0;
        var bestDist = Infinity;
        for (var i = 0; i <= count; i++) {
          var d = Math.abs(boundaries[i] - coord);
          if (d < bestDist) { bestDist = d; best = i; }
        }
        return best;
      }

      function showLine(boundaryIndex) {
        var line = isRow ? rowLine : colLine;
        var otherLine = isRow ? colLine : rowLine;
        otherLine.classList.remove('visible');
        line.classList.add('visible');
        if (isRow) {
          line.style.top = (boundaries[boundaryIndex] - 1.5) + 'px';
        } else {
          line.style.left = (boundaries[boundaryIndex] - 1.5) + 'px';
        }
      }

      function hideLines() {
        rowLine.classList.remove('visible');
        colLine.classList.remove('visible');
      }

      function onMouseMove(e2) {
        var dx = e2.clientX - e.clientX;
        var dy = e2.clientY - e.clientY;
        if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          moved = true;
          clearTimeout(holdTimer);
          stopCharging();
          if (armed) {
            armed = false;
            handleEl.classList.remove('armed');
            handleEl.innerHTML = TABLE_GRIP_ICON;
          }
        }
        if (moved) {
          var coord = isRow ? (e2.clientY - tableRect.top) : (e2.clientX - tableRect.left);
          targetBoundaryIndex = nearestBoundary(coord);
          showLine(targetBoundaryIndex);
        }
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        clearTimeout(holdTimer);
        stopCharging();
        hideLines();

        if (moved) {
          if (isRow) reorderTableRow(tableId, index, targetBoundaryIndex);
          else reorderTableColumn(tableId, index, targetBoundaryIndex);
        } else if (armed) {
          if (isRow) deleteTableRow(tableId, index);
          else deleteTableColumn(tableId, index);
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // Tables start auto-sized (55cqw wide, height driven by row
  // content) — the first drag measures the wrap's actual rendered
  // size via getBoundingClientRect and "locks it in" as an explicit
  // widthPct/heightPct, same pattern as text boxes' first resize
  // (attachTextResizeHandle). Resize is free on both axes — a table
  // doesn't have a "natural" aspect ratio the way an image does.
  function attachTableResizeHandle(handleEl, wrap, tableId, cornerX, cornerY) {
    handleEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var canvasRect = slideCanvas.getBoundingClientRect();
      var data = findTableData(currentSlideIndex, tableId);
      if (!data) return;

      // offsetWidth/offsetHeight (layout size, unaffected by the
      // wrap's own rotate() transform) rather than
      // getBoundingClientRect(), which would return the inflated
      // rotated bounding box once the table has any rotation.
      var startLeftPct = data.leftPct;
      var startTopPct = data.topPct;
      var startWidthPct = (wrap.offsetWidth / canvasRect.width) * 100;
      var startHeightPct = (wrap.offsetHeight / canvasRect.height) * 100;

      var centerXpx = canvasRect.left + (startLeftPct / 100) * canvasRect.width;
      var centerYpx = canvasRect.top + (startTopPct / 100) * canvasRect.height;
      var halfWpx = (startWidthPct / 100) * canvasRect.width / 2;
      var halfHpx = (startHeightPct / 100) * canvasRect.height / 2;

      var fixedX = cornerX === 'left' ? centerXpx + halfWpx : centerXpx - halfWpx;
      var fixedY = cornerY === 'top' ? centerYpx + halfHpx : centerYpx - halfHpx;

      var MIN_SIZE_PX = 60;

      selectTable(wrap, tableId);
      wrap.classList.add('has-size-override');

      function onMouseMove(e2) {
        var newWidthPx = Math.max(MIN_SIZE_PX, cornerX === 'left' ? (fixedX - e2.clientX) : (e2.clientX - fixedX));
        var newHeightPx = Math.max(MIN_SIZE_PX, cornerY === 'top' ? (fixedY - e2.clientY) : (e2.clientY - fixedY));

        var draggedX = cornerX === 'left' ? fixedX - newWidthPx : fixedX + newWidthPx;
        var draggedY = cornerY === 'top' ? fixedY - newHeightPx : fixedY + newHeightPx;

        var newCenterXpx = (fixedX + draggedX) / 2;
        var newCenterYpx = (fixedY + draggedY) / 2;

        wrap.style.left = ((newCenterXpx - canvasRect.left) / canvasRect.width * 100) + '%';
        wrap.style.top = ((newCenterYpx - canvasRect.top) / canvasRect.height * 100) + '%';
        wrap.style.width = (newWidthPx / canvasRect.width * 100) + '%';
        wrap.style.height = (newHeightPx / canvasRect.height * 100) + '%';
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        var newLeftPct = parseFloat(wrap.style.left);
        var newTopPct = parseFloat(wrap.style.top);
        var newWidthPct = parseFloat(wrap.style.width);
        var newHeightPct = parseFloat(wrap.style.height);

        pushUndo({
          type: 'table-resize',
          slideIndex: currentSlideIndex,
          tableId: tableId,
          fromLeft: startLeftPct, fromTop: startTopPct, fromWidth: data.widthPct, fromHeight: data.heightPct,
          toLeft: newLeftPct, toTop: newTopPct, toWidth: newWidthPct, toHeight: newHeightPct
        });

        data.leftPct = newLeftPct;
        data.topPct = newTopPct;
        data.widthPct = newWidthPct;
        data.heightPct = newHeightPct;
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // Same drag-to-rotate math as attachShapeRotateHandle/
  // attachImageRotateHandle.
  function attachTableRotateHandle(handleEl, wrap, tableId) {
    handleEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var data = findTableData(currentSlideIndex, tableId);
      if (!data) return;
      var fromRotation = data.rotation || 0;

      selectTable(wrap, tableId);

      function angleFromCenter(clientX, clientY) {
        var rect = wrap.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        var radians = Math.atan2(clientX - centerX, -(clientY - centerY));
        return radians * (180 / Math.PI);
      }

      function onMouseMove(e2) {
        var angle = angleFromCenter(e2.clientX, e2.clientY);
        if (e2.shiftKey) angle = Math.round(angle / 15) * 15;
        wrap.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'deg)';
        wrap.dataset.pendingRotation = angle;
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        var toRotation = wrap.dataset.pendingRotation !== undefined ? parseFloat(wrap.dataset.pendingRotation) : fromRotation;
        delete wrap.dataset.pendingRotation;

        if (toRotation !== fromRotation) {
          pushUndo({
            type: 'table-rotate',
            slideIndex: currentSlideIndex,
            tableId: tableId,
            fromRotation: fromRotation,
            toRotation: toRotation
          });
          data.rotation = toRotation;
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function buildTableElement(data) {
    var wrap = document.createElement('div');
    wrap.className = 'canvas-table-wrap';
    wrap.dataset.id = data.id;
    wrap.style.left = data.leftPct + '%';
    wrap.style.top = data.topPct + '%';
    if (data.widthPct != null && data.heightPct != null) {
      wrap.classList.add('has-size-override');
      wrap.style.width = data.widthPct + '%';
      wrap.style.height = data.heightPct + '%';
    }
    if (data.rotation) {
      wrap.style.transform = 'translate(-50%, -50%) rotate(' + data.rotation + 'deg)';
    }

    var table = document.createElement('table');
    table.className = 'canvas-table';
    if (data.fillColor) table.style.backgroundColor = data.fillColor;
    if (data.borderColor) table.style.border = '2px solid ' + data.borderColor;

    data.rows.forEach(function (rowValues, r) {
      var tr = document.createElement('tr');
      rowValues.forEach(function (cell, c) {
        // Backward-compatible with tables saved before cells became
        // { html, align } objects — a bare string just becomes html
        // with no alignment.
        var cellData = (cell && typeof cell === 'object') ? cell : { html: cell || '', align: null };
        var td = document.createElement('td');
        td.setAttribute('contenteditable', 'false');
        td.dataset.row = r;
        td.dataset.col = c;
        td.innerHTML = cellData.html || '';
        if (cellData.align) td.style.textAlign = cellData.align;
        td.addEventListener('blur', function (e) {
          if (activeEditingCell !== this) return;
          if (e.relatedTarget && isFormattingControl(e.relatedTarget)) return;
          commitCellEdit();
        });
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    wrap.appendChild(table);

    var addColBtn = document.createElement('button');
    addColBtn.type = 'button';
    addColBtn.className = 'table-edge-btn table-add-col-btn';
    addColBtn.title = 'Add column';
    addColBtn.textContent = '+';
    addColBtn.addEventListener('click', function (e) { e.stopPropagation(); addTableColumn(data.id); });
    wrap.appendChild(addColBtn);

    var addRowBtn = document.createElement('button');
    addRowBtn.type = 'button';
    addRowBtn.className = 'table-edge-btn table-add-row-btn';
    addRowBtn.title = 'Add row';
    addRowBtn.textContent = '+';
    addRowBtn.addEventListener('click', function (e) { e.stopPropagation(); addTableRow(data.id); });
    wrap.appendChild(addRowBtn);

    var rowLine = document.createElement('div');
    rowLine.className = 'table-reorder-line row-line';
    wrap.appendChild(rowLine);

    var colLine = document.createElement('div');
    colLine.className = 'table-reorder-line col-line';
    wrap.appendChild(colLine);

    var numCols = data.rows[0] ? data.rows[0].length : 0;
    for (var c = 0; c < numCols; c++) {
      (function (colIndex) {
        var colHandle = document.createElement('button');
        colHandle.type = 'button';
        colHandle.className = 'table-handle table-col-handle';
        colHandle.title = 'Drag to reorder — hold to delete';
        colHandle.style.left = ((colIndex + 0.5) / numCols * 100) + '%';
        colHandle.innerHTML = TABLE_GRIP_ICON;
        attachHandleInteraction(colHandle, wrap, table, data.id, 'col', colIndex, numCols, rowLine, colLine);
        wrap.appendChild(colHandle);
      })(c);
    }

    var numRows = data.rows.length;
    for (var r = 0; r < numRows; r++) {
      (function (rowIndex) {
        var rowHandle = document.createElement('button');
        rowHandle.type = 'button';
        rowHandle.className = 'table-handle table-row-handle';
        rowHandle.title = 'Drag to reorder — hold to delete';
        rowHandle.style.top = ((rowIndex + 0.5) / numRows * 100) + '%';
        rowHandle.innerHTML = TABLE_GRIP_ICON;
        attachHandleInteraction(rowHandle, wrap, table, data.id, 'row', rowIndex, numRows, rowLine, colLine);
        wrap.appendChild(rowHandle);
      })(r);
    }

    [
      { cls: 'tl', x: 'left', y: 'top' },
      { cls: 'tr', x: 'right', y: 'top' },
      { cls: 'bl', x: 'left', y: 'bottom' },
      { cls: 'br', x: 'right', y: 'bottom' }
    ].forEach(function (c) {
      var resizeHandle = document.createElement('div');
      resizeHandle.className = 'table-resize-handle handle-' + c.cls;
      attachTableResizeHandle(resizeHandle, wrap, data.id, c.x, c.y);
      wrap.appendChild(resizeHandle);
    });

    var rotateStalk = document.createElement('div');
    rotateStalk.className = 'shape-rotate-stalk';
    wrap.appendChild(rotateStalk);

    var rotateHandle = document.createElement('div');
    rotateHandle.className = 'shape-rotate-handle';
    attachTableRotateHandle(rotateHandle, wrap, data.id);
    wrap.appendChild(rotateHandle);

    attachTableEvents(wrap, data.id);
    if (data.id === activeTableId) wrap.classList.add('selected');
    return wrap;
  }

  // Renders slide.objects in array order into the single shared
  // layer, so DOM order (= paint order = stacking order) always
  // matches creation order: whatever was added most recently ends
  // up last in the array and therefore on top. This is also the
  // order the Arrange menu rearranges (see moveActiveObject/
  // moveMultiSelection).
  function renderObjects() {
    objectLayer.innerHTML = '';
    var slide = slides[currentSlideIndex];
    if (!slide.objects) slide.objects = [];

    slide.objects.forEach(function (obj) {
      var el;
      if (obj.type === 'table') el = buildTableElement(obj);
      else if (obj.type === 'image') el = buildImageElement(obj);
      else if (obj.type === 'shape') el = buildShapeElement(obj);
      else el = buildTextBoxElement(obj);
      objectLayer.appendChild(el);
    });
  }

  function addTable() {
    var rows = [];
    for (var r = 0; r < 3; r++) {
      var row = [];
      for (var c = 0; c < 4; c++) row.push(makeEmptyCell());
      rows.push(row);
    }
    var data = { type: 'table', id: 'obj' + (nextObjectId++), leftPct: 50, topPct: 50, rows: rows };
    slides[currentSlideIndex].objects.push(data);
    pushUndo({ type: 'table-add', slideIndex: currentSlideIndex, tableId: data.id });
    renderCanvas();
    reapplyTableSelection(data.id);
  }

  document.getElementById('addTableBtn').addEventListener('click', addTable);

  // ------------------------------------------------------------
  // Freeform images — same object family as text boxes/tables
  // (drag, select, delete, undo), plus four corner handles for
  // resizing once selected. Corner-drag always preserves the
  // image's original aspect ratio, scaling from the opposite
  // (fixed) corner — the standard Canva/PowerPoint default.
  //
  // Files are read client-side via FileReader into a data URL —
  // there's no backend, so nothing is actually uploaded anywhere.
  // That's fine for this wireframe, but worth remembering once
  // "Save" becomes real: a base64 image baked into saved state
  // won't scale the way real file storage would.
  // ------------------------------------------------------------
  var activeImageEl = null;
  var activeImageId = null;
  var imageFileInput = document.getElementById('imageFileInput');

  function selectImage(wrap, imageId) {
    deselectTextBox();
    deselectTable();
    clearMultiSelection();
    if (activeImageEl && activeImageEl !== wrap) deselectImage();
    activeImageEl = wrap;
    activeImageId = imageId;
    wrap.classList.add('selected');
  }

  function deselectImage() {
    if (!activeImageEl) return;
    activeImageEl.classList.remove('selected');
    activeImageEl = null;
    activeImageId = null;
  }

  function reapplyImageSelection(imageId) {
    var el = objectLayer.querySelector('.canvas-image-wrap[data-id="' + imageId + '"]');
    if (el) { activeImageEl = el; activeImageId = imageId; el.classList.add('selected'); }
  }

  function deleteActiveImage() {
    if (!activeImageEl || !activeImageId) return;
    var slide = slides[currentSlideIndex];
    var list = slide.objects || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === activeImageId) { idx = i; break; }
    }
    if (idx === -1) return;

    var data = list[idx];
    pushUndo({
      type: 'image-delete',
      slideIndex: currentSlideIndex,
      imageId: data.id,
      index: idx,
      imageData: Object.assign({}, data)
    });
    list.splice(idx, 1);
    activeImageEl = null;
    activeImageId = null;
    renderCanvas();
  }

  function attachImageMoveEvents(wrap, imageId) {
    wrap.addEventListener('mousedown', function (e) {
      if (e.target.closest('.image-resize-handle')) return; // handled separately

      e.preventDefault();
      var wasSelected = wrap.classList.contains('selected');
      var isGroup = isGroupDrag(imageId);
      var startX = e.clientX;
      var startY = e.clientY;
      var startLeftPct = parseFloat(wrap.style.left);
      var startTopPct = parseFloat(wrap.style.top);
      var moved = false;
      var canvasRect = slideCanvas.getBoundingClientRect();

      function onMouseMove(e2) {
        var dx = e2.clientX - startX;
        var dy = e2.clientY - startY;
        if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          moved = true;
          if (isGroup) beginGroupDrag();
          else selectImage(wrap, imageId);
        }
        if (moved) {
          if (isGroup) {
            updateGroupDrag((dx / canvasRect.width) * 100, (dy / canvasRect.height) * 100);
          } else {
            var tentativeLeftPct = clampPct(startLeftPct + (dx / canvasRect.width) * 100);
            var tentativeTopPct = clampPct(startTopPct + (dy / canvasRect.height) * 100);
            var snapped = applySnapToDrag(wrap, tentativeLeftPct, tentativeTopPct, canvasRect, [imageId]);
            wrap.style.left = snapped.leftPct + '%';
            wrap.style.top = snapped.topPct + '%';
          }
        }
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        hideSnapGuides();

        if (moved && isGroup) {
          commitGroupDrag();
        } else if (moved) {
          var data = findObjectData(currentSlideIndex, imageId);
          var newLeftPct = parseFloat(wrap.style.left);
          var newTopPct = parseFloat(wrap.style.top);
          if (data) {
            pushUndo({
              type: 'image-move',
              slideIndex: currentSlideIndex,
              imageId: imageId,
              fromLeft: startLeftPct,
              fromTop: startTopPct,
              toLeft: newLeftPct,
              toTop: newTopPct
            });
            data.leftPct = newLeftPct;
            data.topPct = newTopPct;
          }
        } else if (!selectObjectOrGroup(imageId)) {
          selectImage(wrap, imageId);
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // cornerX/cornerY identify which corner THIS handle sits on; the
  // opposite corner stays fixed while dragging.
  function attachImageResizeHandle(handleEl, wrap, imageId, cornerX, cornerY) {
    handleEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var canvasRect = slideCanvas.getBoundingClientRect();
      var data = findObjectData(currentSlideIndex, imageId);
      if (!data) return;

      var startLeftPct = data.leftPct;
      var startTopPct = data.topPct;
      var startWidthPct = data.widthPct;
      var startHeightPct = data.heightPct;

      var centerXpx = canvasRect.left + (startLeftPct / 100) * canvasRect.width;
      var centerYpx = canvasRect.top + (startTopPct / 100) * canvasRect.height;
      var halfWpx = (startWidthPct / 100) * canvasRect.width / 2;
      var halfHpx = (startHeightPct / 100) * canvasRect.height / 2;

      var fixedX = cornerX === 'left' ? centerXpx + halfWpx : centerXpx - halfWpx;
      var fixedY = cornerY === 'top' ? centerYpx + halfHpx : centerYpx - halfHpx;

      var aspectRatioPx = (startWidthPct * canvasRect.width) / (startHeightPct * canvasRect.height);
      var MIN_SIZE_PX = 24;

      selectImage(wrap, imageId);

      function onMouseMove(e2) {
        var newWidthPx = cornerX === 'left' ? (fixedX - e2.clientX) : (e2.clientX - fixedX);
        newWidthPx = Math.max(MIN_SIZE_PX, newWidthPx);
        var newHeightPx = newWidthPx / aspectRatioPx;

        var draggedX = cornerX === 'left' ? fixedX - newWidthPx : fixedX + newWidthPx;
        var draggedY = cornerY === 'top' ? fixedY - newHeightPx : fixedY + newHeightPx;

        var newCenterXpx = (fixedX + draggedX) / 2;
        var newCenterYpx = (fixedY + draggedY) / 2;

        wrap.style.left = ((newCenterXpx - canvasRect.left) / canvasRect.width * 100) + '%';
        wrap.style.top = ((newCenterYpx - canvasRect.top) / canvasRect.height * 100) + '%';
        wrap.style.width = (newWidthPx / canvasRect.width * 100) + '%';
        wrap.style.height = (newHeightPx / canvasRect.height * 100) + '%';
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        var newLeftPct = parseFloat(wrap.style.left);
        var newTopPct = parseFloat(wrap.style.top);
        var newWidthPct = parseFloat(wrap.style.width);
        var newHeightPct = parseFloat(wrap.style.height);

        pushUndo({
          type: 'image-resize',
          slideIndex: currentSlideIndex,
          imageId: imageId,
          fromLeft: startLeftPct, fromTop: startTopPct, fromWidth: startWidthPct, fromHeight: startHeightPct,
          toLeft: newLeftPct, toTop: newTopPct, toWidth: newWidthPct, toHeight: newHeightPct
        });

        data.leftPct = newLeftPct;
        data.topPct = newTopPct;
        data.widthPct = newWidthPct;
        data.heightPct = newHeightPct;
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // Same drag-to-rotate math as attachShapeRotateHandle — the wrap
  // rotates around its own centre, resize handles rotate along with
  // it since they're direct children, and Shift snaps to 15°.
  function attachImageRotateHandle(handleEl, wrap, imageId) {
    handleEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var data = findObjectData(currentSlideIndex, imageId);
      if (!data) return;
      var fromRotation = data.rotation || 0;

      selectImage(wrap, imageId);

      function angleFromCenter(clientX, clientY) {
        var rect = wrap.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        var radians = Math.atan2(clientX - centerX, -(clientY - centerY));
        return radians * (180 / Math.PI);
      }

      function onMouseMove(e2) {
        var angle = angleFromCenter(e2.clientX, e2.clientY);
        if (e2.shiftKey) angle = Math.round(angle / 15) * 15;
        wrap.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'deg)';
        wrap.dataset.pendingRotation = angle;
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        var toRotation = wrap.dataset.pendingRotation !== undefined ? parseFloat(wrap.dataset.pendingRotation) : fromRotation;
        delete wrap.dataset.pendingRotation;

        if (toRotation !== fromRotation) {
          pushUndo({
            type: 'image-rotate',
            slideIndex: currentSlideIndex,
            imageId: imageId,
            fromRotation: fromRotation,
            toRotation: toRotation
          });
          data.rotation = toRotation;
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function buildImageElement(data) {
    var wrap = document.createElement('div');
    wrap.className = 'canvas-image-wrap';
    wrap.dataset.id = data.id;
    wrap.style.left = data.leftPct + '%';
    wrap.style.top = data.topPct + '%';
    wrap.style.width = data.widthPct + '%';
    wrap.style.height = data.heightPct + '%';
    var rotation = data.rotation || 0;
    wrap.style.transform = 'translate(-50%, -50%) rotate(' + rotation + 'deg)';

    var img = document.createElement('img');
    img.className = 'canvas-image-el';
    img.src = data.src;
    img.draggable = false;
    img.alt = '';
    wrap.appendChild(img);

    [
      { cls: 'tl', x: 'left', y: 'top' },
      { cls: 'tr', x: 'right', y: 'top' },
      { cls: 'bl', x: 'left', y: 'bottom' },
      { cls: 'br', x: 'right', y: 'bottom' }
    ].forEach(function (c) {
      var handle = document.createElement('div');
      handle.className = 'image-resize-handle handle-' + c.cls;
      attachImageResizeHandle(handle, wrap, data.id, c.x, c.y);
      wrap.appendChild(handle);
    });

    var stalk = document.createElement('div');
    stalk.className = 'shape-rotate-stalk';
    wrap.appendChild(stalk);

    var rotateHandle = document.createElement('div');
    rotateHandle.className = 'shape-rotate-handle';
    attachImageRotateHandle(rotateHandle, wrap, data.id);
    wrap.appendChild(rotateHandle);

    attachImageMoveEvents(wrap, data.id);
    if (data.id === activeImageId) wrap.classList.add('selected');
    return wrap;
  }

  function addImageObject(src, naturalWidth, naturalHeight) {
    // Convert the image's pixel aspect ratio into width%/height% —
    // read live from the canvas rather than assuming a fixed 4:3,
    // so this keeps working correctly if the slide ratio ever
    // changes later.
    var canvasRect = slideCanvas.getBoundingClientRect();
    var canvasRatio = canvasRect.width / canvasRect.height;

    var widthPct, heightPct;
    if (naturalWidth >= naturalHeight) {
      widthPct = 40;
      heightPct = widthPct * (naturalHeight / naturalWidth) * canvasRatio;
    } else {
      heightPct = 40;
      widthPct = heightPct * (naturalWidth / naturalHeight) / canvasRatio;
    }

    var data = {
      type: 'image',
      id: 'obj' + (nextObjectId++),
      leftPct: 50,
      topPct: 50,
      widthPct: widthPct,
      heightPct: heightPct,
      src: src
    };
    slides[currentSlideIndex].objects.push(data);
    pushUndo({ type: 'image-add', slideIndex: currentSlideIndex, imageId: data.id });
    renderCanvas();
    reapplyImageSelection(data.id);
  }

  document.getElementById('addImageBtn').addEventListener('click', function () {
    imageFileInput.value = ''; // reset, so picking the same file twice still fires 'change'
    imageFileInput.click();
  });

  // Downscales/re-encodes an image before it's baked into saved state
  // as a data URL — with no backend, every image lives entirely as
  // base64 inside localStorage (shared ~5-10MB quota for the whole
  // origin), so a handful of full-resolution photos can blow that
  // budget fast. Capping the longest edge and re-encoding as JPEG
  // keeps typical images to a small fraction of their original size;
  // callback receives (dataUrl, naturalWidth, naturalHeight).
  var IMAGE_MAX_DIMENSION_PX = 1600;
  var IMAGE_JPEG_QUALITY = 0.82;

  function downscaleImageFile(file, callback) {
    var reader = new FileReader();
    reader.onload = function (evt) {
      var probe = new Image();
      probe.onload = function () {
        var scale = Math.min(1, IMAGE_MAX_DIMENSION_PX / Math.max(probe.naturalWidth, probe.naturalHeight));
        var outWidth = Math.round(probe.naturalWidth * scale);
        var outHeight = Math.round(probe.naturalHeight * scale);

        var canvas = document.createElement('canvas');
        canvas.width = outWidth;
        canvas.height = outHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(probe, 0, 0, outWidth, outHeight);

        // PNGs with transparency need to stay PNG (JPEG has no alpha
        // channel and would flatten it to black); anything else gets
        // re-encoded as JPEG for the size win.
        var isPng = file.type === 'image/png';
        var outSrc = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', IMAGE_JPEG_QUALITY);
        callback(outSrc, outWidth, outHeight);
      };
      probe.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  imageFileInput.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    downscaleImageFile(file, function (src, width, height) {
      addImageObject(src, width, height);
    });
  });

  // ------------------------------------------------------------
  // Freeform shapes — same object family as text boxes/tables/images
  // (drag, select, delete, undo), plus a fifth handle above the
  // shape for rotation. Corner-resize locks to the shape's own
  // aspect ratio by default (matching images), same as it started
  // when the drag began — holding Shift frees it to resize width/
  // height independently instead.
  // ------------------------------------------------------------
  var activeShapeEl = null;
  var activeShapeId = null;

  // Each shape carries its own viewBox matching its true bounding
  // box exactly, rather than sharing one fixed 0 0 100 100 box — an
  // equilateral triangle is inherently wider than it is tall (ratio
  // ~1.155:1), so drawing it in a square viewBox always either
  // leaves a gap (inscribed) or needs SVG overflow to hang past the
  // edges (which visually reads as "outside the selection box").
  // Giving the triangle its own 115.47x100 viewBox instead means the
  // selection box (sized from the same widthPct/heightPct the SVG
  // renders at) hugs the triangle's actual bounds on all sides, same
  // as the square and circle.
  var SHAPE_BODY_SVG = {
    rect: {
      viewBox: '0 0 100 100',
      markup: '<rect x="1.5" y="1.5" width="97" height="97" vector-effect="non-scaling-stroke"/>'
    },
    ellipse: {
      viewBox: '0 0 100 100',
      markup: '<ellipse cx="50" cy="50" rx="48.5" ry="48.5" vector-effect="non-scaling-stroke"/>'
    },
    // Inset by an even 2-unit margin top and bottom (not a centroid
    // scale — a triangle's centroid sits 1/3 up from its base, not
    // at the vertical midpoint, so scaling from it shrinks the apex
    // margin more than the base margin, leaving an uneven gap). With
    // height fixed at 100-2-2=96, base width = 96/(sqrt(3)/2) ≈
    // 110.85, centred in the 115.47-wide viewBox (≈2.31 either side)
    // — still exactly equilateral, just with a uniform margin on
    // every edge instead of an equal-percentage-scale one.
    triangle: {
      viewBox: '0 0 115.47 100',
      markup: '<path d="M57.735 2 L2.31 98 L113.16 98 Z" stroke-linejoin="miter" vector-effect="non-scaling-stroke"/>'
    }
  };

  function selectShape(wrap, shapeId) {
    deselectTextBox();
    deselectTable();
    deselectImage();
    clearMultiSelection();
    if (activeShapeEl && activeShapeEl !== wrap) deselectShape();
    activeShapeEl = wrap;
    activeShapeId = shapeId;
    wrap.classList.add('selected');
    updateBoxStyleBars();
  }

  function deselectShape() {
    if (!activeShapeEl) return;
    activeShapeEl.classList.remove('selected');
    activeShapeEl = null;
    activeShapeId = null;
    updateBoxStyleBars();
  }

  function reapplyShapeSelection(shapeId) {
    var el = objectLayer.querySelector('.canvas-shape-wrap[data-id="' + shapeId + '"]');
    if (el) { activeShapeEl = el; activeShapeId = shapeId; el.classList.add('selected'); }
  }

  function deleteActiveShape() {
    if (!activeShapeEl || !activeShapeId) return;
    var slide = slides[currentSlideIndex];
    var list = slide.objects || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === activeShapeId) { idx = i; break; }
    }
    if (idx === -1) return;

    var data = list[idx];
    pushUndo({
      type: 'shape-delete',
      slideIndex: currentSlideIndex,
      shapeId: data.id,
      index: idx,
      shapeData: Object.assign({}, data)
    });
    list.splice(idx, 1);
    activeShapeEl = null;
    activeShapeId = null;
    renderCanvas();
  }

  function attachShapeMoveEvents(wrap, shapeId) {
    wrap.addEventListener('mousedown', function (e) {
      if (e.target.closest('.shape-resize-handle') || e.target.closest('.shape-rotate-handle')) return;

      e.preventDefault();
      var wasSelected = wrap.classList.contains('selected');
      var isGroup = isGroupDrag(shapeId);
      var startX = e.clientX;
      var startY = e.clientY;
      var startLeftPct = parseFloat(wrap.style.left);
      var startTopPct = parseFloat(wrap.style.top);
      var moved = false;
      var canvasRect = slideCanvas.getBoundingClientRect();

      function onMouseMove(e2) {
        var dx = e2.clientX - startX;
        var dy = e2.clientY - startY;
        if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          moved = true;
          if (isGroup) beginGroupDrag();
          else selectShape(wrap, shapeId);
        }
        if (moved) {
          if (isGroup) {
            updateGroupDrag((dx / canvasRect.width) * 100, (dy / canvasRect.height) * 100);
          } else {
            var tentativeLeftPct = clampPct(startLeftPct + (dx / canvasRect.width) * 100);
            var tentativeTopPct = clampPct(startTopPct + (dy / canvasRect.height) * 100);
            var snapped = applySnapToDrag(wrap, tentativeLeftPct, tentativeTopPct, canvasRect, [shapeId]);
            wrap.style.left = snapped.leftPct + '%';
            wrap.style.top = snapped.topPct + '%';
          }
        }
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        hideSnapGuides();

        if (moved && isGroup) {
          commitGroupDrag();
        } else if (moved) {
          var data = findObjectData(currentSlideIndex, shapeId);
          var newLeftPct = parseFloat(wrap.style.left);
          var newTopPct = parseFloat(wrap.style.top);
          if (data) {
            pushUndo({
              type: 'shape-move',
              slideIndex: currentSlideIndex,
              shapeId: shapeId,
              fromLeft: startLeftPct,
              fromTop: startTopPct,
              toLeft: newLeftPct,
              toTop: newTopPct
            });
            data.leftPct = newLeftPct;
            data.topPct = newTopPct;
          }
        } else if (!selectObjectOrGroup(shapeId)) {
          selectShape(wrap, shapeId);
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // cornerX/cornerY identify which corner THIS handle sits on; the
  // opposite corner stays fixed while dragging. Free resize by
  // default (width/height independent); holding Shift locks to the
  // aspect ratio the shape had when the drag started.
  function attachShapeResizeHandle(handleEl, wrap, shapeId, cornerX, cornerY) {
    handleEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var canvasRect = slideCanvas.getBoundingClientRect();
      var data = findObjectData(currentSlideIndex, shapeId);
      if (!data) return;

      var startLeftPct = data.leftPct;
      var startTopPct = data.topPct;
      var startWidthPct = data.widthPct;
      var startHeightPct = data.heightPct;

      var centerXpx = canvasRect.left + (startLeftPct / 100) * canvasRect.width;
      var centerYpx = canvasRect.top + (startTopPct / 100) * canvasRect.height;
      var halfWpx = (startWidthPct / 100) * canvasRect.width / 2;
      var halfHpx = (startHeightPct / 100) * canvasRect.height / 2;

      var fixedX = cornerX === 'left' ? centerXpx + halfWpx : centerXpx - halfWpx;
      var fixedY = cornerY === 'top' ? centerYpx + halfHpx : centerYpx - halfHpx;

      var aspectRatioPx = (startWidthPct * canvasRect.width) / (startHeightPct * canvasRect.height);
      var MIN_SIZE_PX = 24;

      selectShape(wrap, shapeId);

      function onMouseMove(e2) {
        var newWidthPx = Math.max(MIN_SIZE_PX, cornerX === 'left' ? (fixedX - e2.clientX) : (e2.clientX - fixedX));
        var newHeightPx = Math.max(MIN_SIZE_PX, cornerY === 'top' ? (fixedY - e2.clientY) : (e2.clientY - fixedY));

        if (!e2.shiftKey) {
          // Locked to the shape's own aspect ratio by default (so a
          // circle/square/equilateral triangle stays that way as you
          // resize it) — drive height off whichever axis moved
          // further, so it feels natural regardless of which corner/
          // direction is being dragged. Hold Shift to resize freely.
          if (Math.abs(newWidthPx - halfWpx * 2) >= Math.abs(newHeightPx - halfHpx * 2)) {
            newHeightPx = Math.max(MIN_SIZE_PX, newWidthPx / aspectRatioPx);
          } else {
            newWidthPx = Math.max(MIN_SIZE_PX, newHeightPx * aspectRatioPx);
          }
        }

        var draggedX = cornerX === 'left' ? fixedX - newWidthPx : fixedX + newWidthPx;
        var draggedY = cornerY === 'top' ? fixedY - newHeightPx : fixedY + newHeightPx;

        var newCenterXpx = (fixedX + draggedX) / 2;
        var newCenterYpx = (fixedY + draggedY) / 2;

        wrap.style.left = ((newCenterXpx - canvasRect.left) / canvasRect.width * 100) + '%';
        wrap.style.top = ((newCenterYpx - canvasRect.top) / canvasRect.height * 100) + '%';
        wrap.style.width = (newWidthPx / canvasRect.width * 100) + '%';
        wrap.style.height = (newHeightPx / canvasRect.height * 100) + '%';
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        var newLeftPct = parseFloat(wrap.style.left);
        var newTopPct = parseFloat(wrap.style.top);
        var newWidthPct = parseFloat(wrap.style.width);
        var newHeightPct = parseFloat(wrap.style.height);

        pushUndo({
          type: 'shape-resize',
          slideIndex: currentSlideIndex,
          shapeId: shapeId,
          fromLeft: startLeftPct, fromTop: startTopPct, fromWidth: startWidthPct, fromHeight: startHeightPct,
          toLeft: newLeftPct, toTop: newTopPct, toWidth: newWidthPct, toHeight: newHeightPct
        });

        data.leftPct = newLeftPct;
        data.topPct = newTopPct;
        data.widthPct = newWidthPct;
        data.heightPct = newHeightPct;
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // Dragging the rotate handle sets the shape's angle around its own
  // centre — angle is measured from the pointer's position relative
  // to the shape's screen centre, atan2'd into degrees, with 0°
  // pointing straight up (matching the handle's resting position
  // directly above the shape) rather than atan2's native "0° = right".
  function attachShapeRotateHandle(handleEl, wrap, shapeId) {
    handleEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var data = findObjectData(currentSlideIndex, shapeId);
      if (!data) return;
      var fromRotation = data.rotation || 0;

      selectShape(wrap, shapeId);

      function angleFromCenter(clientX, clientY) {
        var rect = wrap.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        var radians = Math.atan2(clientX - centerX, -(clientY - centerY));
        return radians * (180 / Math.PI);
      }

      function onMouseMove(e2) {
        var angle = angleFromCenter(e2.clientX, e2.clientY);
        // Snap to 15° increments while Shift is held, same modifier
        // convention as the resize handles' aspect-ratio lock.
        if (e2.shiftKey) angle = Math.round(angle / 15) * 15;
        wrap.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'deg)';
        wrap.dataset.pendingRotation = angle;
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        var toRotation = wrap.dataset.pendingRotation !== undefined ? parseFloat(wrap.dataset.pendingRotation) : fromRotation;
        delete wrap.dataset.pendingRotation;

        if (toRotation !== fromRotation) {
          pushUndo({
            type: 'shape-rotate',
            slideIndex: currentSlideIndex,
            shapeId: shapeId,
            fromRotation: fromRotation,
            toRotation: toRotation
          });
          data.rotation = toRotation;
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function buildShapeElement(data) {
    var wrap = document.createElement('div');
    wrap.className = 'canvas-shape-wrap';
    wrap.dataset.id = data.id;
    wrap.style.left = data.leftPct + '%';
    wrap.style.top = data.topPct + '%';
    wrap.style.width = data.widthPct + '%';
    wrap.style.height = data.heightPct + '%';
    var rotation = data.rotation || 0;
    wrap.style.transform = 'translate(-50%, -50%) rotate(' + rotation + 'deg)';

    var shapeDef = SHAPE_BODY_SVG[data.shapeType] || SHAPE_BODY_SVG.rect;
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', shapeDef.viewBox);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('canvas-shape-body');
    svg.innerHTML = shapeDef.markup;
    var shapeEl = svg.firstElementChild;
    shapeEl.setAttribute('fill', data.fillColor || 'transparent');
    shapeEl.setAttribute('stroke', data.borderColor || '#16264A');
    shapeEl.setAttribute('stroke-width', '2');
    wrap.appendChild(svg);

    [
      { cls: 'tl', x: 'left', y: 'top' },
      { cls: 'tr', x: 'right', y: 'top' },
      { cls: 'bl', x: 'left', y: 'bottom' },
      { cls: 'br', x: 'right', y: 'bottom' }
    ].forEach(function (c) {
      var handle = document.createElement('div');
      handle.className = 'shape-resize-handle handle-' + c.cls;
      attachShapeResizeHandle(handle, wrap, data.id, c.x, c.y);
      wrap.appendChild(handle);
    });

    var stalk = document.createElement('div');
    stalk.className = 'shape-rotate-stalk';
    wrap.appendChild(stalk);

    var rotateHandle = document.createElement('div');
    rotateHandle.className = 'shape-rotate-handle';
    attachShapeRotateHandle(rotateHandle, wrap, data.id);
    wrap.appendChild(rotateHandle);

    attachShapeMoveEvents(wrap, data.id);
    if (data.id === activeShapeId) wrap.classList.add('selected');
    return wrap;
  }

  function addShapeObject(shapeType) {
    // Each shape's box needs to render at the same width:height ratio
    // as its own viewBox (square for rect/ellipse, ~1.1547:1 for the
    // equilateral triangle) for it to come in undistorted — square,
    // circle, equilateral triangle respectively. leftPct/topPct/
    // widthPct/heightPct are percentages of the canvas's own (not
    // necessarily square) width/height, so that target ratio needs
    // the canvas's own aspect ratio folded in, same conversion
    // addImageObject uses for images' natural aspect ratio.
    var shapeDef = SHAPE_BODY_SVG[shapeType] || SHAPE_BODY_SVG.rect;
    var viewBoxParts = shapeDef.viewBox.split(' ').map(Number);
    var shapeRatio = viewBoxParts[2] / viewBoxParts[3]; // viewBox width / height

    var canvasRect = slideCanvas.getBoundingClientRect();
    var canvasRatio = canvasRect.width / canvasRect.height;
    var widthPct = 26;
    var heightPct = (widthPct / shapeRatio) * canvasRatio;

    var data = {
      type: 'shape',
      id: 'obj' + (nextObjectId++),
      shapeType: shapeType,
      leftPct: 50,
      topPct: 50,
      widthPct: widthPct,
      heightPct: heightPct,
      rotation: 0,
      fillColor: null,
      borderColor: '#16264A'
    };
    slides[currentSlideIndex].objects.push(data);
    pushUndo({ type: 'shape-add', slideIndex: currentSlideIndex, shapeId: data.id });
    renderCanvas();
    reapplyShapeSelection(data.id);
  }

  var shapeDropdownWrapper = document.getElementById('shapeDropdownWrapper');
  var shapeToggleBtn = document.getElementById('shapeToggleBtn');
  var shapeDropdownPanel = document.getElementById('shapeDropdownPanel');

  function openShapeDropdown() {
    shapeDropdownPanel.classList.add('open');
    shapeToggleBtn.classList.add('active');
  }
  function closeShapeDropdown() {
    shapeDropdownPanel.classList.remove('open');
    shapeToggleBtn.classList.remove('active');
  }

  shapeToggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (shapeDropdownPanel.classList.contains('open')) closeShapeDropdown();
    else { closeAllDropdowns('shape'); openShapeDropdown(); }
  });

  document.addEventListener('click', function (e) {
    if (shapeDropdownPanel.classList.contains('open') && !shapeDropdownWrapper.contains(e.target)) {
      closeShapeDropdown();
    }
  });

  document.querySelectorAll('.shape-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      addShapeObject(btn.dataset.shape);
      closeShapeDropdown();
    });
  });

  // ------------------------------------------------------------
  // Header & footer — global (same text under every slide, unlike
  // layout/text boxes/tables which are per-slide), so nothing extra
  // is needed for them to "carry across" new slides: they're just
  // two persistent elements, not per-slide data.
  //
  // Entry points: the toolbar button, or double-clicking directly
  // on the header/footer. Exit points: the toolbar button again, or
  // double-clicking the dimmed backdrop. While open, both fields
  // are directly editable — click either one to place a cursor.
  // ------------------------------------------------------------
  var headerFooterBtn = document.getElementById('headerFooterBtn');
  var hfOverlay = document.getElementById('hfOverlay');
  var slideHeaderEl = document.getElementById('slideHeader');
  var slideFooterEl = document.getElementById('slideFooter');
  var headerFooterOpen = false;
  var headerText = '';
  var footerText = '';

  function updateHeaderFooterEmptyState() {
    slideHeaderEl.classList.toggle('is-empty', slideHeaderEl.textContent.trim() === '');
    slideFooterEl.classList.toggle('is-empty', slideFooterEl.textContent.trim() === '');
  }

  function openHeaderFooterMode(focusEl) {
    if (!headerFooterOpen) {
      deselectTextBox();
      deselectTable();
    }
    headerFooterOpen = true;
    slideCanvas.classList.add('hf-editing');
    headerFooterBtn.classList.add('active');
    slideHeaderEl.setAttribute('contenteditable', 'true');
    slideFooterEl.setAttribute('contenteditable', 'true');
    if (focusEl) placeCursorAtEnd(focusEl);
  }

  function closeHeaderFooterMode() {
    if (!headerFooterOpen) return;
    headerText = slideHeaderEl.textContent;
    footerText = slideFooterEl.textContent;
    slideHeaderEl.setAttribute('contenteditable', 'false');
    slideFooterEl.setAttribute('contenteditable', 'false');
    slideHeaderEl.blur();
    slideFooterEl.blur();
    updateHeaderFooterEmptyState();
    slideCanvas.classList.remove('hf-editing');
    headerFooterBtn.classList.remove('active');
    headerFooterOpen = false;
  }

  headerFooterBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (headerFooterOpen) closeHeaderFooterMode();
    else openHeaderFooterMode();
  });

  [slideHeaderEl, slideFooterEl].forEach(function (el) {
    el.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    el.addEventListener('input', updateHeaderFooterEmptyState);
    el.addEventListener('dblclick', function (e) {
      e.stopPropagation();
      if (!headerFooterOpen) openHeaderFooterMode(el);
    });
  });

  hfOverlay.addEventListener('dblclick', function () {
    closeHeaderFooterMode();
  });

  updateHeaderFooterEmptyState(); // starts empty, so both stay hidden until edited

  // Clicking anywhere outside the active box/table/image deselects
  // it (and, if mid-edit, commits the typed text) — except the
  // formatting controls, which need the text box to stay in edit
  // mode (and its highlighted selection intact) while they're used.
  document.addEventListener('mousedown', function (e) {
    if (isFormattingControl(e.target)) return;
    if (activeTextBoxEl && !activeTextBoxEl.contains(e.target)) {
      deselectTextBox();
    }
    if (activeTableEl && !activeTableEl.contains(e.target)) {
      deselectTable();
    }
    if (activeImageEl && !activeImageEl.contains(e.target)) {
      deselectImage();
    }
    if (activeShapeEl && !activeShapeEl.contains(e.target)) {
      deselectShape();
    }
  });

  // ------------------------------------------------------------
  // Multi-select — drag a marquee from an empty part of the canvas
  // to select every object it overlaps (text box, table, image,
  // shape, mixed). Deliberately kept separate from the single-select
  // active*El variables above rather than replacing them: a lot of
  // existing code (format controls, arrange, resize/rotate handles)
  // is written around "the one active object," so multi-select only
  // covers what was asked for — select, move together, delete
  // together — without trying to make every tool group-aware.
  // ------------------------------------------------------------
  var selectedObjectIds = [];
  var canvasMarquee = document.getElementById('canvasMarquee');

  function clearMultiSelection() {
    if (selectedObjectIds.length === 0) return;
    objectLayer.querySelectorAll('.multi-selected').forEach(function (el) {
      el.classList.remove('multi-selected');
    });
    selectedObjectIds = [];
  }

  function applyMultiSelectionClasses() {
    objectLayer.querySelectorAll('.multi-selected').forEach(function (el) {
      el.classList.remove('multi-selected');
    });
    selectedObjectIds.forEach(function (id) {
      var el = objectLayer.querySelector('[data-id="' + id + '"]');
      if (el) el.classList.add('multi-selected');
    });
  }

  // ------------------------------------------------------------
  // Persistent groups — a group is just a shared groupId field on
  // each member object's own data (no separate group entity to keep
  // in sync), so it survives save/reload for free the same way any
  // other object field does. Selecting a grouped object populates
  // selectedObjectIds with every member instead of just that one
  // object, which means the existing multi-select machinery (group
  // drag, group delete, marquee highlighting) already handles groups
  // with no changes of its own — the only new behaviour needed is
  // "clicking a grouped object selects the whole group" and Ctrl+G /
  // Ctrl+Shift+G to create/dissolve one from the current selection.
  // ------------------------------------------------------------
  function getGroupMemberIds(groupId) {
    if (!groupId) return [];
    var list = slides[currentSlideIndex].objects || [];
    return list.filter(function (o) { return o.groupId === groupId; }).map(function (o) { return o.id; });
  }

  // Selects an object by id — if it belongs to a group, selects every
  // member of that group instead (as a multi-selection) rather than
  // just the one object clicked.
  function selectObjectOrGroup(id) {
    var data = findObjectData(currentSlideIndex, id);
    if (data && data.groupId) {
      var memberIds = getGroupMemberIds(data.groupId);
      if (memberIds.length > 1) {
        deselectTextBox();
        deselectTable();
        deselectImage();
        deselectShape();
        selectedObjectIds = memberIds;
        applyMultiSelectionClasses();
        return true;
      }
    }
    return false;
  }

  function groupSelection() {
    var ids = selectedObjectIds.length > 0 ? selectedObjectIds.slice() : [getActiveObjectId()].filter(Boolean);
    if (ids.length < 2) return;

    var groupId = 'grp' + (nextObjectId++);
    var prevGroupIds = {};
    ids.forEach(function (id) {
      var data = findObjectData(currentSlideIndex, id);
      if (data) {
        prevGroupIds[id] = data.groupId || null;
        data.groupId = groupId;
      }
    });

    pushUndo({
      type: 'group',
      slideIndex: currentSlideIndex,
      groupId: groupId,
      objIds: ids,
      prevGroupIds: prevGroupIds
    });

    deselectTextBox();
    deselectTable();
    deselectImage();
    deselectShape();
    renderCanvas();
    selectedObjectIds = ids;
    applyMultiSelectionClasses();
  }

  function ungroupSelection() {
    // Resolve from whatever's selected/active to a groupId, then
    // ungroup every member of that group (not just the ones
    // currently selected — Ctrl+Shift+G on any one grouped object,
    // or the whole group, dissolves the whole thing).
    var groupId = null;
    if (selectedObjectIds.length > 0) {
      var first = findObjectData(currentSlideIndex, selectedObjectIds[0]);
      groupId = first && first.groupId;
    } else {
      var activeId = getActiveObjectId();
      var activeData = activeId && findObjectData(currentSlideIndex, activeId);
      groupId = activeData && activeData.groupId;
    }
    if (!groupId) return;

    var memberIds = getGroupMemberIds(groupId);
    memberIds.forEach(function (id) {
      var data = findObjectData(currentSlideIndex, id);
      if (data) data.groupId = null;
    });

    pushUndo({
      type: 'ungroup',
      slideIndex: currentSlideIndex,
      groupId: groupId,
      objIds: memberIds
    });

    renderCanvas();
    selectedObjectIds = memberIds;
    applyMultiSelectionClasses();
  }

  // ------------------------------------------------------------
  // Snap guides — Canva-style: while dragging one or more objects,
  // compares the moving object(s)' combined bounding box edges/centre
  // against the canvas centre and every other object's edges/centre
  // on the slide, and if any pair lines up within SNAP_THRESHOLD_PX,
  // shows a thin guide line and snaps the drag to exactly that
  // position. Pure move-time behaviour (not resize) — this is what
  // Canva/Figma/PowerPoint mean by "snapping" in the common case,
  // and keeps the corner-resize handlers (already fairly complex
  // with their own aspect-ratio-lock math) untouched.
  // ------------------------------------------------------------
  var SNAP_THRESHOLD_PX = 6;
  var snapGuideV = document.getElementById('snapGuideV');
  var snapGuideH = document.getElementById('snapGuideH');

  function hideSnapGuides() {
    snapGuideV.classList.remove('active');
    snapGuideH.classList.remove('active');
  }

  // Collects the horizontal (x) and vertical (y) snap targets from
  // every object on the current slide except the ones being dragged,
  // plus the canvas's own centre — each target is { pos, type } where
  // type is 'left'/'center'/'right' (for x) or 'top'/'center'/
  // 'bottom' (for y), used only to decide which edge of the MOVING
  // object should align to it.
  function collectSnapTargets(canvasRect, excludeIds) {
    var xTargets = [{ pos: canvasRect.width / 2, type: 'center' }];
    var yTargets = [{ pos: canvasRect.height / 2, type: 'center' }];

    objectLayer.querySelectorAll('[data-id]').forEach(function (el) {
      var id = el.dataset.id;
      if (excludeIds.indexOf(id) !== -1) return;
      var rect = el.getBoundingClientRect();
      var left = rect.left - canvasRect.left;
      var top = rect.top - canvasRect.top;
      xTargets.push({ pos: left, type: 'left' }, { pos: left + rect.width / 2, type: 'center' }, { pos: left + rect.width, type: 'right' });
      yTargets.push({ pos: top, type: 'top' }, { pos: top + rect.height / 2, type: 'center' }, { pos: top + rect.height, type: 'bottom' });
    });

    return { xTargets: xTargets, yTargets: yTargets };
  }

  // movingRect is { left, top, width, height } in canvas-relative
  // pixels for the moving object's (or group's combined) current,
  // unsnapped position. Returns { dxPx, dyPx } to add to the drag —
  // zero on an axis with no snap found — and shows/hides the guide
  // lines as a side effect.
  function computeSnapAdjustment(movingRect, canvasRect, excludeIds) {
    var targets = collectSnapTargets(canvasRect, excludeIds);
    var movingXEdges = [
      { pos: movingRect.left, type: 'left' },
      { pos: movingRect.left + movingRect.width / 2, type: 'center' },
      { pos: movingRect.left + movingRect.width, type: 'right' }
    ];
    var movingYEdges = [
      { pos: movingRect.top, type: 'top' },
      { pos: movingRect.top + movingRect.height / 2, type: 'center' },
      { pos: movingRect.top + movingRect.height, type: 'bottom' }
    ];

    var bestX = null; // { dx, guidePos }
    movingXEdges.forEach(function (edge) {
      targets.xTargets.forEach(function (t) {
        var d = t.pos - edge.pos;
        if (Math.abs(d) <= SNAP_THRESHOLD_PX && (!bestX || Math.abs(d) < Math.abs(bestX.dx))) {
          bestX = { dx: d, guidePos: t.pos };
        }
      });
    });

    var bestY = null;
    movingYEdges.forEach(function (edge) {
      targets.yTargets.forEach(function (t) {
        var d = t.pos - edge.pos;
        if (Math.abs(d) <= SNAP_THRESHOLD_PX && (!bestY || Math.abs(d) < Math.abs(bestY.dy))) {
          bestY = { dy: d, guidePos: t.pos };
        }
      });
    });

    if (bestX) {
      snapGuideV.style.left = bestX.guidePos + 'px';
      snapGuideV.classList.add('active');
    } else {
      snapGuideV.classList.remove('active');
    }
    if (bestY) {
      snapGuideH.style.top = bestY.guidePos + 'px';
      snapGuideH.classList.add('active');
    } else {
      snapGuideH.classList.remove('active');
    }

    return { dxPx: bestX ? bestX.dx : 0, dyPx: bestY ? bestY.dy : 0 };
  }

  // Convenience wrapper for the common single-object-drag case: given
  // an element's tentative (pre-snap) centre position in %, measures
  // its current rendered size (rotation-immune, same offsetWidth/
  // offsetHeight approach used elsewhere), runs the snap engine, and
  // returns the possibly-adjusted { leftPct, topPct }. excludeIds
  // should include the dragged element's own id so it doesn't try to
  // snap to itself.
  function applySnapToDrag(el, tentativeLeftPct, tentativeTopPct, canvasRect, excludeIds) {
    var widthPx = el.offsetWidth;
    var heightPx = el.offsetHeight;
    var centerXpx = (tentativeLeftPct / 100) * canvasRect.width;
    var centerYpx = (tentativeTopPct / 100) * canvasRect.height;
    var movingRect = { left: centerXpx - widthPx / 2, top: centerYpx - heightPx / 2, width: widthPx, height: heightPx };

    var adj = computeSnapAdjustment(movingRect, canvasRect, excludeIds);
    return {
      leftPct: tentativeLeftPct + (adj.dxPx / canvasRect.width) * 100,
      topPct: tentativeTopPct + (adj.dyPx / canvasRect.height) * 100
    };
  }

  // ------------------------------------------------------------
  // Group drag — when the object mousedown'd on is part of an
  // existing multi-selection (more than one item), every selected
  // object moves together instead of just the one under the pointer.
  // Each of the four per-type move handlers below calls into this:
  // beginGroupDrag() on drag-start (captures every selected element +
  // its starting leftPct/topPct), updateGroupDrag() on every
  // mousemove (applies the same delta to all of them), and
  // commitGroupDrag() on mouseup (writes the final positions back
  // into slide.objects and records one combined undo step).
  // ------------------------------------------------------------
  var groupDragItems = null; // [{ id, el, startLeftPct, startTopPct }] while a group drag is in progress

  // True if dragging draggedId should move a whole group together —
  // either it's already part of the active multi-selection, or (the
  // "first click on a grouped object" case, before any selection
  // change has happened yet) it belongs to a persistent group, in
  // which case selectedObjectIds is populated with that group's
  // members right here so beginGroupDrag() (which reads from
  // selectedObjectIds) picks up every member from the very first
  // drag, not just from the second click onward.
  function isGroupDrag(draggedId) {
    if (selectedObjectIds.length > 1 && selectedObjectIds.indexOf(draggedId) !== -1) return true;

    var data = findObjectData(currentSlideIndex, draggedId);
    if (data && data.groupId) {
      var memberIds = getGroupMemberIds(data.groupId);
      if (memberIds.length > 1) {
        selectedObjectIds = memberIds;
        return true;
      }
    }
    return false;
  }

  function beginGroupDrag() {
    groupDragItems = selectedObjectIds.map(function (id) {
      var el = objectLayer.querySelector('[data-id="' + id + '"]');
      return el ? { id: id, el: el, startLeftPct: parseFloat(el.style.left), startTopPct: parseFloat(el.style.top) } : null;
    }).filter(Boolean);
    // Ensures the whole group is visibly highlighted even when the
    // drag is the very first interaction with it (isGroupDrag can
    // populate selectedObjectIds from a persistent group without any
    // prior selection click having applied the highlight yet).
    applyMultiSelectionClasses();
  }

  function updateGroupDrag(dxPct, dyPct) {
    if (!groupDragItems) return;
    var canvasRect = slideCanvas.getBoundingClientRect();
    var excludeIds = groupDragItems.map(function (item) { return item.id; });

    // Snap the group as a whole: compute the combined bounding box at
    // its tentative position, find the best single snap adjustment for
    // that box, then apply the same dx/dy shift to every member so the
    // group moves together instead of each item snapping independently.
    var minLeftPx = Infinity, minTopPx = Infinity, maxRightPx = -Infinity, maxBottomPx = -Infinity;
    groupDragItems.forEach(function (item) {
      var tentativeLeftPct = clampPct(item.startLeftPct + dxPct);
      var tentativeTopPct = clampPct(item.startTopPct + dyPct);
      var widthPx = item.el.offsetWidth;
      var heightPx = item.el.offsetHeight;
      var centerXpx = (tentativeLeftPct / 100) * canvasRect.width;
      var centerYpx = (tentativeTopPct / 100) * canvasRect.height;
      var leftPx = centerXpx - widthPx / 2;
      var topPx = centerYpx - heightPx / 2;
      item._tentativeLeftPct = tentativeLeftPct;
      item._tentativeTopPct = tentativeTopPct;
      if (leftPx < minLeftPx) minLeftPx = leftPx;
      if (topPx < minTopPx) minTopPx = topPx;
      if (leftPx + widthPx > maxRightPx) maxRightPx = leftPx + widthPx;
      if (topPx + heightPx > maxBottomPx) maxBottomPx = topPx + heightPx;
    });

    var groupRect = { left: minLeftPx, top: minTopPx, width: maxRightPx - minLeftPx, height: maxBottomPx - minTopPx };
    var adj = computeSnapAdjustment(groupRect, canvasRect, excludeIds);
    var extraDxPct = (adj.dxPx / canvasRect.width) * 100;
    var extraDyPct = (adj.dyPx / canvasRect.height) * 100;

    groupDragItems.forEach(function (item) {
      item.el.style.left = clampPct(item._tentativeLeftPct + extraDxPct) + '%';
      item.el.style.top = clampPct(item._tentativeTopPct + extraDyPct) + '%';
    });
  }

  function commitGroupDrag() {
    if (!groupDragItems) return;
    hideSnapGuides();
    var moves = [];
    groupDragItems.forEach(function (item) {
      var data = findObjectData(currentSlideIndex, item.id);
      if (!data) return;
      var toLeft = parseFloat(item.el.style.left);
      var toTop = parseFloat(item.el.style.top);
      if (toLeft === item.startLeftPct && toTop === item.startTopPct) return;
      moves.push({ objId: item.id, fromLeft: item.startLeftPct, fromTop: item.startTopPct, toLeft: toLeft, toTop: toTop });
      data.leftPct = toLeft;
      data.topPct = toTop;
    });

    if (moves.length > 0) {
      pushUndo({ type: 'multi-move', slideIndex: currentSlideIndex, moves: moves });
    }
    groupDragItems = null;
  }

  // Rectangle-intersection test against the element's own live
  // rendered bounding box — simpler and more accurate than
  // recomputing from stored leftPct/topPct/widthPct/heightPct, since
  // some object types (auto-sized freeform text boxes, unrotated vs.
  // rotated shapes) don't map onto those percentages the same way.
  function objectIntersectsMarquee(el, marqueeRect) {
    var elRect = el.getBoundingClientRect();
    return !(
      elRect.right < marqueeRect.left ||
      elRect.left > marqueeRect.right ||
      elRect.bottom < marqueeRect.top ||
      elRect.top > marqueeRect.bottom
    );
  }

  slideCanvas.addEventListener('mousedown', function (e) {
    // Only start a marquee from genuinely empty canvas — every real
    // object re-enables pointer-events on itself and handles its own
    // mousedown, so this only fires when nothing else caught the click.
    if (e.target !== slideCanvas && e.target !== objectLayer && e.target !== slideLayoutRender) return;
    if (isFormattingControl(e.target)) return;

    e.preventDefault();
    var startX = e.clientX;
    var startY = e.clientY;
    var moved = false;
    var canvasRect = slideCanvas.getBoundingClientRect();

    function updateMarqueeRect(clientX, clientY) {
      var left = Math.min(startX, clientX);
      var top = Math.min(startY, clientY);
      var right = Math.max(startX, clientX);
      var bottom = Math.max(startY, clientY);
      canvasMarquee.style.left = (left - canvasRect.left) + 'px';
      canvasMarquee.style.top = (top - canvasRect.top) + 'px';
      canvasMarquee.style.width = (right - left) + 'px';
      canvasMarquee.style.height = (bottom - top) + 'px';
      return { left: left, top: top, right: right, bottom: bottom };
    }

    function onMouseMove(e2) {
      var dx = e2.clientX - startX;
      var dy = e2.clientY - startY;
      if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        moved = true;
        deselectTextBox();
        deselectTable();
        deselectImage();
        deselectShape();
        clearMultiSelection();
        canvasMarquee.classList.add('active');
      }
      if (moved) {
        var marqueeRect = updateMarqueeRect(e2.clientX, e2.clientY);

        var ids = [];
        var slide = slides[currentSlideIndex];
        (slide.objects || []).forEach(function (obj) {
          var el = objectLayer.querySelector('[data-id="' + obj.id + '"]');
          if (el && objectIntersectsMarquee(el, marqueeRect)) ids.push(obj.id);
        });
        selectedObjectIds = ids;
        applyMultiSelectionClasses();
      }
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      canvasMarquee.classList.remove('active');

      if (!moved) {
        // Plain click on empty canvas — just clears whatever was
        // selected (single or multi), same as before this feature.
        clearMultiSelection();
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // Deletes every multi-selected object as a single undo step, so
  // one Ctrl+Z restores the whole group rather than needing one
  // undo per object.
  function deleteMultiSelection() {
    if (selectedObjectIds.length === 0) return;
    var slide = slides[currentSlideIndex];
    var list = slide.objects || [];

    var removed = [];
    selectedObjectIds.forEach(function (id) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          removed.push({ index: i, data: Object.assign({}, list[i]) });
          break;
        }
      }
    });
    // Remove highest index first so earlier indices stay valid while
    // splicing, then undo re-inserts in the same (ascending) order.
    removed.sort(function (a, b) { return b.index - a.index; });
    removed.forEach(function (r) {
      list.splice(r.index, 1);
    });
    removed.reverse();

    pushUndo({
      type: 'multi-delete',
      slideIndex: currentSlideIndex,
      removed: removed
    });

    selectedObjectIds = [];
    renderCanvas();
  }

  function performUndo() {
    var action = undoStack.pop();
    if (!action) return;

    deselectTextBox();
    deselectTable();
    clearMultiSelection();
    var switchingSlide = action.slideIndex !== currentSlideIndex;
    if (switchingSlide) currentSlideIndex = action.slideIndex;

    var list = slides[action.slideIndex].objects || [];

    if (action.type === 'add') {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === action.boxId) { action.boxData = list[i]; list.splice(i, 1); break; }
      }
    } else if (action.type === 'delete') {
      var insertAt = Math.min(action.index, list.length);
      list.splice(insertAt, 0, action.boxData);
    } else if (action.type === 'move') {
      var moveBox = findObjectData(action.slideIndex, action.boxId);
      if (moveBox) { moveBox.leftPct = action.fromLeft; moveBox.topPct = action.fromTop; }
    } else if (action.type === 'edit') {
      var editBox = findObjectData(action.slideIndex, action.boxId);
      if (editBox) editBox.html = action.fromText;
    } else if (action.type === 'table-add') {
      for (var j = 0; j < list.length; j++) {
        if (list[j].id === action.tableId) { action.tableData = list[j]; list.splice(j, 1); break; }
      }
    } else if (action.type === 'table-delete') {
      var tblInsertAt = Math.min(action.index, list.length);
      list.splice(tblInsertAt, 0, action.tableData);
    } else if (action.type === 'table-move') {
      var moveTbl = findObjectData(action.slideIndex, action.tableId);
      if (moveTbl) { moveTbl.leftPct = action.fromLeft; moveTbl.topPct = action.fromTop; }
    } else if (action.type === 'table-resize') {
      var resizeTbl = findObjectData(action.slideIndex, action.tableId);
      if (resizeTbl) {
        resizeTbl.leftPct = action.fromLeft; resizeTbl.topPct = action.fromTop;
        resizeTbl.widthPct = action.fromWidth; resizeTbl.heightPct = action.fromHeight;
      }
    } else if (action.type === 'table-rotate') {
      var rotateTbl = findObjectData(action.slideIndex, action.tableId);
      if (rotateTbl) rotateTbl.rotation = action.fromRotation;
    } else if (action.type === 'table-cell-edit') {
      var editTbl = findObjectData(action.slideIndex, action.tableId);
      if (editTbl) setCellHtml(editTbl, action.row, action.col, action.fromText);
    } else if (action.type === 'table-addrow') {
      var addRowTbl = findObjectData(action.slideIndex, action.tableId);
      if (addRowTbl) action.removedRow = addRowTbl.rows.pop();
    } else if (action.type === 'table-addcol') {
      var addColTbl = findObjectData(action.slideIndex, action.tableId);
      if (addColTbl) action.removedCells = addColTbl.rows.map(function (row) { return row.pop(); });
    } else if (action.type === 'table-delrow') {
      var delRowTbl = findObjectData(action.slideIndex, action.tableId);
      if (delRowTbl) delRowTbl.rows.splice(action.rowIndex, 0, action.removedRow);
    } else if (action.type === 'font-style') {
      var fontBox = findObjectData(action.slideIndex, action.boxId);
      if (fontBox) fontBox.html = action.fromHtml;
    } else if (action.type === 'align') {
      var alignBox = findObjectData(action.slideIndex, action.boxId);
      if (alignBox) alignBox.align = action.fromAlign;
    } else if (action.type === 'table-cell-align') {
      var alignTbl = findObjectData(action.slideIndex, action.tableId);
      if (alignTbl) setCellAlign(alignTbl, action.row, action.col, action.fromAlign);
    } else if (action.type === 'box-style') {
      var boxStyleBox = findObjectData(action.slideIndex, action.boxId);
      if (boxStyleBox) boxStyleBox[action.field] = action.fromValue;
    } else if (action.type === 'text-resize') {
      var resizeBox = findObjectData(action.slideIndex, action.boxId);
      if (resizeBox) {
        resizeBox.leftPct = action.fromLeft; resizeBox.topPct = action.fromTop;
        resizeBox.widthPct = action.fromWidth; resizeBox.heightPct = action.fromHeight;
      }
    } else if (action.type === 'text-rotate') {
      var rotateBox = findObjectData(action.slideIndex, action.boxId);
      if (rotateBox) rotateBox.rotation = action.fromRotation;
    } else if (action.type === 'table-delcol') {
      var delColTbl = findObjectData(action.slideIndex, action.tableId);
      if (delColTbl) {
        delColTbl.rows.forEach(function (row, idx) { row.splice(action.colIndex, 0, action.removedCells[idx]); });
      }
    } else if (action.type === 'table-row-reorder') {
      var rowReorderTbl = findObjectData(action.slideIndex, action.tableId);
      if (rowReorderTbl) {
        var movedRow = rowReorderTbl.rows.splice(action.toIndex, 1)[0];
        rowReorderTbl.rows.splice(action.fromIndex, 0, movedRow);
      }
    } else if (action.type === 'table-col-reorder') {
      var colReorderTbl = findObjectData(action.slideIndex, action.tableId);
      if (colReorderTbl) {
        colReorderTbl.rows.forEach(function (row) {
          var movedCell = row.splice(action.toIndex, 1)[0];
          row.splice(action.fromIndex, 0, movedCell);
        });
      }
    } else if (action.type === 'image-add') {
      for (var k = 0; k < list.length; k++) {
        if (list[k].id === action.imageId) { action.imageData = list[k]; list.splice(k, 1); break; }
      }
    } else if (action.type === 'image-delete') {
      var imgInsertAt = Math.min(action.index, list.length);
      list.splice(imgInsertAt, 0, action.imageData);
    } else if (action.type === 'image-move') {
      var moveImg = findObjectData(action.slideIndex, action.imageId);
      if (moveImg) { moveImg.leftPct = action.fromLeft; moveImg.topPct = action.fromTop; }
    } else if (action.type === 'image-resize') {
      var resizeImg = findObjectData(action.slideIndex, action.imageId);
      if (resizeImg) {
        resizeImg.leftPct = action.fromLeft; resizeImg.topPct = action.fromTop;
        resizeImg.widthPct = action.fromWidth; resizeImg.heightPct = action.fromHeight;
      }
    } else if (action.type === 'image-rotate') {
      var rotateImg = findObjectData(action.slideIndex, action.imageId);
      if (rotateImg) rotateImg.rotation = action.fromRotation;
    } else if (action.type === 'shape-add') {
      for (var s = 0; s < list.length; s++) {
        if (list[s].id === action.shapeId) { action.shapeData = list[s]; list.splice(s, 1); break; }
      }
    } else if (action.type === 'shape-delete') {
      var shapeInsertAt = Math.min(action.index, list.length);
      list.splice(shapeInsertAt, 0, action.shapeData);
    } else if (action.type === 'shape-move') {
      var moveShape = findObjectData(action.slideIndex, action.shapeId);
      if (moveShape) { moveShape.leftPct = action.fromLeft; moveShape.topPct = action.fromTop; }
    } else if (action.type === 'shape-resize') {
      var resizeShape = findObjectData(action.slideIndex, action.shapeId);
      if (resizeShape) {
        resizeShape.leftPct = action.fromLeft; resizeShape.topPct = action.fromTop;
        resizeShape.widthPct = action.fromWidth; resizeShape.heightPct = action.fromHeight;
      }
    } else if (action.type === 'shape-rotate') {
      var rotateShape = findObjectData(action.slideIndex, action.shapeId);
      if (rotateShape) rotateShape.rotation = action.fromRotation;
    } else if (action.type === 'arrange') {
      var arrangeList = slides[action.slideIndex].objects || [];
      var arrangeFromIdx = -1;
      for (var av = 0; av < arrangeList.length; av++) {
        if (arrangeList[av].id === action.objId) { arrangeFromIdx = av; break; }
      }
      if (arrangeFromIdx !== -1) {
        var arrangeMoved = arrangeList.splice(arrangeFromIdx, 1)[0];
        arrangeList.splice(action.fromIndex, 0, arrangeMoved);
      }
    } else if (action.type === 'multi-delete') {
      // action.removed is stored in ascending original-index order —
      // inserting from lowest to highest keeps each target index
      // valid as the ones after it shift right.
      action.removed.forEach(function (r) {
        list.splice(Math.min(r.index, list.length), 0, r.data);
      });
    } else if (action.type === 'multi-move') {
      action.moves.forEach(function (m) {
        var obj = findObjectData(action.slideIndex, m.objId);
        if (obj) { obj.leftPct = m.fromLeft; obj.topPct = m.fromTop; }
      });
    } else if (action.type === 'multi-arrange') {
      var byId = {};
      list.forEach(function (o) { byId[o.id] = o; });
      slides[action.slideIndex].objects = action.beforeOrder.map(function (id) { return byId[id]; }).filter(Boolean);
    } else if (action.type === 'multi-paste') {
      action.pastedData.forEach(function (data) {
        for (var pi = 0; pi < list.length; pi++) {
          if (list[pi].id === data.id) { list.splice(pi, 1); break; }
        }
      });
    } else if (action.type === 'group') {
      action.objIds.forEach(function (id) {
        var obj = findObjectData(action.slideIndex, id);
        if (obj) obj.groupId = action.prevGroupIds[id] || null;
      });
    } else if (action.type === 'ungroup') {
      action.objIds.forEach(function (id) {
        var obj = findObjectData(action.slideIndex, id);
        if (obj) obj.groupId = action.groupId;
      });
    }

    if (switchingSlide) renderSlideRail();
    renderCanvas();
    redoStack.push(action);
  }

  function performRedo() {
    var action = redoStack.pop();
    if (!action) return;

    deselectTextBox();
    deselectTable();
    clearMultiSelection();
    var switchingSlide = action.slideIndex !== currentSlideIndex;
    if (switchingSlide) currentSlideIndex = action.slideIndex;

    var list = slides[action.slideIndex].objects || [];

    if (action.type === 'add') {
      list.push(action.boxData);
    } else if (action.type === 'delete') {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === action.boxId) { list.splice(i, 1); break; }
      }
    } else if (action.type === 'move') {
      var moveBox = findObjectData(action.slideIndex, action.boxId);
      if (moveBox) { moveBox.leftPct = action.toLeft; moveBox.topPct = action.toTop; }
    } else if (action.type === 'edit') {
      var editBox = findObjectData(action.slideIndex, action.boxId);
      if (editBox) editBox.html = action.toText;
    } else if (action.type === 'table-add') {
      list.push(action.tableData);
    } else if (action.type === 'table-delete') {
      for (var j = 0; j < list.length; j++) {
        if (list[j].id === action.tableId) { list.splice(j, 1); break; }
      }
    } else if (action.type === 'table-move') {
      var moveTbl = findObjectData(action.slideIndex, action.tableId);
      if (moveTbl) { moveTbl.leftPct = action.toLeft; moveTbl.topPct = action.toTop; }
    } else if (action.type === 'table-resize') {
      var resizeTbl = findObjectData(action.slideIndex, action.tableId);
      if (resizeTbl) {
        resizeTbl.leftPct = action.toLeft; resizeTbl.topPct = action.toTop;
        resizeTbl.widthPct = action.toWidth; resizeTbl.heightPct = action.toHeight;
      }
    } else if (action.type === 'table-rotate') {
      var rotateTbl = findObjectData(action.slideIndex, action.tableId);
      if (rotateTbl) rotateTbl.rotation = action.toRotation;
    } else if (action.type === 'table-cell-edit') {
      var editTbl = findObjectData(action.slideIndex, action.tableId);
      if (editTbl) setCellHtml(editTbl, action.row, action.col, action.toText);
    } else if (action.type === 'table-addrow') {
      var addRowTbl = findObjectData(action.slideIndex, action.tableId);
      if (addRowTbl) addRowTbl.rows.push(action.removedRow);
    } else if (action.type === 'table-addcol') {
      var addColTbl = findObjectData(action.slideIndex, action.tableId);
      if (addColTbl) addColTbl.rows.forEach(function (row, idx) { row.push(action.removedCells[idx]); });
    } else if (action.type === 'table-delrow') {
      var delRowTbl = findObjectData(action.slideIndex, action.tableId);
      if (delRowTbl) delRowTbl.rows.splice(action.rowIndex, 1);
    } else if (action.type === 'font-style') {
      var fontBox = findObjectData(action.slideIndex, action.boxId);
      if (fontBox) fontBox.html = action.toHtml;
    } else if (action.type === 'align') {
      var alignBox = findObjectData(action.slideIndex, action.boxId);
      if (alignBox) alignBox.align = action.toAlign;
    } else if (action.type === 'table-cell-align') {
      var alignTbl = findObjectData(action.slideIndex, action.tableId);
      if (alignTbl) setCellAlign(alignTbl, action.row, action.col, action.toAlign);
    } else if (action.type === 'box-style') {
      var boxStyleBox = findObjectData(action.slideIndex, action.boxId);
      if (boxStyleBox) boxStyleBox[action.field] = action.toValue;
    } else if (action.type === 'text-resize') {
      var resizeBox = findObjectData(action.slideIndex, action.boxId);
      if (resizeBox) {
        resizeBox.leftPct = action.toLeft; resizeBox.topPct = action.toTop;
        resizeBox.widthPct = action.toWidth; resizeBox.heightPct = action.toHeight;
      }
    } else if (action.type === 'text-rotate') {
      var rotateBox = findObjectData(action.slideIndex, action.boxId);
      if (rotateBox) rotateBox.rotation = action.toRotation;
    } else if (action.type === 'table-delcol') {
      var delColTbl = findObjectData(action.slideIndex, action.tableId);
      if (delColTbl) delColTbl.rows.forEach(function (row) { row.splice(action.colIndex, 1); });
    } else if (action.type === 'table-row-reorder') {
      var rowReorderTbl = findObjectData(action.slideIndex, action.tableId);
      if (rowReorderTbl) {
        var movedRow = rowReorderTbl.rows.splice(action.fromIndex, 1)[0];
        rowReorderTbl.rows.splice(action.toIndex, 0, movedRow);
      }
    } else if (action.type === 'table-col-reorder') {
      var colReorderTbl = findObjectData(action.slideIndex, action.tableId);
      if (colReorderTbl) {
        colReorderTbl.rows.forEach(function (row) {
          var movedCell = row.splice(action.fromIndex, 1)[0];
          row.splice(action.toIndex, 0, movedCell);
        });
      }
    } else if (action.type === 'image-add') {
      list.push(action.imageData);
    } else if (action.type === 'image-delete') {
      for (var m = 0; m < list.length; m++) {
        if (list[m].id === action.imageId) { list.splice(m, 1); break; }
      }
    } else if (action.type === 'image-move') {
      var moveImg = findObjectData(action.slideIndex, action.imageId);
      if (moveImg) { moveImg.leftPct = action.toLeft; moveImg.topPct = action.toTop; }
    } else if (action.type === 'image-resize') {
      var resizeImg = findObjectData(action.slideIndex, action.imageId);
      if (resizeImg) {
        resizeImg.leftPct = action.toLeft; resizeImg.topPct = action.toTop;
        resizeImg.widthPct = action.toWidth; resizeImg.heightPct = action.toHeight;
      }
    } else if (action.type === 'image-rotate') {
      var rotateImg = findObjectData(action.slideIndex, action.imageId);
      if (rotateImg) rotateImg.rotation = action.toRotation;
    } else if (action.type === 'shape-add') {
      list.push(action.shapeData);
    } else if (action.type === 'shape-delete') {
      for (var t = 0; t < list.length; t++) {
        if (list[t].id === action.shapeId) { list.splice(t, 1); break; }
      }
    } else if (action.type === 'shape-move') {
      var moveShape = findObjectData(action.slideIndex, action.shapeId);
      if (moveShape) { moveShape.leftPct = action.toLeft; moveShape.topPct = action.toTop; }
    } else if (action.type === 'shape-resize') {
      var resizeShape = findObjectData(action.slideIndex, action.shapeId);
      if (resizeShape) {
        resizeShape.leftPct = action.toLeft; resizeShape.topPct = action.toTop;
        resizeShape.widthPct = action.toWidth; resizeShape.heightPct = action.toHeight;
      }
    } else if (action.type === 'shape-rotate') {
      var rotateShape = findObjectData(action.slideIndex, action.shapeId);
      if (rotateShape) rotateShape.rotation = action.toRotation;
    } else if (action.type === 'arrange') {
      var arrangeList2 = slides[action.slideIndex].objects || [];
      var arrangeFromIdx2 = -1;
      for (var aw = 0; aw < arrangeList2.length; aw++) {
        if (arrangeList2[aw].id === action.objId) { arrangeFromIdx2 = aw; break; }
      }
      if (arrangeFromIdx2 !== -1) {
        var arrangeMoved2 = arrangeList2.splice(arrangeFromIdx2, 1)[0];
        arrangeList2.splice(action.toIndex, 0, arrangeMoved2);
      }
    } else if (action.type === 'multi-delete') {
      action.removed.forEach(function (r) {
        for (var mi = 0; mi < list.length; mi++) {
          if (list[mi].id === r.data.id) { list.splice(mi, 1); break; }
        }
      });
    } else if (action.type === 'multi-move') {
      action.moves.forEach(function (m) {
        var obj = findObjectData(action.slideIndex, m.objId);
        if (obj) { obj.leftPct = m.toLeft; obj.topPct = m.toTop; }
      });
    } else if (action.type === 'multi-arrange') {
      var byId2 = {};
      list.forEach(function (o) { byId2[o.id] = o; });
      slides[action.slideIndex].objects = action.afterOrder.map(function (id) { return byId2[id]; }).filter(Boolean);
    } else if (action.type === 'multi-paste') {
      action.pastedData.forEach(function (data) {
        list.push(JSON.parse(JSON.stringify(data)));
      });
    } else if (action.type === 'group') {
      action.objIds.forEach(function (id) {
        var obj = findObjectData(action.slideIndex, id);
        if (obj) obj.groupId = action.groupId;
      });
    } else if (action.type === 'ungroup') {
      action.objIds.forEach(function (id) {
        var obj = findObjectData(action.slideIndex, id);
        if (obj) obj.groupId = null;
      });
    }

    if (switchingSlide) renderSlideRail();
    renderCanvas();
    undoStack.push(action);
  }

  // ------------------------------------------------------------
  // Slide rail
  // ------------------------------------------------------------
  function renderSlideRail() {
    slideThumbList.innerHTML = '';

    slides.forEach(function (slide, idx) {
      var thumb = document.createElement('div');
      thumb.className = 'rail-thumb slide-thumb' + (idx === currentSlideIndex ? ' active' : '');
      thumb.style.background = currentThemeBg;
      thumb.draggable = true;
      thumb.dataset.index = idx;

      var number = document.createElement('span');
      number.className = 'slide-thumb-number';
      number.textContent = idx + 1;
      thumb.appendChild(number);

      var dup = document.createElement('button');
      dup.type = 'button';
      dup.className = 'thumb-duplicate-btn';
      dup.title = 'Duplicate slide';
      dup.innerHTML = DUPLICATE_ICON;
      dup.addEventListener('click', function (e) {
        e.stopPropagation();
        duplicateSlide(idx);
      });
      thumb.appendChild(dup);

      // Can't delete the only remaining slide
      if (slides.length > 1) {
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'thumb-delete-btn';
        del.title = 'Delete slide';
        del.innerHTML = DELETE_ICON;
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          openDeleteModal(idx);
        });
        thumb.appendChild(del);
      }

      thumb.addEventListener('click', function () {
        currentSlideIndex = idx;
        renderSlideRail();
        renderCanvas();
      });

      attachSlideDragReorder(thumb, idx);

      slideThumbList.appendChild(thumb);
    });

    var addTile = document.createElement('div');
    addTile.className = 'slide-thumb-add';
    addTile.title = 'Add Slide';
    addTile.textContent = '+';
    addTile.addEventListener('click', addSlide);
    slideThumbList.appendChild(addTile);
  }

  function addSlide() {
    slides.push(Object.assign({ layout: 'blank', objects: [], name: '' }, makeDefaultSlideNotes()));
    currentSlideIndex = slides.length - 1;
    renderSlideRail();
    renderCanvas();
  }

  // Deep-clones the slide (including every object, note, and id) so
  // editing the copy never touches the original, then gives every
  // cloned object/note a fresh id — otherwise the duplicate and the
  // original would share ids, which findObjectData/findTableData
  // etc. assume are unique per slide.
  function duplicateSlide(idx) {
    var original = slides[idx];
    var copy = JSON.parse(JSON.stringify(original));

    (copy.objects || []).forEach(function (obj) { obj.id = 'obj' + (nextObjectId++); });
    (copy.discussionPoints || []).forEach(function (dp) {
      dp.id = 'dp' + (nextNoteId++);
      (dp.options || []).forEach(function (opt) { opt.id = 'opt' + (nextNoteId++); });
    });
    (copy.observations || []).forEach(function (obs) {
      obs.id = 'obs' + (nextNoteId++);
      (obs.options || []).forEach(function (opt) { opt.id = 'opt' + (nextNoteId++); });
    });

    slides.splice(idx + 1, 0, copy);
    currentSlideIndex = idx + 1;
    renderSlideRail();
    renderCanvas();
  }

  // HTML5 native drag-and-drop for reordering slide thumbnails —
  // dragstart marks the source index, dragover shows which thumbnail
  // it would land before/after (via a CSS drop-target class rather
  // than a separate insertion-line element, since this is a simple
  // vertical list unlike the table row/column reorder), drop performs
  // the actual splice-and-reinsert.
  var slideDragFromIndex = null;

  function attachSlideDragReorder(thumb, idx) {
    thumb.addEventListener('dragstart', function (e) {
      slideDragFromIndex = idx;
      thumb.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    thumb.addEventListener('dragend', function () {
      slideDragFromIndex = null;
      slideThumbList.querySelectorAll('.slide-thumb').forEach(function (el) {
        el.classList.remove('dragging', 'drop-before', 'drop-after');
      });
    });

    thumb.addEventListener('dragover', function (e) {
      if (slideDragFromIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      var rect = thumb.getBoundingClientRect();
      var before = e.clientY < rect.top + rect.height / 2;
      thumb.classList.toggle('drop-before', before);
      thumb.classList.toggle('drop-after', !before);
    });

    thumb.addEventListener('dragleave', function () {
      thumb.classList.remove('drop-before', 'drop-after');
    });

    thumb.addEventListener('drop', function (e) {
      e.preventDefault();
      if (slideDragFromIndex === null || slideDragFromIndex === idx) return;

      var droppedBefore = thumb.classList.contains('drop-before');
      var moved = slides.splice(slideDragFromIndex, 1)[0];
      var insertAt = droppedBefore ? idx : idx + 1;
      if (slideDragFromIndex < insertAt) insertAt -= 1; // account for the removal shifting later indices down
      slides.splice(insertAt, 0, moved);

      if (currentSlideIndex === slideDragFromIndex) currentSlideIndex = insertAt;
      else {
        // Keep pointing at the same slide even though its index
        // shifted as a side effect of this reorder.
        if (slideDragFromIndex < currentSlideIndex && insertAt >= currentSlideIndex) currentSlideIndex -= 1;
        else if (slideDragFromIndex > currentSlideIndex && insertAt <= currentSlideIndex) currentSlideIndex += 1;
      }

      renderSlideRail();
      renderCanvas();
    });
  }

  // ------------------------------------------------------------
  // Delete slide — confirmation modal
  // ------------------------------------------------------------
  var deleteSlideModal = document.getElementById('deleteSlideModal');
  var deleteSlideCancelBtn = document.getElementById('deleteSlideCancelBtn');
  var deleteSlideConfirmBtn = document.getElementById('deleteSlideConfirmBtn');
  var pendingDeleteIndex = null;

  function openDeleteModal(idx) {
    pendingDeleteIndex = idx;
    deleteSlideModal.classList.add('open');
  }

  function closeDeleteModal() {
    pendingDeleteIndex = null;
    deleteSlideModal.classList.remove('open');
  }

  deleteSlideCancelBtn.addEventListener('click', closeDeleteModal);

  deleteSlideConfirmBtn.addEventListener('click', function () {
    if (pendingDeleteIndex === null) return;

    slides.splice(pendingDeleteIndex, 1);

    if (pendingDeleteIndex < currentSlideIndex) {
      currentSlideIndex -= 1;
    }
    currentSlideIndex = Math.max(0, Math.min(currentSlideIndex, slides.length - 1));

    closeDeleteModal();
    renderSlideRail();
    renderCanvas();
  });

  // Clicking the dimmed backdrop also cancels
  deleteSlideModal.addEventListener('click', function (e) {
    if (e.target === deleteSlideModal) closeDeleteModal();
  });

  // ------------------------------------------------------------
  // Layout dropdown
  // ------------------------------------------------------------
  var layoutDropdownWrapper = document.getElementById('layoutDropdownWrapper');
  var layoutToggleBtn = document.getElementById('layoutToggleBtn');
  var layoutDropdownPanel = document.getElementById('layoutDropdownPanel');
  var layoutDropdownGrid = document.getElementById('layoutDropdownGrid');

  function renderLayoutDropdown() {
    layoutDropdownGrid.innerHTML = '';
    var currentLayoutId = slides[currentSlideIndex].layout;

    LAYOUTS.forEach(function (layout) {
      var thumb = document.createElement('div');
      thumb.className = 'layout-thumb' + (layout.id === currentLayoutId ? ' active' : '');
      thumb.style.background = currentThemeBg;
      thumb.title = layout.name;
      thumb.innerHTML = layoutThumbPreviewHTML(layout);

      thumb.addEventListener('click', function () {
        slides[currentSlideIndex].layout = layout.id;
        applyLayoutTextBoxes(layout.id);
        renderLayoutDropdown();
        renderCanvas();
        closeLayoutDropdown();
      });

      layoutDropdownGrid.appendChild(thumb);
    });
  }

  function openLayoutDropdown() {
    renderLayoutDropdown();
    layoutDropdownPanel.classList.add('open');
    layoutToggleBtn.classList.add('active');
  }

  function closeLayoutDropdown() {
    layoutDropdownPanel.classList.remove('open');
    layoutToggleBtn.classList.remove('active');
  }

  // Only one of Layout / Theme / Module / Arrange / text colour /
  // highlight colour / box fill / box border should ever be open at
  // once — opening one closes whichever of the others was already
  // open.
  function closeAllDropdowns(except) {
    if (except !== 'layout') closeLayoutDropdown();
    if (except !== 'theme') closeThemeDropdown();
    if (except !== 'module') closeModuleDropdown();
    if (except !== 'arrange') closeArrangeDropdown();
    if (except !== 'textColor') closeTextColorDropdown();
    if (except !== 'highlightColor') closeHighlightColorDropdown();
    if (except !== 'boxFill') closeBoxFillDropdown();
    if (except !== 'boxBorder') closeBoxBorderDropdown();
    if (except !== 'shape') closeShapeDropdown();
  }

  layoutToggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (layoutDropdownPanel.classList.contains('open')) {
      closeLayoutDropdown();
    } else {
      closeAllDropdowns('layout');
      openLayoutDropdown();
    }
  });

  // Clicking anywhere outside the dropdown (including switching
  // slides, which lives outside this wrapper) closes it.
  document.addEventListener('click', function (e) {
    if (layoutDropdownPanel.classList.contains('open') && !layoutDropdownWrapper.contains(e.target)) {
      closeLayoutDropdown();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeDeleteModal();
      closeLayoutDropdown();
      closeThemeDropdown();
      closeModuleDropdown();
      closeArrangeDropdown();
      closeTextColorDropdown();
      closeHighlightColorDropdown();
      closeBoxFillDropdown();
      closeBoxBorderDropdown();
      deselectTextBox();
      deselectTable();
      deselectImage();
      clearMultiSelection();
      closeHeaderFooterMode();
      closeSaveExerciseModal();
      closeUnsavedChangesModal();
      var entryModalEl = document.getElementById('builderEntryModal');
      if (entryModalEl) entryModalEl.classList.remove('open');
    }

    // Delete/Backspace removes whichever's selected — the multi-
    // selected group if there is one, otherwise the single active
    // box/table/image/shape, but only when it's selected-not-editing
    // — while actually typing (in a text box, or in a table cell),
    // these keys should just edit text. isTypingSomewhere covers both
    // "typing" states, since neither should be interrupted by Delete.
    if (e.key === 'Delete' || e.key === 'Backspace') {
      var isTypingSomewhere =
        (activeTextBoxEl && activeTextBoxEl.getAttribute('contenteditable') === 'true') ||
        (activeTableEl && activeEditingCell);

      if (selectedObjectIds.length > 0) {
        e.preventDefault();
        deleteMultiSelection();
      } else if (!isTypingSomewhere && (activeTextBoxEl || activeTableEl || activeImageEl || activeShapeEl)) {
        e.preventDefault();
        deleteActiveObject();
      }
    }

    // Ctrl/Cmd+Z: while actively typing (text box or table cell),
    // defer to the browser's own native undo for that field
    // (keystroke-level). Otherwise, undo the last add/delete/move/
    // commit on either tool. Ctrl/Cmd+Shift+Z and Ctrl+Y both redo,
    // same idea.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      var isTypingInBox = activeTextBoxEl && activeTextBoxEl.getAttribute('contenteditable') === 'true';
      var isTypingInCell = !!activeEditingCell;
      if (!isTypingInBox && !isTypingInCell) {
        e.preventDefault();
        if (e.shiftKey) performRedo();
        else performUndo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      var isTypingInBoxY = activeTextBoxEl && activeTextBoxEl.getAttribute('contenteditable') === 'true';
      var isTypingInCellY = !!activeEditingCell;
      if (!isTypingInBoxY && !isTypingInCellY) {
        e.preventDefault();
        performRedo();
      }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      // Only intercepts when a canvas object is selected and nothing
      // is being typed into — otherwise this is just a normal text
      // copy inside a text box/cell, which the browser already
      // handles natively and shouldn't be touched.
      var isTypingC = (activeTextBoxEl && activeTextBoxEl.getAttribute('contenteditable') === 'true') || !!activeEditingCell;
      if (!isTypingC && (selectedObjectIds.length > 0 || getActiveObjectId())) {
        e.preventDefault();
        copySelection();
      }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
      var isTypingX = (activeTextBoxEl && activeTextBoxEl.getAttribute('contenteditable') === 'true') || !!activeEditingCell;
      if (!isTypingX && (selectedObjectIds.length > 0 || getActiveObjectId())) {
        e.preventDefault();
        cutSelection();
      }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      var isTypingV = (activeTextBoxEl && activeTextBoxEl.getAttribute('contenteditable') === 'true') || !!activeEditingCell;
      if (!isTypingV && objectClipboard) {
        e.preventDefault();
        pasteClipboard();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
      e.preventDefault();
      ungroupSelection();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
      e.preventDefault();
      groupSelection();
    }
  });

  document.getElementById('undoBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    performUndo();
  });

  document.getElementById('redoBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    performRedo();
  });

  // ------------------------------------------------------------
  // Theme dropdown — same interaction pattern as Layout, but the
  // choice made here applies to the whole exercise (every slide,
  // past and future), not just the current one.
  // ------------------------------------------------------------
  var themeDropdownWrapper = document.getElementById('themeDropdownWrapper');
  var themeToggleBtn = document.getElementById('themeToggleBtn');
  var themeDropdownPanel = document.getElementById('themeDropdownPanel');

  function openThemeDropdown() {
    themeDropdownPanel.classList.add('open');
    themeToggleBtn.classList.add('active');
  }

  function closeThemeDropdown() {
    themeDropdownPanel.classList.remove('open');
    themeToggleBtn.classList.remove('active');
  }

  themeToggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (themeDropdownPanel.classList.contains('open')) {
      closeThemeDropdown();
    } else {
      closeAllDropdowns('theme');
      openThemeDropdown();
    }
  });

  document.addEventListener('click', function (e) {
    if (themeDropdownPanel.classList.contains('open') && !themeDropdownWrapper.contains(e.target)) {
      closeThemeDropdown();
    }
  });

  // ------------------------------------------------------------
  // Module dropdown — pure visual mock-up. Opens/closes like the
  // others, but the cards inside aren't clickable and nothing gets
  // inserted onto the slide — it's just an example of what browsing
  // existing modules/injects to add would look like.
  // ------------------------------------------------------------
  var moduleDropdownWrapper = document.getElementById('moduleDropdownWrapper');
  var moduleToggleBtn = document.getElementById('moduleToggleBtn');
  var moduleDropdownPanel = document.getElementById('moduleDropdownPanel');

  function openModuleDropdown() {
    moduleDropdownPanel.classList.add('open');
    moduleToggleBtn.classList.add('active');
  }

  function closeModuleDropdown() {
    moduleDropdownPanel.classList.remove('open');
    moduleToggleBtn.classList.remove('active');
  }

  moduleToggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (moduleDropdownPanel.classList.contains('open')) {
      closeModuleDropdown();
    } else {
      closeAllDropdowns('module');
      openModuleDropdown();
    }
  });

  document.addEventListener('click', function (e) {
    if (moduleDropdownPanel.classList.contains('open') && !moduleDropdownWrapper.contains(e.target)) {
      closeModuleDropdown();
    }
  });

  // ------------------------------------------------------------
  // Arrange dropdown — reorders whichever object (text box, table,
  // image, or shape) is currently selected within slide.objects,
  // the single shared, ordered array that already determines
  // stacking order for every object type (later in the array = later
  // in the DOM = painted on top; see renderObjects()). Forward/
  // Backward swap with the next/previous object; To front/back move
  // to the very end/start of the array.
  // ------------------------------------------------------------
  var arrangeDropdownWrapper = document.getElementById('arrangeDropdownWrapper');
  var arrangeToggleBtn = document.getElementById('arrangeToggleBtn');
  var arrangeDropdownPanel = document.getElementById('arrangeDropdownPanel');
  // Arrange applies to every object type (not just text boxes, unlike
  // most of formattingControls), but it needs the same exemption:
  // without this, clicking the toggle button or a dropdown option
  // counts as "clicking away" from whatever's selected, deselecting
  // it via the mousedown handler below before the option's own click
  // handler ever gets a chance to act on that selection.
  formattingControls.push(arrangeDropdownWrapper);

  // Resolves whichever object is currently selected, regardless of
  // type, so Arrange can act on it generically.
  function getActiveObjectId() {
    if (activeTextBoxEl) return activeTextBoxEl.dataset.id;
    if (activeTableEl) return activeTableId;
    if (activeImageEl) return activeImageId;
    if (activeShapeEl) return activeShapeId;
    return null;
  }

  // Deletes whichever single object is currently selected, regardless
  // of type — same generic-dispatch idea as getActiveObjectId/
  // moveActiveObject, used by the Delete/Backspace keydown handler so
  // it doesn't need one near-identical branch per object type. Each
  // deleteActiveX() still owns its own type-specific undo/cleanup.
  function deleteActiveObject() {
    if (activeTextBoxEl) deleteActiveTextBox();
    else if (activeTableEl) deleteActiveTable();
    else if (activeImageEl) deleteActiveImage();
    else if (activeShapeEl) deleteActiveShape();
  }

  // ------------------------------------------------------------
  // Copy / cut / paste — an in-memory clipboard (not the real OS
  // clipboard) holding deep-cloned object data, same approach
  // Figma/Canva use internally for canvas objects; the real
  // clipboard API is reserved for actual text copy/paste inside a
  // text box or table cell, which the browser already handles
  // natively and which these shortcuts deliberately stay out of the
  // way of (see isTypingSomewhere below).
  // ------------------------------------------------------------
  var objectClipboard = null; // array of deep-cloned object data, or null

  function getSelectedObjectsData() {
    var ids = selectedObjectIds.length > 0 ? selectedObjectIds : [getActiveObjectId()].filter(Boolean);
    return ids.map(function (id) { return findObjectData(currentSlideIndex, id); }).filter(Boolean);
  }

  function copySelection() {
    var objs = getSelectedObjectsData();
    if (objs.length === 0) return;
    objectClipboard = JSON.parse(JSON.stringify(objs));
  }

  function cutSelection() {
    var objs = getSelectedObjectsData();
    if (objs.length === 0) return;
    objectClipboard = JSON.parse(JSON.stringify(objs));
    if (selectedObjectIds.length > 0) deleteMultiSelection();
    else deleteActiveObject();
  }

  // Pastes the clipboard as new objects, offset slightly from their
  // original position (standard paste convention, so a paste never
  // lands exactly on top of its source and looks like nothing
  // happened) — fresh ids throughout, same reasoning as
  // duplicateSlide. Pasted objects become the new multi-selection
  // (or single selection, if there's only one) so they can be
  // immediately dragged into place.
  var PASTE_OFFSET_PCT = 3;

  function pasteClipboard() {
    if (!objectClipboard || objectClipboard.length === 0) return;

    deselectTextBox();
    deselectTable();
    deselectImage();
    deselectShape();
    clearMultiSelection();

    var pasted = [];
    objectClipboard.forEach(function (obj) {
      var copy = JSON.parse(JSON.stringify(obj));
      copy.id = 'obj' + (nextObjectId++);
      copy.leftPct = clampPct((copy.leftPct || 50) + PASTE_OFFSET_PCT);
      copy.topPct = clampPct((copy.topPct || 50) + PASTE_OFFSET_PCT);
      slides[currentSlideIndex].objects.push(copy);
      pasted.push(copy);
    });
    var newIds = pasted.map(function (o) { return o.id; });

    // Stores the full pasted object data (not just ids) so redo can
    // recreate them exactly after undo removes them — unlike most
    // undo actions here, there's no "original" version of a pasted
    // object sitting elsewhere to restore from.
    pushUndo({
      type: 'multi-paste',
      slideIndex: currentSlideIndex,
      pastedData: JSON.parse(JSON.stringify(pasted))
    });

    renderCanvas();

    if (newIds.length === 1) {
      reapplySelectionById(newIds[0]);
    } else {
      selectedObjectIds = newIds;
      applyMultiSelectionClasses();
    }
  }

  // Re-selects whatever was just reordered, by type, so the teal
  // selection outline/handles stay on it through the renderCanvas()
  // rebuild the move triggers.
  function reapplySelectionById(objId) {
    if (!objId) return;
    var data = findObjectData(currentSlideIndex, objId);
    if (!data) return;
    if (data.type === 'table') reapplyTableSelection(objId);
    else if (data.type === 'image') reapplyImageSelection(objId);
    else if (data.type === 'shape') reapplyShapeSelection(objId);
    else reapplyTextBoxSelection(objId);
  }

  function moveActiveObject(mode) {
    if (selectedObjectIds.length > 1) {
      moveMultiSelection(mode);
      return;
    }

    var objId = getActiveObjectId();
    if (!objId) return;

    var list = slides[currentSlideIndex].objects || [];
    var fromIndex = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === objId) { fromIndex = i; break; }
    }
    if (fromIndex === -1) return;

    var toIndex;
    if (mode === 'forward') toIndex = Math.min(fromIndex + 1, list.length - 1);
    else if (mode === 'backward') toIndex = Math.max(fromIndex - 1, 0);
    else if (mode === 'front') toIndex = list.length - 1;
    else toIndex = 0; // 'back'

    if (toIndex === fromIndex) return; // already there — nothing to do/undo

    pushUndo({
      type: 'arrange',
      slideIndex: currentSlideIndex,
      objId: objId,
      fromIndex: fromIndex,
      toIndex: toIndex
    });

    var moved = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, moved);

    renderCanvas();
    reapplySelectionById(objId);
  }

  // Group version of Arrange — same four modes, applied to every
  // multi-selected object at once while preserving their relative
  // order among themselves. Recorded as a single before/after
  // ordering snapshot rather than per-item index deltas, since with
  // several objects moving past each other at once the individual
  // deltas aren't independently meaningful — the snapshot sidesteps
  // that entirely and is trivial to restore exactly.
  function moveMultiSelection(mode) {
    var list = slides[currentSlideIndex].objects || [];
    var beforeOrder = list.map(function (o) { return o.id; });
    var selectedSet = {};
    selectedObjectIds.forEach(function (id) { selectedSet[id] = true; });

    var selected = list.filter(function (o) { return selectedSet[o.id]; });
    var rest = list.filter(function (o) { return !selectedSet[o.id]; });
    if (selected.length === 0) return;

    var newList;
    if (mode === 'front') {
      // Selected objects move to the very top, in their existing
      // relative order, everything else keeps its relative order
      // underneath.
      newList = rest.concat(selected);
    } else if (mode === 'back') {
      newList = selected.concat(rest);
    } else if (mode === 'forward') {
      // Each selected object hops forward past the next non-selected
      // object above it — walk from the top down so an object never
      // "leapfrogs" one of its own already-moved group-mates.
      newList = list.slice();
      for (var f = newList.length - 2; f >= 0; f--) {
        if (selectedSet[newList[f].id] && !selectedSet[newList[f + 1].id]) {
          var tmp = newList[f]; newList[f] = newList[f + 1]; newList[f + 1] = tmp;
        }
      }
    } else {
      // 'backward' — mirror image of forward, walking bottom-up.
      newList = list.slice();
      for (var b = 1; b < newList.length; b++) {
        if (selectedSet[newList[b].id] && !selectedSet[newList[b - 1].id]) {
          var tmp2 = newList[b]; newList[b] = newList[b - 1]; newList[b - 1] = tmp2;
        }
      }
    }

    var afterOrder = newList.map(function (o) { return o.id; });
    if (afterOrder.join('|') === beforeOrder.join('|')) return; // no-op, nothing to undo

    pushUndo({
      type: 'multi-arrange',
      slideIndex: currentSlideIndex,
      beforeOrder: beforeOrder,
      afterOrder: afterOrder
    });

    slides[currentSlideIndex].objects = newList;
    var keepSelected = selectedObjectIds.slice();
    renderCanvas(); // clears selectedObjectIds as part of its normal deselect-everything pass
    selectedObjectIds = keepSelected;
    applyMultiSelectionClasses();
  }

  document.querySelectorAll('.arrange-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      moveActiveObject(btn.dataset.arrange);
      closeArrangeDropdown();
    });
  });

  function openArrangeDropdown() {
    arrangeDropdownPanel.classList.add('open');
    arrangeToggleBtn.classList.add('active');
  }

  function closeArrangeDropdown() {
    arrangeDropdownPanel.classList.remove('open');
    arrangeToggleBtn.classList.remove('active');
  }

  arrangeToggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (arrangeDropdownPanel.classList.contains('open')) {
      closeArrangeDropdown();
    } else {
      closeAllDropdowns('arrange');
      openArrangeDropdown();
    }
  });

  document.addEventListener('click', function (e) {
    if (arrangeDropdownPanel.classList.contains('open') && !arrangeDropdownWrapper.contains(e.target)) {
      closeArrangeDropdown();
    }
  });

  // ------------------------------------------------------------
  // Theme selection — updates the shared background for every
  // slide (existing and future) plus the main canvas. Layout choice
  // is untouched by this — it's tracked per-slide, not globally.
  // ------------------------------------------------------------
  var themeThumbs = document.querySelectorAll('.theme-thumb');

  // Reflect whatever currentThemeBg already is (default, or restored
  // from a loaded exercise via ?editId=) in the swatch selector.
  themeThumbs.forEach(function (t) {
    t.classList.toggle('active', (t.dataset.bg || '#ffffff') === currentThemeBg);
  });

  themeThumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      themeThumbs.forEach(function (t) { t.classList.remove('active'); });
      thumb.classList.add('active');
      currentThemeBg = thumb.dataset.bg || '#ffffff';
      renderSlideRail();
      renderCanvas();
      if (layoutDropdownPanel.classList.contains('open')) {
        renderLayoutDropdown();
      }
      closeThemeDropdown();
    });
  });

  // ------------------------------------------------------------
  // Slides panel toggle — collapses the rail out of the layout
  // entirely (display: none) so the canvas expands to fill the
  // freed space; click again to bring it back. (Theme used to live
  // here too as a side panel — it's a toolbar dropdown now, see
  // above, since it applies globally rather than needing to stay
  // visible alongside the canvas.)
  // ------------------------------------------------------------
  var panelsByTarget = {
    slides: document.getElementById('slideRail')
  };

  document.querySelectorAll('.toolbar-panel-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = panelsByTarget[btn.dataset.target];
      if (!panel) return;
      var nowHidden = panel.classList.toggle('rail-hidden');
      btn.classList.toggle('active', !nowHidden);
    });
  });

  // ------------------------------------------------------------
  // Slide / Inject name — a per-slide facilitator-facing label,
  // same pattern as discussion points/observations below it: a
  // plain field bound directly to slide.name, re-rendered whenever
  // renderCanvas() runs (slide switch, add, undo/redo, ...). Not
  // part of the undo stack, same as the notes fields.
  // ------------------------------------------------------------
  var slideNameInput = document.getElementById('slideNameInput');

  function renderSlideName() {
    slideNameInput.value = slides[currentSlideIndex].name || '';
  }

  slideNameInput.addEventListener('input', function () {
    slides[currentSlideIndex].name = slideNameInput.value;
  });

  // ------------------------------------------------------------
  // Discussion Points & Observations — per-slide notes panels
  // below the canvas. Discussion Points are plain facilitator
  // notes; Observations additionally carry a type (Free Text /
  // Checkbox / Multiple Choice) that will drive how they render in
  // the delivery view later — for now, picking Multiple Choice just
  // reveals sub-fields here to define the options; the other two
  // types don't do anything extra yet.
  // ------------------------------------------------------------
  var discussionPointsList = document.getElementById('discussionPointsList');
  var observationsList = document.getElementById('observationsList');

  function renderDiscussionPoints() {
    discussionPointsList.innerHTML = '';
    var slide = slides[currentSlideIndex];
    if (!slide.discussionPoints) slide.discussionPoints = [];

    slide.discussionPoints.forEach(function (dp) {
      var item = document.createElement('div');
      item.className = 'obs-note-item';

      var row = document.createElement('div');
      row.className = 'obs-item-row';

      var textarea = document.createElement('textarea');
      textarea.className = 'note-textarea';
      textarea.placeholder = 'Add a facilitator note or discussion point…';
      textarea.value = dp.text || '';
      textarea.addEventListener('input', function () { dp.text = textarea.value; });

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'note-delete-btn';
      delBtn.title = 'Delete';
      delBtn.innerHTML = DELETE_ICON;
      delBtn.addEventListener('click', function () {
        slide.discussionPoints = slide.discussionPoints.filter(function (x) { return x.id !== dp.id; });
        renderDiscussionPoints();
      });

      row.appendChild(textarea);
      row.appendChild(delBtn);
      item.appendChild(row);

      discussionPointsList.appendChild(item);
    });
  }

  document.getElementById('addDiscussionPointBtn').addEventListener('click', function () {
    var slide = slides[currentSlideIndex];
    slide.discussionPoints.push({ id: 'dp' + (nextNoteId++), text: '', dpType: 'freetext', options: [] });
    renderDiscussionPoints();
  });

  var OBS_TYPES = [
    ['freetext', 'Free Text'],
    ['checkbox', 'Checkbox'],
    ['multiplechoice', 'Multiple Choice']
  ];

  function renderObservations() {
    observationsList.innerHTML = '';
    var slide = slides[currentSlideIndex];
    if (!slide.observations) slide.observations = [];

    slide.observations.forEach(function (obs) {
      if (!obs.options) obs.options = [];

      var item = document.createElement('div');
      item.className = 'obs-note-item';

      var row = document.createElement('div');
      row.className = 'obs-item-row';

      var textarea = document.createElement('textarea');
      textarea.className = 'note-textarea';
      textarea.placeholder = 'Add an observation prompt…';
      textarea.value = obs.text || '';
      textarea.addEventListener('input', function () { obs.text = textarea.value; });

      var selectWrap = document.createElement('div');
      selectWrap.className = 'select-wrapper obs-type-select';
      var select = document.createElement('select');
      OBS_TYPES.forEach(function (pair) {
        var opt = document.createElement('option');
        opt.value = pair[0];
        opt.textContent = pair[1];
        if (obs.obsType === pair[0]) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener('change', function () {
        obs.obsType = select.value;
        if (obs.obsType === 'multiplechoice' && obs.options.length === 0) {
          obs.options.push({ id: 'opt' + (nextNoteId++), text: '' });
          obs.options.push({ id: 'opt' + (nextNoteId++), text: '' });
        }
        renderObservations();
      });
      var arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrowSvg.setAttribute('class', 'select-arrow');
      arrowSvg.setAttribute('viewBox', '0 0 24 24');
      arrowSvg.setAttribute('width', '14');
      arrowSvg.setAttribute('height', '14');
      arrowSvg.setAttribute('fill', 'none');
      arrowSvg.setAttribute('stroke', '#16264A');
      arrowSvg.setAttribute('stroke-width', '2');
      arrowSvg.setAttribute('stroke-linecap', 'round');
      arrowSvg.setAttribute('stroke-linejoin', 'round');
      arrowSvg.innerHTML = '<path d="M6 9l6 6 6-6"/>';
      selectWrap.appendChild(select);
      selectWrap.appendChild(arrowSvg);

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'note-delete-btn';
      delBtn.title = 'Delete';
      delBtn.innerHTML = DELETE_ICON;
      delBtn.addEventListener('click', function () {
        slide.observations = slide.observations.filter(function (x) { return x.id !== obs.id; });
        renderObservations();
      });

      row.appendChild(textarea);
      row.appendChild(selectWrap);
      row.appendChild(delBtn);
      item.appendChild(row);

      if (obs.obsType === 'multiplechoice') {
        var optionsList = document.createElement('div');
        optionsList.className = 'obs-options-list';

        obs.options.forEach(function (opt) {
          var optRow = document.createElement('div');
          optRow.className = 'obs-option-row';

          var input = document.createElement('input');
          input.type = 'text';
          input.className = 'obs-option-input';
          input.placeholder = 'Option text';
          input.value = opt.text || '';
          input.addEventListener('input', function () { opt.text = input.value; });

          var optDel = document.createElement('button');
          optDel.type = 'button';
          optDel.className = 'obs-option-delete';
          optDel.title = 'Delete option';
          optDel.innerHTML = DELETE_ICON;
          optDel.addEventListener('click', function () {
            obs.options = obs.options.filter(function (x) { return x.id !== opt.id; });
            renderObservations();
          });

          optRow.appendChild(input);
          optRow.appendChild(optDel);
          optionsList.appendChild(optRow);
        });

        var addOptBtn = document.createElement('button');
        addOptBtn.type = 'button';
        addOptBtn.className = 'obs-add-option-btn';
        addOptBtn.textContent = '+ Add option';
        addOptBtn.addEventListener('click', function () {
          obs.options.push({ id: 'opt' + (nextNoteId++), text: '' });
          renderObservations();
        });
        optionsList.appendChild(addOptBtn);

        item.appendChild(optionsList);
      }

      observationsList.appendChild(item);
    });
  }

  document.getElementById('addObservationBtn').addEventListener('click', function () {
    var slide = slides[currentSlideIndex];
    slide.observations.push({ id: 'obs' + (nextNoteId++), text: '', obsType: 'freetext', options: [] });
    renderObservations();
  });

  // ------------------------------------------------------------
  // Initial render
  // ============================================================
  renderSlideRail();
  renderCanvas();

  // ============================================================
  // BUILDER PREVIEW - Show delivery viewer in modal
  // ============================================================
  var builderPreviewModal = document.getElementById('builderPreviewModal');
  var previewDeliveryContainer = document.getElementById('previewDeliveryContainer');

  function openBuilderPreview() {
    // Save builder slides to sessionStorage for delivery viewer to use
    try {
      sessionStorage.setItem('builderPreviewMode', 'true');
      sessionStorage.setItem('builderPreviewSlides', JSON.stringify(slides));
      sessionStorage.setItem('builderCurrentSlideIndex', currentSlideIndex);
      sessionStorage.setItem('builderPreviewThemeBg', currentThemeBg);
    } catch (e) {
      console.error('Failed to save preview data:', e);
      return;
    }

    // Load delivery viewer content
    previewDeliveryContainer.innerHTML = '<iframe id="previewIframe" style="width:100%; height:100%; border:none; background:#000;" src="../pages/exercise-delivery.html"></iframe>';
    builderPreviewModal.style.display = 'block';
  }

  function closeBuilderPreview() {
    builderPreviewModal.style.display = 'none';
    previewDeliveryContainer.innerHTML = '';
    try {
      sessionStorage.removeItem('builderPreviewMode');
      sessionStorage.removeItem('builderPreviewSlides');
      sessionStorage.removeItem('builderCurrentSlideIndex');
      sessionStorage.removeItem('builderPreviewThemeBg');
    } catch (e) {}
  }

  // Listen for messages from iframe (close preview)
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'closePreview') {
      closeBuilderPreview();
    }
  });

  // Preview button event listener
  document.querySelector('button[title="Preview Exercise"]').addEventListener('click', function () {
    openBuilderPreview();
  });

  // Allow closing via Escape key only (not by clicking on screen)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && builderPreviewModal.style.display === 'block') {
      closeBuilderPreview();
    }
  });

  // ============================================================
  // SAVE EXERCISE — names + categorises the current slide deck and
  // writes it to localStorage (excyteCustomExercises), so it shows
  // up under its chosen theme (and always under "My Exercises") back
  // in the Exercise Library.
  // ============================================================

  // Same 17 themes listed on the Exercise Library homepage
  // (index.html #themeFilter), plus "My Exercises" itself — picking
  // it files the exercise there and nowhere else.
  var THEME_LIST = [
    'My Exercises',
    'Phishing & Social Engineering',
    'Ransomware & Extortion',
    'Test Theme',
    'Communications, Media & Stakeholder Management',
    'Cyber Assessment Framework (CAF)',
    'Education and Safeguarding',
    'Excyte Live',
    'Executive & Leadership',
    'How to Exercise',
    'Incident of the Month',
    'Insider Threat',
    'National Security',
    'NCSC Exercise in a Box',
    'Operational Technology (OT)',
    'PYOA (BETA)',
    'Supply Chain & Third-Party Compromise',
    'Website Defacement & Brand Abuse'
  ];

  var saveExerciseModal = document.getElementById('saveExerciseModal');
  var saveExerciseNameInput = document.getElementById('saveExerciseNameInput');
  var saveExerciseNameError = document.getElementById('saveExerciseNameError');
  var saveExerciseStorageError = document.getElementById('saveExerciseStorageError');
  var saveExerciseThemeSelect = document.getElementById('saveExerciseThemeSelect');
  var saveExerciseCancelBtn = document.getElementById('saveExerciseCancelBtn');
  var saveExerciseConfirmBtn = document.getElementById('saveExerciseConfirmBtn');
  var builderPageTitle = document.getElementById('builderPageTitle');

  THEME_LIST.forEach(function (themeName) {
    var opt = document.createElement('option');
    opt.value = themeName;
    opt.textContent = themeName;
    saveExerciseThemeSelect.appendChild(opt);
  });

  function updateBuilderPageTitle() {
    builderPageTitle.textContent = currentExerciseMeta.name ? currentExerciseMeta.name : 'Exercise Builder';
    document.title = 'Excyte | ' + (currentExerciseMeta.name || 'Exercise Builder');
  }
  updateBuilderPageTitle();

  // Set when Save is opened from the unsaved-changes prompt (so a
  // deferred navigation can continue once the save actually completes).
  var afterSaveCallback = null;

  function openSaveExerciseModal(callback) {
    afterSaveCallback = callback || null;
    saveExerciseNameInput.value = currentExerciseMeta.name || '';
    saveExerciseThemeSelect.value = THEME_LIST.indexOf(currentExerciseMeta.theme) !== -1
      ? currentExerciseMeta.theme
      : THEME_LIST[0];
    saveExerciseNameError.classList.remove('show');
    saveExerciseStorageError.classList.remove('show');
    saveExerciseModal.classList.add('open');
    saveExerciseNameInput.focus();
  }

  function closeSaveExerciseModal() {
    afterSaveCallback = null;
    saveExerciseModal.classList.remove('open');
  }

  // Writes the current slides/theme to localStorage under
  // currentExerciseMeta.id — reusing the same id on every subsequent
  // save (rather than minting a new one) so re-saving updates the
  // same record instead of creating duplicates. Returns true/false —
  // callers must check this before treating the save as having
  // happened (clearing the draft, navigating away, etc.), since a
  // full localStorage quota means the write can genuinely fail.
  function performSave(name, theme) {
    var all = loadCustomExercises();
    var id = currentExerciseMeta.id || ('ex-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
    var now = new Date();
    var timestamp = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear() + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    var previousRecord = all[id];
    all[id] = {
      id: id,
      name: name,
      theme: theme,
      slides: slides,
      themeBg: currentThemeBg,
      createdAt: (all[id] && all[id].createdAt) || timestamp,
      updatedAt: timestamp
    };
    var ok = saveCustomExercises(all);
    if (!ok) {
      // Roll back the in-memory record so a later successful save
      // (e.g. after freeing up space) still sees the correct
      // createdAt/previous state rather than this failed attempt's.
      if (previousRecord) all[id] = previousRecord; else delete all[id];
      return false;
    }

    currentExerciseMeta = { id: id, name: name, theme: theme };
    lastSavedSnapshot = snapshotState();
    updateBuilderPageTitle();
    // A real save just persisted everything to the named record —
    // any leftover draft would only be stale/redundant from here.
    clearDraft();

    // The URL doesn't carry ?editId= yet on a brand new save — add it
    // (without reloading) so a page refresh from here on continues
    // editing this same saved exercise instead of starting blank.
    var url = new URL(window.location.href);
    if (url.searchParams.get('editId') !== id) {
      url.searchParams.set('editId', id);
      window.history.replaceState(null, '', url);
      initialEditId = id; // keep in sync with the URL update above, so a draft written after this still matches on the next load
    }
    return true;
  }

  saveExerciseCancelBtn.addEventListener('click', closeSaveExerciseModal);

  saveExerciseConfirmBtn.addEventListener('click', function () {
    var name = saveExerciseNameInput.value.trim();
    if (!name) {
      saveExerciseNameError.classList.add('show');
      saveExerciseNameInput.focus();
      return;
    }
    saveExerciseStorageError.classList.remove('show');
    var ok = performSave(name, saveExerciseThemeSelect.value);
    if (!ok) {
      saveExerciseStorageError.classList.add('show');
      return; // stay on the modal — nothing was actually saved
    }
    var callback = afterSaveCallback;
    closeSaveExerciseModal();
    if (callback) callback();
  });

  saveExerciseNameInput.addEventListener('input', function () {
    if (saveExerciseNameInput.value.trim()) saveExerciseNameError.classList.remove('show');
  });

  // Backdrop click cancels, matching every other modal on this page
  saveExerciseModal.addEventListener('click', function (e) {
    if (e.target === saveExerciseModal) closeSaveExerciseModal();
  });

  document.getElementById('saveBuilderBtn').addEventListener('click', function () {
    openSaveExerciseModal();
  });

  // ============================================================
  // UNSAVED CHANGES GUARD — catches navigating away from the builder
  // (sidebar links, the Excyte logo) while there are unsaved edits,
  // and refreshing/closing the tab as a native-dialog fallback (the
  // browser doesn't allow a custom Save button on that one — see
  // below).
  // ============================================================
  var unsavedChangesModal = document.getElementById('unsavedChangesModal');
  var unsavedSaveBtn = document.getElementById('unsavedSaveBtn');
  var unsavedDiscardBtn = document.getElementById('unsavedDiscardBtn');
  var unsavedCancelBtn = document.getElementById('unsavedCancelBtn');
  var pendingNavigationHref = null;

  function openUnsavedChangesModal(href) {
    pendingNavigationHref = href;
    unsavedChangesModal.classList.add('open');
  }

  function closeUnsavedChangesModal() {
    pendingNavigationHref = null;
    unsavedChangesModal.classList.remove('open');
  }

  unsavedCancelBtn.addEventListener('click', closeUnsavedChangesModal);

  unsavedChangesModal.addEventListener('click', function (e) {
    if (e.target === unsavedChangesModal) closeUnsavedChangesModal();
  });

  unsavedDiscardBtn.addEventListener('click', function () {
    var href = pendingNavigationHref;
    closeUnsavedChangesModal();
    // Discarding means these changes are meant to be gone — clear any
    // draft, and mark the current state as no longer dirty, or the
    // beforeunload handler about to fire on this navigation would
    // just re-persist the very thing being discarded.
    clearDraft();
    lastSavedSnapshot = snapshotState();
    if (href) window.location.href = href;
  });

  unsavedSaveBtn.addEventListener('click', function () {
    var href = pendingNavigationHref;
    closeUnsavedChangesModal();

    if (currentExerciseMeta.name) {
      // Already saved before this session — just re-save under the
      // same name/theme and continue straight on. If the quick
      // re-save fails (e.g. storage is full), don't navigate away as
      // if it worked — fall back to the full Save modal, which can
      // actually show the error instead of losing the changes
      // silently.
      var ok = performSave(currentExerciseMeta.name, currentExerciseMeta.theme || THEME_LIST[0]);
      if (ok) {
        if (href) window.location.href = href;
      } else {
        openSaveExerciseModal(function () {
          if (href) window.location.href = href;
        });
        saveExerciseStorageError.classList.add('show');
      }
    } else {
      // Never saved — collect a name/theme first, then continue.
      openSaveExerciseModal(function () {
        if (href) window.location.href = href;
      });
    }
  });

  // Intercepts clicks on any real link away from this page (sidebar
  // nav items, the Excyte logo) while there are unsaved changes, so
  // a custom Save/Discard/Cancel prompt can run before the browser
  // actually navigates. Capture phase so this runs before menu.js's
  // own click handling.
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href]') : null;
    if (!link) return;
    if (link.getAttribute('href') === '#') return;
    if (!isDirty()) return;

    e.preventDefault();
    e.stopPropagation();
    openUnsavedChangesModal(link.href);
  }, true);

  // Silently persists a draft on the way out — covers refresh, closing
  // the tab, typing a new URL, back/forward, anything the in-app
  // link-intercept above can't catch. Only written when there's
  // actually something unsaved, so a draft never lingers for a
  // session that has nothing to restore. No more native "leave site?"
  // warning here: since the draft means a refresh genuinely can't
  // lose anything now, the warning would just be noise.
  window.addEventListener('beforeunload', function () {
    if (isDirty()) saveDraftToSession();
  });

  // ============================================================
  // BUILDER ENTRY PROMPT — on a fresh visit (no ?editId=), the
  // builder underneath is already sitting in its default blank-slide
  // state; this just asks up front whether that's actually what's
  // wanted, or whether to jump straight into editing something
  // already saved instead. Skipped entirely when arriving via
  // ?editId= (from the Edit button on the events page, or a save
  // earlier this session), or when a draft was just restored (a
  // refresh mid-edit already answers the question just as clearly).
  // ============================================================
  (function setupBuilderEntryPrompt() {
    if (initialEditId || draftRestored) return;

    var entryModal = document.getElementById('builderEntryModal');
    var choiceStep = document.getElementById('builderEntryChoiceStep');
    var editStep = document.getElementById('builderEntryEditStep');
    var editEmptyMessage = document.getElementById('builderEntryEditEmptyMessage');
    var editFields = document.getElementById('builderEntryEditFields');
    var themeSelect = document.getElementById('builderEntryThemeSelect');
    var exerciseSelect = document.getElementById('builderEntryExerciseSelect');
    var createBtn = document.getElementById('builderEntryCreateBtn');
    var editBtn = document.getElementById('builderEntryEditBtn');
    var backBtn = document.getElementById('builderEntryBackBtn');
    var confirmBtn = document.getElementById('builderEntryEditConfirmBtn');

    // Only exercises saved from this builder can be edited here (no
    // demo/bundled exercises), grouped by theme so the first dropdown
    // only ever lists themes that actually have something to edit.
    function getEditableByTheme() {
      var all = loadCustomExercises();
      var byTheme = {};
      Object.keys(all).forEach(function (id) {
        var ex = all[id];
        if (!ex) return;
        var theme = ex.theme || 'My Exercises';
        if (!byTheme[theme]) byTheme[theme] = [];
        byTheme[theme].push(ex);
      });
      return byTheme;
    }

    function closeEntryModal() {
      entryModal.classList.remove('open');
    }

    function showChoiceStep() {
      choiceStep.style.display = '';
      editStep.style.display = 'none';
    }

    function showEditStep() {
      var byTheme = getEditableByTheme();
      var themes = Object.keys(byTheme);

      if (themes.length === 0) {
        editEmptyMessage.style.display = '';
        editFields.style.display = 'none';
        confirmBtn.disabled = true;
      } else {
        editEmptyMessage.style.display = 'none';
        editFields.style.display = '';

        themeSelect.innerHTML = '';
        themes.sort().forEach(function (theme) {
          var opt = document.createElement('option');
          opt.value = theme;
          opt.textContent = theme;
          themeSelect.appendChild(opt);
        });

        populateExercisesForTheme(byTheme, themeSelect.value);
      }

      choiceStep.style.display = 'none';
      editStep.style.display = '';
    }

    function populateExercisesForTheme(byTheme, theme) {
      var exercises = (byTheme[theme] || []).slice().sort(function (a, b) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      exerciseSelect.innerHTML = '';
      exercises.forEach(function (ex) {
        var opt = document.createElement('option');
        opt.value = ex.id;
        opt.textContent = ex.name;
        exerciseSelect.appendChild(opt);
      });

      confirmBtn.disabled = exercises.length === 0;
    }

    createBtn.addEventListener('click', closeEntryModal);

    editBtn.addEventListener('click', showEditStep);

    backBtn.addEventListener('click', showChoiceStep);

    themeSelect.addEventListener('change', function () {
      populateExercisesForTheme(getEditableByTheme(), themeSelect.value);
    });

    confirmBtn.addEventListener('click', function () {
      if (confirmBtn.disabled || !exerciseSelect.value) return;
      window.location.href = 'exercise-builder.html?editId=' + encodeURIComponent(exerciseSelect.value);
    });

    // Dismissing without an explicit choice (backdrop click, Escape)
    // just leaves the already-blank builder as-is — equivalent to
    // Create New.
    entryModal.addEventListener('click', function (e) {
      if (e.target === entryModal) closeEntryModal();
    });

    showChoiceStep();
    entryModal.classList.add('open');
  })();

});
