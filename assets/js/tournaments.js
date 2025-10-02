/*
=================================================
Crimson Crown - Tournaments Page Script (v2.1 - Final)
=================================================
This script handles the main tournaments listing page.
For the user's preferred layout, it fetches all tournaments and then
separates them into three distinct sections on the page: "Active", "Upcoming", and "Past".

This script handles:
1. Fetching all tournaments from the backend API router.
2. Displaying loading spinners in each section while fetching.
3. Categorizing tournaments into the three status groups.
4. Dynamically creating and displaying tournament cards in their respective sections.
5. Handling empty states and error messages for each section individually.
*/

// The main function runs as soon as the basic HTML document structure has been loaded.
document.addEventListener('DOMContentLoaded', async () => {
    // Get references to the container elements for each tournament status category.
    const activeContainer = document.getElementById('active-tournaments');
    const upcomingContainer = document.getElementById('upcoming-tournaments');
    const closedContainer = document.getElementById('closed-tournaments');
    
    // This is the main function that orchestrates fetching and displaying the data.
    async function fetchAndDisplayTournaments() {
        try {
            // --- FETCH TOURNAMENT DATA ---
            // Send a GET request to our single API router, specifying the 'getTournaments' action.
            const response = await fetch('/api/router?action=getTournaments');
            if (!response.ok) {
                // If the server responds with an error (e.g., 500), throw an error to be caught below.
                throw new Error('Failed to fetch tournament data from the server.');
            }
            // Parse the JSON response from the server into a JavaScript array of tournament objects.
            const allTournaments = await response.json();
            
            // --- CATEGORIZE TOURNAMENTS ---
            // Filter the single list of tournaments into three separate arrays based on their 'status' property.
            // We convert the status to lowercase to ensure consistent matching (e.g., 'Active' vs 'active').
            const active = allTournaments.filter(t => t.status.toLowerCase() === 'active');
            const upcoming = allTournaments.filter(t => t.status.toLowerCase() === 'upcoming');
            const closed = allTournaments.filter(t => t.status.toLowerCase() === 'closed');
            
            // --- DISPLAY TOURNAMENTS ---
            // Call the display function for each category, passing the filtered array, the target container,
            // and a user-friendly message to show if that specific category is empty.
            displayTournaments(active, activeContainer, 'No active tournaments right now.');
            displayTournaments(upcoming, upcomingContainer, 'No upcoming tournaments announced yet.');
            displayTournaments(closed, closedContainer, 'No past tournaments to show.');

        } catch (error) {
            // This block runs if any part of the `try` block fails (e.g., the fetch request).
            console.error('Failed to load tournaments:', error);
            // Display a user-friendly error message in the main active container.
            if (activeContainer) {
                activeContainer.innerHTML = '<p class="text-danger text-center col-12">Could not load tournaments. Please try again later.</p>';
            }
            if (upcomingContainer) upcomingContainer.innerHTML = ''; // Clear other loaders
            if (closedContainer) closedContainer.innerHTML = '';
        }
    }

    /**
     * Renders a list of tournaments into a given container element.
     * @param {Array} tournaments - The array of tournament objects to display for this section.
     * @param {HTMLElement} container - The container element (e.g., a div with a specific ID) to inject the cards into.
     * @param {string} emptyMessage - The message to display if the `tournaments` array for this section is empty.
     */
    function displayTournaments(tournaments, container, emptyMessage) {
        // Safety check: if the container element doesn't exist on the page, do nothing.
        if (!container) return;
        
        // Clear any existing content (like the initial loading spinner) from the container.
        container.innerHTML = ''; 

        // Check if there are any tournaments to display in this category.
        if (tournaments.length === 0) {
            // If the array is empty, show the "empty" message for this section.
            container.innerHTML = `<div class="col-12"><p class="text-secondary text-center">${emptyMessage}</p></div>`;
            return;
        }

        // Loop through each `tourney` object in the provided array.
        tournaments.forEach(tourney => {
            // Create the complete HTML for a single tournament card.
            const cardHTML = `
                <div class="col tournament-col fade-in">
                    <div class="tournament-card h-100">
                        <div class="card-banner" style="background-image: url('${tourney.bannerImage || 'assets/images/default-banner.png'}')">
                            <div class="card-status">${tourney.status}</div>
                        </div>
                        <div class="card-content">
                            <h5 class="card-title text-truncate">${tourney.scrimName}</h5>
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
            // Append the newly created card's HTML to the container.
            container.innerHTML += cardHTML;
        });
    }

    // --- INITIALIZE ---
    // Start the entire process by fetching the tournaments when the page loads.
    fetchAndDisplayTournaments();
});