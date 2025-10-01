/*
=================================================
Crimson Crown - Global Authentication Script (v2.0 - Vercel)
=================================================
This is the complete and final script for the public-facing website's authentication. It handles:
- Checking for a login token in the URL (after Discord redirect).
- Storing the token and cleaning the URL.
- Reading the token from localStorage on subsequent visits.
- Decoding the token to get user data (username, avatar, roles).
- Dynamically rendering the UI (either a "Login" button or a user profile dropdown).
- Handling the logout process.
*/

// A global variable to hold the current user's data once they are logged in.
let currentUser = null;

// This function runs as soon as the basic HTML document is loaded.
document.addEventListener('DOMContentLoaded', () => {
    const userAuthContainer = document.getElementById('user-auth-container');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const redirectPath = urlParams.get('redirect');

    // Scenario 1: User has just logged in via Discord and was redirected back.
    if (token) {
        localStorage.setItem('jwt_token', token);
        
        // Clean up the URL. If a specific redirect path was saved, go there. Otherwise, go to the homepage.
        const cleanUrl = redirectPath || '/';
        window.history.replaceState({}, document.title, cleanUrl);
    }

    // Read the token from local storage on every page load.
    const storedToken = localStorage.getItem('jwt_token');

    if (storedToken) {
        // Scenario 2: A token exists, so the user is likely logged in.
        try {
            const payload = JSON.parse(atob(storedToken.split('.')[1]));
            
            // Check if the token has expired.
            const isExpired = payload.exp * 1000 < Date.now();
            if (isExpired) {
                localStorage.removeItem('jwt_token');
                showLoginButton(userAuthContainer);
                return;
            }

            // If the token is valid, set the global currentUser object and update the UI.
            currentUser = payload;
            showUserProfile(userAuthContainer, currentUser);

        } catch (error) {
            console.error("Invalid token found:", error);
            localStorage.removeItem('jwt_token');
            showLoginButton(userAuthContainer);
        }
    } else {
        // Scenario 3: No token found. The user is logged out.
        showLoginButton(userAuthContainer);
    }
});

/**
 * Renders the "Login with Discord" button in the navigation bar.
 * @param {HTMLElement} container - The div element where the button will be placed.
 */
function showLoginButton(container) {
    if (!container) return;
    
    // Construct the login URL. We include the current page's path as a 'redirect' parameter.
    const redirectParam = encodeURIComponent(window.location.pathname + window.location.search);
    const loginUrl = `/api/router?action=discord-auth-start&redirect=${redirectParam}`;
    
    container.innerHTML = `
        <a href="${loginUrl}" class="btn btn-brand">
            <i class="fab fa-discord me-2"></i> Login with Discord
        </a>
    `;
}

/**
 * Renders the user profile dropdown in the navigation bar.
 * @param {object} user - The decoded JWT payload containing user info.
 */
function showUserProfile(container, user) {
    if (!container) return;
    
    // Check if the user has an 'admin' siteRole to decide if the Admin Panel link should be shown.
    const adminLink = user.siteRole === 'admin' 
        ? '<li><a class="dropdown-item" href="/admin/dashboard.html"><i class="fas fa-user-shield fa-fw me-2"></i>Admin Panel</a></li><li><hr class="dropdown-divider"></li>' 
        : '';

    container.innerHTML = `
        <div class="dropdown">
            <button class="btn btn-dark dropdown-toggle d-flex align-items-center" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="${user.avatar}" alt="${user.username}" class="rounded-circle me-2" style="width: 32px; height: 32px;">
                ${user.username}
            </button>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end" aria-labelledby="userDropdown">
                <li><a class="dropdown-item" href="profile.html"><i class="fas fa-user-circle fa-fw me-2"></i>Profile</a></li>
                <li><a class="dropdown-item" href="my-clan.html"><i class="fas fa-users fa-fw me-2"></i>My Clan</a></li>
                <li><hr class="dropdown-divider"></li>
                ${adminLink}
                <li><a class="dropdown-item" href="#" onclick="logout()"><i class="fas fa-sign-out-alt fa-fw me-2"></i>Logout</a></li>
            </ul>
        </div>
    `;
}

/**
 * Logs the user out by removing the token and reloading the page.
 */
function logout() {
    localStorage.removeItem('jwt_token');
    window.location.href = '/'; // Redirect to homepage to reset the state.
}