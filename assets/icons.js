// Inline SVG icons for the test shell. Stroke icons inherit currentColor.
const ICON = (() => {
  const s = (body, vb = '0 0 24 24') =>
    `<svg viewBox="${vb}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  return {
    left: s('<path d="M15 5l-7 7 7 7" stroke-width="2.4"/>'),
    right: s('<path d="M9 5l7 7-7 7" stroke-width="2.4"/>'),
    reset: s('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7"/><path d="M20 3.5v5.2h-5.2"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.3"/><path d="M4 20.5v-5.2h5.2"/>'),
    minus: s('<path d="M5 12h14" stroke-width="2"/>'),
    plus: s('<path d="M12 5v14M5 12h14" stroke-width="2"/>'),
    bookmark: s('<path d="M7 3.5h10v17l-5-4-5 4z"/>'),
    bookmarkFilled: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10v17l-5-4-5 4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    note: s('<rect x="4" y="5" width="13" height="15" rx="1"/><path d="M11 13l8.5-8.5 1.5 1.5L12.5 14.5 10.5 15z"/>'),
    color: s('<path d="M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z"/><path d="M9.2 14.5a3 3 0 0 0 2.8 2.8"/>'),
    highlighter: s('<path d="M3 20h8"/><path d="M8.5 16.5l-2-2 9-9a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2z"/><path d="M6.5 14.5L5 18h3.5l.5-1.5"/><path d="M13 8l3 3"/>'),
    eliminator: s('<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M8 8l8 8M16 8l-8 8"/>'),
    calculator: s('<rect x="5.5" y="2.5" width="13" height="19" rx="1.5"/><rect x="8" y="5" width="8" height="3.5"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18h.01M12 18h.01M15.5 18h.01" stroke-width="2.4"/>'),
    ruler: s('<path d="M4 20L20 4"/><path d="M6.5 20.5L20.5 6.5 17.5 3.5 3.5 17.5z"/><path d="M7 14l1.5 1.5M9.5 11.5l1.5 1.5M12 9l1.5 1.5M14.5 6.5l1.5 1.5"/>'),
    protractor: s('<path d="M3 17a9 9 0 0 1 18 0z"/><path d="M8 17a4 4 0 0 1 8 0"/><path d="M12 8v2M7.4 9.6l1 1.6M16.6 9.6l-1 1.6"/>'),
    linereader: s('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M3 14h18"/><path d="M6 12h9" stroke-width="2"/>'),
    speaker: s('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
    close: s('<path d="M7 7l10 10M17 7L7 17" stroke-width="2.6"/>'),
    check: s('<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16.2 9.5" stroke-width="2"/>'),
    offline: s('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6" stroke-width="2"/>'),
    eye: s('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: s('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 20L20 4"/>'),
    zoomPlus: s('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"/>'),
    undo: s('<path d="M9 7L4.5 11.5 9 16"/><path d="M4.5 11.5H15a4.5 4.5 0 0 1 0 9h-2"/>'),
    redo: s('<path d="M15 7l4.5 4.5L15 16"/><path d="M19.5 11.5H9a4.5 4.5 0 0 0 0 9h2"/>'),
    rotate: s('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/>')
  };
})();
