const paths = {
  map: '<path d="M4 6.2 9 4l6 2 5-2v13.8L15 20l-6-2-5 2V6.2Z"/><path d="M9 4v14M15 6v14"/>',
  journal: '<path d="M5 4.5h9.4A2.6 2.6 0 0 1 17 7.1V20H7.6A2.6 2.6 0 0 1 5 17.4V4.5Z"/><path d="M17 7.5h2v12.5h-2M8 8h6M8 11h6M8 14h4"/>',
  skills: '<path d="m12 3 2.1 4.9L19 10l-4.9 2.1L12 17l-2.1-4.9L5 10l4.9-2.1L12 3Z"/><path d="m18.5 15 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z"/>',
  journey: '<path d="M5 19c3-7 4-12 12-14"/><path d="m13 4 4 1-1 4M4 20h16"/><circle cx="9" cy="12" r="1.6"/>',
  inventory: '<path d="M5 8.5h14V20H5zM8 8.5V6a4 4 0 0 1 8 0v2.5"/><path d="M9 13h6"/>',
  chronicle: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2M12 3.5V2M12 22v-1.5M3.5 12H2M22 12h-1.5"/>',
  contracts: '<path d="M7 3.5h10V21l-5-3-5 3V3.5Z"/><path d="M10 8h4M10 11h4M10 14h2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  warning: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17.2v.1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  spark: '<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/>'
};

export const uiIcon = (name, className = '') => {
  const body = paths[name] ?? paths.spark;
  return `<svg class="ui-icon${className ? ` ${className}` : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
};

export const UI_ICON_NAMES = Object.freeze(Object.keys(paths));
