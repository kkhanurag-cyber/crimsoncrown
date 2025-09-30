const { GoogleSpreadsheet } = require('google-spreadsheet');

// These credentials are read securely from Netlify's environment variables
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

exports.handler = async (event, context) => {
    try {
        // Get the tournament ID from the query parameter (e.g., ?id=SCRIM123)
        const { id } = event.queryStringParameters;
        if (!id) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Tournament ID is required.' }) };
        }

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: CLIENT_EMAIL,
            private_key: PRIVATE_KEY,
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['tournaments'];
        const rows = await sheet.getRows();

        // Find the specific tournament that matches the provided ID
        const tournamentRow = rows.find(row => row.scrimId === id);

        if (!tournamentRow) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Tournament not found.' }) };
        }
        
        // Format all data for the detail page
        const tournamentDetails = {
            scrimId: tournamentRow.scrimId,
            scrimName: tournamentRow.scrimName,
            game: tournamentRow.game,
            status: tournamentRow.status,
            slots: tournamentRow.slots,
            prizePool: tournamentRow.prizePool,
            bannerImage: tournamentRow.bannerImage,
            regStart: tournamentRow.regStart,
            regEnd: tournamentRow.regEnd,
            scrimStart: tournamentRow.scrimStart,
            scrimEnd: tournamentRow.scrimEnd,
            rounds: tournamentRow.rounds,
            mode: tournamentRow.mode,
            rules: tournamentRow.rules,
            pointTable: tournamentRow.pointTable,
            description: tournamentRow.description,
        };

        return {
            statusCode: 200,
            body: JSON.stringify(tournamentDetails),
        };
    } catch (error) {
        console.error('Error fetching tournament detail:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch data' }) };
    }
};
