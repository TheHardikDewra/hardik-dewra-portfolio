/* Iteration 2 interactions: masthead date, mobile menu, FAQ, copy-email, the
   highlighter, drawn section rules, annotation pins, the horizontal gallery and the
   process timeline. Runs after motion.js, which owns reveals and split headlines. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('static');
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var motion = !reduce && gsap && ST && root.classList.contains('motion-on');

  // Dateline: today's date where I am.
  document.querySelectorAll('[data-date]').forEach(function (el) {
    try {
      el.textContent = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: el.getAttribute('data-date') }).format(new Date());
    } catch (e) { /* keep server text */ }
  });

  // Mobile menu.
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
  }
  if (btn && menu) {
    menu.inert = true;
    btn.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1040) setMenu(false); });
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

  // Copy email on desktop; let the mailto open a mail app on phones.
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      if (coarse || !(navigator.clipboard && window.isSecureContext)) return;
      e.preventDefault();
      var label = b.querySelector('.copy-label');
      navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function () {
        if (!label) return;
        var old = label.textContent;
        label.textContent = 'Copied to clipboard';
        setTimeout(function () { label.textContent = old; }, 1800);
      }, function () { location.href = b.getAttribute('href'); });
    });
  });

  // Annotation pins <-> notes: hovering or tapping either lights up both.
  document.querySelectorAll('.case').forEach(function (c) {
    var pins = c.querySelectorAll('.pin'), notes = c.querySelectorAll('.note');
    function set(n) {
      pins.forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-n') === n); });
      notes.forEach(function (x) { x.classList.toggle('is-active', x.getAttribute('data-n') === n); });
    }
    pins.forEach(function (p) {
      p.addEventListener('mouseenter', function () { set(p.getAttribute('data-n')); });
      p.addEventListener('focus', function () { set(p.getAttribute('data-n')); });
      p.addEventListener('click', function () {
        set(p.getAttribute('data-n'));
        var note = c.querySelector('.note[data-n="' + p.getAttribute('data-n') + '"]');
        if (note && window.innerWidth < 1000) note.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      });
    });
    notes.forEach(function (x) { x.addEventListener('mouseenter', function () { set(x.getAttribute('data-n')); }); });
    c.addEventListener('mouseleave', function () { set(null); });
  });

  var gallery = document.querySelector('.gallery');
  var track = gallery && gallery.querySelector('.track');
  var bar = document.querySelector('.gallery-progress i');
  function nativeGallery() {
    if (!gallery) return;
    gallery.classList.add('is-native');
    var upd = function () {
      var max = gallery.scrollWidth - gallery.clientWidth;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? gallery.scrollLeft / max : 0) + ')';
    };
    gallery.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  if (!motion) {
    document.querySelectorAll('.hl, .sec-top, .case, .day').forEach(function (el) { el.classList.add('is-in'); });
    nativeGallery();
    return;
  }

  function inView(selector, start, cb) {
    document.querySelectorAll(selector).forEach(function (el) {
      ST.create({ trigger: el, start: start || 'top 85%', once: true, onEnter: function () { cb ? cb(el) : el.classList.add('is-in'); } });
    });
  }
  inView('.sec-top', 'top 90%');
  inView('.case', 'top 70%');

  // Highlighter strokes run after motion.js has split the headlines into lines.
  function armHighlights() {
    document.querySelectorAll('.hl').forEach(function (el, i) {
      var inHero = !!el.closest('.hero');
      if (inHero) { setTimeout(function () { el.classList.add('is-in'); }, 850 + i * 160); return; }
      ST.create({ trigger: el, start: 'top 80%', once: true, onEnter: function () { setTimeout(function () { el.classList.add('is-in'); }, 350); } });
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(armHighlights, 60); });
  else armHighlights();

  // Horizontal gallery: pinned and scrubbed on desktop, native swipe elsewhere.
  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px) and (hover: hover) and (pointer: fine)', function () {
    if (!gallery || !track) return;
    var sec = gallery.closest('section');
    var dist = function () { return Math.max(0, track.scrollWidth - document.documentElement.clientWidth); };
    var tween = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: sec, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
        start: function () { return sec.offsetHeight > window.innerHeight ? 'bottom bottom' : 'top top'; },
        end: function () { return '+=' + dist(); },
        onUpdate: function (st) { if (bar) bar.style.transform = 'scaleX(' + st.progress + ')'; }
      }
    });
    return function () { tween.scrollTrigger && tween.scrollTrigger.kill(); gsap.set(track, { x: 0 }); };
  });
  mm.add('(max-width: 900px), (hover: none), (pointer: coarse)', function () { nativeGallery(); });

  // Process: the navy line draws down the timeline, each day lights up as it's reached.
  var tl = document.querySelector('.timeline');
  if (tl) {
    gsap.to('.timeline-progress', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 65%', end: 'bottom 65%', scrub: 0.4 } });
    inView('.day', 'top 65%');
  }

  // Images in the gallery and cases change layout height as they load.
  window.addEventListener('load', function () { ST.refresh(); });
})();
