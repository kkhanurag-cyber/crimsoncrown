document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get('id');

    const loader = document.getElementById('loader');
    const content = document.getElementById('tournament-content');
    const mainContent = document.getElementById('main-content');
    
    if (!tournamentId) {
        loader.innerHTML = '<p class="text-danger">Error: No tournament ID provided.</p>';
        mainContent.style.opacity = 1;
        return;
    }

    try {
        const response = await fetch(`/.netlify/functions/getTournamentDetail?id=${tournamentId}`);
        if (!response.ok) {
            throw new Error(`Tournament not found or server error.`);
        }
        const data = await response.json();

        // Populate the page with data
        document.title = `${data.scrimName} — Crimson Crown`;
        document.getElementById('detail-banner-container').style.backgroundImage = `linear-gradient(rgba(10,10,10,0.7), rgba(10,10,10,1)), url(${data.bannerImage || 'assets/images/default-banner.png'})`;
        document.getElementById('tourney-name').textContent = data.scrimName;
        document.getElementById('tourney-description').textContent = data.description || 'No description available.';
        document.getElementById('tourney-rules').textContent = data.rules || 'Rules will be announced soon.';
        document.getElementById('tourney-points').textContent = data.pointTable || 'Point system will be announced soon.';
        
        document.getElementById('tourney-prize').textContent = data.prizePool || 'TBD';
        document.getElementById('tourney-game').textContent = data.game;
        document.getElementById('tourney-mode').textContent = data.mode;
        document.getElementById('tourney-slots').textContent = `${data.slots} Teams`;

        // Format and display dates
        const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD';
        document.getElementById('tourney-reg-start').textContent = formatDate(data.regStart);
        document.getElementById('tourney-reg-end').textContent = formatDate(data.regEnd);
        document.getElementById('tourney-scrim-start').textContent = formatDate(data.scrimStart);
        
        // Update register button link
        document.getElementById('register-button').href = `registration.html?scrimId=${data.scrimId}`;
        
        // Hide loader and show content
        loader.classList.add('d-none');
        content.classList.remove('d-none');
        mainContent.style.opacity = 1;

    } catch (error) {
        console.error('Failed to load tournament details:', error);
        loader.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
        mainContent.style.opacity = 1;
    }
});
