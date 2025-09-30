/*
=================================================
Crimson Crown - Unified Admin Panel Script
=================================================
This script controls all frontend logic for the admin panel.
It handles:
- Secure admin authentication via Discord login and role checking.
- Dashboard: Creating, viewing, editing, and deleting tournaments.
- User Management: Viewing all users and assigning site roles.
- Clan Management: Approving or denying clan join requests.
*/

// --- 1. PRIMARY CONTROLLER ---
// This runs when any admin page is loaded and calls the correct handler based on the page's content.
document.addEventListener('DOMContentLoaded', () => {
    // --- Admin Authentication Check ---
    // The admin login page is the only page that DOESN'T require a token check.
    if (document.getElementById('login-form')) {
        handleLoginPage();
    } else {
        // For all other admin pages, we must verify the user is an authorized admin.
        protectPage();
    }
    
    // --- Page-Specific Handlers ---
    if (document.getElementById('add-tournament-form')) {
        handleDashboardPage();
    }
    if (document.getElementById('users-table')) {
        handleUsersPage();
    }
    if (document.getElementById('requests-table')) {
        handleRequestsPage();
    }
    if (document.getElementById('edit-tournament-form')) {
        handleEditTournamentPage();
    }
    if (document.getElementById('registrations-table-container')) {
        handleViewRegistrationsPage();
    }
});


// --- 2. AUTHENTICATION & SECURITY ---

/**
 * Checks if a user has a valid admin token. If not, redirects to the admin login page.
 * It also renders the user's profile in the navbar.
 * @returns {string | null} The JWT token if valid, otherwise redirects.
 */
function protectPage() {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        window.location.href = '/admin/index.html';
        return null;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.siteRole || payload.siteRole !== 'admin') {
            // If the user is logged in but is not an admin, deny access.
            document.body.innerHTML = `<div class="container text-center py-5"><h1 class="text-danger">Access Denied</h1><p>You do not have permission to view this page.</p><a href="/">Go to Homepage</a></div>`;
            throw new Error('Insufficient permissions');
        }
        // If the user is an admin, render their profile in the navbar.
        renderAdminProfile(payload);
        return token;
    } catch (error) {
        // If token is invalid or expired, clear it and redirect to login.
        localStorage.removeItem('jwt_token');
        window.location.href = '/admin/index.html';
        return null;
    }
}

/**
 * Handles the logic for the admin login page, checking for a token in the URL.
 */
function handleLoginPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    const authCheck = document.getElementById('auth-check');
    const loginUI = document.getElementById('login-ui');
    const errorMessage = document.getElementById('error-message');

    if (token) {
        // A token was found in the URL. Show "Verifying..." UI.
        authCheck.classList.remove('d-none');
        loginUI.classList.add('d-none');

        // Verify the token has admin role before redirecting.
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.siteRole === 'admin') {
                localStorage.setItem('jwt_token', token);
                window.location.href = '/admin/dashboard.html';
            } else {
                throw new Error('You do not have admin permissions.');
            }
        } catch (err) {
            errorMessage.textContent = err.message || 'Invalid login attempt.';
            authCheck.classList.add('d-none');
            loginUI.classList.remove('d-none');
        }
    } else if (error) {
        errorMessage.textContent = 'Authentication failed. Please try again.';
    }
}

/**
 * Renders the admin's profile dropdown in the navbar.
 * @param {object} user - The decoded JWT payload.
 */
function renderAdminProfile(user) {
    const container = document.getElementById('user-auth-container');
    if (!container) return;
    container.innerHTML = `
        <div class="dropdown">
            <button class="btn btn-dark dropdown-toggle d-flex align-items-center" type="button" data-bs-toggle="dropdown">
                <img src="${user.avatar}" class="rounded-circle me-2" style="width: 32px; height: 32px;">
                ${user.username}
            </button>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end">
                <li><a class="dropdown-item" href="#" onclick="logout()">Logout</a></li>
            </ul>
        </div>
    `;
}

/**
 * Logs the admin out by clearing the token and redirecting.
 */
function logout() {
    localStorage.removeItem('jwt_token');
    window.location.href = '/admin/index.html';
}


// --- 3. DASHBOARD PAGE LOGIC ---

/**
 * Initializes the dashboard page, loading the tournament list and setting up forms.
 */
function handleDashboardPage() {
    loadTournamentsList();
    document.getElementById('add-tournament-form').addEventListener('submit', handleTournamentSubmit);
    document.getElementById('bannerUpload').addEventListener('change', handleImageUpload);
}

