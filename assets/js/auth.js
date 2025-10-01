/*
=================================================
Crimson Crown - Global Authentication Script (v2.0 - Vercel)
=================================================
This is the complete and final version of the auth script, corrected for Vercel.
*/

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const userAuthContainer = document.getElementById('user-auth-container');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const redirectPath = urlParams.get('redirect');

    if (token) {
        localStorage.setItem('jwt_token', token);
        const cleanUrl = redirectPath || '/';
        window.history.replaceState({}, document.title, cleanUrl);
    }

    const storedToken = localStorage.getItem('jwt_token');

    if (storedToken) {
        try {
            const payload = JSON.parse(atob(storedToken.split('.')[1]));
            const isExpired = payload.exp * 1000 < Date.now();
            if (isExpired) {
                localStorage.removeItem('jwt_token');
                showLoginButton(userAuthContainer);
                return;
            }
            currentUser = payload;
            showUserProfile(userAuthContainer, currentUser);
        } catch (error) {
            console.error("Invalid token:", error);
            localStorage.removeItem('jwt_token');
            showLoginButton(userAuthContainer);
        }
    } else {
        showLoginButton(userAuthContainer);
    }
});

function showLoginButton(container) {
    if (!container) return;
    
    const redirectParam = encodeURIComponent(window.location.pathname + window.location.search);
    
    // UPDATED LINE START: The path is now correctly set to /api/ for Vercel.
    const loginUrl = `/api/discord-auth-start?redirect=${redirectParam}`;
    // UPDATED LINE END

    container.innerHTML = `
        <a href="${loginUrl}" class="btn btn-brand">
            <i class="fab fa-discord me-2"></i> Login with Discord
        </a>
    `;
}

function showUserProfile(container, user) {
    if (!container) return;
    
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

function logout() {
    localStorage.removeItem('jwt_token');
    window.location.href = '/';
}