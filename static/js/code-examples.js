// static/js/code-examples.js
(function () {
  // Init only this carousel (safer than auto-selecting all)
  document.addEventListener('DOMContentLoaded', function () {
    if (window.bulmaCarousel) {
      bulmaCarousel.attach('#code-carousel', {
      slidesToShow: 1,
      slidesToScroll: 1,
      loop: true,
      navigation: true,
      pagination: true,
      autoplay: false,
      pauseOnHover: true,
      // belt-and-suspenders: never switch to multiple slides on wide screens
      breakpoints: [
        { changePoint: 0,    slidesToShow: 1, slidesToScroll: 1 },
        { changePoint: 769,  slidesToShow: 1, slidesToScroll: 1 },
        { changePoint: 1024, slidesToShow: 1, slidesToScroll: 1 }
      ]
    });

    }

    // Copy buttons
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
