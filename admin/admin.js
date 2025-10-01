/*
=================================================
Crimson Crown - Unified Admin Panel Script
=================================================
This script controls all frontend logic for the admin panel. It handles:
- Secure admin authentication via Discord login and role checking.
- Dashboard: Creating, viewing, editing, and deleting tournaments.
- User Management: Viewing all users and assigning site roles.
- Clan Management: Approving or denying clan join requests.
- Viewing tournament registrations.
*/

// --- 1. PRIMARY CONTROLLER ---
// This runs when any admin page is loaded and calls the correct handler based on the page's content.
document.addEventListener('DOMContentLoaded', () => {
    // The admin login page is the only one that doesn't require a token check.
    if (document.getElementById('login-form')) {
        handleLoginPage();
    } else {
        // For all other admin pages, we must verify the user is an authorized admin.
        protectPage();
    }
    
    // Page-Specific Handlers
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
 * It also renders the user's profile in the navbar if they are a valid admin.
 * @returns {string | null} The JWT token if valid, otherwise it redirects and returns null.
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
            // If the user is logged in but is not an admin, deny access and show a message.
            document.body.innerHTML = `<div class="container text-center py-5"><h1 class="text-danger">Access Denied</h1><p class="text-secondary">You do not have the required permissions to view this page.</p><a href="/" class="btn btn-brand mt-3">Go to Homepage</a></div>`;
            throw new Error('Insufficient permissions');
        }
        // If the user is a valid admin, render their profile in the navbar.
        renderAdminProfile(payload);
        return token;
    } catch (error) {
        // If the token is invalid or expired, clear it and force a re-login.
        localStorage.removeItem('jwt_token');
        window.location.href = '/admin/index.html';
        return null;
    }
}

/**
 * Handles the logic for the admin login page, checking for a token in the URL from the Discord redirect.
 */
function handleLoginPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    const authCheck = document.getElementById('auth-check');
    const loginUI = document.getElementById('login-ui');
    const errorMessage = document.getElementById('error-message');

    if (token) {
        // A token was found in the URL. Show the "Verifying..." UI.
        authCheck.classList.remove('d-none');
        loginUI.classList.add('d-none');

        // Verify the token has the 'admin' role before saving it and redirecting.
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
        errorMessage.textContent = 'Authentication failed via Discord. Please try again.';
    }
}

/**
 * Renders the admin's profile dropdown in the navbar.
 * @param {object} user - The decoded JWT payload containing the user's info.
 */
function renderAdminProfile(user) {
    const container = document.getElementById('user-auth-container');
    if (!container) return;
    container.innerHTML = `
        <div class="dropdown">
            <button class="btn btn-dark dropdown-toggle d-flex align-items-center" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="${user.avatar}" class="rounded-circle me-2" style="width: 32px; height: 32px; object-fit: cover;">
                ${user.username}
            </button>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end">
                <li><a class="dropdown-item" href="#" onclick="logout()"><i class="fas fa-sign-out-alt fa-fw me-2"></i>Logout</a></li>
            </ul>
        </div>
    `;
}

/**
 * Logs the admin out by clearing the token from local storage and redirecting to the login page.
 */
function logout() {
    localStorage.removeItem('jwt_token');
    window.location.href = '/admin/index.html';
}


// --- 3. DASHBOARD & TOURNAMENT MANAGEMENT ---

/**
 * Initializes the dashboard page by loading the tournament list and setting up form listeners.
 */
function handleDashboardPage() {
    loadTournamentsList();
    document.getElementById('add-tournament-form').addEventListener('submit', handleTournamentSubmit);
    document.getElementById('bannerUpload').addEventListener('change', handleImageUpload);
}

/**
 * Fetches and displays the list of all created tournaments on the dashboard.
 */
