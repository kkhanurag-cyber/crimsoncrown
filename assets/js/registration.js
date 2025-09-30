document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('jwt_token');
    const params = new URLSearchParams(window.location.search);
    const scrimId = params.get('scrimId');

    const loader = document.getElementById('loader');
    const formContainer = document.getElementById('registration-form-container');
    const tournamentNameEl = document.getElementById('tournament-name');
    const tournamentGameEl = document.getElementById('tournament-game');
    
    // 1. Check for Login Token
    if (!token) {
        const redirectUrl = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
        window.location.href = `/.netlify/functions/discord-auth-start?redirect=${redirectUrl}`;
        return;
    }

    // 2. Check for Tournament ID
    if (!scrimId) {
        tournamentNameEl.textContent = "Invalid Tournament Link";
        tournamentGameEl.textContent = "Please register from the tournaments page.";
        loader.classList.add('d-none');
        return;
    }

    try {
        // 3. Verify User's Clan Status and Role
        const userRes = await fetch('/.netlify/functions/getUser', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!userRes.ok) throw new Error('Could not verify your user status.');
        const user = await userRes.json();

        if (!user.clanId) {
            const noClanModal = new bootstrap.Modal(document.getElementById('no-clan-modal'));
            noClanModal.show();
            tournamentNameEl.textContent = "Clan Membership Required";
            loader.classList.add('d-none');
            return;
        }

        if (user.clanRole !== 'leader' && user.clanRole !== 'co-leader') {
            const authRoleModal = new bootstrap.Modal(document.getElementById('auth-role-modal'));
            authRoleModal.show();
            tournamentNameEl.textContent = "Authorization Required";
            loader.classList.add('d-none');
            return;
        }

        // 4. If checks pass, fetch tournament details
        const tourneyRes = await fetch(`/.netlify/functions/getTournamentDetail?id=${scrimId}`);
        if (!tourneyRes.ok) throw new Error('Could not find the specified tournament.');
        const tournament = await tourneyRes.json();
        
        // 5. Populate page and hidden form fields
        tournamentNameEl.textContent = `Register for ${tournament.scrimName}`;
        tournamentGameEl.textContent = `Game: ${tournament.game} | Mode: ${tournament.mode}`;
        document.getElementById('scrimId').value = scrimId;
        document.getElementById('clanId').value = user.clanId;
        
        // Pre-fill clan name if we can get it from the user's token
        const payload = JSON.parse(atob(token.split('.')[1]));
        if(payload.clanId === user.clanId && payload.clanName) {
            document.getElementById('clanName').value = payload.clanName;
        }
        
        // 6. Show the form and attach submit listener
        loader.classList.add('d-none');
        formContainer.classList.remove('d-none');
        document.getElementById('tournament-registration-form').addEventListener('submit', handleTournamentRegistration);

    } catch (error) {
        loader.classList.add('d-none');
        tournamentNameEl.textContent = "Error";
        tournamentGameEl.textContent = error.message;
    }
});

async function handleTournamentRegistration(event) {
    event.preventDefault();
    const token = localStorage.getItem('jwt_token');

    const submitButton = document.getElementById('submit-button');
    const buttonText = document.getElementById('submit-button-text');
    const buttonSpinner = document.getElementById('submit-spinner');
    const formStatus = document.getElementById('form-status');

    submitButton.disabled = true;
    buttonText.textContent = 'Submitting...';
    buttonSpinner.classList.remove('d-none');
    formStatus.textContent = '';

    const registrationData = {
        scrimId: document.getElementById('scrimId').value,
        clanId: document.getElementById('clanId').value,
        clanName: document.getElementById('clanName').value,
        captainDiscord: document.getElementById('captainDiscord').value,
        roster: document.getElementById('roster').value,
    };

    try {
        const response = await fetch('/.netlify/functions/registerForTournament', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(registrationData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Registration failed.');
        }

        document.getElementById('registration-form-container').innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-check-circle text-success fa-3x mb-3"></i>
                <h3 class="text-success">Registration Successful!</h3>
                <p class="text-secondary">Your clan has been registered for the tournament.</p>
                <a href="tournaments.html" class="btn btn-brand mt-3">Back to Tournaments</a>
            </div>
        `;

    } catch (error) {
        formStatus.textContent = `❌ Error: ${error.message}`;
        formStatus.classList.add('text-danger');
    } finally {
        submitButton.disabled = false;
        buttonText.textContent = 'Register Team';
        buttonSpinner.classList.add('d-none');
    }
}