document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default form submission

        // Show a "sending" state on the button
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...`;

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value,
        };

        try {
            const response = await fetch('/.netlify/functions/sendContactEmail', {
                method: 'POST',
                body: JSON.stringify(formData),
            });
            
            if (!response.ok) {
                throw new Error('Server responded with an error.');
            }
            
            // Show success message
            submitButton.classList.remove('btn-brand');
            submitButton.classList.add('btn-success');
            submitButton.innerHTML = 'Message Sent!';

            // Reset form and button after a few seconds
            setTimeout(() => {
                contactForm.reset();
                submitButton.disabled = false;
                submitButton.classList.remove('btn-success');
                submitButton.classList.add('btn-brand');
                submitButton.innerHTML = originalButtonText;
            }, 3000);

        } catch (error) {
            console.error('Submission error:', error);
            // Show error message
            submitButton.classList.remove('btn-brand');
            submitButton.classList.add('btn-danger');
            submitButton.innerHTML = 'Error! Try Again.';
            
            // Reset button after a few seconds
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.classList.remove('btn-danger');
                submitButton.classList.add('btn-brand');
                submitButton.innerHTML = originalButtonText;
            }, 3000);
        }
    });
});
