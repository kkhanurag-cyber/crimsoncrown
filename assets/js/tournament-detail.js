/*
=================================================
Crimson Crown - Tournament Detail Page Script (v2.1 - Final)
=================================================
This script handles the logic for the individual tournament detail page. It:
1. Gets the tournament ID from the URL's query parameters.
2. Fetches the detailed data for that specific tournament from the backend API router.
3. Populates all the page elements (banner, description, rules, prize pool, schedule).
4. Sets the correct link and state for the "Register Now" button based on tournament status.
5. Handles loading and error states.
*/

document.addEventListener('DOMContentLoaded', async () => {
    // Get the query parameters from the current URL (e.g., ?id=SCRIM123).
    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get('id');

    // Get references to all the major page elements.
    const loader = document.getElementById('loader');
    const content = document.getElementById('tournament-content');
    const mainContent = document.getElementById('main-content');
    
    // If no tournament ID is found in the URL, show an error and stop.
    if (!tournamentId) {
        loader.innerHTML = '<p class="text-danger text-center fs-4">Error: No tournament ID provided in the URL.</p>';
        mainContent.style.opacity = 1;
        return;
    }

    try {
        // Fetch the detailed data for this specific tournament from our API router.
        const response = await fetch(`/api/router?action=getTournamentDetail&id=${tournamentId}`);
        if (!response.ok) {
            throw new Error(`Tournament not found or a server error occurred.`);
        }
        const data = await response.json();

        // --- Populate the page with the fetched tournament data ---

        // 1. Set the page title and the main banner image.
        document.title = `${data.scrimName} — Crimson Crown`;
        const bannerContainer = document.getElementById('detail-banner-container');
        bannerContainer.style.backgroundImage = `
            linear-gradient(rgba(10, 10, 10, 0.7), rgba(10, 10, 10, 1)), 
            url(${data.bannerImage || 'assets/images/default-banner.png'})
        `;
        
        // 2. Populate the main content sections.
        document.getElementById('tourney-name').textContent = data.scrimName;
        document.getElementById('tourney-description').textContent = data.description || 'No description is available for this tournament.';
        document.getElementById('tourney-rules').textContent = data.rules || 'Rules will be announced soon.';
        document.getElementById('tourney-points').textContent = data.pointTable || 'The point system will be announced soon.';
        
        // 3. Populate the sidebar info card.
        document.getElementById('tourney-prize').textContent = data.prizePool || 'TBD';
        document.getElementById('tourney-game').textContent = data.game;
        document.getElementById('tourney-mode').textContent = data.mode;
        document.getElementById('tourney-slots').textContent = `${data.registeredCount} / ${data.slots} Teams`;

        // 4. Format and display the tournament schedule dates.
        const formatDate = (dateString) => {
            if (!dateString) return 'TBD';
            // Use Intl.DateTimeFormat for robust and locale-aware date formatting.
            return new Intl.DateTimeFormat('en-US', { 
                dateStyle: 'medium', 
                timeStyle: 'short',
                timeZone: 'Asia/Kolkata' // Example timezone, adjust as needed
            }).format(new Date(dateString));
        };
        document.getElementById('tourney-reg-start').textContent = formatDate(data.regStart);
        document.getElementById('tourney-reg-end').textContent = formatDate(data.regEnd);
        document.getElementById('tourney-scrim-start').textContent = formatDate(data.scrimStart);
        
        // 5. Update the "Register Now" button link and state based on the tournament's status.
        const registerButton = document.getElementById('register-button');
        if (data.status.toLowerCase() === 'active') {
             registerButton.href = `registration.html?id=${data.scrimId}`;
        } else {
            registerButton.classList.add('disabled');
            registerButton.textContent = `Registration ${data.status.toLowerCase() === 'upcoming' ? 'Not Open' : 'Closed'}`;
        }
        
        // Hide the loader and fade in the fully populated content.
        loader.classList.add('d-none');
        content.classList.remove('d-none');
        mainContent.style.opacity = 1;

    } catch (error) {
        console.error('Failed to load tournament details:', error);
        // If an error occurs, show an error message in place of the loader.
        loader.innerHTML = `<p class="text-danger text-center fs-4">${error.message}</p>`;
        mainContent.style.opacity = 1;
    }
});