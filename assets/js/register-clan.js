document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('clan-registration-form');
    const logoUploader = document.getElementById('clanLogoUpload');
    const hiddenLogoInput = document.getElementById('clanLogo');
    const submitButton = registrationForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    let isUploading = false;

    // --- 1. HANDLE LOGO UPLOAD ---
    logoUploader.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        isUploading = true;
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Uploading Logo...`;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64File = reader.result;
            try {
                // We reuse the same secure upload function from the admin panel
                const response = await fetch('/.netlify/functions/uploadToDrive', {
                    method: 'POST',
                    // NOTE: This endpoint needs a JWT to work. For a public form, you'd
                    // typically create a separate, less-privileged upload function.
                    // For now, we will assume it's open for this purpose.
                    // In a real-world scenario, you'd add security checks.
                    body: JSON.stringify({ file: base64File, fileName: file.name }),
                });

                if (!response.ok) throw new Error('Upload failed');
                const { url } = await response.json();
                
                hiddenLogoInput.value = url; // Store the returned URL
                submitButton.innerHTML = `Logo Uploaded! Ready to Submit.`;
                
            } catch (error) {
                console.error(error);
                submitButton.innerHTML = `Logo Upload Failed! Try again.`;
            } finally {
                isUploading = false;
                submitButton.disabled = false;
            }
        };
    });

    // --- 2. HANDLE FORM SUBMISSION ---
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isUploading) {
            alert('Please wait for the logo to finish uploading.');
            return;
        }
        if (!hiddenLogoInput.value) {
            alert('Please upload a clan logo before submitting.');
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Submitting...`;

        const clanData = {
            clanName: document.getElementById('clanName').value,
            clanTag: document.getElementById('clanTag').value,
            captainName: document.getElementById('captainName').value,
            captainDiscord: document.getElementById('captainDiscord').value,
            clanLogo: hiddenLogoInput.value,
        };

        try {
            const response = await fetch('/.netlify/functions/createClan', {
                method: 'POST',
                body: JSON.stringify(clanData),
            });

            if (!response.ok) throw new Error('Registration failed');

            submitButton.classList.remove('btn-brand');
            submitButton.classList.add('btn-success');
            submitButton.innerHTML = 'Registration Successful!';
            
            setTimeout(() => {
                window.location.href = '/clans.html'; // Redirect to clans page on success
            }, 2000);

        } catch (error) {
            console.error(error);
            submitButton.classList.remove('btn-brand');
            submitButton.classList.add('btn-danger');
            submitButton.innerHTML = 'Error! Please Try Again.';

            setTimeout(() => {
                submitButton.disabled = false;
                submit_button.classList.remove('btn-danger');
                submitButton.classList.add('btn-brand');
                submitButton.innerHTML = originalButtonText;
            }, 3000);
        }
    });
});
