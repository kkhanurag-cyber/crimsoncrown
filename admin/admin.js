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

// UPDATED LINE START: Add these two new functions to the bottom of admin.js
// --- USER MANAGEMENT PAGE ---
async function handleUsersPage() {
    const token = protectPage();
    const table = document.getElementById('users-table');
    const tableBody = document.getElementById('users-body');
    const loader = document.getElementById('loader');

    try {
        const response = await fetch('/.netlify/functions/getUsers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch users.');
        const users = await response.json();

        loader.classList.add('d-none');
        table.classList.remove('d-none');
        tableBody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${user.avatar}" class="rounded-circle me-2" style="width: 32px; height: 32px;">
                    ${user.username}
                </td>
                <td>${user.userId}</td>
                <td>
                    <select class="form-select form-select-sm bg-dark text-white" data-user-id="${user.userId}" onchange="updateRole(this)">
                        <option value="user" ${user.siteRole === 'user' ? 'selected' : ''}>User</option>
                        <option value="moderator" ${user.siteRole === 'moderator' ? 'selected' : ''}>Moderator</option>
                        <option value="manager" ${user.siteRole === 'manager' ? 'selected' : ''}>Manager</option>
                        <option value="admin" ${user.siteRole === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

async function updateRole(selectElement) {
    const token = localStorage.getItem('jwt_token');
    const userId = selectElement.dataset.userId;
    const newRole = selectElement.value;

    try {
        const response = await fetch('/.netlify/functions/updateUserRole', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId, newRole })
        });

        if (!response.ok) {
            throw new Error('Failed to update role.');
        }
        
        // Optionally, show a small success message
        const originalColor = selectElement.style.borderColor;
        selectElement.style.borderColor = 'green';
        setTimeout(() => { selectElement.style.borderColor = originalColor; }, 2000);

    } catch (error) {
        alert(error.message);
        selectElement.style.borderColor = 'red';
    }
}

// UPDATED LINE START: Add this to your Primary Controller at the top of admin.js
if (document.getElementById('edit-tournament-form')) {
    handleEditTournamentPage();
}
// UPDATED LINE END


// UPDATED LINE START: In the handleDashboardPage function, find the loadTournamentsList call and replace the old function with this new one.
async function loadTournamentsList() {
    const listContainer = document.getElementById('tournaments-list');
    const loader = document.getElementById('tournaments-loader');

    try {
        const response = await fetch('/.netlify/functions/getTournaments');
        if (!response.ok) throw new Error('Failed to load tournaments');
        const tournaments = await response.json();

        loader.classList.add('d-none');
        listContainer.classList.remove('d-none');
        listContainer.innerHTML = ''; 

        tournaments.forEach(tourney => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item bg-transparent text-light d-flex justify-content-between align-items-center';
            listItem.innerHTML = `
                <div>
                    <strong>${tourney.scrimName}</strong>
                    <small class="d-block text-secondary">${tourney.status}</small>
                </div>
                <div class="btn-group">
                    <a href="/admin/view-registrations.html?id=${tourney.scrimId}" class="btn btn-sm btn-outline-secondary">View</a>
                    <a href="/admin/edit-tournament.html?id=${tourney.scrimId}" class="btn btn-sm btn-outline-info">Edit</a>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteTournament('${tourney.scrimId}', '${tourney.scrimName}')">Delete</button>
                </div>
            `;
            listContainer.appendChild(listItem);
        });

    } catch (error) {
        loader.innerHTML = `<p class="text-danger">Could not load tournaments.</p>`;
    }
}
// UPDATED LINE END