/**
 * Fetches and displays the list of existing tournaments on the dashboard.
 */
async function loadTournamentsList() {
    const token = localStorage.getItem('jwt_token');
    const listContainer = document.getElementById('tournaments-list');
    const loader = document.getElementById('tournaments-loader');

    try {
        const response = await fetch('/.netlify/functions/getTournaments', {
             headers: { 'Authorization': `Bearer ${token}` } // Even public-facing gets need auth if logic changes
        });
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
                    <a href="/admin/view-registrations.html?id=${tourney.scrimId}" class="btn btn-sm btn-outline-secondary">View Regs</a>
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

/**
 * Handles uploading the banner image to Google Drive.
 */
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('jwt_token');
    const formStatus = document.getElementById('form-status');
    formStatus.textContent = 'Uploading banner...';
    formStatus.classList.remove('text-success', 'text-danger');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const base64File = reader.result;
        try {
            const response = await fetch('/.netlify/functions/uploadToDrive', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ file: base64File, fileName: file.name }),
            });
            if (!response.ok) throw new Error('Upload failed');
            const { url } = await response.json();
            
            document.getElementById('bannerImage').value = url;
            formStatus.textContent = '✅ Banner uploaded successfully!';
            formStatus.classList.add('text-success');
        } catch (error) {
            formStatus.textContent = `❌ Banner upload failed: ${error.message}`;
            formStatus.classList.add('text-danger');
        }
    };
}

/**
 * Handles the submission of the "Create Tournament" form.
 */
async function handleTournamentSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('jwt_token');
    const formStatus = document.getElementById('form-status');
    
    const bannerUrl = document.getElementById('bannerImage').value;
    if (!bannerUrl) {
        formStatus.textContent = 'Please upload a banner and wait for it to finish.';
        formStatus.classList.add('text-danger');
        return;
    }

    const tournamentData = {
        scrimId: 'SCRIM_' + Date.now(),
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
    
    formStatus.textContent = 'Creating tournament...';

    try {
        const response = await fetch('/.netlify/functions/addTournament', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tournamentData),
        });
        if (!response.ok) throw new Error('Failed to add tournament.');

        formStatus.textContent = '✅ Tournament created successfully!';
        formStatus.classList.add('text-success');
        e.target.reset(); 
        loadTournamentsList(); // Refresh the list

    } catch (error) {
        formStatus.textContent = `❌ Error: ${error.message}`;
        formStatus.classList.add('text-danger');
    }
}

/**
 * Deletes a tournament.
 */
async function deleteTournament(scrimId, scrimName) {
    const token = localStorage.getItem('jwt_token');
    if (!confirm(`Are you sure you want to delete "${scrimName}"? This cannot be undone.`)) return;

    try {
        const response = await fetch('/.netlify/functions/deleteTournament', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ scrimId })
        });
        if (!response.ok) throw new Error('Failed to delete tournament.');

        alert('✅ Tournament deleted.');
        loadTournamentsList();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}


// --- 4. OTHER ADMIN PAGES ---

/**
 * Handles the logic for the "Edit Tournament" page.
 */
