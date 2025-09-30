let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const userAuthContainer = document.getElementById('user-auth-container');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        localStorage.setItem('jwt_token', token);
        const redirectPath = urlParams.get('redirect') || '/';
        window.history.replaceState({}, document.title, redirectPath);
    }

    const storedToken = localStorage.getItem('jwt_token');

    if (storedToken) {
        try {
            const payload = JSON.parse(atob(storedToken.split('.')[1]));
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
    container.innerHTML = `
        <a href="/.netlify/functions/discord-auth-start" class="btn btn-brand">
            <i class="fab fa-discord me-2"></i> Login with Discord
        </a>
    `;
}

function showUserProfile(container, user) {
    if (!container) return;
    container.innerHTML = `
        <div class="dropdown">
            <button class="btn btn-dark dropdown-toggle d-flex align-items-center" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="${user.avatar}" alt="${user.username}" class="rounded-circle me-2" style="width: 32px; height: 32px;">
                ${user.username}
            </button>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end" aria-labelledby="userDropdown">
                <li><a class="dropdown-item" href="profile.html">Profile</a></li>
                <li><a class="dropdown-item" href="my-clan.html">My Clan</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" onclick="logout()">Logout</a></li>
            </ul>
        </div>
    `;
}

function logout() {
    localStorage.removeItem('jwt_token');
    window.location.href = '/';
}

// UPDATED LINE START: Replace the showUserProfile function in auth.js with this version
function showUserProfile(container, user) {
    if (!container) return;
    container.innerHTML = `
        <div class="dropdown">
            <button class="btn btn-dark dropdown-toggle d-flex align-items-center" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="${user.avatar}" alt="${user.username}" class="rounded-circle me-2" style="width: 32px; height: 32px;">
                ${user.username}
            </button>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end" aria-labelledby="userDropdown">
                <li><a class="dropdown-item" href="profile.html">Profile</a></li>
                <li><a class="dropdown-item" href="my-clan.html">My Clan</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" onclick="logout()">Logout</a></li>
            </ul>
        </div>
    `;
}
// UPDATED LINE END