/*
=================================================
Crimson Crown - Unified Admin Panel Script (v2.1 - Final)
=================================================
This script controls all frontend logic for the admin panel. It handles:
- Secure admin authentication via Discord login and role checking.
- Dashboard: Creating, viewing, editing, and deleting tournaments.
- User Management: Viewing all users and assigning site roles.
- Clan Management: Approving or denying clan join requests.
- Viewing messages from the contact form.
- Managing partners and sponsors.
- Image uploads via Vercel Blob (supporting both file upload and link pasting).
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
    
    // Page-Specific Handlers to run the correct logic for the current page.
    if (document.getElementById('add-tournament-form')) handleDashboardPage();
    if (document.getElementById('users-table')) handleUsersPage();
    if (document.getElementById('requests-table')) handleRequestsPage();
    if (document.getElementById('edit-tournament-form')) handleEditTournamentPage();
    if (document.getElementById('registrations-table-container')) handleViewRegistrationsPage();
    if (document.getElementById('messages-table')) handleMessagesPage();
    if (document.getElementById('partners-list-container')) handlePartnersPage();
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
        // If no token exists, immediately redirect to the login page.
        window.location.href = '/admin/index.html';
        return null;
    }
    try {
        // Decode the token to check the user's role.
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.siteRole || payload.siteRole !== 'admin') {
            // If the user is logged in but is NOT an admin, block access and show a message.
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
        try {
            // Decode the token to check if the user has the 'admin' role.
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.siteRole === 'admin') {
                // If they are an admin, save the token and redirect to the dashboard.
                localStorage.setItem('jwt_token', token);
                window.location.href = '/admin/dashboard.html';
            } else {
                // If they are a regular user, deny access.
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
 * @param {object} user - The decoded JWT payload containing the user's info.
 */
function renderAdminProfile(user) {
    const container = document.getElementById('user-auth-container');
    if (!container) return;
    container.innerHTML = `<div class="dropdown"><button class="btn btn-dark dropdown-toggle d-flex align-items-center" type="button" data-bs-toggle="dropdown" aria-expanded="false"><img src="${user.avatar}" class="rounded-circle me-2" style="width: 32px; height: 32px; object-fit: cover;">${user.username}</button><ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end"><li><a class="dropdown-item" href="#" onclick="logout()"><i class="fas fa-sign-out-alt fa-fw me-2"></i>Logout</a></li></ul></div>`;
}

/**
 * Logs the admin out by clearing the token from local storage and redirecting.
 */
function logout() {
    localStorage.removeItem('jwt_token');
    window.location.href = '/admin/index.html';
}


// --- 3. DASHBOARD & TOURNAMENT MANAGEMENT ---

function handleDashboardPage() {
    loadTournamentsList();
    document.getElementById('add-tournament-form').addEventListener('submit', handleTournamentSubmit);
    document.getElementById('bannerUpload').addEventListener('change', handleImageUpload);
    document.getElementById('methodFile').addEventListener('change', toggleUploadMethod);
    document.getElementById('methodLink').addEventListener('change', toggleUploadMethod);
}

function toggleUploadMethod() {
    const useFile = document.getElementById('methodFile').checked;
    document.getElementById('file-upload-group').classList.toggle('d-none', !useFile);
    document.getElementById('link-upload-group').classList.toggle('d-none', useFile);
    document.getElementById('bannerImage').value = '';
    document.getElementById('bannerUrl').value = '';
    document.getElementById('bannerUpload').value = '';
    document.getElementById('form-status').textContent = '';
}

