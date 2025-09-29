// This script handles both login and dashboard logic

// --- LOGIN PAGE LOGIC ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');

        try {
            const response = await fetch('/.netlify/functions/adminLogin', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const { token } = await response.json();
            // Store the token securely in the browser's local storage
            localStorage.setItem('jwt_token', token);
            // Redirect to the dashboard
            window.location.href = '/admin/dashboard.html';

        } catch (error) {
            errorMessage.textContent = 'Login failed. Please check your username and password.';
        }
    });
}


// --- DASHBOARD PAGE LOGIC ---
// This function runs on any admin page that needs protection
function protectPage() {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        // If no token exists, redirect to login page
        window.location.href = '/admin/index.html';
    }
    // We could also add token verification here if needed
}

// Example of how to use the token to submit the "Add Tournament" form
const addTournamentForm = document.getElementById('add-tournament-form'); // Make sure your form has this ID
if (addTournamentForm) {
    protectPage(); // Protect the page first

    addTournamentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('jwt_token');

        // Create an object with all your form data
        const formData = {
            scrimId: 'SCRIM' + Date.now(),
            scrimName: document.getElementById('scrimName').value,
            // ... get all other form values
        };

        try {
            const response = await fetch('/.netlify/functions/addTournament', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}` // Send the token for verification
                },
                body: JSON.stringify(formData),
            });
            
            if (!response.ok) throw new Error('Failed to add tournament');
            
            alert('Tournament added successfully!');
            addTournamentForm.reset();

        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
}

function logout() {
    localStorage.removeItem('jwt_token');
    window.location.href = '/admin/index.html';
}