// static/js/code-examples.js
(function () {
  const ROOT = '#code-examples-carousel';

  function playActiveVideo() {
    document.querySelectorAll(ROOT + ' video').forEach(v => { try { v.pause(); } catch(_){}; });
    const active = document.querySelector(ROOT + ' .is-current, ' + ROOT + ' .is-active');
    if (!active) return;
    const vid = active.querySelector('video');
    if (vid) {
      vid.muted = true; vid.loop = true; vid.playsInline = true;
      Promise.resolve(vid.play()).catch(() => {});
    }
  }

  function getInstance() {
    if (!window.bulmaCarousel) return null;
    try {
      const list = bulmaCarousel._carousels || [];
      const found = list.find(c => c && c.element && ('#' + c.element.id) === ROOT);
      if (found) return found;
    } catch (_) {}
    // Fallback: attach only this one with 1-per-view
    const arr = bulmaCarousel.attach(ROOT, {
      slidesToShow: 1,
      slidesToScroll: 1,
      navigation: true,
      pagination: true,
      autoplay: false,
      infinite: true,     // keep right arrow active on last slide
      pauseOnHover: true
    });
    return Array.isArray(arr) ? arr[0] : arr;
  }

  document.addEventListener('DOMContentLoaded', function () {
    const root = document.querySelector(ROOT);
    if (!root) return;

    const instance = getInstance();
    if (!instance) return;

    // Keep the visible slide’s video playing like a GIF
    if (typeof instance.on === 'function') {
      instance.on('ready', playActiveVideo);
      instance.on('after:show', playActiveVideo);
    }
    playActiveVideo();

    // Bind nav buttons explicitly for this build (uses `slider-navigation-*`)
    const btnPrev = root.querySelector('.slider-navigation-previous');
    const btnNext = root.querySelector('.slider-navigation-next');

    if (btnPrev) {
      ['click','touchend'].forEach(ev =>
        btnPrev.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); if (instance.previous) instance.previous(); })
      );
    }
    if (btnNext) {
      ['click','touchend'].forEach(ev =>
        btnNext.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); if (instance.next) instance.next(); })
      );
    }

    // Copy-to-clipboard buttons (unchanged)
    document.querySelectorAll('.copy-cmd').forEach(btn => {
      btn.addEventListener('click', () => {
        const sel = btn.getAttribute('data-copy');
        const el  = document.querySelector(sel);
        if (!el) return;
        const text = el.innerText.trim();
        navigator.clipboard.writeText(text).then(() => {
          const prev = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-check"></i>&nbsp;Copied';
          btn.classList.add('is-success');
          setTimeout(() => { btn.innerHTML = prev; btn.classList.remove('is-success'); }, 1400);
        });
      });
    });
  });
})();
