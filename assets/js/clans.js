document.addEventListener('DOMContentLoaded', async () => {
    const clanContainer = document.getElementById('clan-list');
    const loader = document.getElementById('loader');
    const noResultsMessage = document.getElementById('no-results');

    try {
        const response = await fetch('/.netlify/functions/getClans');
        if (!response.ok) throw new Error('Failed to fetch clan data.');
        const clans = await response.json();

        loader.classList.add('d-none');
        if (clans.length === 0) {
            noResultsMessage.classList.remove('d-none');
            return;
        }

        clans.forEach(clan => {
            const rosterSize = clan.roster ? clan.roster.split(',').length : 0;
            const cardHTML = `
                <div class="col">
                    <a href="clan-detail.html?id=${clan.clanId}" class="clan-card h-100 text-decoration-none">
                        <img src="${clan.clanLogo || 'assets/images/default-logo.png'}" class="clan-banner" alt="${clan.clanName} Logo">
                        <div class="card-content">
                            <h5 class="clan-name text-truncate">[${clan.clanTag}] ${clan.clanName}</h5>
                            <p class="clan-members-count text-secondary">${rosterSize} Members</p>
                            <div class="card-action mt-auto">
                                <span class="btn btn-sm btn-outline-light w-100">View Clan</span>
                            </div>
                        </div>
                    </a>
                </div>
            `;
            clanContainer.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error('Error loading clans:', error);
        loader.classList.add('d-none');
        clanContainer.innerHTML = '<p class="text-danger text-center col-12">Could not load clans. Please try again later.</p>';
    }
});