/*
=================================================
Crimson Crown - Global Authentication Script
=================================================
This script runs on EVERY page of the website. It handles:
1. Checking for a login token in the URL (after Discord redirect).
2. Storing the token and cleaning the URL.
3. Reading the token from localStorage on subsequent visits.
4. Decoding the token to get user data (username, avatar, roles).
5. Dynamically rendering the UI (either a "Login" button or a user profile dropdown).
6. Handling the logout process.
*/

// A global variable to hold the current user's data once they are logged in.
// This allows other scripts on the page to access user info if needed.
let currentUser = null;

// This function runs as soon as the basic HTML document is loaded.
document.addEventListener('DOMContentLoaded', () => {
    const userAuthContainer = document.getElementById('user-auth-container');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const redirectPath = urlParams.get('redirect');

    // Scenario 1: User has just logged in via Discord and was redirected back.
    if (token) {
        // Save the token to the browser's local storage. This makes the user
        // stay logged in even if they close the tab or refresh the page.
        localStorage.setItem('jwt_token', token);
        
        // Clean up the URL by removing the token and redirect parameters.
        // This provides a better user experience and prevents the token from being shared accidentally.
        // If there was a specific page the user was trying to access, we send them there. Otherwise, to the homepage.
        const cleanUrl = redirectPath || '/';
        window.history.replaceState({}, document.title, cleanUrl);
    }

    // Read the token from local storage on every page load.
    const storedToken = localStorage.getItem('jwt_token');

    if (storedToken) {
        // Scenario 2: A token exists, so the user is likely logged in.
        try {
            // A JWT is made of three parts separated by dots: header, payload, and signature.
            // The middle part (payload) contains the user data we need. It's base64 encoded.
            const payload = JSON.parse(atob(storedToken.split('.')[1]));
            
            // We check if the token has expired.
            const isExpired = payload.exp * 1000 < Date.now();
            if (isExpired) {
                // If expired, remove the old token and treat the user as logged out.
                localStorage.removeItem('jwt_token');
                showLoginButton(userAuthContainer);
                return;
            }

            // If the token is valid and not expired, set the global currentUser object.
            currentUser = payload;
            
            // Update the UI to show the user's profile information.
            showUserProfile(userAuthContainer, currentUser);

        } catch (error) {
            // If the token is malformed or invalid, it's a security risk.
            // Clear it from storage and show the login button.
            console.error("Invalid or malformed token found:", error);
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
    if (!container) return; // Safety check if the container element doesn't exist.
    
    // Construct the login URL. We include the current page's path as a 'redirect' parameter.
    // This tells our backend where to send the user back to after a successful login.
    const redirectParam = encodeURIComponent(window.location.pathname + window.location.search);
    const loginUrl = `/.netlify/functions/discord-auth-start?redirect=${redirectParam}`;
    
    container.innerHTML = `
        <a href="${loginUrl}" class="btn btn-brand">
            <i class="fab fa-discord me-2"></i> Login with Discord
        </a>
    `;
}

/**
 * Renders the user profile dropdown in the navigation bar.
 * @param {HTMLElement} container - The div element where the dropdown will be placed.
 * @param {object} user - The decoded JWT payload containing user info.
 */
function showUserProfile(container, user) {
    if (!container) return; // Safety check.
    
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
    // Redirect to the homepage to reset the state.
    window.location.href = '/';
}