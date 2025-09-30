/*
=================================================
Crimson Crown - Tournament Registration Script
=================================================
This script handles the logic for the tournament registration page. It:
1. Checks for a tournament ID in the URL.
2. Checks if the user is logged in via their JWT.
3. Fetches the user's data to verify if they are in a clan and have the correct role (leader/co-leader).
4. Shows different pop-up modals based on the user's status.
5. If authorized, it fetches tournament details and shows the registration form.
6. Handles the final form submission to a secure backend function.
*/

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('jwt_token');
    const params = new URLSearchParams(window.location.search);
    const scrimId = params.get('scrimId');

    const loader = document.getElementById('loader');
    const formContainer = document.getElementById('registration-form-container');
    const tournamentNameEl = document.getElementById('tournament-name');
    const tournamentGameEl = document.getElementById('tournament-game');
    
    // --- 1. Check for Login Token ---
    if (!token) {
        // If the user is not logged in, we must redirect them.
        // We pass the current page's URL as a 'redirect' parameter.
        // After they log in, Discord will send them back to this exact registration page.
        const redirectUrl = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
        window.location.href = `/.netlify/functions/discord-auth-start?redirect=${redirectUrl}`;
        return;
    }

    // --- 2. Check for a Tournament ID in the URL ---
    if (!scrimId) {
        tournamentNameEl.textContent = "Invalid Tournament Link";
        tournamentGameEl.textContent = "Please register by clicking a 'Register' button on the tournaments page.";
        loader.classList.add('d-none');
        return;
    }

    try {
        // --- 3. Verify User's Clan Status and Role ---
        // Fetch the user's data from our secure backend function.
        const userRes = await fetch('/.netlify/functions/getUser', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!userRes.ok) throw new Error('Could not verify your user status. Please try logging in again.');
        const user = await userRes.json();

        // Check if the user is in a clan.
        if (!user.clanId) {
            const noClanModal = new bootstrap.Modal(document.getElementById('no-clan-modal'));
            noClanModal.show();
            tournamentNameEl.textContent = "Clan Membership Required";
            loader.classList.add('d-none');
            return;
        }

        // Check if the user has the required role (leader or co-leader).
        if (user.clanRole !== 'leader' && user.clanRole !== 'co-leader') {
            const authRoleModal = new bootstrap.Modal(document.getElementById('auth-role-modal'));
            authRoleModal.show();
            tournamentNameEl.textContent = "Authorization Required";
            loader.classList.add('d-none');
            return;
        }

        // --- 4. If all checks pass, fetch tournament details ---
        const tourneyRes = await fetch(`/.netlify/functions/getTournamentDetail?id=${scrimId}`);
        if (!tourneyRes.ok) throw new Error('Could not find the specified tournament.');
        const tournament = await tourneyRes.json();
        
        // --- 5. Populate the page and hidden form fields ---
        tournamentNameEl.textContent = `Register for: ${tournament.scrimName}`;
        tournamentGameEl.textContent = `Game: ${tournament.game} | Mode: ${tournament.mode}`;
        document.getElementById('scrimId').value = scrimId;
        document.getElementById('clanId').value = user.clanId;
        
        // Attempt to pre-fill the clan name by decoding the JWT (if available).
        const payload = JSON.parse(atob(token.split('.')[1]));
        if(payload.clanId === user.clanId && payload.clanName) {
            document.getElementById('clanName').value = payload.clanName;
        }
        
        // --- 6. Show the form and attach the submit listener ---
        loader.classList.add('d-none');
        formContainer.classList.remove('d-none');
        document.getElementById('tournament-registration-form').addEventListener('submit', handleTournamentRegistration);

    } catch (error) {
        loader.classList.add('d-none');
        tournamentNameEl.textContent = "An Error Occurred";
        tournamentGameEl.textContent = error.message;
        tournamentGameEl.classList.add('text-danger');
    }
});

/**
 * Handles the final submission of the tournament registration form.
 * @param {Event} event - The form submission event.
 */
async function handleTournamentRegistration(event) {
    event.preventDefault();
    const token = localStorage.getItem('jwt_token');

    const submitButton = document.getElementById('submit-button');
    const buttonText = document.getElementById('submit-button-text');
    const buttonSpinner = document.getElementById('submit-spinner');
    const formStatus = document.getElementById('form-status');

    // UI feedback: show loading state.
    submitButton.disabled = true;
    buttonText.textContent = 'Submitting...';
    buttonSpinner.classList.remove('d-none');
    formStatus.textContent = '';
    formStatus.classList.remove('text-success', 'text-danger');

    // Collect all data from the form.
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
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
             },
            body: JSON.stringify(registrationData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Registration failed.');
        }

        // On success, replace the form with a success message.
        document.getElementById('registration-form-container').innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-check-circle text-success fa-3x mb-3"></i>
                <h3 class="text-success">Registration Successful!</h3>
                <p class="text-secondary">Your clan is now registered for this tournament. Good luck!</p>
                <a href="tournaments.html" class="btn btn-brand mt-3">Back to Tournaments</a>
            </div>
        `;

    } catch (error) {
        // Handle errors.
        formStatus.textContent = `❌ Error: ${error.message}`;
        formStatus.classList.add('text-danger');
    } finally {
        // Re-enable the button regardless of success or failure.
        submitButton.disabled = false;
        buttonText.textContent = 'Register Team';
        buttonSpinner.classList.add('d-none');
    }
}