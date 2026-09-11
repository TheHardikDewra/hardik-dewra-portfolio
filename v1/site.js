/* Iteration 1 interactions: nav state, mobile menu, FAQ, copy-email, and the
   cursor-following preview on the work index. Runs after motion.js. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Nav hairline appears once the page moves.
  var nav = document.querySelector('.nav');
  function onScroll() { if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu. `inert` keeps the closed menu out of the tab order.
  var btn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    if (!menu || !btn) return;
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    btn.setAttribute('aria-expanded', String(open));
    var label = btn.querySelector('.label');
    if (label) label.textContent = open ? 'Close' : 'Menu';
    document.body.style.overflow = open ? 'hidden' : '';
    if (window.__lenis) { if (open) window.__lenis.stop(); else window.__lenis.start(); }
  }
  if (btn && menu) {
    menu.inert = true;
    btn.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 960) setMenu(false); });
  }

  // FAQ accordion.
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function () {
      var open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', String(open));
    });
  });

  // Copy email, falling back to mailto when the clipboard is unavailable.
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      var label = b.querySelector('.copy-label');
      var done = function () {
        if (!label) return;
        var old = label.textContent;
        label.textContent = 'Copied to clipboard';
        setTimeout(function () { label.textContent = old; }, 1800);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { location.href = 'mailto:' + text; });
      else location.href = 'mailto:' + text;
    });
  });

  // Work index: a screenshot follows the cursor while a row is hovered.
  var preview = document.querySelector('.preview');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (preview && fine && !reduce && window.gsap) {
    var gsap = window.gsap;
    var img = preview.querySelector('img');
    var rows = document.querySelectorAll('.row[data-preview]');
    gsap.set(preview, { xPercent: 8, yPercent: -50, scale: 0.92 });
    var xTo = gsap.quickTo(preview, 'x', { duration: 0.5, ease: 'power3' });
    var yTo = gsap.quickTo(preview, 'y', { duration: 0.5, ease: 'power3' });
    window.addEventListener('mousemove', function (e) { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    rows.forEach(function (row) {
      row.addEventListener('mouseenter', function () {
        var src = row.getAttribute('data-preview');
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
        img.setAttribute('alt', '');
        gsap.to(preview, { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
      });
      row.addEventListener('mouseleave', function () {
        gsap.to(preview, { opacity: 0, scale: 0.92, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
      });
    });
    // Warm the cache so swapping rows never shows an empty frame.
    var warm = function () { rows.forEach(function (r) { var i = new Image(); i.src = r.getAttribute('data-preview'); }); };
    if ('requestIdleCallback' in window) requestIdleCallback(warm); else setTimeout(warm, 1500);
  }
})();
