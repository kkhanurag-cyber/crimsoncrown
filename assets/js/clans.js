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
            const cardHTML = `
                <div class="col">
                    <div class="clan-card h-100">
                        <img src="${clan.clanLogo || 'assets/images/default-logo.png'}" class="clan-banner" alt="${clan.clanName} Logo">
                        <div class="card-content">
                            <h5 class="clan-name">[${clan.clanTag}] ${clan.clanName}</h5>
                            <p class="clan-members-count text-secondary">Captain: ${clan.captainName}</p>
                            <div class="clan-stats">
                                <div>
                                    <strong>${clan.wins || 0}</strong>
                                    <span>Wins</span>
                                </div>
                                <div>
                                    <strong>${clan.tournamentsPlayed || 0}</strong>
                                    <span>Played</span>
                                </div>
                            </div>
                            <!-- A link to a future clan detail page can go here -->
                        </div>
                    </div>
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
