/*
=================================================
Crimson Crown - Clan Registration Script
=================================================
This script handles the logic for the clan registration page. It:
1. Checks if a user is logged in. If not, it shows a "Login" prompt.
2. Handles the image upload process by sending the file to a public backend function.
3. Intercepts the main form submission.
4. Sends all clan data to a secure backend function to create the clan.
5. Provides UI feedback to the user (loading states, success/error messages).
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
});

/**
 * Handles the file selection for the clan logo. Uploads the image to Google Drive.
 * @param {Event} event - The file input change event.
 */
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formStatus = document.getElementById('form-status');
    formStatus.textContent = 'Uploading logo, please wait...';
    formStatus.classList.remove('text-success', 'text-danger');

    // Use FileReader to convert the image to a base64 string for sending to the backend.
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const base64File = reader.result;
        try {
            // Send the file data to our public upload function.
            const response = await fetch('/.netlify/functions/publicUploadToDrive', {
                method: 'POST',
                body: JSON.stringify({ file: base64File, fileName: file.name }),
            });

            if (!response.ok) throw new Error('Image upload failed on the server.');
            
            const { url } = await response.json();
            
            // Store the returned Google Drive URL in a hidden input field in the form.
            document.getElementById('clanLogo').value = url;
            formStatus.textContent = '✅ Logo uploaded successfully!';
            formStatus.classList.add('text-success');
        } catch (error) {
            formStatus.textContent = `❌ Logo upload failed: ${error.message}`;
            formStatus.classList.add('text-danger');
        }
    };
}

/**
 * Handles the final submission of the clan registration form.
 * @param {Event} event - The form submission event.
 */
async function handleClanRegistration(event) {
    event.preventDefault(); // Prevent default page reload.
    const token = localStorage.getItem('jwt_token');
    const clanLogoInput = document.getElementById('clanLogo');

    // Validation checks.
    if (!clanLogoInput.value) {
        alert('Please select and wait for the clan logo to finish uploading before submitting.');
        return;
    }
    
    // UI feedback elements.
    const submitButton = document.getElementById('submit-button');
    const buttonText = document.getElementById('submit-button-text');
    const buttonSpinner = document.getElementById('submit-spinner');
    const formStatus = document.getElementById('form-status');
    
    // Disable button and show spinner for loading state.
    submitButton.disabled = true;
    buttonText.textContent = 'Creating Clan...';
    buttonSpinner.classList.remove('d-none');
    formStatus.textContent = '';
    formStatus.classList.remove('text-success', 'text-danger');

    // Collect all data from the form.
    const clanData = {
        clanName: document.getElementById('clanName').value,
        clanTag: document.getElementById('clanTag').value,
        clanLogo: document.getElementById('clanLogo').value,
        roster: document.getElementById('roster').value,
    };

    try {
        // Send the data to the secure 'createClan' backend function.
        // The user's JWT is sent in the header to identify them as the captain.
        const response = await fetch('/.netlify/functions/createClan', {
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