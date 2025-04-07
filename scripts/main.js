// Main JavaScript file for the CodeIt platform

document.addEventListener('DOMContentLoaded', function() {
    // Add animation classes to elements as they enter the viewport
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.feature-cards .card');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (elementPosition < screenPosition) {
                element.classList.add('animate');
            }
        });
    };
    
    // Call once when page loads
    animateOnScroll();
    
    // Call on scroll
    window.addEventListener('scroll', animateOnScroll);
    
    // Add hover effect to language icons
    const languageElements = document.querySelectorAll('.language');
    languageElements.forEach(lang => {
        lang.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = 'var(--shadow-md)';
            this.style.transition = 'all 0.3s ease';
        });
        
        lang.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
}); 