async function handleEditTournamentPage() {
    const token = localStorage.getItem('jwt_token');
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
        const response = await fetch(`/.netlify/functions/getTournamentDetail?id=${scrimId}`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Could not fetch tournament data.');
        const data = await response.json();
        
        title.textContent = `Edit: ${data.scrimName}`;
        
        // Pre-fill the form with existing data
        document.getElementById('scrimName').value = data.scrimName || '';
        document.getElementById('status').value = data.status || 'upcoming';
        document.getElementById('game').value = data.game || 'Farlight 84';
        document.getElementById('bannerImage').value = data.bannerImage || '';
        document.getElementById('slots').value = data.slots || '';
        document.getElementById('prizePool').value = data.prizePool || '';
        document.getElementById('rounds').value = data.rounds || '';
        document.getElementById('mode').value = data.mode || 'Squad';
        // Format dates correctly for datetime-local input
        const toDateTimeLocal = (isoDate) => isoDate ? new Date(new Date(isoDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
        document.getElementById('regStart').value = toDateTimeLocal(data.regStart);
        document.getElementById('regEnd').value = toDateTimeLocal(data.regEnd);
        document.getElementById('scrimStart').value = toDateTimeLocal(data.scrimStart);
        document.getElementById('scrimEnd').value = toDateTimeLocal(data.scrimEnd);
        document.getElementById('description').value = data.description || '';
        document.getElementById('rules').value = data.rules || '';
        document.getElementById('pointTable').value = data.pointTable || '';
        
        loader.classList.add('d-none');
        formContainer.classList.remove('d-none');

        document.getElementById('edit-tournament-form').addEventListener('submit', (e) => {
            e.preventDefault();
            updateTournament(scrimId);
        });

    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

/**
 * Submits the updated tournament data.
 */
async function updateTournament(scrimId) {
    const token = localStorage.getItem('jwt_token');
    const updatedData = {
        scrimId: scrimId,
        scrimName: document.getElementById('scrimName').value,
        status: document.getElementById('status').value,
        game: document.getElementById('game').value,
        bannerImage: document.getElementById('bannerImage').value,
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

    try {
        const response = await fetch('/.netlify/functions/updateTournament', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        if (!response.ok) throw new Error('Failed to save changes.');

        alert('✅ Tournament updated successfully!');
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

/**
 * Handles the logic for the "User Management" page.
 */
async function handleUsersPage() {
    const token = localStorage.getItem('jwt_token');
    const tableBody = document.getElementById('users-body');
    const loader = document.getElementById('loader');
    const table = document.getElementById('users-table');

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
                <td><img src="${user.avatar}" class="rounded-circle me-2" style="width: 32px; height: 32px;">${user.username}</td>
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

/**
 * Updates a user's role.
 */
async function updateRole(selectElement) {
    const token = localStorage.getItem('jwt_token');
    const userId = selectElement.dataset.userId;
    const newRole = selectElement.value;

    try {
        const response = await fetch('/.netlify/functions/updateUserRole', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, newRole })
        });
        if (!response.ok) throw new Error('Failed to update role.');
        
        const originalColor = selectElement.style.borderColor;
        selectElement.style.borderColor = 'green';
        setTimeout(() => { selectElement.style.borderColor = originalColor; }, 2000);
    } catch (error) {
        alert(error.message);
        selectElement.style.borderColor = 'red';
    }
}

/**
 * Handles the logic for the "Clan Requests" page.
 */
async function handleRequestsPage() {
    const token = localStorage.getItem('jwt_token');
    const tableBody = document.getElementById('requests-body');
    const loader = document.getElementById('loader');
    const table = document.getElementById('requests-table');
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

/**
 * Approves or denies a clan join request from the admin panel.
 */
async function processRequest(requestId, userId, clanId, action) {
    const token = localStorage.getItem('jwt_token');
    const row = document.getElementById(`request-${requestId}`);
    row.querySelectorAll('button').forEach(b => b.disabled = true);
    row.style.opacity = '0.5';

    try {
        const response = await fetch('/.netlify/functions/processClanRequest', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, userId, clanId, action })
        });
        if (!response.ok) throw new Error(`Failed to ${action} request.`);
        
        row.style.transition = 'opacity 0.5s ease';
        row.style.opacity = '0';
        setTimeout(() => row.remove(), 500);
    } catch (error) {
        alert(error.message);
        row.style.opacity = '1';
        row.querySelectorAll('button').forEach(b => b.disabled = false);
    }
}

/**
 * Handles the "View Registrations" page.
 */
async function handleViewRegistrationsPage() {
    const token = localStorage.getItem('jwt_token');
    const params = new URLSearchParams(window.location.search);
    const scrimId = params.get('id');
    const loader = document.getElementById('loader');
    const tableContainer = document.getElementById('registrations-table-container');
    const tableBody = document.getElementById('registrations-body');
    const noResults = document.getElementById('no-results');
    const title = document.getElementById('tournament-title');

    if (!scrimId) {
        loader.innerHTML = '<p class="text-danger">No tournament ID specified.</p>';
        return;
    }

    try {
        const response = await fetch(`/.netlify/functions/getRegistrations?id=${scrimId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Could not load registrations.');
        const registrations = await response.json();

        loader.classList.add('d-none');
        if (registrations.length === 0) {
            noResults.classList.remove('d-none');
            return;
        }

        tableContainer.classList.remove('d-none');
        tableBody.innerHTML = '';
        registrations.forEach(reg => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reg.teamName}</td>
                <td>${reg.captain}</td>
                <td style="white-space: pre-wrap;">${reg.roster}</td>
                <td>${new Date(reg.timestamp).toLocaleString()}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}