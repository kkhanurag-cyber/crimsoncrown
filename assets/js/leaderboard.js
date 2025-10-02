/*
=================================================
Crimson Crown - Leaderboard Page Script (v2.1 - Final)
=================================================
This script handles the logic for the public-facing leaderboard page. It:
1. Fetches the sorted leaderboard data from the backend API router.
2. Displays a loading spinner while the data is being fetched.
3. Dynamically populates the Top 3 podium section with the top three teams.
4. Dynamically populates the main leaderboard table for all other ranks.
5. Handles the display of a "no data available" message if the leaderboard is empty.
6. Manages and displays any errors that occur during the fetching process.
*/

// The main function runs as soon as the basic HTML document structure has been loaded.
document.addEventListener('DOMContentLoaded', async () => {
    // Get references to the key HTML elements that this script will interact with.
    const podiumSection = document.getElementById('leaderboard-podium');
    const tableBody = document.getElementById('leaderboard-body');
    const loader = document.getElementById('leaderboard-loader');

    try {
        // --- FETCH LEADERBOARD DATA ---
        // Send a GET request to our single API router, specifying the 'getLeaderboard' action.
        // The data will already be sorted correctly by the backend logic.
        const response = await fetch('/api/router?action=getLeaderboard');
        if (!response.ok) {
            // If the server responds with an error (e.g., 500), throw an error.
            throw new Error('Failed to fetch leaderboard data from the server.');
        }
        // Parse the JSON response into a JavaScript array of team objects.
        const leaderboardData = await response.json();
        
        // Once the data has been successfully fetched, hide the loading spinner.
        loader.classList.add('d-none');

        // Check if there is any data to display.
        if (leaderboardData.length === 0) {
            // If the array is empty, show a message in the table and stop the script.
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">No leaderboard data is available yet.</td></tr>';
            return;
        }

        // --- POPULATE PODIUM FOR TOP 3 ---
        // This section only runs if there are at least 3 teams in the leaderboard data.
        if (leaderboardData.length >= 3) {
            // Destructure the array to easily get the top 3 teams.
            const [rank1, rank2, rank3] = leaderboardData;
            
            // Populate Rank 1 (Gold)
            document.getElementById('podium-rank1-logo').src = rank1.teamLogo;
            document.getElementById('podium-rank1-name').textContent = rank1.teamName;
            document.getElementById('podium-rank1-points').textContent = `${rank1.totalPoints} Points`;

            // Populate Rank 2 (Silver)
            document.getElementById('podium-rank2-logo').src = rank2.teamLogo;
            document.getElementById('podium-rank2-name').textContent = rank2.teamName;
            document.getElementById('podium-rank2-points').textContent = `${rank2.totalPoints} Points`;

            // Populate Rank 3 (Bronze)
            document.getElementById('podium-rank3-logo').src = rank3.teamLogo;
            document.getElementById('podium-rank3-name').textContent = rank3.teamName;
            document.getElementById('podium-rank3-points').textContent = `${rank3.totalPoints} Points`;
            
            // Make the entire podium section visible now that it's populated.
            podiumSection.classList.remove('d-none');
        }

        // --- POPULATE THE MAIN LEADERBOARD TABLE ---
        // If there are 3 or more teams, we show the rest starting from rank 4.
        // Otherwise (if there are 1 or 2 teams), we show all teams in the table starting from rank 1.
        const tableData = leaderboardData.length >= 3 ? leaderboardData.slice(3) : leaderboardData;
        let rankCounter = leaderboardData.length >= 3 ? 4 : 1;

        // Loop through the data designated for the table.
        tableData.forEach(team => {
            const row = document.createElement('tr');
            // Apply special classes for the top 3 ranks if they appear in the table (for leaderboards with < 3 teams).
            if (rankCounter <= 3) {
                row.classList.add(`rank-${rankCounter}`);
            }
            // Create the HTML for the table row.
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
            // Append the new row to the table body.
            tableBody.appendChild(row);
            rankCounter++;
        });

    } catch (error) {
        console.error("Error loading leaderboard:", error);
        // If any error occurs during the fetch, hide the loader and display an error message in the table.
        loader.classList.add('d-none');
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Error loading leaderboard. Please try again later.</td></tr>';
    }
});