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
      // If controls are present, autoplay still works when muted
      Promise.resolve(vid.play()).catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.bulmaCarousel) return;

    // Attach ONLY to our feature carousel
    const instances = bulmaCarousel.attach('#code-carousel', {
      slidesToShow: 1,
      slidesToScroll: 1,
      loop: true,
      navigation: true,
      pagination: true,
      autoplay: false,      // we manually play the slide's video
      pauseOnHover: true,
      // belt-and-suspenders: never switch to multiple slides on wider screens
      breakpoints: [
        { changePoint: 0,    slidesToShow: 1, slidesToScroll: 1 },
        { changePoint: 769,  slidesToShow: 1, slidesToScroll: 1 },
        { changePoint: 1024, slidesToShow: 1, slidesToScroll: 1 }
      ]
    });

    const carousel = Array.isArray(instances) ? instances[0] : instances;

    // When the carousel is ready or slides change, (re)play the visible video
    if (carousel && typeof carousel.on === 'function') {
      carousel.on('ready', playActiveVideo);
      carousel.on('after:show', playActiveVideo);
    }
    // Safety: trigger once after DOM ready
    playActiveVideo();

    // Copy-to-clipboard buttons
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
