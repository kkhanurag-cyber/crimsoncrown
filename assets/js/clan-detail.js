/*
=================================================
Crimson Crown - Clan Detail Page Script (v2.0 - Vercel)
=================================================
This script handles the logic for viewing a single clan's public profile. It:
1. Gets the clan ID from the URL.
2. Fetches the detailed data for that specific clan.
3. Populates the page with the clan's logo, name, captain, and roster.
4. Intelligently displays a "Join" button, "Login to Join," or a status message based on the user's login and clan status.
5. Handles the "Request to Join" button click.
*/

document.addEventListener('DOMContentLoaded', async () => {
    // Get the query parameters from the current URL (e.g., ?id=CLAN123).
    const params = new URLSearchParams(window.location.search);
    const clanId = params.get('id');
    const token = localStorage.getItem('jwt_token');

    const loader = document.getElementById('loader');
    const clanContent = document.getElementById('clan-content');

    if (!clanId) {
        loader.innerHTML = '<p class="text-danger text-center">Error: No clan ID was provided in the URL.</p>';
        return;
    }

    try {
        // Fetch the detailed data for this specific clan.
        const response = await fetch(`/api/router?action=getClanDetail&id=${clanId}`);
        if (!response.ok) {
            throw new Error('Could not find the specified clan. It may have been deleted or the link is incorrect.');
        }
        const clan = await response.json();

        // --- Populate the page with the fetched clan data ---

        document.title = `${clan.clanName} - Crimson Crown`;
        document.getElementById('clan-logo').src = clan.clanLogo;
        document.getElementById('clan-name').textContent = `[${clan.clanTag}] ${clan.clanName}`;
        document.getElementById('clan-captain').innerHTML = `<span><i class="fas fa-crown"></i> Captain: <strong>${clan.captainName}</strong></span>`;

        // Populate the roster list.
        const rosterList = document.getElementById('roster-list');
        if (clan.roster && clan.roster.length > 0) {
            clan.roster.forEach(member => {
                rosterList.innerHTML += `<li class="list-group-item bg-transparent text-light">${member}</li>`;
            });
        } else {
            rosterList.innerHTML = `<li class="list-group-item bg-transparent text-secondary text-center">This clan's roster is not public.</li>`;
        }

        // --- Handle the "Join Clan" button logic ---
        const joinButtonContainer = document.getElementById('join-button-container');
        if (token) {
            // User is logged in. Check their status.
            const user = JSON.parse(atob(token.split('.')[1]));
            if (user.clanId) {
                if (user.clanId === clanId) {
                    // User is already a member of this clan.
                    joinButtonContainer.innerHTML = `<button class="btn btn-success disabled">You are in this clan</button>`;
                } else {
                    // User is in a different clan.
                    joinButtonContainer.innerHTML = `<button class="btn btn-secondary disabled">You are already in another clan</button>`;
                }
            } else {
                // User is logged in but not in a clan, so show the join button.
                joinButtonContainer.innerHTML = `<button id="join-clan-btn" class="btn btn-brand">Request to Join</button>`;
                document.getElementById('join-clan-btn').addEventListener('click', () => requestToJoin(clan.clanId, clan.clanName));
            }
        } else {
            // User is not logged in. Prompt them to log in to join.
            // The login link includes a redirect back to this specific clan page.
            const loginUrl = `/api/discord-auth-start?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            joinButtonContainer.innerHTML = `<a href="${loginUrl}" class="btn btn-brand">Login to Join Clan</a>`;
        }
        
        // Hide the loader and show the populated content.
        loader.classList.add('d-none');
        clanContent.classList.remove('d-none');

    } catch (error) {
        console.error("Error loading clan details:", error);
        loader.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
    }
});

/**
 * Handles the "Request to Join" button click.
 * @param {string} clanId - The unique ID of the clan the user wants to join.
 * @param {string} clanName - The name of the clan.
 */
async function requestToJoin(clanId, clanName) {
    const token = localStorage.getItem('jwt_token');
    const joinButton = document.getElementById('join-clan-btn');
    joinButton.disabled = true;
    joinButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Sending Request...`;

    try {
        const response = await fetch('/api/router?action=createClanRequest', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clanId, clanName })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to send request.");
        }
        
        // Provide success feedback to the user.
        joinButton.classList.remove('btn-brand');
        joinButton.classList.add('btn-warning');
        joinButton.textContent = 'Request Sent!';

    } catch (error) {
        alert(`Error: ${error.message}`);
        // Re-enable the button if an error occurs.
        joinButton.disabled = false;
        joinButton.innerHTML = `Request to Join`;
    }
}