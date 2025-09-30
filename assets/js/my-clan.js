document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        window.location.href = '/'; // Redirect if not logged in
        return;
    }
    
    const loader = document.getElementById('loader');
    const noClanPrompt = document.getElementById('no-clan-prompt');
    const clanDashboard = document.getElementById('clan-dashboard');

    try {
        const response = await fetch('/.netlify/functions/getMyClan', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 404) { // User is not in a clan
            loader.classList.add('d-none');
            noClanPrompt.classList.remove('d-none');
            return;
        }
        if (!response.ok) throw new Error('Failed to fetch clan data.');
        
        const { clanDetails, pendingRequests } = await response.json();

        // Populate Clan Info
        document.getElementById('clan-logo').src = clanDetails.clanLogo;
        document.getElementById('clan-name').textContent = `[${clanDetails.clanTag}] ${clanDetails.clanName}`;

        // Populate Roster
        const rosterList = document.getElementById('roster-list');
        clanDetails.roster.forEach(member => {
            rosterList.innerHTML += `<li class="list-group-item bg-transparent text-light">${member}</li>`;
        });
        
        // Populate Join Requests (if any)
        const requestsList = document.getElementById('requests-list');
        if (pendingRequests && pendingRequests.length > 0) {
             pendingRequests.forEach(req => {
                requestsList.innerHTML += `
                    <div id="req-${req.requestId}" class="d-flex justify-content-between align-items-center mb-2">
                        <span>${req.username}</span>
                        <div>
                            <button class="btn btn-sm btn-success" onclick="manageRequest('${req.requestId}', '${req.userId}', '${clanDetails.clanId}', 'approve')">Approve</button>
                            <button class="btn btn-sm btn-danger" onclick="manageRequest('${req.requestId}', '${req.userId}', '${clanDetails.clanId}', 'deny')">Deny</button>
                        </div>
                    </div>
                `;
            });
        } else {
             document.getElementById('requests-panel').classList.add('d-none'); // Hide panel if no requests
        }

        loader.classList.add('d-none');
        clanDashboard.classList.remove('d-none');
    } catch (error) {
        console.error(error);
        loader.innerHTML = '<p class="text-danger">Could not load your clan data. Please try again.</p>';
    }
});

async function manageRequest(requestId, userId, clanId, action) {
    const token = localStorage.getItem('jwt_token');
    const row = document.getElementById(`req-${requestId}`);
    row.style.pointerEvents = 'none';
    row.style.opacity = '0.5';

    try {
        const response = await fetch('/.netlify/functions/manageClanRequest', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ requestId, userId, clanId, action })
        });
        if (!response.ok) throw new Error(`Failed to ${action} request.`);
        
        row.style.transition = 'opacity 0.5s ease';
        row.style.opacity = '0';
        setTimeout(() => row.remove(), 500);

    } catch (error) {
        alert(error.message);
        row.style.pointerEvents = 'auto';
        row.style.opacity = '1';
    }
}