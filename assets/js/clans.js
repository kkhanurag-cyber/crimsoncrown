/*
=================================================
Crimson Crown - Clans Page Script (v2.1 - Final)
=================================================
This script handles the logic for the public-facing clans listing page. It:
1. Fetches the list of all registered clans from the backend API router.
2. Displays a loading spinner while the data is being fetched.
3. Dynamically creates and inserts a styled "clan card" for each clan into the page.
4. Makes each clan card a clickable link that directs users to the clan's detail page.
5. Includes a fallback `onerror` attribute for images to prevent broken logo icons.
6. Handles the display of a "no clans found" message if the database is empty.
7. Manages and displays any errors that occur during the fetching process.
*/

// The main function runs as soon as the basic HTML document structure has been loaded.
document.addEventListener('DOMContentLoaded', async () => {
    // Get references to the key HTML elements that this script will interact with.
    const clanContainer = document.getElementById('clan-list');
    const loader = document.getElementById('loader');
    const noResultsMessage = document.getElementById('no-results');

    try {
        // --- FETCH CLAN DATA ---
        // Send a GET request to our single API router, specifying the 'getClans' action.
        const response = await fetch('/api/router?action=getClans');
        
        // If the server responds with an error status (like 500), throw an error to be caught below.
        if (!response.ok) {
            throw new Error('Failed to fetch clan data from the server.');
        }
        // Parse the JSON response from the server into a JavaScript array of clan objects.
        const clans = await response.json();

        // --- RENDER THE UI ---

        // Once the data is successfully fetched, hide the loading spinner.
        loader.classList.add('d-none');

        // Check if the returned array of clans is empty.
        if (clans.length === 0) {
            // If there are no clans, show the "No results" message and stop the script.
            noResultsMessage.classList.remove('d-none');
            return;
        }

        // Loop through each `clan` object in the `clans` array.
        clans.forEach(clan => {
            // Calculate the number of members from the roster string.
            // The roster is a comma-separated string, so we split it by the comma and get the array length.
            // We add 1 to always include the captain, who may not be in the initial roster string.
            const memberCount = (clan.roster ? clan.roster.split(',').length : 0) + 1;
            
            // Create the complete HTML for a single clan card.
            // The entire card is a link (`<a>`) that directs to `clan-detail.html`, passing the
            // clan's unique ID (`clan.clanId`) as a URL parameter.
            const cardHTML = `
                <div class="col">
                    <a href="clan-detail.html?id=${clan.clanId}" class="clan-card h-100 text-decoration-none">
                        <img 
                            src="${clan.clanLogo || 'assets/images/default-logo.png'}" 
                            class="clan-banner" 
                            alt="${clan.clanName} Logo" 
                            onerror="this.onerror=null;this.src='assets/images/default-logo.png';"
                        >
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
            // Append the newly created card's HTML to the main grid container.
            clanContainer.innerHTML += cardHTML;
        });

    } catch (error) {
        // This block runs if any part of the `try` block fails (e.g., the fetch request).
        console.error('Error loading clans:', error);
        // Hide the loader and display a user-friendly error message in its place.
        loader.classList.add('d-none');
        clanContainer.innerHTML = '<p class="text-danger text-center col-12">Could not load clans. Please try again later.</p>';
    }
});