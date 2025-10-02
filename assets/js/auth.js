/*
=================================================
Crimson Crown - Global Authentication Script (v2.1 - Final)
=================================================
This script runs on EVERY page of the website. It handles:
1. Checking for a login token in the URL (after a user is redirected back from Discord).
2. Storing the token in the browser's localStorage and cleaning the URL.
3. Reading the token from localStorage on subsequent visits to keep the user logged in.
4. Decoding the token to get user data (username, avatar, roles).
5. Checking if the token is expired and logging the user out if it is.
6. Dynamically rendering the UI in the navbar (either a "Login" button or a user profile dropdown).
7. Handling the logout process.
8. Loading and applying global site settings (like social media links) to the entire site.
*/

// A global variable to hold the current user's data once they are logged in.
// This allows other scripts on the page (like registration pages) to access user info if needed.
let currentUser = null;

// This main function runs as soon as the basic HTML document structure has been loaded by the browser.
document.addEventListener('DOMContentLoaded', () => {
    // Get a reference to the placeholder div in the navbar where the login UI will go.
    const userAuthContainer = document.getElementById('user-auth-container');
    // Read the parameters from the current page's URL.
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const redirectPath = urlParams.get('redirect');

    // Scenario 1: User has just logged in via Discord and was redirected back.
    if (token) {
        // A 'token' in the URL is the signal that a successful login just occurred.
        // Save the token to the browser's local storage. This is what makes the user
        // stay logged in even if they close the tab or refresh the page.
        localStorage.setItem('jwt_token', token);
        
        // Clean up the URL by removing the token and redirect parameters.
        // This provides a better user experience and prevents the token from being accidentally shared.
        // If there was a specific page the user was trying to access before logging in (like a registration page),
        // we send them back there. Otherwise, we send them to the homepage ('/').
        const cleanUrl = redirectPath || '/';
        window.history.replaceState({}, document.title, cleanUrl);
    }

    // Read the token from local storage on every single page load.
    const storedToken = localStorage.getItem('jwt_token');

    if (storedToken) {
        // Scenario 2: A token exists in storage, so the user is likely logged in.
        try {
            // A JWT is made of three parts separated by dots: header, payload, and signature.
            // The middle part (payload) contains the user data we need. It's base64 encoded, so we decode it.
            const payload = JSON.parse(atob(storedToken.split('.')[1]));
            
            // We must check if the token has expired. The 'exp' field is a Unix timestamp in seconds.
            const isExpired = payload.exp * 1000 < Date.now();
            if (isExpired) {
                // If the token is expired, remove the old token from storage and treat the user as logged out.
                console.warn("Auth: Token is expired. Logging out.");
                localStorage.removeItem('jwt_token');
                showLoginButton(userAuthContainer);
                return; // Stop execution.
            }

            // If the token is valid and not expired, set the global currentUser object.
            currentUser = payload;
            
            // Update the UI to show the user's profile information in the navbar.
            showUserProfile(userAuthContainer, currentUser);

        } catch (error) {
            // This 'catch' block runs if the token is malformed or invalid (e.g., tampered with).
            // This is a security measure. We clear the bad token and show the login button.
            console.error("Auth: Invalid or malformed token found. Clearing session.", error);
            localStorage.removeItem('jwt_token');
            showLoginButton(userAuthContainer);
        }
    } else {
        // Scenario 3: No token found in storage. The user is logged out.
        showLoginButton(userAuthContainer);
    }

    // After handling user authentication, always load and apply site-wide settings like social links.
    loadSiteSettings();
});

/**
 * Renders the "Login with Discord" button in the navigation bar.
 * @param {HTMLElement} container - The div element where the button will be placed.
 */
function showLoginButton(container) {
    if (!container) return; // Safety check if the container element doesn't exist on the page.
    
    // Construct the login URL. We include the current page's path as a 'redirect' parameter.
    // This tells our backend where to send the user back to after a successful login.
    const redirectParam = encodeURIComponent(window.location.pathname + window.location.search);
    const loginUrl = `/api/router?action=discord-auth-start&redirect=${redirectParam}`;
    
    container.innerHTML = `
        <a href="${loginUrl}" class="btn btn-brand">
            <i class="fab fa-discord me-2"></i> Login with Discord
        </a>
    `;
}

/**
 * Renders the user profile dropdown in the navigation bar after a successful login.
 * @param {HTMLElement} container - The div element where the dropdown will be placed.
 * @param {object} user - The decoded JWT payload containing the user's info.
 */
function showUserProfile(container, user) {
    if (!container) return; // Safety check.
    
    // Check if the user has an 'admin' siteRole to decide if the "Admin Panel" link should be shown.
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
 * Fetches site-wide settings (like social media links) from the backend and dynamically updates them on the page.
 */
async function loadSiteSettings() {
    try {
        const response = await fetch('/api/router?action=getSiteSettings');
        if (!response.ok) return;
        const settings = await response.json();

        // Find all links with a `data-social-link` attribute and update their 'href' property.
        document.querySelectorAll('[data-social-link]').forEach(link => {
            const platform = link.dataset.socialLink; // e.g., "discord", "twitter"
            const urlKey = `${platform}Url`; // e.g., "discordUrl"
            if (settings[urlKey]) {
                link.href = settings[urlKey];
            } else {
                // If a URL is not set in the database for a link, hide it from the page.
                link.style.display = 'none';
            }
        });
    } catch (error) {
        console.error("Could not load site settings:", error);
    }
}

/**
 * Logs the user out by removing their session token from local storage and redirecting to the homepage.
 * This function is globally available to be called by the `onclick` attribute in the user dropdown menu.
 */
function logout() {
    localStorage.removeItem('jwt_token');
    // Redirect to the homepage to reset the state and show the "Login" button again.
    window.location.href = '/';
}