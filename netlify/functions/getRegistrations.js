const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

// Securely get credentials from Netlify's environment variables
const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, SPREADSHEET_ID, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // 1. Protect this function with JWT Authentication
    try {
        const token = event.headers.authorization.split(' ')[1];
        jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // 2. Get the tournament ID from the query parameter
    const scrimId = event.queryStringParameters.id;
    if (!scrimId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing tournament ID' }) };
    }

    // 3. Fetch and filter the registrations
    try {
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['registrations'];
        const rows = await sheet.getRows();

        // Filter the rows to find only those matching the requested scrimId
        const registrations = rows
            .filter(row => row.scrimId === scrimId)
            .map(row => ({
                teamName: row.teamName,
                captain: row.captain,
                players: [row.player1, row.player2, row.player3, row.player4].filter(Boolean).join(', '),
                subs: [row.sub1, row.sub2, row.sub3].filter(Boolean).join(', ') || 'None',
                timestamp: row.timestamp,
            }));

        return {
            statusCode: 200,
            body: JSON.stringify(registrations),
        };

    } catch (error) {
        console.error("Error fetching registrations:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch registration data' }) };
    }
};
