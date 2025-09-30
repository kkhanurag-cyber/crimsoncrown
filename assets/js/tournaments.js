document.addEventListener('DOMContentLoaded', async () => {
    const tournamentContainer = document.getElementById('tournament-list');
    const loader = document.getElementById('loader');
    const filterButtons = document.getElementById('filter-btn-group');
    const noResultsMessage = document.getElementById('no-results');
    
    let allTournaments = []; // Cache to store all tournaments

    // --- FETCH DATA ---
    async function fetchTournaments() {
        try {
            const response = await fetch('/.netlify/functions/getTournaments');
            if (!response.ok) throw new Error('Failed to fetch data');
            allTournaments = await response.json();
            displayTournaments('all'); // Display all tournaments initially
            loader.classList.add('d-none');
        } catch (error) {
            console.error('Failed to load tournaments:', error);
            loader.innerHTML = '<p class="text-danger">Could not load tournaments. Please try again later.</p>';
        }
    }

    // --- DISPLAY AND FILTER LOGIC ---
    function displayTournaments(filter) {
        tournamentContainer.innerHTML = ''; // Clear existing cards
        let visibleCount = 0;
        
        const filteredTournaments = (filter === 'all') 
            ? allTournaments 
            : allTournaments.filter(t => t.status.toLowerCase() === filter);

        if (filteredTournaments.length === 0) {
            noResultsMessage.classList.remove('d-none');
        } else {
            noResultsMessage.classList.add('d-none');
        }

        filteredTournaments.forEach(tourney => {
            const cardHTML = `
                <div class="col tournament-col" data-status="${tourney.status.toLowerCase()}">
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
                </div>
            `;
            tournamentContainer.innerHTML += cardHTML;
        });
    }

    // --- EVENT LISTENERS ---
    filterButtons.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            // Update active button style
            document.querySelector('#filter-btn-group .active').classList.remove('active');
            e.target.classList.add('active');
            
            const filter = e.target.dataset.filter;
            displayTournaments(filter);
        }
    });

    // --- INITIALIZE ---
    fetchTournaments();
});
