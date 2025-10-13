// static/js/code-examples.js
(function () {
  const ROOT = '#code-examples-carousel';

  function keepLooping(video) {
    if (!video) return;
    video.muted = true; video.loop = true; video.playsInline = true;
    // If loop is ignored by a template listener, force-loop here:
    video.addEventListener('ended', function onEnded(e) {
      e.stopImmediatePropagation();  // prevent any template 'ended' listener
      e.stopPropagation();
      try { this.currentTime = 0; } catch(_) {}
      Promise.resolve(this.play()).catch(() => {});
    });
    Promise.resolve(video.play()).catch(() => {});
  }

  function playActiveVideo() {
    document.querySelectorAll(ROOT + ' video').forEach(v => { try { v.pause(); } catch(_) {} });
    const active = document.querySelector(
      ROOT + ' .is-current, ' + ROOT + ' .is-active, ' + ROOT + ' .carousel-item.is-active'
    );
    if (!active) return;
    keepLooping(active.querySelector('video'));
  }

  function getInstance() {
    if (!window.bulmaCarousel) return null;
    try {
      const list = bulmaCarousel._carousels || [];
      const found = list.find(c => c && c.element && ('#' + c.element.id) === ROOT);
      if (found) return found;
    } catch (_) {}
    const arr = bulmaCarousel.attach(ROOT, {
      slidesToShow: 1, slidesToScroll: 1,
      navigation: true, pagination: true,
      autoplay: false, infinite: true, pauseOnHover: true
    });
    return Array.isArray(arr) ? arr[0] : arr;
  }

  document.addEventListener('DOMContentLoaded', function () {
    const root = document.querySelector(ROOT);
    if (!root) return;

    const instance = getInstance();
    if (!instance) return;

    if (typeof instance.on === 'function') {
      instance.on('ready', playActiveVideo);
      instance.on('after:show', playActiveVideo);
    }
    playActiveVideo(); // first paint

    // Copy buttons (unchanged)
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
