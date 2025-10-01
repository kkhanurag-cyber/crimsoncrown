/*
=================================================
Crimson Crown - Clans Page Script (v2.0 - Vercel)
=================================================
This script handles:
1. Fetching the list of all registered clans from the backend.
2. Displaying a loading spinner while fetching.
3. Dynamically creating and inserting clan cards into the page.
4. Handling empty states and error messages.
5. Making the clan cards clickable, leading to the detail page.
*/

document.addEventListener('DOMContentLoaded', async () => {
    const clanContainer = document.getElementById('clan-list');
    const loader = document.getElementById('loader');
    const noResultsMessage = document.getElementById('no-results');

    try {
        // Fetch the list of clans from our secure serverless function.
        // We use the new '/api/router' endpoint with the correct action parameter.
        const response = await fetch('/api/router?action=getClans');
        if (!response.ok) {
            // If the server responds with an error (e.g., 500), throw an error to be caught below.
            throw new Error('Failed to fetch clan data from the server.');
        }
        const clans = await response.json();

        // Once data is fetched, hide the loading spinner.
        loader.classList.add('d-none');

        // Check if there are any clans to display.
        if (clans.length === 0) {
            // If the array is empty, show the "No results" message.
            noResultsMessage.classList.remove('d-none');
            return;
        }

        // Loop through each clan object in the array.
        clans.forEach(clan => {
            // Calculate the number of members from the roster string.
            // The roster is a comma-separated string, so we split it and get the length.
            const memberCount = clan.roster ? clan.roster.split(',').length : 0;
            
            // Create the HTML for a single clan card.
            // This entire card is a link (`<a>`) that will take the user to the `clan-detail.html` page,
            // passing the clan's unique ID in the URL.
            const cardHTML = `
                <div class="col">
                    <a href="clan-detail.html?id=${clan.clanId}" class="clan-card h-100 text-decoration-none">
                        <img src="${clan.clanLogo || 'assets/images/default-logo.png'}" class="clan-banner" alt="${clan.clanName} Logo" onerror="this.onerror=null;this.src='assets/images/default-logo.png';">
                        <div class="card-content">
                            <h5 class="clan-name text-truncate">[${clan.clanTag}] ${clan.clanName}</h5>
                            <p class="clan-members-count text-secondary">${memberCount} Members</p>
                            <div class="card-action mt-auto">
                                <span class="btn btn-sm btn-outline-light w-100">View Clan</span>
                            </div>
                        </div>
                    </a>
                </div>
            `;
            // Append the new card's HTML to the main container.
            clanContainer.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error('Error loading clans:', error);
        // If an error occurs during the fetch, hide the loader and show an error message.
        loader.classList.add('d-none');
        clanContainer.innerHTML = '<p class="text-danger text-center col-12">Could not load clans. Please try again later.</p>';
    }
});