/*
=================================================
Crimson Crown - Contact Page Script
=================================================
This script handles:
1. Intercepting the contact form submission to prevent a page reload.
2. Showing a "sending" state to the user for better feedback.
3. Sending the form data to the secure 'sendContactEmail' backend function.
4. Displaying success or error messages to the user.
5. Resetting the form after a successful submission.
*/

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    
    // Safety check: only run the script if the contact form exists on the page.
    if (!contactForm) {
        return;
    }

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML; // Store the original button content (e.g., "Send Message").

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default browser action of reloading the page on form submission.

        // --- UI Feedback: Start Sending ---
        // Disable the button to prevent multiple submissions.
        submitButton.disabled = true;
        // Change the button text and add a spinner to indicate that something is happening.
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...`;

        // Create a data object with all the values from the form fields.
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value,
        };

        try {
            // Send the form data to our secure serverless function.
            const response = await fetch('/.netlify/functions/sendContactEmail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            
            // Check if the server responded with an error status.
            if (!response.ok) {
                throw new Error('Server responded with an error.');
            }
            
            // --- UI Feedback: Success ---
            // Change the button style to green to indicate success.
            submitButton.classList.remove('btn-brand');
            submitButton.classList.add('btn-success');
            submitButton.innerHTML = 'Message Sent!';

            // After a 3-second delay, reset the form and the button to their original state.
            setTimeout(() => {
                contactForm.reset();
                submitButton.disabled = false;
                submitButton.classList.remove('btn-success');
                submitButton.classList.add('btn-brand');
                submitButton.innerHTML = originalButtonText;
            }, 3000);

        } catch (error) {
            console.error('Contact form submission error:', error);
            // --- UI Feedback: Error ---
            // Change the button style to red to indicate an error.
            submitButton.classList.remove('btn-brand');
            submitButton.classList.add('btn-danger');
            submitButton.innerHTML = 'Error! Try Again.';
            
            // After a 3-second delay, reset the button to allow the user to try again.
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.classList.remove('btn-danger');
                submitButton.classList.add('btn-brand');
                submitButton.innerHTML = originalButtonText;
            }, 3000);
        }
    });
});