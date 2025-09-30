/*
=================================================
Crimson Crown - Tournaments Page Script
=================================================
This script handles the main tournaments listing page. It:
1. Fetches all tournaments from the backend.
2. Implements a client-side filtering system (All, Active, Upcoming, Past).
3. Dynamically creates and displays tournament cards.
4. Provides smooth animations for filtering.
5. Handles loading, empty, and error states.
*/

document.addEventListener('DOMContentLoaded', async () => {
    const tournamentContainer = document.getElementById('tournament-list');
    const loader = document.getElementById('loader');
    const filterButtons = document.getElementById('filter-btn-group');
    const noResultsMessage = document.getElementById('no-results');
    
    let allTournaments = []; // A cache to store the fetched tournaments, so we don't have to re-fetch on every filter click.

    // --- 1. FETCH TOURNAMENT DATA ---
    async function fetchTournaments() {
        try {
            const response = await fetch('/.netlify/functions/getTournaments');
            if (!response.ok) throw new Error('Failed to fetch data from the server.');
            allTournaments = await response.json();
            
            // Initially, display all tournaments.
            displayTournaments('all'); 
            loader.classList.add('d-none');
        } catch (error) {
            console.error('Failed to load tournaments:', error);
            loader.innerHTML = '<p class="text-danger text-center col-12">Could not load tournaments. Please try again later.</p>';
        }
    }

    // --- 2. DISPLAY AND FILTER LOGIC ---
    function displayTournaments(filter) {
        // Determine which tournaments to show based on the filter.
        const filteredTournaments = (filter === 'all') 
            ? allTournaments 
            : allTournaments.filter(t => t.status.toLowerCase() === filter);

        // First, hide all currently visible cards with a fade-out animation.
        const existingCards = tournamentContainer.querySelectorAll('.tournament-col');
        existingCards.forEach(card => card.classList.add('fade-out'));

        // After the fade-out animation completes, update the content.
        setTimeout(() => {
            tournamentContainer.innerHTML = ''; // Clear the container.

            if (filteredTournaments.length === 0) {
                noResultsMessage.classList.remove('d-none');
            } else {
                noResultsMessage.classList.add('d-none');
            }

            // Create and append the new set of filtered cards.
            filteredTournaments.forEach(tourney => {
                const cardCol = document.createElement('div');
                cardCol.className = 'col tournament-col fade-in'; // Add a fade-in class for the new cards
                
                const cardHTML = `
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
                                <a href="tournament-detail.html?id=${tourney.scrimId}" class="btn btn-brand w-100">View Details</a>
                            </div>
                        </div>
                    </div>
                `;
                cardCol.innerHTML = cardHTML;
                tournamentContainer.appendChild(cardCol);
            });
        }, 300); // This timeout should match the CSS transition duration for the fade-out effect.
    }

    // --- 3. EVENT LISTENERS FOR FILTER BUTTONS ---
    filterButtons.addEventListener('click', (e) => {
        // Use event delegation to handle clicks on any button within the group.
        if (e.target.tagName === 'BUTTON') {
            // Update the 'active' class on the buttons.
            document.querySelector('#filter-btn-group .active').classList.remove('active');
            e.target.classList.add('active');
            
            // Get the filter value from the button's data attribute (e.g., 'data-filter="active"').
            const filter = e.target.dataset.filter;
            displayTournaments(filter);
        }
    });

    // --- INITIALIZE ---
    // Start the process by fetching the tournaments when the page loads.
    fetchTournaments();
});