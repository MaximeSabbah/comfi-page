window.HELP_IMPROVE_VIDEOJS = false;

// More Works Dropdown Functionality
function toggleMoreWorks() {
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    } else {
        dropdown.classList.add('show');
        button.classList.add('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const container = document.querySelector('.more-works-container');
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    
    if (container && !container.contains(event.target)) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Close dropdown on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const dropdown = document.getElementById('moreWorksDropdown');
        const button = document.querySelector('.more-works-btn');
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Copy BibTeX to clipboard
function copyBibTeX() {
    const bibtexElement = document.getElementById('bibtex-code');
    const button = document.querySelector('.copy-bibtex-btn');
    const copyText = button.querySelector('.copy-text');
    
    if (bibtexElement) {
        navigator.clipboard.writeText(bibtexElement.textContent).then(function() {
            // Success feedback
            button.classList.add('copied');
            copyText.textContent = 'Cop';
            
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        }).catch(function(err) {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = bibtexElement.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            button.classList.add('copied');
            copyText.textContent = 'Cop';
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        });
    }
}

// Scroll to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

// Video carousel autoplay when in view
function setupVideoCarouselAutoplay() {
    const carouselVideos = document.querySelectorAll('.results-carousel video');
    
    if (carouselVideos.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                // Video is in view, play it
                video.play().catch(e => {
                    // Autoplay failed, probably due to browser policy
                    console.log('Autoplay prevented:', e);
                });
            } else {
                // Video is out of view, pause it
                video.pause();
            }
        });
    }, {
        threshold: 0.5 // Trigger when 50% of the video is visible
    });
    
    carouselVideos.forEach(video => {
        observer.observe(video);
    });
}

// --- keep the rest of index.js above unchanged ---

// --- Bulma carousel init -----------------------------------------------------
$(document).ready(function () {
  if (!window.bulmaCarousel) {
    setupVideoCarouselAutoplay();
    return;
  }

  // If you have other carousels on the page, init them globally …
  bulmaCarousel.attach('.carousel:not(#code-examples-carousel)', {
    slidesToScroll: 1,
    slidesToShow:   1,
    loop:           true,
    infinite:       true,
    autoplay:       true,
    autoplaySpeed:  5000
  });

  // … and init the **code examples** carousel explicitly (no autoplay).
  bulmaCarousel.attach('#code-examples-carousel', {
    slidesToScroll: 1,
    slidesToShow:   1,
    loop:           true,
    infinite:       true,
    autoplay:       false,
    navigation:     true,
    pagination:     true,
    pauseOnHover:   true
  });

  // Make sure the previous/next buttons control the **correct** instance
  const root = document.getElementById('code-examples-carousel');
  if (root) {
    let instance = null;
    try {
      const list = bulmaCarousel._carousels || [];
      instance = list.find(c => c && c.element === root) || null;
      // If multiple instances somehow attached, keep first and destroy others
      const dups = list.filter(c => c && c.element === root);
      if (dups.length > 1) {
        for (let i = 1; i < dups.length; i++) {
          try { dups[i].destroy(); } catch (_) {}
        }
        instance = dups[0];
      }
    } catch (_) {}

    if (instance) {
      const prevBtn = root.querySelector('.slider-navigation-previous');
      const nextBtn = root.querySelector('.slider-navigation-next');
      const bind = (el, fn) => {
        if (!el || typeof fn !== 'function') return;
        el.style.pointerEvents = 'auto';
        el.style.zIndex = '5';
        el.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          try { fn.call(instance); } catch (_) {}
        }, { capture: true });
      };
      bind(prevBtn, instance.previous);
      bind(nextBtn, instance.next);

      // Ensure no surprise auto-advance
      if (instance.options) {
        instance.options.autoplay = false;
        instance.options.pauseOnHover = true;
      }
    }
  }

  if (window.bulmaSlider) bulmaSlider.attach();
  setupVideoCarouselAutoplay();
});