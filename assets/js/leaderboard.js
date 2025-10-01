/*
=================================================
Crimson Crown - Leaderboard Page Script (v2.0 - Vercel)
=================================================
This script handles:
1. Fetching the sorted leaderboard data from the backend API router.
2. Displaying a loading spinner.
3. Dynamically populating the Top 3 podium section.
4. Dynamically populating the main leaderboard table for all other ranks.
5. Handling empty states (no data) and error messages.
*/

document.addEventListener('DOMContentLoaded', async () => {
    const podiumSection = document.getElementById('leaderboard-podium');
    const tableBody = document.getElementById('leaderboard-body');
    const loader = document.getElementById('leaderboard-loader');

    try {
        // Fetch the leaderboard data from our secure API router.
        const response = await fetch('/api/router?action=getLeaderboard');
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard data from the server.');
        }
        const leaderboardData = await response.json();
        
        // Once data is fetched, hide the loading spinner.
        loader.classList.add('d-none');

        // Check if there is any data to display.
        if (leaderboardData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">No leaderboard data is available yet.</td></tr>';
            return;
        }

        // --- Populate the Podium Section for the Top 3 Teams ---
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

        // --- Populate the Main Leaderboard Table ---
        const tableData = leaderboardData.length >= 3 ? leaderboardData.slice(3) : leaderboardData;
        let rankCounter = leaderboardData.length >= 3 ? 4 : 1;

        tableData.forEach(team => {
            const row = document.createElement('tr');
            if (rankCounter <= 3) {
                row.classList.add(`rank-${rankCounter}`);
            }
            row.innerHTML = `
                <td class="rank-value text-center">${rankCounter}</td>
                <td>
                    <div class="clan-info">
                        <img src="${team.teamLogo}" alt="${team.teamName} Logo" onerror="this.onerror=null;this.src='assets/images/default-logo.png';">
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
        console.error("Error loading leaderboard:", error);
        loader.classList.add('d-none');
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Error loading leaderboard. Please try again later.</td></tr>';
    }
});