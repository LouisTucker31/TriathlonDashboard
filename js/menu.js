/* ==========================================================================
   Excyte shared sidebar menu
   Include this file on every page, plus a <div id="sidebar-placeholder"></div>
   right at the top of <body>. Set <body data-page="exercises"> (or whichever
   page it is) so the correct nav item gets highlighted automatically.
   ========================================================================== */

(function () {

  // This file is shared across every page, but index.html lives at the
  // project root while every other page now lives in pages/ — so the
  // links below need different relative paths depending on where the
  // current page actually is.
  var inPages = /\/pages\//.test(window.location.pathname);
  var toRoot = inPages ? '../' : '';
  var toPages = inPages ? '' : 'pages/';

  // The inline script in <head> already applied this class before first
  // paint if the sidebar was left collapsed — read it here so the sidebar
  // is built collapsed from the start, rather than created expanded and
  // then toggled a moment later (which is what caused the visible slide).
  var startCollapsed = document.documentElement.classList.contains('sidebar-collapsed');

  var sidebarHTML =
    '<aside class="sidebar' + (startCollapsed ? ' collapsed' : '') + '" id="sidebar">' +
      '<div class="logo-area">' +
        '<a href="' + toRoot + 'index.html" class="logo-link">' +
          '<div class="logo-row">' +
            '<img class="logo-full-img" src="' + toRoot + 'assets/excyte-logo-full.png" alt="Excyte">' +
            '<img class="logo-icon-img" src="' + toRoot + 'assets/excyte-logo-icon.png" alt="Excyte">' +
          '</div>' +
        '</a>' +
        '<p class="tagline">Cyber Exercising Business Resilience</p>' +
      '</div>' +

      '<nav class="nav-menu">' +
        '<a href="' + toRoot + 'index.html" class="nav-item" data-page="exercises">' +
          '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z"/><circle cx="12" cy="12" r="3"/></svg>' +
          '<span class="nav-text">Exercises</span>' +
        '</a>' +
        '<a href="' + toPages + 'exercise-builder.html" class="nav-item" data-page="exercise-builder">' +
          '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z"/><path d="M4 7.5 L12 12 L20 7.5"/><path d="M12 12 V21"/></svg>' +
          '<span class="nav-text">Exercise Builder</span>' +
        '</a>' +
        '<a href="' + toPages + 'reporting.html" class="nav-item" data-page="reporting">' +
          '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V10"/><path d="M10 19V5"/><path d="M16 19V13"/><path d="M4 19H20"/></svg>' +
          '<span class="nav-text">Reporting</span>' +
        '</a>' +
        '<a href="#" class="nav-item expandable" data-page="data-management">' +
          '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>' +
          '<span class="nav-text">Data Management</span>' +
          '<svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' +
        '</a>' +
        '<a href="#" class="nav-item" data-page="support">' +
          '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/><path d="M5.5 5.5l3.2 3.2M18.5 5.5l-3.2 3.2M5.5 18.5l3.2-3.2M18.5 18.5l-3.2-3.2"/></svg>' +
          '<span class="nav-text">Support</span>' +
        '</a>' +
        '<a href="#" class="nav-item expandable" data-page="settings">' +
          '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
          '<span class="nav-text">Settings</span>' +
          '<svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' +
        '</a>' +
      '</nav>' +

      '<button class="collapse-btn" id="collapseBtn" aria-label="Collapse sidebar">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>' +
      '</button>' +

      '<div class="user-area">' +
        '<div class="welcome">' +
          '<span class="welcome-label">Welcome,</span>' +
          '<strong class="welcome-name">Louis Tucker</strong>' +
        '</div>' +
        '<button class="logout-btn"><span>Logout</span></button>' +
      '</div>' +
    '</aside>';

  document.addEventListener('DOMContentLoaded', function () {

    var placeholder = document.getElementById('sidebar-placeholder');
    if (!placeholder) return;

    placeholder.outerHTML = sidebarHTML;

    // Highlight whichever nav item matches this page's data-page attribute
    var currentPage = document.body.getAttribute('data-page');
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      if (currentPage && item.getAttribute('data-page') === currentPage) {
        item.classList.add('active');
      }
      // Static mockup — only "Exercises" and "Reporting" actually go
      // anywhere right now. Every other nav item is a placeholder for now.
      if (['exercises', 'reporting', 'exercise-builder'].indexOf(item.getAttribute('data-page')) === -1) {
        item.addEventListener('click', function (e) { e.preventDefault(); });
      }
    });

    // Collapse / expand sidebar — persisted so it stays collapsed (or
    // expanded) when the user navigates to another page. The initial
    // state is already baked into sidebarHTML above; this just handles
    // toggling and saving from here on.
    var COLLAPSE_KEY = 'excyteSidebarCollapsed';
    var collapseBtn = document.getElementById('collapseBtn');
    var sidebar = document.getElementById('sidebar');

    collapseBtn.addEventListener('click', function () {
      sidebar.classList.toggle('collapsed');
      try {
        localStorage.setItem(COLLAPSE_KEY, sidebar.classList.contains('collapsed'));
      } catch (e) {}
    });

  });

})();
