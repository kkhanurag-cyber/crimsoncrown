/*
=================================================
Crimson Crown - Clan Registration Script (v2.1 - Final)
=================================================
This script handles the logic for the clan registration page. It:
1. Checks if a user is logged in. If not, it shows a "Login" prompt.
2. Toggles between file upload and link pasting for the logo.
3. Handles the image upload process by sending the file to the Vercel Blob endpoint.
4. Intercepts the main form submission and validates the logo input.
5. Sends all clan data to the secure 'createClan' backend function.
6. Saves the new, updated JWT token upon success to reflect the user's new clan status.
7. Provides UI feedback to the user (loading states, success/error messages).
*/

// This function runs as soon as the basic HTML document is loaded.
document.addEventListener('DOMContentLoaded', () => {
    // Get the user's login token from local storage.
    const token = localStorage.getItem('jwt_token');
    const loginPrompt = document.getElementById('login-prompt');
    const registrationContainer = document.getElementById('registration-container');
    
    // Logic to show/hide content based on login status.
    if (!token) {
        // If the user is not logged in, show the message asking them to log in.
        loginPrompt.classList.remove('d-none');
        registrationContainer.classList.add('d-none');
        return; // Stop the rest of the script from running.
    }
    
    // If the user is logged in, hide the login prompt and show the registration form.
    loginPrompt.classList.add('d-none');
    registrationContainer.classList.remove('d-none');
    
    // Attach event listeners to the form elements.
    const clanForm = document.getElementById('clan-registration-form');
    const logoUploader = document.getElementById('clanLogoUpload');
    
    clanForm.addEventListener('submit', handleClanRegistration);
    logoUploader.addEventListener('change', handleImageUpload);
    
    // Add event listeners for the new radio buttons to toggle the input methods.
    document.getElementById('logoMethodFile').addEventListener('change', toggleLogoUploadMethod);
    document.getElementById('logoMethodLink').addEventListener('change', toggleLogoUploadMethod);
});

/**
 * Toggles the visibility of the file upload vs. link paste inputs for the clan logo.
 */
function toggleLogoUploadMethod() {
    const useFile = document.getElementById('logoMethodFile').checked;
    // Show or hide the file upload group based on the radio button selection.
    document.getElementById('logo-file-upload-group').classList.toggle('d-none', !useFile);
    // Show or hide the link input group based on the radio button selection.
    document.getElementById('logo-link-upload-group').classList.toggle('d-none', useFile);
    
    // Clear all related inputs when switching to prevent confusion.
    document.getElementById('clanLogo').value = ''; // Hidden input for the final URL
    document.getElementById('clanLogoUrl').value = ''; // The URL input field
    document.getElementById('clanLogoUpload').value = ''; // The file input field
    document.getElementById('form-status').textContent = ''; // The status message
}

/**
 * Handles the file selection for the clan logo. Uploads the image to Vercel Blob.
 * @param {Event} event - The file input change event.
 */
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formStatus = document.getElementById('form-status');
    formStatus.textContent = 'Uploading logo, please wait...';
    formStatus.className = 'mt-3 text-warning';

    try {
        // Send the file to our public Vercel Blob upload function.
        // The filename is passed as a query parameter to keep it clean.
        const response = await fetch(`/api/upload?filename=clan-logo-${Date.now()}-${file.name}`, {
            method: 'POST',
            body: file, // The raw file is sent in the body.
        });

        if (!response.ok) {
            throw new Error('Image upload failed on the server.');
        }
        
        const { url } = await response.json();
        
        // Store the returned Vercel Blob URL in a hidden input field in the form.
        document.getElementById('clanLogo').value = url;
        formStatus.textContent = '✅ Logo uploaded successfully!';
        formStatus.className = 'mt-3 text-success';
    } catch (error) {
        formStatus.textContent = `❌ Logo upload failed: ${error.message}`;
        formStatus.className = 'mt-3 text-danger';
    }
}

/**
 * Handles the final submission of the clan registration form.
 * @param {Event} event - The form submission event.
 */
async function handleClanRegistration(event) {
    event.preventDefault(); // Prevent default page reload.
    const token = localStorage.getItem('jwt_token');
    const useFile = document.getElementById('logoMethodFile').checked;
    const formStatus = document.getElementById('form-status');
    let finalLogoUrl;

    // Determine which input method is being used and get the final URL.
    if (useFile) {
        // If the user chose to upload a file, the URL will be in the hidden input.
        finalLogoUrl = document.getElementById('clanLogo').value;
        if (!finalLogoUrl) {
            alert('Please upload a clan logo and wait for it to finish.');
            return;
        }
    } else {
        // If the user chose to paste a link, get the URL directly from the visible input.
        finalLogoUrl = document.getElementById('clanLogoUrl').value;
        if (!finalLogoUrl) {
            alert('Please paste a valid URL for the clan logo.');
            return;
        }
    }
    
    // UI feedback elements.
    const submitButton = document.getElementById('submit-button');
    const buttonText = document.getElementById('submit-button-text');
    const buttonSpinner = document.getElementById('submit-spinner');
    
    // Disable button and show spinner for loading state.
    submitButton.disabled = true;
    buttonText.textContent = 'Creating Clan...';
    buttonSpinner.classList.remove('d-none');
    formStatus.textContent = '';
    formStatus.className = 'mt-3';

    // Collect all data from the form.
    const clanData = {
        clanName: document.getElementById('clanName').value,
        clanTag: document.getElementById('clanTag').value,
        clanLogo: finalLogoUrl, // Use the final URL from either method.
        roster: document.getElementById('roster').value,
    };

    try {
        // Send the data to the secure 'createClan' action in the API router.
        const response = await fetch('/api/router?action=createClan', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clanData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create the clan.');
        }
        
        // --- THIS IS THE CRITICAL FIX for the "My Clan" page bug ---
        // If the backend sent back a new, updated token, save it to localStorage.
        // This instantly updates the user's session with their new clan information.
        if (result.token) {
            localStorage.setItem('jwt_token', result.token);
        }

        // Handle success.
        formStatus.textContent = '✅ Clan created successfully! Redirecting...';
        formStatus.classList.add('text-success');
        
        // Redirect the new clan leader to their new "My Clan" page after a short delay.
        setTimeout(() => {
            window.location.href = `/my-clan.html`;
        }, 2000);

    } catch (error) {
        // Handle errors.
        formStatus.textContent = `❌ Error: ${error.message}`;
        formStatus.classList.add('text-danger');
        
        // Re-enable the button so the user can try again.
        submitButton.disabled = false;
        buttonText.textContent = 'Create Clan';
        buttonSpinner.classList.add('d-none');
    }
}