async function loadTournamentsList() {
    const token = localStorage.getItem('jwt_token');
    const listContainer = document.getElementById('tournaments-list');
    const loader = document.getElementById('tournaments-loader');
    try {
        const response = await fetch('/api/router?action=getTournaments');
        if (!response.ok) throw new Error('Failed to load tournaments list.');
        const tournaments = await response.json();
        loader.classList.add('d-none');
        listContainer.classList.remove('d-none');
        listContainer.innerHTML = ''; 
        tournaments.reverse().forEach(tourney => {
            const li = document.createElement('li');
            li.className = 'list-group-item bg-transparent text-light d-flex justify-content-between align-items-center flex-wrap';
            li.innerHTML = `<div><strong>${tourney.scrimName}</strong><small class="d-block text-secondary">${tourney.status}</small></div><div class="btn-group mt-2 mt-sm-0"><a href="/admin/view-registrations.html?id=${tourney.scrimId}" class="btn btn-sm btn-outline-secondary" title="View Registrations"><i class="fas fa-users"></i></a><a href="/admin/edit-tournament.html?id=${tourney.scrimId}" class="btn btn-sm btn-outline-info" title="Edit"><i class="fas fa-edit"></i></a><button class="btn btn-sm btn-outline-danger" title="Delete" onclick="deleteTournament('${tourney.scrimId}', '${tourney.scrimName}')"><i class="fas fa-trash"></i></button></div>`;
            listContainer.appendChild(li);
        });
    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const formStatus = document.getElementById('form-status');
    formStatus.textContent = 'Uploading banner...';
    formStatus.className = 'mt-3 text-end text-warning';
    try {
        const response = await fetch(`/api/upload?filename=banner-${Date.now()}-${file.name}`, { method: 'POST', body: file });
        if (!response.ok) throw new Error('Upload failed.');
        const { url } = await response.json();
        document.getElementById('bannerImage').value = url;
        formStatus.textContent = '✅ Banner uploaded successfully!';
        formStatus.className = 'mt-3 text-end text-success';
    } catch (error) {
        formStatus.textContent = `❌ Banner upload failed: ${error.message}`;
        formStatus.className = 'mt-3 text-end text-danger';
    }
}

async function handleTournamentSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('jwt_token');
    const formStatus = document.getElementById('form-status');
    const useFile = document.getElementById('methodFile').checked;
    let finalBannerUrl;

    if (useFile) {
        finalBannerUrl = document.getElementById('bannerImage').value;
        if (!finalBannerUrl) {
            formStatus.textContent = 'Please upload a banner file and wait for it to finish.';
            formStatus.className = 'mt-3 text-end text-warning';
            return;
        }
    } else {
        finalBannerUrl = document.getElementById('bannerUrl').value;
        if (!finalBannerUrl) {
            formStatus.textContent = 'Please paste a valid URL for the banner.';
            formStatus.className = 'mt-3 text-end text-warning';
            return;
        }
    }

    const tournamentData = {
        scrimId: 'SCRIM_' + Date.now(),
        bannerImage: finalBannerUrl,
        scrimName: document.getElementById('scrimName').value, game: document.getElementById('game').value, status: document.getElementById('status').value,
        slots: document.getElementById('slots').value, prizePool: document.getElementById('prizePool').value, rounds: document.getElementById('rounds').value, mode: document.getElementById('mode').value,
        regStart: document.getElementById('regStart').value, regEnd: document.getElementById('regEnd').value, scrimStart: document.getElementById('scrimStart').value, scrimEnd: document.getElementById('scrimEnd').value,
        description: document.getElementById('description').value, rules: document.getElementById('rules').value, pointTable: document.getElementById('pointTable').value,
    };
    
    formStatus.textContent = 'Creating tournament...';
    formStatus.className = 'mt-3 text-end text-info';

    try {
        const response = await fetch('/api/router?action=addTournament', { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, 
            body: JSON.stringify(tournamentData) 
        });
        if (!response.ok) throw new Error('Failed to add tournament.');

        formStatus.textContent = '✅ Tournament created successfully!';
        formStatus.className = 'mt-3 text-end text-success';
        e.target.reset();
        toggleUploadMethod();
        loadTournamentsList();
    } catch (error) {
        formStatus.textContent = `❌ Error: ${error.message}`;
        formStatus.className = 'mt-3 text-end text-danger';
    }
}

async function deleteTournament(scrimId, scrimName) {
    const token = localStorage.getItem('jwt_token');
    if (!confirm(`Are you sure you want to permanently delete "${scrimName}"?`)) return;
    try {
        const response = await fetch('/api/router?action=deleteTournament', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ scrimId }) });
        if (!response.ok) throw new Error('Failed to delete tournament.');
        alert('✅ Tournament deleted.');
        loadTournamentsList();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}


// --- 4. OTHER ADMIN PAGES ---

