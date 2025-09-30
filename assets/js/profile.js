document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('profile-loader');
    const content = document.getElementById('profile-content');
    const token = localStorage.getItem('jwt_token');

    if (!token) {
        // If user is not logged in, redirect them to the homepage to log in.
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/getUserProfile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch profile data.');
        }

        const profile = await response.json();

        // Populate the page with the fetched data
        document.getElementById('profile-avatar').src = profile.avatar;
        document.getElementById('profile-username').textContent = profile.username;
        document.getElementById('tournaments-played').textContent = profile.tournamentsPlayed;
        document.getElementById('leaderboard-position').textContent = profile.leaderboardPosition;
        
        const clanInfoContainer = document.getElementById('profile-clan-info');
        if (profile.clan) {
            clanInfoContainer.innerHTML = `
                <span>
                    <img src="${profile.clan.clanLogo}" class="rounded-circle me-2" style="width:24px; height:24px;">
                    Member of <strong>${profile.clan.clanName}</strong>
                </span>
            `;
        } else {
             clanInfoContainer.innerHTML = `<span>Not currently in a clan.</span>`;
        }

        // Hide loader and show content
        loader.classList.add('d-none');
        content.classList.remove('d-none');

    } catch (error) {
        console.error(error);
        loader.innerHTML = '<p class="text-danger">Could not load your profile. Please try logging in again.</p>';
    }
});
