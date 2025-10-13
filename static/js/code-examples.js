// static/js/code-examples.js
(function () {
  function playActiveVideo() {
    // Pause all videos in the code carousel
    document.querySelectorAll('#code-carousel video').forEach(v => {
      try { v.pause(); } catch (_) {}
    });
    // Play the active slide's video (if any)
    const active = document.querySelector('#code-carousel .is-active');
    if (!active) return;
    const vid = active.querySelector('video');
    if (vid) {
      vid.muted = true;               // required for autoplay on most browsers
      Promise.resolve(vid.play()).catch(() => {}); // ignore autoplay promise errors
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.bulmaCarousel) return;

    // If a global initializer already attached to ALL carousels,
    // it likely created a 2-up instance for #code-carousel.
    // Find that instance and destroy it before we re-attach with our own options.
    try {
      const carousels = bulmaCarousel._carousels || [];
      carousels.forEach(c => {
        if (c && c.element && c.element.id === 'code-carousel' && typeof c.destroy === 'function') {
          c.destroy();
        }
      });
    } catch (e) {
      // non-fatal if internals differ
    }

    // Attach ONLY to our feature carousel with 1-per-view (belt & suspenders)
    const instances = bulmaCarousel.attach('#code-carousel', {
      slidesToShow: 1,
      slidesToScroll: 1,
      loop: true,
      navigation: true,
      pagination: true,
      autoplay: false,      // we control the actual <video> playback
      pauseOnHover: true,
      breakpoints: [
        { changePoint: 0,    slidesToShow: 1, slidesToScroll: 1 },
        { changePoint: 769,  slidesToShow: 1, slidesToScroll: 1 },
        { changePoint: 1024, slidesToShow: 1, slidesToScroll: 1 }
      ]
    });

    const carousel = Array.isArray(instances) ? instances[0] : instances;

    // (Re)play the visible video's slide
    const bindPlayback = () => {
      playActiveVideo();
      if (carousel && typeof carousel.on === 'function') {
        carousel.on('ready', playActiveVideo);
        carousel.on('after:show', playActiveVideo);
      }
    };

    // Bind now and once more after load (covers rare timing races)
    bindPlayback();
    window.addEventListener('load', playActiveVideo);

    // Copy buttons (unchanged)
    document.querySelectorAll('.copy-cmd').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetSel = btn.getAttribute('data-copy');
        const el = document.querySelector(targetSel);
        if (!el) return;

        const text = el.innerText.trim();
        navigator.clipboard.writeText(text).then(() => {
          const original = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-check"></i>&nbsp;Copied';
          btn.classList.add('is-success');
          setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.remove('is-success');
          }, 1400);
        });
      });
    });
  });
})();
