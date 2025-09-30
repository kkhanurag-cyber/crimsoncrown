document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const clanId = params.get('id');
    const token = localStorage.getItem('jwt_token');

    const loader = document.getElementById('loader');
    const clanContent = document.getElementById('clan-content');

    if (!clanId) {
        loader.innerHTML = '<p class="text-danger text-center">Error: No clan ID provided.</p>';
        return;
    }

    try {
        const response = await fetch(`/.netlify/functions/getClanDetail?id=${clanId}`);
        if (!response.ok) throw new Error('Could not find the specified clan.');
        const clan = await response.json();

        // Populate clan details
        document.title = `${clan.clanName} - Crimson Crown`;
        document.getElementById('clan-logo').src = clan.clanLogo;
        document.getElementById('clan-name').textContent = `[${clan.clanTag}] ${clan.clanName}`;
        document.getElementById('clan-captain').innerHTML = `<span><i class="fas fa-crown"></i> Captain: <strong>${clan.captainName}</strong></span>`;

        // Populate roster
        const rosterList = document.getElementById('roster-list');
        if (clan.roster && clan.roster.length > 0) {
            clan.roster.forEach(member => {
                rosterList.innerHTML += `<li class="list-group-item bg-transparent text-light">${member}</li>`;
            });
        } else {
            rosterList.innerHTML = `<li class="list-group-item bg-transparent text-secondary text-center">This clan's roster is not public.</li>`;
        }

        // Handle "Join Clan" button logic
        const joinButtonContainer = document.getElementById('join-button-container');
        if (token) {
            const user = JSON.parse(atob(token.split('.')[1]));
            if (user.clanId) {
                if (user.clanId === clanId) {
                    joinButtonContainer.innerHTML = `<button class="btn btn-success disabled">You are in this clan</button>`;
                } else {
                    joinButtonContainer.innerHTML = `<button class="btn btn-secondary disabled">You are already in another clan</button>`;
                }
            } else {
                joinButtonContainer.innerHTML = `<button id="join-clan-btn" class="btn btn-brand">Request to Join</button>`;
                document.getElementById('join-clan-btn').addEventListener('click', () => requestToJoin(clan.clanId, clan.clanName));
            }
        } else {
            // If user is not logged in
            const loginUrl = `/.netlify/functions/discord-auth-start?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            joinButtonContainer.innerHTML = `<a href="${loginUrl}" class="btn btn-brand">Login to Join Clan</a>`;
        }
        
        loader.classList.add('d-none');
        clanContent.classList.remove('d-none');

    } catch (error) {
        console.error(error);
        loader.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
    }
});

async function requestToJoin(clanId, clanName) {
    const token = localStorage.getItem('jwt_token');
    const joinButton = document.getElementById('join-clan-btn');
    joinButton.disabled = true;
    joinButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Sending...`;

    try {
        const response = await fetch('/.netlify/functions/createClanRequest', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ clanId, clanName })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error);
        }
        
        joinButton.classList.remove('btn-brand');
        joinButton.classList.add('btn-warning');
        joinButton.textContent = 'Request Sent!';

    } catch (error) {
        alert(`Error: ${error.message}`);
        joinButton.disabled = false;
        joinButton.innerHTML = `Request to Join`;
    }
}