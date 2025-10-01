const { GoogleSpreadsheet } = require('google-spreadsheet');

// All credentials are read securely from Netlify's environment variables.
const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

exports.handler = async (event) => {
    // This is a public function, so no user authentication (JWT check) is required.
    
    // Initialize a new GoogleSpreadsheet object with our Sheet ID.
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        // Authenticate with the Google Sheets API using the service account credentials.
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        // Load the document properties and worksheets.
        await doc.loadInfo();
        
        // Access the specific sheet (tab) named 'leaderboard'.
        const sheet = doc.sheetsByTitle['leaderboard'];
        
        // Fetch all rows from the 'leaderboard' sheet.
        const rows = await sheet.getRows();

        // Map over each row to format the data into a clean JSON object for the frontend.
        // We parse numbers to ensure correct sorting and calculations.
        const leaderboard = rows.map(row => ({
            teamName: row.teamName,
            totalPoints: parseInt(row.totalPoints, 10) || 0,
            avgRank: parseFloat(row.avgRank) || 0,
            totalKills: parseInt(row.totalKills, 10) || 0,
            teamLogo: row.teamLogo || 'assets/images/default-logo.png' // Provide a default logo if none is listed.
        }));

        // Sort the leaderboard data. The primary sort key is 'totalPoints' in descending order.
        // If two teams have the same number of points, 'avgRank' (ascending) is used as a tie-breaker.
        leaderboard.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) {
                return b.totalPoints - a.totalPoints;
            }
            return a.avgRank - b.avgRank;
        });

        // If successful, return a 200 OK status with the sorted leaderboard data.
        return {
            statusCode: 200,
            body: JSON.stringify(leaderboard),
        };
    } catch (error) {
        // If any part of the process fails, log the error and return a 500 Internal Server Error.
        console.error('Error fetching leaderboard:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch leaderboard data' }),
        };
    }
};