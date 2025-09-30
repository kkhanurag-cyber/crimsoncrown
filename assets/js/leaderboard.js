document.addEventListener('DOMContentLoaded', async () => {
    const podiumSection = document.getElementById('leaderboard-podium');
    const tableBody = document.getElementById('leaderboard-body');
    const loader = document.getElementById('leaderboard-loader');

    try {
        const response = await fetch('/.netlify/functions/getLeaderboard');
        if (!response.ok) throw new Error('Failed to fetch leaderboard data.');
        
        const leaderboardData = await response.json();
        
        // Hide loader
        loader.classList.add('d-none');

        if (leaderboardData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">No leaderboard data available yet.</td></tr>';
            return;
        }

        // Populate Podium for Top 3
        if (leaderboardData.length >= 3) {
            const [rank1, rank2, rank3] = leaderboardData;
            
            document.getElementById('podium-rank1-logo').src = rank1.teamLogo;
            document.getElementById('podium-rank1-name').textContent = rank1.teamName;
            document.getElementById('podium-rank1-points').textContent = `${rank1.totalPoints} Points`;

            document.getElementById('podium-rank2-logo').src = rank2.teamLogo;
            document.getElementById('podium-rank2-name').textContent = rank2.teamName;
            document.getElementById('podium-rank2-points').textContent = `${rank2.totalPoints} Points`;

            document.getElementById('podium-rank3-logo').src = rank3.teamLogo;
            document.getElementById('podium-rank3-name').textContent = rank3.teamName;
            document.getElementById('podium-rank3-points').textContent = `${rank3.totalPoints} Points`;
            
            podiumSection.classList.remove('d-none');
        }

        // Populate Table (starting from rank 4 if podium is shown)
        const tableData = leaderboardData.length >= 3 ? leaderboardData.slice(3) : leaderboardData;
        let rankCounter = leaderboardData.length >= 3 ? 4 : 1;

        tableData.forEach(team => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="rank-value text-center">${rankCounter}</td>
                <td>
                    <div class="clan-info">
                        <img src="${team.teamLogo}" alt="${team.teamName} Logo">
                        <span class="clan-name">${team.teamName}</span>
                    </div>
                </td>
                <td class="text-center">${team.totalKills}</td>
                <td class="text-center">${team.avgRank.toFixed(2)}</td>
                <td class="text-end fw-bold">${team.totalPoints}</td>
            `;
            tableBody.appendChild(row);
            rankCounter++;
        });

    } catch (error) {
        console.error(error);
        loader.classList.add('d-none');
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Error loading leaderboard. Please try again later.</td></tr>';
    }
});
