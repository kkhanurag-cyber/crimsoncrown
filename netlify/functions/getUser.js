const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // 1. Authenticate the user with their JWT login token.
    let userPayload;
    try {
        const token = event.headers.authorization.split(' ')[1];
        userPayload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        // If the token is missing or invalid, the user is not logged in or their session has expired.
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // If the token is valid, proceed to fetch the user's data from the database.
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        
        const sheet = doc.sheetsByTitle['users'];
        const rows = await sheet.getRows();
        
        // Find the specific row in the 'users' sheet that matches the user's ID from the token.
        const userRow = rows.find(u => u.userId === userPayload.userId);

        if (!userRow) {
            // This case handles data inconsistency where a user has a valid token but no database entry.
            return { statusCode: 404, body: JSON.stringify({ error: 'User not found in database.' }) };
        }

        // Format the user's data to be sent back. This is used for registration checks.
        const userData = {
            userId: userRow.userId,
            username: userRow.username,
            clanId: userRow.clanId,
            clanRole: userRow.clanRole
        };
        
        return { statusCode: 200, body: JSON.stringify(userData) };

    } catch (error) {
        console.error('Error fetching user data:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch user data.' }) };
    }
};