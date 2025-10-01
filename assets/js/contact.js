/*
=================================================
Crimson Crown - Contact Page Script (v2.0 - Vercel)
=================================================
This script handles the logic for the public contact form. It:
1. Intercepts the form submission to prevent a page reload.
2. Shows a "sending" state to the user for better feedback.
3. Sends the form data to the secure 'sendContactEmail' action in the API router.
4. Displays success or error messages to the user.
5. Resets the form after a successful submission.
*/

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    
    // Safety check: only run the script if the contact form exists on the page.
    if (!contactForm) {
        return;
    }

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalButtonHTML = submitButton.innerHTML; // Store the original button content.

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default browser action of reloading the page.

        // --- UI Feedback: Start Sending ---
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...`;

        // Create a data object with all the values from the form fields.
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value,
        };

        try {
            // Send the form data to our secure API router with the correct action parameter.
            const response = await fetch('/api/router?action=sendContactEmail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            
            if (!response.ok) {
                throw new Error('Server responded with an error.');
            }
            
            // --- UI Feedback: Success ---
            submitButton.classList.remove('btn-brand');
            submitButton.classList.add('btn-success');
            submitButton.innerHTML = '<i class="fas fa-check-circle me-2"></i> Message Sent!';

            // After a 3-second delay, reset the form and the button to their original state.
            setTimeout(() => {
                contactForm.reset();
                submitButton.disabled = false;
                submitButton.classList.remove('btn-success');
                submitButton.classList.add('btn-brand');
                submitButton.innerHTML = originalButtonHTML;
            }, 3000);

        } catch (error) {
            console.error('Contact form submission error:', error);
            // --- UI Feedback: Error ---
            submitButton.classList.remove('btn-brand');
            submitButton.classList.add('btn-danger');
            submitButton.innerHTML = 'Error! Try Again.';
            
            // After a 3-second delay, reset the button to allow the user to try again.
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.classList.remove('btn-danger');
                submitButton.classList.add('btn-brand');
                submitButton.innerHTML = originalButtonHTML;
            }, 3000);
        }
    });
});