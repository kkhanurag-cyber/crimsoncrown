document.addEventListener('DOMContentLoaded', async () => {
    const activeContainer = document.getElementById('active-tournaments');
    const upcomingContainer = document.getElementById('upcoming-tournaments');
    const closedContainer = document.getElementById('closed-tournaments');
    
    // Display a loading message
    if (activeContainer) activeContainer.innerHTML = '<p class="text-secondary">Loading tournaments...</p>';

    try {
        // Fetch data from our secure Netlify function
        const response = await fetch('/.netlify/functions/getTournaments');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const tournaments = await response.json();

        // Clear loading messages
        if (activeContainer) activeContainer.innerHTML = '';
        if (upcomingContainer) upcomingContainer.innerHTML = '';
        if (closedContainer) closedContainer.innerHTML = '';
        
        let hasActive = false, hasUpcoming = false, hasClosed = false;

        tournaments.forEach(tourney => {
            // Create the HTML for a tournament card
            const cardHTML = `
                <div class="col">
                    <div class="tournament-card h-100">
                        <div class="card-banner" style="background-image: url('${tourney.bannerImage || 'assets/images/default-banner.png'}')">
                            <div class="card-status">${tourney.status}</div>
                        </div>
                        <div class="card-content">
                            <h5 class="card-title">${tourney.scrimName}</h5>
                            <p class="card-sponsor text-secondary">${tourney.game}</p>
                            <hr>
                            <div class="card-details">
                                <span><i class="fas fa-users"></i> ${tourney.slots} Slots</span>
                                <span><i class="fas fa-trophy"></i> ${tourney.prizePool || 'TBD'}</span>
                            </div>
                            <div class="card-action">
                                <a href="#" class="btn btn-brand w-100">View Details</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Place the card in the correct section based on its status
            if (tourney.status.toLowerCase() === 'active' && activeContainer) {
                activeContainer.innerHTML += cardHTML;
                hasActive = true;
            } else if (tourney.status.toLowerCase() === 'upcoming' && upcomingContainer) {
                upcomingContainer.innerHTML += cardHTML;
                hasUpcoming = true;
            } else if (closedContainer) {
                closedContainer.innerHTML += cardHTML;
                hasClosed = true;
            }
        });
        
        // Display a message if a section is empty
        if (!hasActive && activeContainer) activeContainer.innerHTML = '<p class="text-secondary">No active tournaments right now.</p>';
        if (!hasUpcoming && upcomingContainer) upcomingContainer.innerHTML = '<p class="text-secondary">No upcoming tournaments announced yet.</p>';
        if (!hasClosed && closedContainer) closedContainer.innerHTML = '<p class="text-secondary">No past tournaments to show.</p>';

    } catch (error) {
        console.error('Failed to load tournaments:', error);
        if (activeContainer) activeContainer.innerHTML = '<p class="text-danger">Could not load tournaments. Please try again later.</p>';
    }
});