const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // Admin-only function
    try {
        const token = event.headers.authorization.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.siteRole !== 'admin') throw new Error('Permissions error');
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['clan_requests'];
        const rows = await sheet.getRows();

        // Find all requests that are still pending
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

        return { statusCode: 200, body: JSON.stringify(pendingRequests) };
    } catch (error) {
        console.error('Error fetching clan requests:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch requests.' }) };
    }
};