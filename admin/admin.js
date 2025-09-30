/*
=================================================
Crimson Crown Admin Panel - Main JavaScript File
=================================================
Handles:
1. Secure Admin Login
2. Page Protection (JWT Authentication)
3. Banner Upload to Google Drive
4. Tournament Creation Form Submission
5. Logout Functionality
*/

// --- Primary Controller: Runs when the page is loaded ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the login page
    if (document.getElementById('login-form')) {
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Check if we are on the dashboard page
    if (document.getElementById('add-tournament-form')) {
        // 1. Protect the dashboard page immediately
        protectPage();
        
        // 2. Attach event listeners for the dashboard functionality
        const addTournamentForm = document.getElementById('add-tournament-form');
        const bannerUploader = document.getElementById('bannerUpload');
        
        addTournamentForm.addEventListener('submit', handleTournamentSubmit);
        bannerUploader.addEventListener('change', handleImageUpload);
    }
});


/**
 * Handles the admin login form submission.
 * @param {Event} e - The form submission event.
 */
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = ''; // Clear previous errors

    try {
        const response = await fetch('/.netlify/functions/adminLogin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            throw new Error('Invalid credentials. Please try again.');
        }

        const { token } = await response.json();
        
        // Store the token in the browser's local storage
        localStorage.setItem('jwt_token', token);
        
        // Redirect to the dashboard
        window.location.href = '/admin/dashboard.html';

    } catch (error) {
        errorMessage.textContent = error.message;
        console.error('Login failed:', error);
    }
}


/**
 * Protects a page by checking for a valid JWT token.
 * If no token is found, it redirects to the login page.
 */
function protectPage() {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        // No token found, user is not logged in.
        // Redirect to the login page immediately.
        window.location.href = '/admin/index.html';
    }
    // Note: For higher security, you could add a function here to
    // verify the token with the backend on every page load.
}


/**
 * Handles the file selection for the tournament banner.
 * Uploads the selected image to Google Drive via a secure serverless function.
 * @param {Event} event - The file input change event.
 */
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Convert the image file to a base64 string for transport
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onloadend = async () => {
        const base64File = reader.result;
        const token = localStorage.getItem('jwt_token');
        
        alert('Uploading banner to Google Drive... Please wait, this may take a moment.');

        try {
            const response = await fetch('/.netlify/functions/uploadToDrive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ file: base64File, fileName: file.name }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const { url } = await response.json();
            
            // Store the returned URL in the hidden input field
            document.getElementById('bannerImage').value = url;
            alert('✅ Banner uploaded successfully!');

        } catch (error) {
            alert(`❌ Banner upload failed: ${error.message}`);
            console.error('Upload error:', error);
        }
    };

    reader.onerror = (error) => {
        alert('Error reading the file.');
        console.error('FileReader error:', error);
    };
}


/**
 * Handles the submission of the "Add Tournament" form.
 * @param {Event} e - The form submission event.
 */
async function handleTournamentSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('jwt_token');
    
    const bannerUrl = document.getElementById('bannerImage').value;
    if (!bannerUrl) {
        alert('Please upload a banner image and wait for it to finish before creating the tournament.');
        return;
    }

    // Collect all data from the form into a single object
    const tournamentData = {
        scrimId: 'SCRIM_' + Date.now(), // Auto-generate a unique ID
        scrimName: document.getElementById('scrimName').value,
        game: document.getElementById('game').value,
        status: document.getElementById('status').value,
        bannerImage: bannerUrl,
        slots: document.getElementById('slots').value,
        prizePool: document.getElementById('prizePool').value,
        rounds: document.getElementById('rounds').value,
        mode: document.getElementById('mode').value,
        regStart: document.getElementById('regStart').value,
        regEnd: document.getElementById('regEnd').value,
        scrimStart: document.getElementById('scrimStart').value,
        scrimEnd: document.getElementById('scrimEnd').value,
        description: document.getElementById('description').value,
        rules: document.getElementById('rules').value,
        pointTable: document.getElementById('pointTable').value,
    };
    
    alert('Creating tournament...');

    try {
        const response = await fetch('/.netlify/functions/addTournament', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(tournamentData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add tournament.');
        }

        alert('✅ Tournament created successfully!');
        e.target.reset(); // Resets the form after successful submission

    } catch (error) {
        alert(`❌ Error creating tournament: ${error.message}`);
        console.error('Submit error:', error);
    }
}


/**
 * Logs the admin out by clearing the token and redirecting to the login page.
 * This function is called by the "Logout" button's onclick attribute.
 */
function logout() {
    localStorage.removeItem('jwt_token');
    window.location.href = '/admin/index.html';
}
