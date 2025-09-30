document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    const loginPrompt = document.getElementById('login-prompt');
    const registrationContainer = document.getElementById('registration-container');

    if (!token) {
        // If user is not logged in, show the login prompt and hide the form
        loginPrompt.classList.remove('d-none');
        registrationContainer.classList.add('d-none');
        return; // Stop further execution
    }
    
    // If user is logged in, show the form
    loginPrompt.classList.add('d-none');
    registrationContainer.classList.remove('d-none');
    
    const clanForm = document.getElementById('clan-registration-form');
    const logoUploader = document.getElementById('clanLogoUpload');

    clanForm.addEventListener('submit', handleClanRegistration);
    logoUploader.addEventListener('change', handleImageUpload);
});

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formStatus = document.getElementById('form-status');
    formStatus.textContent = 'Uploading logo...';
    formStatus.classList.remove('text-success', 'text-danger');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const base64File = reader.result;
        try {
            // CORRECTED: Using the public upload function
            const response = await fetch('/.netlify/functions/publicUploadToDrive', {
                method: 'POST',
                body: JSON.stringify({ file: base64File, fileName: file.name }),
            });

            if (!response.ok) throw new Error('Image upload failed.');
            const { url } = await response.json();
            
            document.getElementById('clanLogo').value = url;
            formStatus.textContent = '✅ Logo uploaded successfully!';
            formStatus.classList.add('text-success');
        } catch (error) {
            formStatus.textContent = `❌ Logo upload failed: ${error.message}`;
            formStatus.classList.add('text-danger');
        }
    };
}

async function handleClanRegistration(event) {
    event.preventDefault();
    const token = localStorage.getItem('jwt_token');
    const clanLogoInput = document.getElementById('clanLogo');
    if (!clanLogoInput.value) {
        alert('Please select and upload a clan logo first.');
        return;
    }
    
    const submitButton = document.getElementById('submit-button');
    const buttonText = document.getElementById('submit-button-text');
    const buttonSpinner = document.getElementById('submit-spinner');
    const formStatus = document.getElementById('form-status');
    
    submitButton.disabled = true;
    buttonText.textContent = 'Creating...';
    buttonSpinner.classList.remove('d-none');
    formStatus.textContent = '';
    formStatus.classList.remove('text-success', 'text-danger');

    const clanData = {
        clanName: document.getElementById('clanName').value,
        clanTag: document.getElementById('clanTag').value,
        clanLogo: document.getElementById('clanLogo').value,
        roster: document.getElementById('roster').value,
    };

    try {
        const response = await fetch('/.netlify/functions/createClan', {
            method: 'POST',
            // CORRECTED: Added the Authorization header to identify the user
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(clanData)
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || 'Failed to create clan.');
        }

        formStatus.textContent = '✅ Clan created successfully! Redirecting...';
        formStatus.classList.add('text-success');
        
        setTimeout(() => { window.location.href = `/clans.html`; }, 2000);
    } catch (error) {
        formStatus.textContent = `❌ Error: ${error.message}`;
        formStatus.classList.add('text-danger');
        
        submitButton.disabled = false;
        buttonText.textContent = 'Create Clan';
        buttonSpinner.classList.add('d-none');
    }
}