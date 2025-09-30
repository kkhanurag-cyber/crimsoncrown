const { GoogleSpreadsheet } = require('google-spreadsheet');

// These credentials are read securely from Netlify's environment variables
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID; // FIXED: Was hardcoded
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

exports.handler = async (event, context) => {
    try {
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        // Authenticate with the service account
        await doc.useServiceAccountAuth({
            client_email: CLIENT_EMAIL,
            private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['tournaments'];
        const rows = await sheet.getRows();

        const tournaments = rows.map(row => ({
            scrimId: row.scrimId,
            scrimName: row.scrimName,
            game: row.game,
            status: row.status,
            slots: row.slots,
            prizePool: row.prizePool,
            bannerImage: row.bannerImage
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