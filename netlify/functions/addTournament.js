const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

// Get credentials from environment variables
const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event, context) => {
    // 1. Check for a valid token
    try {
        const token = event.headers.authorization.split(' ')[1]; // Get token from "Bearer <token>"
        jwt.verify(token, JWT_SECRET); // This will throw an error if the token is invalid or expired
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Invalid or missing token' }) };
    }

    // 2. If token is valid, proceed to add data
    try {
        const tournamentData = JSON.parse(event.body);
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['tournaments'];
        
        // Add the new tournament as a row in the sheet
        await sheet.addRow(tournamentData);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Tournament added successfully' }),
        };
    } catch (error) {
        console.error('Error adding to Google Sheet:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to add tournament' }) };
    }
};