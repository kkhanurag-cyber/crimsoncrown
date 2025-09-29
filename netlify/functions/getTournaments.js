const { GoogleSpreadsheet } = require('google-spreadsheet');

// These credentials are read securely from Netlify's environment variables
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // The long ID from your sheet's URL
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

// Initialize the sheet
const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

exports.handler = async (event, context) => {
    try {
        // Authenticate with the service account
        await doc.useServiceAccountAuth({
            client_email: CLIENT_EMAIL,
            private_key: PRIVATE_KEY,
        });

        // Load spreadsheet info
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['tournaments']; // IMPORTANT: Name of your sheet tab

        // Read all rows from the sheet
        const rows = await sheet.getRows();

        // Format the data to send back to the frontend
        const tournaments = rows.map(row => ({
            scrimId: row.scrimId,
            scrimName: row.scrimName,
            game: row.game,
            status: row.status,
            slots: row.slots,
            prizePool: row.prizePool,
            bannerImage: row.bannerImage // Assumes you have a column for banner image URLs
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(tournaments),
        };
    } catch (error) {
        console.error('Error fetching from Google Sheet:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch tournament data' }),
        };
    }
};