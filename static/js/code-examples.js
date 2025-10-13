// static/js/code-examples.js
(function () {
  const ROOT = '#code-examples-carousel';

  function playActiveVideo() {
    // Pause every video in the carousel…
    document.querySelectorAll(ROOT + ' video').forEach(v => {
      try { v.pause(); } catch (_) {}
    });

    // …then play the one in the active slide (works with both class names)
    const active = document.querySelector(
      ROOT + ' .is-current, ' +
      ROOT + ' .is-active, ' +
      ROOT + ' .carousel-item.is-active'
    );
    if (!active) return;

    const vid = active.querySelector('video');
    if (vid) {
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;

      // If a third-party listener tries to advance on "ended", stop it.
      vid.addEventListener('ended', function onEnded(e) {
        e.stopImmediatePropagation();
        e.stopPropagation();
        try { this.currentTime = 0; } catch (_) {}
        Promise.resolve(this.play()).catch(() => {});
      }, { once: true });

      Promise.resolve(vid.play()).catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.bulmaCarousel) return;

    // Find the instance created in index.js for this specific element
    let instance = null;
    try {
      const list = bulmaCarousel._carousels || [];
      instance = list.find(c => c && c.element && c.element.id === 'code-examples-carousel') || null;
    } catch (_) {}

    if (!instance) return; // index.js must attach it; we don't attach here

    if (typeof instance.on === 'function') {
      instance.on('ready',      playActiveVideo);
      instance.on('after:show', playActiveVideo);
    }
    playActiveVideo();
  });
})();
