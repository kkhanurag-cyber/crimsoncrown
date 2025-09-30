const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // Admin-only function: Verify the user has an 'admin' role in their token
    try {
        const token = event.headers.authorization.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.siteRole !== 'admin') {
            throw new Error('Insufficient permissions');
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Proceed only if authorized
    try {
        const tournamentData = JSON.parse(event.body);
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['tournaments'];
        
        // Add the new tournament data as a new row in the 'tournaments' sheet
        await sheet.addRow(tournamentData);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Tournament added successfully' }),
        };
    } catch (error) {
        console.error('Error adding tournament to Google Sheet:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to add tournament' }) };
    }
};