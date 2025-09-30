const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // This is an admin-only function. Check for admin role in JWT.
    try {
        const token = event.headers.authorization.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET);
        if (!payload.siteRole || payload.siteRole !== 'admin') {
            throw new Error('Insufficient permissions');
        }
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
        const sheet = doc.sheetsByTitle['users'];
        const rows = await sheet.getRows();

        const users = rows.map(row => ({
            userId: row.userId,
            username: row.username,
            avatar: row.avatar,
            siteRole: row.siteRole || 'user', // Default to 'user' if blank
        }));

        return { statusCode: 200, body: JSON.stringify(users) };
    } catch (error) {
        console.error('Error fetching users:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch user list.' }) };
    }
};