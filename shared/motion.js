/* Shared motion layer: Lenis smooth scroll + GSAP ScrollTrigger reveals.
 *
 * Markup API
 *   data-reveal              fade + 24px rise when scrolled into view
 *   data-reveal-stagger      on a parent: reveal its [data-reveal] children in sequence
 *   data-split="lines|words" headline split into masked lines that slide up
 *   data-split-load          split headline animates on load instead of on scroll
 *   data-parallax="0.15"     subtle scroll parallax (use once per page)
 *   data-count="143"         count up from 0 (data-decimals, data-prefix, data-suffix)
 *   data-marquee             seamless looping row (children are duplicated)
 *   data-clock="Asia/Kolkata" live local time, e.g. 12:43 AM
 *   data-year                current year
 *
 * Off switches: prefers-reduced-motion, ?static=1 (for full-page captures), or GSAP failing to load.
 * In every off case the page renders fully visible and static.
 */
(function () {
  var root = document.documentElement;
  var params = new URLSearchParams(location.search);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('static');

  // Utilities that are useful with or without motion.
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  var clocks = document.querySelectorAll('[data-clock]');
  function tick() {
    clocks.forEach(function (el) {
      try {
        el.textContent = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: el.dataset.clock }).format(new Date());
      } catch (e) { /* unsupported zone: keep server text */ }
    });
  }
  if (clocks.length) { tick(); setInterval(tick, 15000); }

  document.querySelectorAll('[data-marquee]').forEach(function (m) {
    var track = m.querySelector('.marquee-track');
    if (!track || track.dataset.cloned) return;
    Array.prototype.slice.call(track.children).forEach(function (c) {
      var clone = c.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('a,button').forEach(function (f) { f.setAttribute('tabindex', '-1'); });
      track.appendChild(clone);
    });
    track.dataset.cloned = '1';
  });

  if (reduce || !window.gsap || !window.ScrollTrigger) { root.classList.add('motion-off'); return; }
  root.classList.add('motion-on');

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);
  var ST = window.ScrollTrigger;
  var EASE = 'power3.out';

  // Smooth scroll, driven by GSAP's ticker so ScrollTrigger and Lenis agree on every frame.
  var lenis = null;
  if (window.Lenis && !params.has('nolenis')) {
    lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 1, touchMultiplier: 1.4 });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var el = document.getElementById(id.slice(1));
    if (!el) return;
    e.preventDefault();
    var off = -(parseInt(getComputedStyle(root).getPropertyValue('--anchor-offset'), 10) || 72);
    if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.2 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + off, behavior: 'smooth' });
    history.replaceState(null, '', id);
  });

  // Reveals. gsap.to from the CSS-hidden state; once:true so a jump-scroll past a
  // section still fires it (ScrollTrigger enters every trigger it passes).
  function reveal(el, delay) {
    gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: EASE, delay: delay || 0, overwrite: 'auto',
      onComplete: function () { el.style.transform = ''; } });
  }
  var staggered = new Set();
  document.querySelectorAll('[data-reveal-stagger]').forEach(function (group) {
    var kids = group.querySelectorAll('[data-reveal]');
    kids.forEach(function (k) { staggered.add(k); });
    ST.create({ trigger: group, start: 'top 86%', once: true, onEnter: function () {
      kids.forEach(function (k, i) { reveal(k, i * 0.08); });
    } });
  });
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    if (staggered.has(el)) return;
    ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () { reveal(el); } });
  });

  // Split headlines: masked lines slide up.
  function splitHeadline(el) {
    if (!window.SplitText) { el.classList.add('is-split'); return; }
    var type = el.dataset.split === 'words' ? 'words,lines' : 'lines';
    var split = window.SplitText.create(el, { type: type, mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: function (self) {
        el.classList.add('is-split');
        var targets = el.dataset.split === 'words' ? self.words : self.lines;
        var tween = gsap.from(targets, { yPercent: 110, duration: 0.95, ease: 'power4.out', stagger: 0.07, paused: true });
        if (el.hasAttribute('data-split-load')) gsap.delayedCall(0.15, function () { tween.play(); });
        else ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { tween.play(); } });
        return tween;
      } });
    return split;
  }
  var splitEls = document.querySelectorAll('[data-split]');
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { splitEls.forEach(splitHeadline); ST.refresh(); });
  } else splitEls.forEach(splitHeadline);

  document.querySelectorAll('[data-parallax]').forEach(function (el) {
    var amt = parseFloat(el.dataset.parallax) || 0.12;
    gsap.fromTo(el, { yPercent: amt * 50 }, { yPercent: -amt * 50, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  document.querySelectorAll('[data-count]').forEach(function (el) {
    var to = parseFloat(el.dataset.count);
    var dec = parseInt(el.dataset.decimals || '0', 10);
    var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    var fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    var obj = { v: 0 };
    ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
      gsap.to(obj, { v: to, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = pre + fmt.format(obj.v) + suf; } });
    } });
  });

  // Layout shifts from late fonts/images move trigger positions; re-measure once settled.
  window.addEventListener('load', function () { ST.refresh(); });

  // Safety net: anything still hidden that is on screen after 3.5s gets shown.
  setTimeout(function () {
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (getComputedStyle(el).opacity === '0' && r.top < window.innerHeight) reveal(el);
    });
    document.querySelectorAll('[data-split]').forEach(function (el) { el.classList.add('is-split'); });
  }, 3500);
})();
