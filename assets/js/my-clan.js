/*
=================================================
Crimson Crown - My Clan Page Script (v2.1 - Final)
=================================================
This script handles the user's personal clan dashboard. It:
1. Checks if the user is logged in. If not, it redirects them.
2. Fetches the user's specific clan data from the backend API router.
3. Displays a "Not in a Clan" prompt with action buttons if the user isn't in one.
4. Populates the page with the clan's details (logo, name, roster) using the new professional layout.
5. If the user is the clan leader, it also fetches and displays pending join requests.
6. Handles the logic for the leader to approve or deny these requests.
7. Implements the "Leave Clan" functionality.
*/

// The main function runs as soon as the basic HTML document structure has been loaded.
document.addEventListener('DOMContentLoaded', async () => {
    // Get the user's login token from local storage.
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        // If the user is not logged in, they cannot have a clan. Redirect them to the homepage.
        window.location.href = '/';
        return;
    }
    
    // Get references to all the major page elements that this script will manipulate.
    const loader = document.getElementById('loader');
    const noClanPrompt = document.getElementById('no-clan-prompt');
    const clanDashboard = document.getElementById('clan-dashboard');

    try {
        // Fetch the user's clan data from our secure API router.
        // We send the user's JWT in the Authorization header to identify them.
        const response = await fetch('/api/router?action=getMyClan', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // The backend returns a 404 status if the user's token shows they are not in a clan.
        if (response.status === 404) {
            // Hide the loader and show the "Not in a clan" message and action buttons.
            loader.classList.add('d-none');
            noClanPrompt.classList.remove('d-none');
            return;
        }
        if (!response.ok) {
            // Handle other potential server errors.
            throw new Error('Failed to fetch your clan data.');
        }
        
        // Parse the JSON response from the server.
        const { clanDetails, pendingRequests } = await response.json();

        // --- Populate the Clan Dashboard with the fetched data ---

        // 1. Populate the main clan header.
        document.getElementById('clan-logo').src = clanDetails.clanLogo;
        document.getElementById('clan-logo').onerror = () => { document.getElementById('clan-logo').src = 'assets/images/default-logo.png'; };
        document.getElementById('clan-name').textContent = `[${clanDetails.clanTag}] ${clanDetails.clanName}`;
        document.querySelectorAll('.clan-name-span').forEach(el => el.textContent = clanDetails.clanName);
        document.getElementById('clan-description').textContent = clanDetails.description || 'This clan has not set a description yet.';

        // 2. Populate the roster list and member count.
        const rosterList = document.getElementById('roster-list');
        const memberCountEl = document.getElementById('member-count');
        const rosterMembers = clanDetails.roster.length > 0 ? clanDetails.roster : [clanDetails.captainName];
        memberCountEl.textContent = rosterMembers.length;
        rosterList.innerHTML = ''; // Clear any placeholder content.
        rosterMembers.forEach(member => {
            const isCaptain = member.toLowerCase() === clanDetails.captainName.toLowerCase();
            rosterList.innerHTML += `
                <li class="list-group-item bg-transparent text-light ps-0 d-flex justify-content-between align-items-center">
                    ${member}
                    ${isCaptain ? '<span class="badge bg-danger">Captain</span>' : ''}
                </li>`;
        });
        
        // 3. Populate the Join Requests panel (this only runs if the user is the leader).
        const requestsPanel = document.getElementById('requests-panel');
        const requestsList = document.getElementById('requests-list');
        const user = JSON.parse(atob(token.split('.')[1]));
        if (user.userId === clanDetails.captainId && pendingRequests) {
            requestsPanel.classList.remove('d-none');
            if (pendingRequests.length > 0) {
                 requestsList.innerHTML = ''; // Clear placeholders.
                 pendingRequests.forEach(req => {
                    requestsList.innerHTML += `
                        <div id="req-${req.requestId}" class="d-flex justify-content-between align-items-center mb-3 p-2 rounded" style="background-color: var(--midnight-black);">
                            <span class="text-light">${req.username}</span>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-success" onclick="manageRequest('${req.requestId}', '${req.userId}', '${clanDetails.clanId}', 'approve')">Approve</button>
                                <button class="btn btn-sm btn-danger" onclick="manageRequest('${req.requestId}', '${req.userId}', '${clanDetails.clanId}', 'deny')">Deny</button>
                            </div>
                        </div>
                    `;
                });
            } else {
                 requestsList.innerHTML = '<p class="text-secondary text-center">No pending join requests.</p>';
            }
        }
        
        // Add an event listener to the "Leave Clan" button.
        document.getElementById('leave-clan-btn').addEventListener('click', leaveClan);

        // Hide the loader and show the fully populated dashboard.
        loader.classList.add('d-none');
        clanDashboard.classList.remove('d-none');
    } catch (error) {
        console.error("Error loading 'My Clan' page:", error);
        loader.innerHTML = '<p class="text-danger">Could not load your clan data. Please try again.</p>';
    }
});

/**
 * Handles the clan leader's action to approve or deny a join request.
 * @param {string} requestId - The unique ID of the request.
 * @param {string} userId - The unique ID of the user who made the request.
 * @param {string} clanId - The ID of the clan they are requesting to join.
 * @param {string} action - The action to perform ('approve' or 'deny').
 */
async function manageRequest(requestId, userId, clanId, action) {
    const token = localStorage.getItem('jwt_token');
    const row = document.getElementById(`req-${requestId}`);
    // Disable the buttons on the row to prevent multiple clicks while processing.
    row.querySelectorAll('button').forEach(btn => btn.disabled = true);
    row.style.opacity = '0.5';

    try {
        const response = await fetch('/api/router?action=manageClanRequest', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requestId, userId, clanId, action })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to ${action} request.`);
        }
        
        // On success, smoothly fade out and remove the request from the UI.
        row.style.transition = 'opacity 0.5s ease';
        row.style.opacity = '0';
        setTimeout(() => {
            row.remove();
            // If this was the last request, show a "no requests" message.
            if (document.getElementById('requests-list').children.length === 0) {
                 document.getElementById('requests-list').innerHTML = '<p class="text-secondary text-center">No pending requests.</p>';
            }
        }, 500);

    } catch (error) {
        alert(error.message);
        // If an error occurs, re-enable the buttons so the leader can try again.
        row.style.opacity = '1';
        row.querySelectorAll('button').forEach(btn => btn.disabled = false);
    }
}

/**
 * Handles the "Leave Clan" button click.
 */
async function leaveClan() {
    if (!confirm('Are you sure you want to leave this clan? This action cannot be undone.')) {
        return;
    }
    const token = localStorage.getItem('jwt_token');
    try {
        const response = await fetch('/api/router?action=leaveClan', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to leave the clan.');
        }
        
        // If the backend sends back a new, updated token (without clan info), save it.
        if(result.token) {
            localStorage.setItem('jwt_token', result.token);
        }
        // Reload the page. The user will now see the "not in a clan" prompt.
        window.location.reload();

    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}