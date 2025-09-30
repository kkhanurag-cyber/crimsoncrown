const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // This is an admin-only function, so we must first verify the user's token.
    try {
        // Extract the token from the 'Authorization' header (e.g., "Bearer <token>").
        const token = event.headers.authorization.split(' ')[1];
        // Verify the token using our secret key. This will throw an error if the token is invalid or expired.
        const payload = jwt.verify(token, JWT_SECRET);
        // Check if the user has the 'admin' role in their token's payload.
        if (!payload.siteRole || payload.siteRole !== 'admin') {
            throw new Error('Insufficient permissions. Admin role required.');
        }
    } catch (error) {
        // If token is missing, invalid, or doesn't have the admin role, return a 401 Unauthorized error.
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // If the user is a verified admin, proceed to fetch the data.
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        
        // Access the 'clan_requests' sheet.
        const sheet = doc.sheetsByTitle['clan_requests'];
        const rows = await sheet.getRows();

        // Filter the rows to find only those with a 'pending' status.
        const pendingRequests = rows
            .filter(row => row.status === 'pending')
            .map(row => ({
                requestId: row.requestId,
                clanId: row.clanId,
                clanName: row.clanName,
                userId: row.userId,
                username: row.username,
                timestamp: row.timestamp,
            }));

        // Return the list of pending requests.
        return { statusCode: 200, body: JSON.stringify(pendingRequests) };
    } catch (error) {
        console.error('Error fetching clan requests:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch requests.' }) };
    }
};