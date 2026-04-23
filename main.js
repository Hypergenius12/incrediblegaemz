document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.style.background = 'rgba(10, 11, 16, 0.95)';
            navbar.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            navbar.style.backdropFilter = 'blur(10px)';
        } else {
            navbar.style.background = 'transparent';
            navbar.style.borderBottom = 'none';
            navbar.style.backdropFilter = 'none';
        }
    });

    let textVelX = 0;
    let textVelY = 0;
    let lastClientX = 0;
    let lastClientY = 0;

    document.addEventListener('mousemove', (e) => {
        textVelX = e.clientX - lastClientX;
        textVelY = e.clientY - lastClientY;
        lastClientX = e.clientX;
        lastClientY = e.clientY;
    });

    let smoothedTextVelX = 0;
    let smoothedTextVelY = 0;

    function animateTextWiggle() {
        smoothedTextVelX += (textVelX - smoothedTextVelX) * 0.1;
        smoothedTextVelY += (textVelY - smoothedTextVelY) * 0.1;
        
        textVelX *= 0.5;
        textVelY *= 0.5;
        
        const speed = Math.sqrt(smoothedTextVelX**2 + smoothedTextVelY**2);
        const spans = document.querySelectorAll('.interactive-text.shine-active .word');

        if(speed > 0.1) {
            spans.forEach(span => {
                const rect = span.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                const dx = lastClientX - centerX;
                const dy = lastClientY - centerY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 150) {
                    const force = (150 - dist) / 150;
                    const wx = smoothedTextVelX * force * parseFloat(span.dataset.wiggleX) * 0.15;
                    const wy = smoothedTextVelY * force * parseFloat(span.dataset.wiggleY) * 0.15;
                    span.style.setProperty('--wiggle-x', `${wx}px`);
                    span.style.setProperty('--wiggle-y', `${wy}px`);
                } else {
                    span.style.setProperty('--wiggle-x', `0px`);
                    span.style.setProperty('--wiggle-y', `0px`);
                }
            });
        } else {
            spans.forEach(span => {
                span.style.setProperty('--wiggle-x', `0px`);
                span.style.setProperty('--wiggle-y', `0px`);
            });
        }
        
        requestAnimationFrame(animateTextWiggle);
    }
    requestAnimationFrame(animateTextWiggle);

    function splitTextIntoSpans(elements, isLeafFall = false) {
        elements.forEach(el => {
            if(el.dataset.originalText) return; 

            el.dataset.originalText = el.innerText.trim(); 
            const words = el.dataset.originalText.split(/\s+/);
            el.innerHTML = ''; 
            
            let maxDelay = 0;

            words.forEach((word, index) => {
                const span = document.createElement('span');
                span.className = 'word';
                
                span.dataset.wiggleX = (Math.random() - 0.5) * 2.5; 
                span.dataset.wiggleY = (Math.random() - 0.5) * 2.5;
                
                if (isLeafFall) {
                    const baseDelay = index * 0.02;
                    const randomScatter = Math.random() * 0.8; 
                    const totalDelay = baseDelay + randomScatter;
                    
                    span.style.animationDelay = `${totalDelay}s`;
                    
                    if (totalDelay > maxDelay) {
                        maxDelay = totalDelay;
                    }
                    
                    const randomRot = (Math.random() - 0.5) * 5;
                    span.style.setProperty('--random-rot', `${randomRot}deg`);
                } else {
                    const delay = index * 0.08;
                    span.style.animationDelay = `${delay}s`; 
                    
                    if (delay > maxDelay) {
                        maxDelay = delay;
                    }
                }
                
                span.innerText = word;
                el.appendChild(span);
                el.appendChild(document.createTextNode(' '));
            });
            
            const animDuration = isLeafFall ? 1500 : 800;
            el.dataset.totalAnimTime = Math.ceil((maxDelay * 1000) + animDuration + 200);
        });
    }

    const bodyElements = document.querySelectorAll('.body-spin');
    splitTextIntoSpans(bodyElements, true);

    const headerElements = document.querySelectorAll('.header-load');
    splitTextIntoSpans(headerElements, false);

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                
                const waitTime = parseInt(entry.target.dataset.totalAnimTime) || 2200;
                
                setTimeout(() => {
                    if (entry.target.classList.contains('body-spin')) {
                        entry.target.classList.add('shine-active');
                    }
                }, waitTime); 
                
                observer.unobserve(entry.target); 
            }
        });
    }, { 
        threshold: 0.1, 
        rootMargin: '50px' 
    }); 

    bodyElements.forEach(el => observer.observe(el));
    headerElements.forEach(el => observer.observe(el));

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    const contactBtn = document.getElementById('contact-email-btn');
    const copyToast = document.getElementById('copy-toast');

    if (contactBtn && copyToast) {
        contactBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            
            navigator.clipboard.writeText('incrediblegaemz@gmail.com').then(() => {
                copyToast.classList.add('show');
                
                setTimeout(() => {
                    copyToast.classList.remove('show');
                }, 2500);
            }).catch(err => {
                console.error(err);
            });
        });
    }
});
