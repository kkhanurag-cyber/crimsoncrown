/*
=================================================
Crimson Crown - Contact Page Script (v2.1 - Final)
=================================================
This script handles the logic for the public contact form. It:
1. Intercepts the form submission to prevent a page reload.
2. Shows a "sending" state to the user for better feedback.
3. Sends the form data to the secure 'sendContactEmail' action in the API router.
   The backend then saves the message to Google Sheets and sends an email notification.
4. Displays clear success or error messages to the user.
5. Resets the form after a successful submission.
*/

// The main function runs as soon as the basic HTML document structure has been loaded.
document.addEventListener('DOMContentLoaded', () => {
    // Get a reference to the contact form element.
    const contactForm = document.getElementById('contact-form');
    
    // Safety check: only run the script if the contact form exists on the current page.
    if (!contactForm) {
        return;
    }

    // Get a reference to the submit button and store its original HTML content.
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalButtonHTML = submitButton.innerHTML; 

    // Add an event listener for the 'submit' event on the form.
    contactForm.addEventListener('submit', async (e) => {
        // Prevent the default browser action of reloading the page on form submission.
        e.preventDefault(); 

        // --- UI Feedback: Start Sending ---
        // Disable the button to prevent multiple submissions while one is in progress.
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
            // Send the form data to our secure API router, specifying the 'sendContactEmail' action.
            const response = await fetch('/api/router?action=sendContactEmail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            
            // Check if the server responded with an error status (e.g., 500).
            if (!response.ok) {
                throw new Error('Server responded with an error.');
            }
            
            // --- UI Feedback: Success ---
            // Change the button style to green to indicate success.
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
            // Change the button style to red to indicate an error.
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