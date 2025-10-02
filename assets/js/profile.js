/*
=================================================
Crimson Crown - User Profile Page Script (v2.1 - Final)
=================================================
This script handles the logic for the user's personal profile page. It:
1. Checks if the user is logged in. If not, it redirects them to the homepage.
2. Fetches the user's complete profile data from the backend API router. This data includes
   clan affiliation, tournament history, and leaderboard rank.
3. Populates all the page elements with the fetched data (avatar, username, stats).
4. Intelligently displays either the user's clan information or a prompt to join/create a clan.
5. Handles loading and error states to provide a smooth user experience.
*/

// The main function runs as soon as the basic HTML document structure has been loaded.
document.addEventListener('DOMContentLoaded', async () => {
    // Get references to the key HTML elements that this script will interact with.
    const loader = document.getElementById('loader');
    const content = document.getElementById('profile-content');
    // Get the user's login token from local storage to check if they are logged in.
    const token = localStorage.getItem('jwt_token');

    // If the user is not logged in, they cannot view a profile.
    // Redirect them to the homepage where the auth.js script will show them the login button.
    if (!token) {
        window.location.href = '/';
        return; // Stop the rest of the script from running.
    }

    try {
        // --- FETCH PROFILE DATA ---
        // Send a GET request to our single API router, specifying the 'getUserProfile' action.
        // The user's JWT is sent in the Authorization header to securely identify them to the backend.
        const response = await fetch('/api/router?action=getUserProfile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // If the server responds with an error (e.g., 500 or 404), throw an error.
            throw new Error('Failed to fetch your profile data from the server.');
        }

        // Parse the JSON response from the server into a JavaScript object.
        const profile = await response.json();

        // --- POPULATE THE PAGE WITH FETCHED DATA ---

        // 1. Populate the main profile header section.
        document.getElementById('profile-avatar').src = profile.avatar;
        document.getElementById('profile-username').textContent = profile.username;
        
        // 2. Populate the statistics cards with the data calculated by the backend.
        document.getElementById('tournaments-played').textContent = profile.tournamentsPlayed;
        document.getElementById('leaderboard-position').textContent = profile.leaderboardPosition;
        
        // 3. Populate the clan information section based on whether the user is in a clan.
        const clanInfoContainer = document.getElementById('profile-clan-info');
        if (profile.clan) {
            // If the user is in a clan, display the clan's logo and name.
            clanInfoContainer.innerHTML = `
                <div class="d-flex align-items-center justify-content-center">
                    <img src="${profile.clan.clanLogo}" class="rounded-circle me-2" style="width:24px; height:24px; object-fit: cover;" alt="${profile.clan.clanName} Logo">
                    <span>Member of <strong>${profile.clan.clanName}</strong></span>
                </div>
            `;
        } else {
            // If the user is not in a clan, display a helpful message with action buttons.
             clanInfoContainer.innerHTML = `
                <p class="text-secondary mb-3">You are not currently in a clan.</p>
                <div>
                    <a href="clans.html" class="btn btn-sm btn-outline-light">Browse Clans</a>
                    <a href="register-clan.html" class="btn btn-sm btn-brand ms-2">Create a Clan</a>
                </div>
            `;
        }

        // Hide the loader and show the fully populated content.
        loader.classList.add('d-none');
        content.classList.remove('d-none');

    } catch (error) {
        // This block runs if any part of the `try` block fails.
        console.error("Error loading profile:", error);
        // Display a user-friendly error message in place of the loader.
        loader.innerHTML = '<p class="text-danger text-center">Could not load your profile. Please try logging in again.</p>';
    }
});