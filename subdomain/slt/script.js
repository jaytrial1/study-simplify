// DOM Elements
const header = document.querySelector('header');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const navLinksItems = document.querySelectorAll('.nav-links li');
const testimonialDots = document.querySelectorAll('.dot');
const enrollmentForm = document.getElementById('enrollmentForm');

// Mobile Navigation Toggle
hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Close mobile menu when a nav link is clicked
navLinksItems.forEach(item => {
    item.addEventListener('click', () => {
        if (navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
});

// Scroll Event for Header
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Smooth Scrolling for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    });
});

// Testimonial Slider
let currentTestimonial = 0;
const testimonials = document.querySelectorAll('.testimonial');

function showTestimonial(index) {
    // Hide all testimonials
    testimonials.forEach(testimonial => {
        testimonial.style.display = 'none';
    });
    
    // Remove active class from all dots
    testimonialDots.forEach(dot => {
        dot.classList.remove('active');
    });
    
    // Show current testimonial and activate dot
    testimonials[index].style.display = 'block';
    testimonialDots[index].classList.add('active');
}

// Initialize testimonials
showTestimonial(currentTestimonial);

// Add click event to dots
testimonialDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        currentTestimonial = index;
        showTestimonial(currentTestimonial);
    });
});

// Auto-rotate testimonials
setInterval(() => {
    currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    showTestimonial(currentTestimonial);
}, 5000);

// AI Chat Demo
document.addEventListener('DOMContentLoaded', () => {
    const typingMessage = document.querySelector('.ai-message.typing');
    const chatMessages = document.querySelector('.chat-messages');
    
    if (typingMessage && chatMessages) {
        // Show the typing indicator for 3 seconds
        setTimeout(() => {
            // Create a new AI message
            const aiMessage = document.createElement('div');
            aiMessage.classList.add('ai-message');
            
            // Add the message content
            aiMessage.innerHTML = `
                <p>The light-dependent reactions take place in the thylakoid membrane and convert light energy into chemical energy.</p>
                <p>These reactions produce ATP and NADPH, which are then used in the light-independent reactions (Calvin cycle) to produce glucose.</p>
                <p>In this process, water molecules are split, releasing oxygen as a byproduct.</p>
            `;
            
            // Remove the typing indicator and add the new message
            typingMessage.remove();
            chatMessages.appendChild(aiMessage);
            
            // Scroll to the bottom of the chat
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 3000);
    }
});

// Form Submission
if (enrollmentForm) {
    enrollmentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            course: document.getElementById('course').value,
            message: document.getElementById('message').value
        };
        
        // Here you would normally send this data to your server
        // For demonstration, we'll just show an alert
        alert('Thank you for your enrollment request! We will contact you shortly.');
        
        // Clear the form
        enrollmentForm.reset();
    });
}

// Animation on Scroll - Simple implementation
window.addEventListener('scroll', () => {
    const elements = document.querySelectorAll('.feature, .course-card, .about-content, .contact-content, .ai-feature, .ai-trial, .ai-showcase');
    
    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.3;
        
        if (elementPosition < screenPosition) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
});

// Initialize scroll animations
document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('.feature, .course-card, .about-content, .contact-content, .ai-feature, .ai-trial, .ai-showcase');
    
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'all 0.5s ease-in-out';
    });
    
    // Trigger scroll event once to initialize animations for elements already in viewport
    window.dispatchEvent(new Event('scroll'));
}); 