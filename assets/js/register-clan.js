/*
=================================================
Crimson Crown - Clan Registration Script (v2.1 - Final)
=================================================
This is the complete and final script for the clan registration page. It handles:
- Checking if a user is logged in. If not, it shows a "Login" prompt.
- Toggling between file upload and link pasting for the logo.
- Handling the image upload process to Vercel Blob.
- Intercepting the main form submission and validating the logo input.
- Sending all clan data to the secure 'createClan' backend function.
- Providing UI feedback to the user (loading states, success/error messages).
*/

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
    document.getElementById('logo-file-upload-group').classList.toggle('d-none', !useFile);
    document.getElementById('logo-link-upload-group').classList.toggle('d-none', useFile);
    // Clear all related inputs when switching to prevent confusion.
    document.getElementById('clanLogo').value = '';
    document.getElementById('clanLogoUrl').value = '';
    document.getElementById('clanLogoUpload').value = '';
    document.getElementById('form-status').textContent = '';
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
        // The filename is passed as a query parameter.
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
        finalLogoUrl = document.getElementById('clanLogo').value;
        if (!finalLogoUrl) {
            alert('Please upload a clan logo and wait for it to finish.');
            return;
        }
    } else {
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

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || 'Failed to create the clan.');
        }

        // Handle success.
        formStatus.textContent = '✅ Clan created successfully! You will be redirected shortly.';
        formStatus.classList.add('text-success');
        
        // Redirect the new clan leader to the clans page after a short delay.
        setTimeout(() => {
            window.location.href = `/clans.html`;
        }, 2500);

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