async function loadTournamentsList() {
    const token = localStorage.getItem('jwt_token');
    const listContainer = document.getElementById('tournaments-list');
    const loader = document.getElementById('tournaments-loader');
    try {
        // Even though getTournaments is public, we send the token in case its logic changes.
        const response = await fetch('/.netlify/functions/getTournaments', {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load tournaments list.');
        const tournaments = await response.json();
        
        loader.classList.add('d-none');
        listContainer.classList.remove('d-none');
        listContainer.innerHTML = ''; 

        tournaments.reverse().forEach(tourney => { // Show newest first
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item bg-transparent text-light d-flex justify-content-between align-items-center flex-wrap';
            listItem.innerHTML = `
                <div class="me-3">
                    <strong>${tourney.scrimName}</strong>
                    <small class="d-block text-secondary">${tourney.status}</small>
                </div>
                <div class="btn-group mt-2 mt-sm-0">
                    <a href="/admin/view-registrations.html?id=${tourney.scrimId}" class="btn btn-sm btn-outline-secondary" title="View Registrations"><i class="fas fa-users"></i></a>
                    <a href="/admin/edit-tournament.html?id=${tourney.scrimId}" class="btn btn-sm btn-outline-info" title="Edit"><i class="fas fa-edit"></i></a>
                    <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="deleteTournament('${tourney.scrimId}', '${tourney.scrimName}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            listContainer.appendChild(listItem);
        });
    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

/**
 * Handles uploading the tournament banner image to the designated backend function.
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
            const response = await fetch('/.netlify/functions/uploadToGitHub', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`, // Auth is needed to prove an admin is uploading
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ file: base64File, fileName: file.name }),
            });
            if (!response.ok) {
                 const err = await response.json();
                 throw new Error(err.error || 'Upload failed');
            }
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
        formStatus.classList.remove('text-danger', 'text-success');
        formStatus.classList.add('text-warning');
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
        loadTournamentsList(); // Refresh the list of tournaments on the dashboard

    } catch (error) {
        formStatus.textContent = `❌ Error: ${error.message}`;
        formStatus.classList.add('text-danger');
    }
}

/**
 * Deletes a tournament after confirmation.
 */
async function deleteTournament(scrimId, scrimName) {
    const token = localStorage.getItem('jwt_token');
    if (!confirm(`Are you sure you want to permanently delete the tournament "${scrimName}"? This cannot be undone.`)) return;

    try {
        const response = await fetch('/.netlify/functions/deleteTournament', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ scrimId })
        });
        if (!response.ok) throw new Error('Failed to delete tournament.');
        
        alert('✅ Tournament deleted.');
        loadTournamentsList(); // Refresh the list
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
 * Submits the updated tournament data to the backend.
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
                        <option value="user" ${!user.siteRole || user.siteRole === 'user' ? 'selected' : ''}>User</option>
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
 * Updates a user's role when the admin changes the dropdown.
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
        
        // Visual feedback for success
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
        // Fetch tournament name for the header
        const tourneyResponse = await fetch(`/.netlify/functions/getTournamentDetail?id=${scrimId}`);
        if(tourneyResponse.ok) {
            const tourney = await tourneyResponse.json();
            title.textContent = `Registrations for: ${tourney.scrimName}`;
        }

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

if (document.getElementById('messages-table')) {
    handleMessagesPage();
}