async function handleEditTournamentPage() {
    const token = localStorage.getItem('jwt_token');
    const scrimId = new URLSearchParams(window.location.search).get('id');
    const loader = document.getElementById('loader');
    const formContainer = document.getElementById('edit-form-container');
    if (!scrimId) { loader.innerHTML = '<p class="text-danger">No tournament ID provided.</p>'; return; }
    try {
        const response = await fetch(`/api/router?action=getTournamentDetail&id=${scrimId}`);
        if (!response.ok) throw new Error('Could not fetch tournament data.');
        const data = await response.json();
        document.getElementById('edit-title').textContent = `Edit: ${data.scrimName}`;
        const fields = ['scrimName', 'status', 'game', 'bannerImage', 'slots', 'prizePool', 'rounds', 'mode', 'description', 'rules', 'pointTable'];
        fields.forEach(f => { if(document.getElementById(f)) document.getElementById(f).value = data[f] || '' });
        const toDateTimeLocal = (iso) => iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
        ['regStart', 'regEnd', 'scrimStart', 'scrimEnd'].forEach(f => { if(document.getElementById(f)) document.getElementById(f).value = toDateTimeLocal(data[f]) });
        loader.classList.add('d-none');
        formContainer.classList.remove('d-none');
        document.getElementById('edit-tournament-form').addEventListener('submit', (e) => { e.preventDefault(); updateTournament(scrimId); });
    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

async function updateTournament(scrimId) {
    const token = localStorage.getItem('jwt_token');
    const updatedData = {
        scrimId: scrimId,
        scrimName: document.getElementById('scrimName').value, status: document.getElementById('status').value, game: document.getElementById('game').value, bannerImage: document.getElementById('bannerImage').value,
        slots: document.getElementById('slots').value, prizePool: document.getElementById('prizePool').value, rounds: document.getElementById('rounds').value, mode: document.getElementById('mode').value,
        regStart: document.getElementById('regStart').value, regEnd: document.getElementById('regEnd').value, scrimStart: document.getElementById('scrimStart').value, scrimEnd: document.getElementById('scrimEnd').value,
        description: document.getElementById('description').value, rules: document.getElementById('rules').value, pointTable: document.getElementById('pointTable').value,
    };
    try {
        const response = await fetch('/api/router?action=updateTournament', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(updatedData) });
        if (!response.ok) throw new Error('Failed to save changes.');
        alert('✅ Tournament updated successfully!');
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

async function handleUsersPage() {
    const token = localStorage.getItem('jwt_token');
    const tableBody = document.getElementById('users-body');
    const loader = document.getElementById('loader');
    const table = document.getElementById('users-table');
    try {
        const response = await fetch('/api/router?action=getUsers', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch users.');
        const users = await response.json();
        loader.classList.add('d-none');
        table.classList.remove('d-none');
        tableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `<td><img src="${user.avatar}" class="rounded-circle me-2" style="width: 32px; height: 32px;">${user.username}</td><td>${user.userId}</td><td><select class="form-select form-select-sm bg-dark text-white" data-user-id="${user.userId}" onchange="updateRole(this)"><option value="user" ${!user.siteRole || user.siteRole === 'user' ? 'selected' : ''}>User</option><option value="moderator" ${user.siteRole === 'moderator' ? 'selected' : ''}>Moderator</option><option value="manager" ${user.siteRole === 'manager' ? 'selected' : ''}>Manager</option><option value="admin" ${user.siteRole === 'admin' ? 'selected' : ''}>Admin</option></select></td>`;
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
        const response = await fetch('/api/router?action=updateUserRole', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, newRole }) });
        if (!response.ok) throw new Error('Failed to update role.');
        selectElement.style.borderColor = 'green';
        setTimeout(() => { selectElement.style.borderColor = ''; }, 2000);
    } catch (error) {
        alert(error.message);
        selectElement.style.borderColor = 'red';
    }
}

async function handleRequestsPage() {
    const token = localStorage.getItem('jwt_token');
    const tableBody = document.getElementById('requests-body');
    const loader = document.getElementById('loader');
    const table = document.getElementById('requests-table');
    const noResults = document.getElementById('no-results');
    try {
        const response = await fetch('/api/router?action=getClanRequests', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch requests.');
        const requests = await response.json();
        loader.classList.add('d-none');
        if (requests.length === 0) { noResults.classList.remove('d-none'); return; }
        table.classList.remove('d-none');
        tableBody.innerHTML = '';
        requests.forEach(req => {
            const row = document.createElement('tr');
            row.id = `request-${req.requestId}`;
            row.innerHTML = `<td>${req.username}</td><td>${req.clanName}</td><td>${new Date(req.timestamp).toLocaleDateString()}</td><td class="text-end"><button class="btn btn-sm btn-success" onclick="processRequest('${req.requestId}', '${req.userId}', '${req.clanId}', 'approve')">Approve</button><button class="btn btn-sm btn-danger ms-2" onclick="processRequest('${req.requestId}', '${req.userId}', '${req.clanId}', 'deny')">Deny</button></td>`;
            tableBody.appendChild(row);
        });
    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

async function processRequest(requestId, userId, clanId, action) {
    const token = localStorage.getItem('jwt_token');
    const row = document.getElementById(`request-${requestId}`);
    row.querySelectorAll('button').forEach(b => b.disabled = true);
    row.style.opacity = '0.5';
    try {
        const response = await fetch('/api/router?action=processClanRequest', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, userId, clanId, action }) });
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

async function handleViewRegistrationsPage() {
    const token = localStorage.getItem('jwt_token');
    const scrimId = new URLSearchParams(window.location.search).get('id');
    const loader = document.getElementById('loader');
    const tableContainer = document.getElementById('registrations-table-container');
    const tableBody = document.getElementById('registrations-body');
    const noResults = document.getElementById('no-results');
    const title = document.getElementById('tournament-title');
    if (!scrimId) { loader.innerHTML = '<p class="text-danger">No tournament ID specified.</p>'; return; }
    try {
        const tourneyResponse = await fetch(`/api/router?action=getTournamentDetail&id=${scrimId}`);
        if(tourneyResponse.ok) { title.textContent = `Registrations for: ${(await tourneyResponse.json()).scrimName}`; }
        const response = await fetch(`/api/router?action=getRegistrations&id=${scrimId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Could not load registrations.');
        const registrations = await response.json();
        loader.classList.add('d-none');
        if (registrations.length === 0) { noResults.classList.remove('d-none'); return; }
        tableContainer.classList.remove('d-none');
        tableBody.innerHTML = '';
        registrations.forEach(reg => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${reg.clanName}</td><td>${reg.captainDiscord}</td><td style="white-space: pre-wrap;">${reg.roster}</td><td>${new Date(reg.timestamp).toLocaleString()}</td>`;
            tableBody.appendChild(row);
        });
    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

async function handleMessagesPage() {
    const token = localStorage.getItem('jwt_token');
    const tableBody = document.getElementById('messages-body');
    const loader = document.getElementById('loader');
    const table = document.getElementById('messages-table');
    const noResults = document.getElementById('no-results');
    try {
        const response = await fetch('/api/router?action=getMessages', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch messages.');
        const messages = await response.json();
        loader.classList.add('d-none');
        if (messages.length === 0) { noResults.classList.remove('d-none'); return; }
        table.classList.remove('d-none');
        tableBody.innerHTML = '';
        messages.forEach(msg => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${msg.name} &lt;${msg.email}&gt;</td><td>${msg.subject}</td><td>${new Date(msg.timestamp).toLocaleDateString()}</td><td><span class="badge ${msg.status === 'unread' ? 'bg-danger' : 'bg-secondary'}">${msg.status}</span></td><td><button class="btn btn-sm btn-outline-info" onclick='viewMessage(${JSON.stringify(msg)})'>View</button></td>`;
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
    new bootstrap.Modal(document.getElementById('messageModal')).show();
}

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
        const response = await fetch('/api/router?action=getPartners');
        if (!response.ok) throw new Error('Failed to fetch partners.');
        allPartners = await response.json();
        loader.classList.add('d-none');
        container.classList.remove('d-none');
        tableBody.innerHTML = '';
        allPartners.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `<td><img src="${p.logoUrl}" style="width: 30px; height: 30px; object-fit: contain; margin-right: 10px;" alt="">${p.partnerName}</td><td>${p.category}</td><td class="text-end"><button class="btn btn-sm btn-outline-info" onclick="openEditModal('${p.partnerName}')">Edit</button><button class="btn btn-sm btn-outline-danger ms-2" onclick="deletePartner('${p.partnerName}')">Delete</button></td>`;
            tableBody.appendChild(row);
        });
    } catch (error) {
        loader.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

async function addPartner(e) {
    e.preventDefault();
    const token = localStorage.getItem('jwt_token');
    const partnerData = { partnerName: document.getElementById('partnerName').value, logoUrl: document.getElementById('logoUrl').value, websiteUrl: document.getElementById('websiteUrl').value, category: document.getElementById('category').value };
    try {
        const response = await fetch('/api/router?action=addPartner', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(partnerData) });
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
        originalName: document.getElementById('editOriginalName').value, partnerName: document.getElementById('editPartnerName').value, logoUrl: document.getElementById('editLogoUrl').value,
        websiteUrl: document.getElementById('editWebsiteUrl').value, category: document.getElementById('editCategory').value,
    };
    try {
        const response = await fetch('/api/router?action=updatePartner', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(updatedData) });
        if (!response.ok) throw new Error('Failed to update partner.');
        editPartnerModal.hide();
        loadPartnersList();
    } catch (error) { alert(error.message); }
}

async function deletePartner(partnerName) {
    if (!confirm(`Are you sure you want to delete ${partnerName}?`)) return;
    const token = localStorage.getItem('jwt_token');
    try {
        const response = await fetch('/api/router?action=deletePartner', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ partnerName }) });
        if (!response.ok) throw new Error('Failed to delete partner.');
        loadPartnersList();
    } catch (error) { alert(error.message); }
}