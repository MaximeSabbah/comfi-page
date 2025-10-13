// static/js/code-examples.js
(function () {
  function playActiveVideo() {
    // pause all videos in our carousel
    document.querySelectorAll('#code-carousel video').forEach(v => {
      try { v.pause(); } catch (_) {}
    });
    // play the active slide's video
    const active = document.querySelector('#code-carousel .is-current, #code-carousel .is-active');
    if (!active) return;
    const vid = active.querySelector('video');
    if (vid) {
      vid.muted = true;  // required for autoplay in most browsers
      Promise.resolve(vid.play()).catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.bulmaCarousel) return;

    // Try to get the instance the global initializer already created
    let instance = null;
    try {
      const list = bulmaCarousel._carousels || [];
      instance = list.find(c => c && c.element && c.element.id === 'code-carousel') || null;
    } catch (_) {}

    // Fallback: if not found (unlikely), attach just this one with 1-per-view
    if (!instance) {
      const arr = bulmaCarousel.attach('#code-carousel', {
        slidesToShow: 1,
        slidesToScroll: 1,
        navigation: true,
        pagination: true,
        autoplay: false,
        pauseOnHover: true
      });
      instance = Array.isArray(arr) ? arr[0] : arr;
    }

    // (re)play when ready / after show
    if (instance && typeof instance.on === 'function') {
      instance.on('ready', playActiveVideo);
      instance.on('after:show', playActiveVideo);
    }
    // and once after DOM loaded
    playActiveVideo();

    // Copy buttons
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
          setTimeout(() => {
            btn.innerHTML = prev;
            btn.classList.remove('is-success');
          }, 1400);
        });
      });
    });
  });
})();
