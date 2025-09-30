/*
=================================================
Crimson Crown - My Clan Page Script
=================================================
This script handles the user's personal clan dashboard. It:
1. Checks if the user is logged in.
2. Fetches the user's specific clan data from the backend.
3. Displays a "Not in a Clan" prompt if the user isn't in one.
4. Populates the page with the clan's details (logo, name, roster).
5. If the user is the clan leader, it also fetches and displays pending join requests.
6. Handles the logic for the leader to approve or deny these requests.
*/

document.addEventListener('DOMContentLoaded', async () => {
    // Get the user's login token from local storage.
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        // If the user is not logged in, they can't have a clan. Redirect them to the homepage to log in.
        window.location.href = '/';
        return;
    }
    
    // Get references to all the major page elements.
    const loader = document.getElementById('loader');
    const noClanPrompt = document.getElementById('no-clan-prompt');
    const clanDashboard = document.getElementById('clan-dashboard');

    try {
        // Fetch the user's clan data from our secure serverless function.
        // We send the user's JWT in the Authorization header to identify them.
        const response = await fetch('/.netlify/functions/getMyClan', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 404) {
            // The backend returns 404 if the user is not in a clan.
            // Hide the loader and show the "Not in a clan" message.
            loader.classList.add('d-none');
            noClanPrompt.classList.remove('d-none');
            return;
        }
        if (!response.ok) {
            // Handle other potential server errors.
            throw new Error('Failed to fetch your clan data.');
        }
        
        const { clanDetails, pendingRequests } = await response.json();

        // --- Populate the Clan Dashboard with the fetched data ---

        // 1. Populate the main clan header.
        document.getElementById('clan-logo').src = clanDetails.clanLogo;
        document.getElementById('clan-name').textContent = `[${clanDetails.clanTag}] ${clanDetails.clanName}`;

        // 2. Populate the roster list.
        const rosterList = document.getElementById('roster-list');
        if (clanDetails.roster && clanDetails.roster.length > 0) {
            clanDetails.roster.forEach(member => {
                const isCaptain = member === clanDetails.captainName;
                rosterList.innerHTML += `
                    <li class="list-group-item bg-transparent text-light d-flex justify-content-between align-items-center">
                        ${member}
                        ${isCaptain ? '<span class="badge bg-danger">Captain</span>' : ''}
                    </li>
                `;
            });
        } else {
             rosterList.innerHTML = `<li class="list-group-item bg-transparent text-secondary">No members listed in the roster.</li>`;
        }
        
        // 3. Populate the Join Requests panel (this only runs if the backend sent requests).
        const requestsPanel = document.getElementById('requests-panel');
        const requestsList = document.getElementById('requests-list');
        if (pendingRequests && pendingRequests.length > 0) {
             pendingRequests.forEach(req => {
                requestsList.innerHTML += `
                    <div id="req-${req.requestId}" class="d-flex justify-content-between align-items-center mb-3 p-2 rounded" style="background-color: #1a1a1a;">
                        <span class="text-light">${req.username}</span>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-success" onclick="manageRequest('${req.requestId}', '${req.userId}', '${clanDetails.clanId}', 'approve')">Approve</button>
                            <button class="btn btn-sm btn-danger" onclick="manageRequest('${req.requestId}', '${req.userId}', '${clanDetails.clanId}', 'deny')">Deny</button>
                        </div>
                    </div>
                `;
            });
        } else {
             // If there are no pending requests, hide the entire panel.
             requestsPanel.classList.add('d-none');
        }

        // Hide the loader and show the fully populated dashboard.
        loader.classList.add('d-none');
        clanDashboard.classList.remove('d-none');

    } catch (error) {
        console.error("Error loading 'My Clan' page:", error);
        loader.innerHTML = '<p class="text-danger">Could not load your clan data. Please try logging in again.</p>';
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
        const response = await fetch('/.netlify/functions/manageClanRequest', {
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
            // Optional: If this was the last request, show a "no requests" message.
            if (document.getElementById('requests-list').children.length === 0) {
                 document.getElementById('requests-panel').classList.add('d-none');
            }
        }, 500);

    } catch (error) {
        alert(error.message);
        // If an error occurs, re-enable the buttons so the leader can try again.
        row.style.opacity = '1';
        row.querySelectorAll('button').forEach(btn => btn.disabled = false);
    }
}