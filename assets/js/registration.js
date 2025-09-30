document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const scrimId = params.get('scrimId');

    const loader = document.getElementById('loader');
    const registrationCard = document.getElementById('registration-card');
    const registrationForm = document.getElementById('registration-form');
    const tournamentNameHeading = document.getElementById('tournament-name-heading');
    const tournamentInfo = document.getElementById('tournament-info');
    const scrimIdInput = document.getElementById('scrimId');

    if (!scrimId) {
        loader.classList.add('d-none');
        tournamentInfo.textContent = 'Error: No tournament selected. Please register through a valid tournament link.';
        tournamentInfo.classList.add('text-danger');
        return;
    }

    // --- 1. Fetch tournament details to display on the page ---
    try {
        const response = await fetch(`/.netlify/functions/getTournamentDetail?id=${scrimId}`);
        if (!response.ok) throw new Error('Tournament not found or has expired.');
        const tournament = await response.json();
        
        // Populate page with tournament info
        tournamentNameHeading.textContent = `Register for ${tournament.scrimName}`;
        tournamentInfo.textContent = `Game: ${tournament.game} | Mode: ${tournament.mode}`;
        scrimIdInput.value = scrimId;

        loader.classList.add('d-none');
        registrationCard.classList.remove('d-none');

    } catch (error) {
        loader.classList.add('d-none');
        tournamentInfo.textContent = `Error: ${error.message}`;
        tournamentInfo.classList.add('text-danger');
    }

    // --- 2. Handle the form submission ---
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = registrationForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Submitting...`;

        // Collect all form data
        const registrationData = {
            scrimId: scrimIdInput.value,
            teamName: document.getElementById('teamName').value,
            captain: document.getElementById('captain').value,
            player1: document.getElementById('player1').value,
            player2: document.getElementById('player2').value,
            player3: document.getElementById('player3').value,
            player4: document.getElementById('player4').value,
            sub1: document.getElementById('sub1').value,
            sub2: document.getElementById('sub2').value,
            sub3: document.getElementById('sub3').value,
        };

        try {
            const response = await fetch('/.netlify/functions/registerForTournament', {
                method: 'POST',
                body: JSON.stringify(registrationData),
            });
            if (!response.ok) throw new Error('Submission failed. Please try again.');

            // Success state
            registrationCard.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-check-circle text-success fa-3x mb-3"></i>
                    <h3 class="text-success">Registration Successful!</h3>
                    <p class="text-secondary">Your team has been registered. You will be contacted with further details.</p>
                    <a href="tournaments.html" class="btn btn-brand mt-3">Back to Tournaments</a>
                </div>
            `;

        } catch (error) {
            alert(`Error: ${error.message}`);
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
});
