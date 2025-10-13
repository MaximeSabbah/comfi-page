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

$(document).ready(function() {
    // Global defaults for all carousels (as before)
    var options = {
        slidesToScroll: 1,
        slidesToShow: 1,
        loop: true,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 5000,
    };

    // 1) Attach to all carousels EXCEPT the code-examples one
    bulmaCarousel.attach('.carousel:not(#code-examples-carousel)', options);

    // 2) Attach the code-examples carousel with manual navigation (no autoplay)
    bulmaCarousel.attach('#code-examples-carousel', {
        slidesToScroll: 1,
        slidesToShow: 1,
        loop: true,
        infinite: true,
        autoplay: false,      // <-- user controls only
        navigation: true,
        pagination: true,
        pauseOnHover: true
    });

    bulmaSlider.attach();

    // Keep your IntersectionObserver helper (it only plays/pause videos; harmless)
    setupVideoCarouselAutoplay();
    
    // ---- Fix for code-examples carousel: bind arrows to the correct instance ----
    const root = document.getElementById('code-examples-carousel');
    if (root && window.bulmaCarousel) {
        // Try to find the single instance created for this element
        let instance = null;
        try {
        const list = bulmaCarousel._carousels || [];
        instance = list.find(c => c && c.element === root) || null;
        } catch (_) {}

        // If somehow multiple instances exist, keep the first and destroy the rest
        try {
        const dups = (bulmaCarousel._carousels || []).filter(c => c && c.element === root);
        if (dups.length > 1 && typeof dups[0].destroy === 'function') {
            for (let i = 1; i < dups.length; i++) dups[i].destroy();
            instance = dups[0];
        }
        } catch (_) {}

        if (instance) {
        const prevBtn = root.querySelector('.slider-navigation-previous');
        const nextBtn = root.querySelector('.slider-navigation-next');

        const safeBind = (el, fn) => {
            if (!el) return;
            el.style.pointerEvents = 'auto';
            el.style.zIndex = '5';
            el.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            try { fn.call(instance); } catch (_) {}
            }, { capture: true });
        };

        safeBind(prevBtn, instance.previous);
        safeBind(nextBtn, instance.next);

        // Also make these elements click-through safe
        const track = root.querySelector('.slider-container');
        if (track) track.style.willChange = 'transform';

        // Make sure nothing else auto-advances this carousel
        if (typeof instance.options === 'object') {
            instance.options.autoplay = false;
            instance.options.pauseOnHover = true;
        }
        }
    }
});

