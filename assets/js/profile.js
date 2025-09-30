/*
=================================================
Crimson Crown - User Profile Page Script
=================================================
This script handles:
1. Checking if the user is logged in.
2. Fetching the user's complete profile data from the backend.
3. Populating the page with their avatar, username, clan status, and stats.
4. Handling loading and error states.
*/

document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('loader');
    const content = document.getElementById('profile-content');
    const token = localStorage.getItem('jwt_token');

    // If the user is not logged in, they cannot view a profile.
    // Redirect them to the homepage where they will see the login button.
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        // Fetch the user's complete profile data from our secure serverless function.
        // The backend function will use the JWT to identify the user and gather all necessary data.
        const response = await fetch('/.netlify/functions/getUserProfile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch your profile data from the server.');
        }

        const profile = await response.json();

        // --- Populate the page with the fetched profile data ---

        // 1. Populate the main profile header.
        document.getElementById('profile-avatar').src = profile.avatar;
        document.getElementById('profile-username').textContent = profile.username;
        
        // 2. Populate the statistics cards.
        document.getElementById('tournaments-played').textContent = profile.tournamentsPlayed;
        document.getElementById('leaderboard-position').textContent = profile.leaderboardPosition;
        
        // 3. Populate the clan information section.
        const clanInfoContainer = document.getElementById('profile-clan-info');
        if (profile.clan) {
            // If the user is in a clan, display the clan's logo and name.
            clanInfoContainer.innerHTML = `
                <div class="d-flex align-items-center justify-content-center">
                    <img src="${profile.clan.clanLogo}" class="rounded-circle me-2" style="width:24px; height:24px;" alt="${profile.clan.clanName} Logo">
                    <span>Member of <strong>${profile.clan.clanName}</strong></span>
                </div>
            `;
        } else {
            // If the user is not in a clan, display a message with action buttons.
             clanInfoContainer.innerHTML = `
                <p class="text-secondary mb-3">You are not currently in a clan.</p>
                <div>
                    <a href="clans.html" class="btn btn-sm btn-outline-light">Browse Clans</a>
                    <a href="register-clan.html" class="btn btn-sm btn-brand">Create a Clan</a>
                </div>
            `;
        }

        // Hide the loader and show the fully populated content.
        loader.classList.add('d-none');
        content.classList.remove('d-none');

    } catch (error) {
        console.error("Error loading profile:", error);
        // If an error occurs, show an error message in place of the loader.
        loader.innerHTML = '<p class="text-danger text-center">Could not load your profile. Please try logging in again.</p>';
    }
});