// UPDATED LINE START: Add these two new functions to the bottom of admin.js
// --- MESSAGES PAGE ---
async function handleMessagesPage() {
    const token = protectPage();
    const tableBody = document.getElementById('messages-body');
    const loader = document.getElementById('loader');
    const table = document.getElementById('messages-table');
    const noResults = document.getElementById('no-results');

    try {
        const response = await fetch('/.netlify/functions/getMessages', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch messages.');
        const messages = await response.json();

        loader.classList.add('d-none');
        if (messages.length === 0) {
            noResults.classList.remove('d-none');
            return;
        }
        
        table.classList.remove('d-none');
        tableBody.innerHTML = '';

        messages.forEach(msg => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${msg.name} &lt;${msg.email}&gt;</td>
                <td>${msg.subject}</td>
                <td>${new Date(msg.timestamp).toLocaleDateString()}</td>
                <td><span class="badge ${msg.status === 'unread' ? 'bg-danger' : 'bg-secondary'}">${msg.status}</span></td>
                <td><button class="btn btn-sm btn-outline-info" onclick='viewMessage(${JSON.stringify(msg)})'>View</button></td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

function viewMessage(msg) {
    document.getElementById('messageModalSubject').textContent = msg.subject;
    document.getElementById('messageModalFrom').textContent = `${msg.name} <${msg.email}>`;
    document.getElementById('messageModalBody').textContent = msg.message;
    
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    messageModal.show();
}
// UPDATED LINE END


// UPDATED LINE START: Add this to your Primary Controller at the top of admin.js
if (document.getElementById('partners-list-container')) {
    handlePartnersPage();
}
// UPDATED LINE END


// UPDATED LINE START: Add these new functions to the bottom of admin.js
// --- PARTNERS PAGE ---
let allPartners = [];
let editPartnerModal;

async function handlePartnersPage() {
    protectPage();
    editPartnerModal = new bootstrap.Modal(document.getElementById('editPartnerModal'));

    loadPartnersList();
    document.getElementById('add-partner-form').addEventListener('submit', addPartner);
    document.getElementById('save-partner-changes').addEventListener('click', updatePartner);
}

async function loadPartnersList() {
    const token = localStorage.getItem('jwt_token');
    const tableBody = document.getElementById('partners-body');
    const loader = document.getElementById('loader');
    const container = document.getElementById('partners-list-container');
    
    loader.classList.remove('d-none');
    container.classList.add('d-none');

    try {
        const response = await fetch('/.netlify/functions/getPartners', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch partners.');
        allPartners = await response.json();

        loader.classList.add('d-none');
        container.classList.remove('d-none');
        tableBody.innerHTML = '';

        allPartners.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${p.logoUrl}" style="width: 30px; height: 30px; object-fit: contain; margin-right: 10px;" alt="">${p.partnerName}</td>
                <td>${p.category}</td>
                <td>
                    <button class="btn btn-sm btn-outline-info" onclick="openEditModal('${p.partnerName}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deletePartner('${p.partnerName}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

async function addPartner(e) {
    e.preventDefault();
    const token = localStorage.getItem('jwt_token');
    const partnerData = {
        partnerName: document.getElementById('partnerName').value,
        logoUrl: document.getElementById('logoUrl').value,
        websiteUrl: document.getElementById('websiteUrl').value,
        category: document.getElementById('category').value,
    };
    try {
        const response = await fetch('/.netlify/functions/addPartner', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(partnerData)
        });
        if (!response.ok) throw new Error('Failed to add partner.');
        e.target.reset();
        loadPartnersList();
    } catch (error) { alert(error.message); }
}

function openEditModal(partnerName) {
    const partner = allPartners.find(p => p.partnerName === partnerName);
    if (!partner) return;
    document.getElementById('editOriginalName').value = partner.partnerName;
    document.getElementById('editPartnerName').value = partner.partnerName;
    document.getElementById('editLogoUrl').value = partner.logoUrl;
    document.getElementById('editWebsiteUrl').value = partner.websiteUrl;
    document.getElementById('editCategory').value = partner.category;
    editPartnerModal.show();
}

async function updatePartner() {
    const token = localStorage.getItem('jwt_token');
    const updatedData = {
        originalName: document.getElementById('editOriginalName').value,
        partnerName: document.getElementById('editPartnerName').value,
        logoUrl: document.getElementById('editLogoUrl').value,
        websiteUrl: document.getElementById('editWebsiteUrl').value,
        category: document.getElementById('editCategory').value,
    };
    try {
        const response = await fetch('/.netlify/functions/updatePartner', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updatedData)
        });
        if (!response.ok) throw new Error('Failed to update partner.');
        editPartnerModal.hide();
        loadPartnersList();
    } catch (error) { alert(error.message); }
}

async function deletePartner(partnerName) {
    if (!confirm(`Are you sure you want to delete ${partnerName}?`)) return;
    const token = localStorage.getItem('jwt_token');
    try {
        const response = await fetch('/.netlify/functions/deletePartner', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ partnerName })
        });
        if (!response.ok) throw new Error('Failed to delete partner.');
        loadPartnersList();
    } catch (error) { alert(error.message); }
}
// UPDATED LINE END