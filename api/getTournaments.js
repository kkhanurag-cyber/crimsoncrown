const { GoogleSpreadsheet } = require('google-spreadsheet');

// All credentials are read securely from Netlify's environment variables.
const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

exports.handler = async (event) => {
    // This function is public, so no JWT check is needed.
    
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
        
        // Access the specific sheet (tab) named 'tournaments'.
        const sheet = doc.sheetsByTitle['tournaments'];
        
        // Fetch all rows from the 'tournaments' sheet.
        const rows = await sheet.getRows();

        // Map over each row to format the data into a clean JSON object for the frontend.
        const tournaments = rows.map(row => ({
            scrimId: row.scrimId,
            scrimName: row.scrimName,
            game: row.game,
            status: row.status,
            slots: row.slots,
            prizePool: row.prizePool,
            bannerImage: row.bannerImage
        }));

        // If successful, return a 200 OK status with the list of tournaments.
        return {
            statusCode: 200,
            body: JSON.stringify(tournaments),
        };
    } catch (error) {
        // If any part of the process fails, log the error and return a 500 Internal Server Error.
        console.error('Error fetching tournaments:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch tournament data' }),
        };
    }
};