/* PartFit Ghana — back navigation
   The router uses history.replaceState (no browser history entries), and
   sub-pages had no explicit way back to their parent. This tracks the current
   page and injects a Back button into the header on every non-root page,
   returning to that page's logical parent. Loaded last so it wraps the final
   render / product / appHeader definitions. */
(() => {
  const P = window.PFV3; if (!P) return;

  // bottom-nav roots never show a Back button
  const ROOT = new Set(['home', 'catalogue', 'request', 'orders', 'account']);
  // logical parent for every sub-page
  const PARENT = {
    product: 'catalogue', vehicle: 'home', order: 'catalogue', track: 'orders',
    login: 'home', signup: 'home', faq: 'home', contact: 'home',
    privacy: 'home', terms: 'home', returns: 'home', delivery: 'home', fitment: 'home'
  };
  P.cur = 'home';

  // track the current page across every navigation mechanism
  if (typeof render === 'function') {
    const base = render;
    render = function (page, arg) { if (page) P.cur = page; return base.call(this, page, arg); };
  }
  if (typeof product === 'function') {
    const base = product;
    product = function (id) { P.cur = 'product'; return base.call(this, id); };
  }
  const wrap = (name, key) => {
    if (typeof window[name] === 'function') {
      const base = window[name];
      window[name] = function () { P.cur = key; return base.apply(this, arguments); };
    }
  };
  wrap('home', 'home'); wrap('catalogue', 'catalogue'); wrap('order', 'order');
  wrap('vehicle', 'vehicle'); wrap('requestPart', 'request');

  // inject the Back button into the header for sub-pages
  if (typeof appHeader === 'function') {
    const base = appHeader;
    appHeader = function (title, sub) {
      const html = base.call(this, title, sub);
      if (ROOT.has(P.cur) || !(P.cur in PARENT)) return html;
      const btn = '<button class="v6Back" data-back aria-label="Go back">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>';
      return html.replace(/(<header\b[^>]*>)/, '$1' + btn);
    };
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-back]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    render(PARENT[P.cur] || 'home');
  }, true);
})();
