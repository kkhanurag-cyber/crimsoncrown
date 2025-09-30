const { GoogleSpreadsheet } = require('google-spreadsheet');

// These credentials are read securely from Netlify's environment variables
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

exports.handler = async (event, context) => {
    try {
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        
        await doc.useServiceAccountAuth({
            client_email: CLIENT_EMAIL,
            private_key: PRIVATE_KEY,
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['leaderboard']; // IMPORTANT: Name of your leaderboard sheet tab

        const rows = await sheet.getRows();

        // Format and sort the data
        const leaderboard = rows.map(row => ({
            teamName: row.teamName,
            totalPoints: parseInt(row.totalPoints, 10) || 0,
            avgRank: parseFloat(row.avgRank) || 0,
            totalKills: parseInt(row.totalKills, 10) || 0,
            // You can add a teamLogo URL from your sheet if you have one
            teamLogo: row.teamLogo || 'assets/images/default-logo.png' 
        }));

        // Sort by totalPoints (descending), then by avgRank (ascending) as a tie-breaker
        leaderboard.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) {
                return b.totalPoints - a.totalPoints;
            }
            return a.avgRank - b.avgRank;
        });

        return {
            statusCode: 200,
            body: JSON.stringify(leaderboard),
        };
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch leaderboard data' }),
        };
    }
};