// UPDATED LINE START: Add these new functions to the bottom of admin.js
// --- EDIT TOURNAMENT PAGE ---
async function handleEditTournamentPage() {
    protectPage();
    const params = new URLSearchParams(window.location.search);
    const scrimId = params.get('id');

    const loader = document.getElementById('loader');
    const formContainer = document.getElementById('edit-form-container');
    const title = document.getElementById('edit-title');

    if (!scrimId) {
        loader.innerHTML = '<p class="text-danger">No tournament ID provided.</p>';
        return;
    }

    try {
        // Fetch existing data for the tournament
        const response = await fetch(`/.netlify/functions/getTournamentDetail?id=${scrimId}`);
        if (!response.ok) throw new Error('Could not fetch tournament data.');
        const data = await response.json();
        
        title.textContent = `Edit: ${data.scrimName}`;
        
        // Pre-fill the form with the data
        // NOTE: Ensure your edit-tournament.html has inputs with these IDs
        document.getElementById('scrimName').value = data.scrimName;
        document.getElementById('status').value = data.status;
        // ... pre-fill ALL other form fields (game, slots, prizePool, dates, etc.) ...
        
        loader.classList.add('d-none');
        formContainer.classList.remove('d-none');

        // Attach submit listener
        document.getElementById('edit-tournament-form').addEventListener('submit', (e) => {
            e.preventDefault();
            updateTournament(scrimId);
        });

    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

async function updateTournament(scrimId) {
    const token = localStorage.getItem('jwt_token');
    
    // Gather all data from the form
    const updatedData = {
        scrimId: scrimId,
        scrimName: document.getElementById('scrimName').value,
        status: document.getElementById('status').value,
        // ... get ALL other values from the form ...
    };

    try {
        const response = await fetch('/.netlify/functions/updateTournament', {
            method: 'POST', // or 'PUT'
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updatedData)
        });
        if (!response.ok) throw new Error('Failed to save changes.');

        alert('✅ Tournament updated successfully!');
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

async function deleteTournament(scrimId, scrimName) {
    const token = localStorage.getItem('jwt_token');
    if (!confirm(`Are you sure you want to delete the tournament "${scrimName}"? This cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/deleteTournament', {
            method: 'POST', // Netlify functions often use POST for simplicity, even for delete
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ scrimId })
        });
        if (!response.ok) throw new Error('Failed to delete tournament.');

        alert('✅ Tournament deleted successfully.');
        // Reload the list of tournaments on the dashboard
        loadTournamentsList();

    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}
// UPDATED LINE END

// UPDATED LINE START: Add this to your Primary Controller at the top of admin.js
if (document.getElementById('requests-table')) {
    handleRequestsPage();
}
// UPDATED LINE END


// UPDATED LINE START: Add these two new functions to the bottom of admin.js
// --- CLAN REQUESTS PAGE ---
async function handleRequestsPage() {
    const token = protectPage();
    const table = document.getElementById('requests-table');
    const tableBody = document.getElementById('requests-body');
    const loader = document.getElementById('loader');
    const noResults = document.getElementById('no-results');

    try {
        const response = await fetch('/.netlify/functions/getClanRequests', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch requests.');
        const requests = await response.json();

        loader.classList.add('d-none');
        
        if (requests.length === 0) {
            noResults.classList.remove('d-none');
            return;
        }
        
        table.classList.remove('d-none');
        tableBody.innerHTML = '';

        requests.forEach(req => {
            const row = document.createElement('tr');
            row.id = `request-${req.requestId}`;
            row.innerHTML = `
                <td>${req.username}</td>
                <td>${req.clanName}</td>
                <td>${new Date(req.timestamp).toLocaleDateString()}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-success" onclick="processRequest('${req.requestId}', '${req.userId}', '${req.clanId}', 'approve')">Approve</button>
                    <button class="btn btn-sm btn-danger" onclick="processRequest('${req.requestId}', '${req.userId}', '${req.clanId}', 'deny')">Deny</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

async function processRequest(requestId, userId, clanId, action) {
    const token = localStorage.getItem('jwt_token');
    const row = document.getElementById(`request-${requestId}`);
    const buttons = row.querySelectorAll('button');
    buttons.forEach(b => b.disabled = true); // Disable buttons during processing

    try {
        const response = await fetch('/.netlify/functions/processClanRequest', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ requestId, userId, clanId, action })
        });

        if (!response.ok) throw new Error(`Failed to ${action} request.`);
        
        // On success, fade out and remove the row from the UI
        row.style.transition = 'opacity 0.5s ease';
        row.style.opacity = '0';
        setTimeout(() => row.remove(), 500);
        
    } catch (error) {
        alert(error.message);
        buttons.forEach(b => b.disabled = false); // Re-enable buttons on error
    }
}
// UPDATED LINE END