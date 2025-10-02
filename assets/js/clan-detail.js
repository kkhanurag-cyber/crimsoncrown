/*
=================================================
Crimson Crown - Clan Detail Page Script (v2.1 - Final)
=================================================
This script handles the logic for viewing a single clan's public profile. It:
1. Gets the clan ID from the URL's query parameters (e.g., ?id=CLAN123).
2. Fetches the detailed data for that specific clan from the API router.
3. Populates the page with the clan's logo, name, captain, and roster using the new professional layout.
4. Intelligently displays a "Request to Join" button, "Login to Join," or a status message 
   based on the user's current login and clan status.
5. Handles the "Request to Join" button click by sending a secure request to the backend.
*/

// The main function runs as soon as the basic HTML document structure has been loaded.
document.addEventListener('DOMContentLoaded', async () => {
    // Get the query parameters from the current URL to find the clan ID.
    const params = new URLSearchParams(window.location.search);
    const clanId = params.get('id');
    // Get the user's login token from local storage to check their status.
    const token = localStorage.getItem('jwt_token');

    // Get references to the key HTML elements that this script will interact with.
    const loader = document.getElementById('loader');
    const clanContent = document.getElementById('clan-content');

    // If no clan ID is found in the URL, the page cannot load. Show an error and stop.
    if (!clanId) {
        loader.innerHTML = '<p class="text-danger text-center">Error: No clan ID was provided in the URL.</p>';
        return;
    }

    try {
        // --- FETCH CLAN DATA ---
        // Send a GET request to our single API router, specifying the 'getClanDetail' action and the ID.
        const response = await fetch(`/api/router?action=getClanDetail&id=${clanId}`);
        if (!response.ok) {
            // If the server responds with an error (e.g., 404 Not Found), throw an error.
            throw new Error('Could not find the specified clan. It may have been deleted or the link is incorrect.');
        }
        const clan = await response.json();

        // --- POPULATE THE PAGE WITH FETCHED DATA ---

        // Set the browser tab's title to the clan's name for better SEO and user experience.
        document.title = `${clan.clanName} - Crimson Crown`;
        
        // Populate the main hero section with the clan's identity.
        document.getElementById('clan-logo').src = clan.clanLogo;
        document.getElementById('clan-name').textContent = `[${clan.clanTag}] ${clan.clanName}`;
        
        // Populate all other instances of the clan name on the page for consistency.
        document.querySelectorAll('.clan-name-span').forEach(span => span.textContent = clan.clanName);
        
        // Populate the leadership section.
        const leadershipList = document.getElementById('clan-leadership-list');
        leadershipList.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-crown text-danger me-3 fa-2x"></i>
                <div>
                    <h5 class="mb-0">${clan.captainName}</h5>
                    <small class="text-secondary">Clan Captain</small>
                </div>
            </div>
        `;

        // Populate the roster list and member count.
        const rosterList = document.getElementById('roster-list');
        const memberCountEl = document.getElementById('member-count');
        // Combine the captain's name with the rest of the roster, ensuring no duplicates.
        const rosterMembers = [clan.captainName, ...clan.roster.filter(m => m.toLowerCase() !== clan.captainName.toLowerCase())];
        memberCountEl.textContent = rosterMembers.length;
        rosterList.innerHTML = ''; // Clear any placeholder content.
        rosterMembers.forEach(member => {
            const isCaptain = member.toLowerCase() === clan.captainName.toLowerCase();
            rosterList.innerHTML += `
                <li class="list-group-item bg-transparent text-light ps-0 d-flex justify-content-between align-items-center">
                    ${member}
                    ${isCaptain ? '<span class="badge bg-danger">Captain</span>' : ''}
                </li>`;
        });
        
        // --- HANDLE THE "JOIN CLAN" BUTTON LOGIC ---
        const joinButtonContainer = document.getElementById('join-button-container');
        if (token) {
            // If the user is logged in, decode their token to check their clan status.
            const user = JSON.parse(atob(token.split('.')[1]));
            if (user.clanId) {
                if (user.clanId === clanId) {
                    // User is already a member of this clan. Link them to their personal clan dashboard.
                    joinButtonContainer.innerHTML = `<a href="my-clan.html" class="btn btn-success">You are in this clan</a>`;
                } else {
                    // User is in a different clan. They must leave it before joining another.
                    joinButtonContainer.innerHTML = `<button class="btn btn-secondary disabled">You are in another clan</button>`;
                }
            } else {
                // User is logged in but not in a clan, so show the "Request to Join" button.
                joinButtonContainer.innerHTML = `<button id="join-clan-btn" class="btn btn-brand">Request to Join</button>`;
                document.getElementById('join-clan-btn').addEventListener('click', () => requestToJoin(clan.clanId, clan.clanName));
            }
        } else {
            // If the user is not logged in, show a button that prompts them to log in.
            // The login link includes a redirect back to this specific clan page so they don't lose their place.
            const loginUrl = `/api/router?action=discord-auth-start&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            joinButtonContainer.innerHTML = `<a href="${loginUrl}" class="btn btn-brand">Login to Join Clan</a>`;
        }
        
        // Hide the loader and show the fully populated content.
        loader.classList.add('d-none');
        clanContent.classList.remove('d-none');

    } catch (error) {
        // This block runs if any part of the process fails.
        console.error("Error loading clan details:", error);
        loader.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
    }
});

/**
 * Handles the "Request to Join" button click by sending a secure request to the backend.
 * @param {string} clanId - The unique ID of the clan the user wants to join.
 * @param {string} clanName - The name of the clan.
 */
async function requestToJoin(clanId, clanName) {
    const token = localStorage.getItem('jwt_token');
    const joinButton = document.getElementById('join-clan-btn');
    
    // UI Feedback: Show loading state on the button to prevent multiple clicks.
    joinButton.disabled = true;
    joinButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Sending Request...`;

    try {
        // Send the request to the API router with the 'createClanRequest' action.
        const response = await fetch('/api/router?action=createClanRequest', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, // The user's JWT proves who they are.
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clanId, clanName })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to send request.");
        }
        
        // UI Feedback: Show success state on the button. The user cannot click it again.
        joinButton.classList.remove('btn-brand');
        joinButton.classList.add('btn-warning');
        joinButton.textContent = 'Request Sent!';

    } catch (error) {
        alert(`Error: ${error.message}`);
        // Re-enable the button if an error occurs so the user can try again.
        joinButton.disabled = false;
        joinButton.innerHTML = `Request to Join`;
    }
}