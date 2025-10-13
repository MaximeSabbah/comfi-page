// static/js/code-examples.js
(function () {
  const rootSel = '#code-examples-carousel';

  function playActiveVideo() {
    // pause every video in this carousel
    document.querySelectorAll(rootSel + ' video').forEach(v => {
      try { v.pause(); } catch (_) {}
    });
    // play only the active slide's video
    const active =
      document.querySelector(rootSel + ' .is-current') ||
      document.querySelector(rootSel + ' .is-active');
    if (!active) return;
    const vid = active.querySelector('video');
    if (vid) {
      vid.muted = true;  // required for autoplay
      vid.loop = true;
      vid.playsInline = true;
      Promise.resolve(vid.play()).catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.bulmaCarousel) return;

    // Use the instance created by the site's global init; fallback: attach just this one
    let instance = null;
    try {
      const list = bulmaCarousel._carousels || [];
      instance = list.find(c => c && c.element && c.element.id === 'code-examples-carousel') || null;
    } catch (_) {}

    if (!instance) {
      const arr = bulmaCarousel.attach(rootSel, {
        slidesToShow: 1,
        slidesToScroll: 1,
        navigation: true,
        pagination: true,
        autoplay: false,    // user advances manually
        pauseOnHover: true
      });
      instance = Array.isArray(arr) ? arr[0] : arr;
    }

    // (re)play video on ready / after slide change
    if (instance && typeof instance.on === 'function') {
      instance.on('ready', playActiveVideo);
      instance.on('after:show', playActiveVideo);
    }
    playActiveVideo();

    // Copy buttons
    document.querySelectorAll('.copy-cmd').forEach(btn => {
      btn.addEventListener('click', () => {
        const sel = btn.getAttribute('data-copy');
        const el = document.querySelector(sel);
        if (!el) return;
        const text = el.innerText.trim();
        navigator.clipboard.writeText(text).then(() => {
          const prev = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-check"></i>&nbsp;Copied';
          btn.classList.add('is-success');
          setTimeout(() => {
            btn.innerHTML = prev;
            btn.classList.remove('is-success');
          }, 1400);
        });
      });
    });
  });
})();
