const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // This is an admin-only function. First, verify the user's token and role.
    try {
        const token = event.headers.authorization.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET);
        // Check if the 'siteRole' in the token payload is 'admin'.
        if (!payload.siteRole || payload.siteRole !== 'admin') {
            throw new Error('Insufficient permissions. Admin role required.');
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // If the user is a verified admin, proceed to fetch the list of all users.
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['users'];
        const rows = await sheet.getRows();

        // Map over all user rows to create a clean list for the admin panel.
        const users = rows.map(row => ({
            userId: row.userId,
            username: row.username,
            avatar: row.avatar,
            siteRole: row.siteRole || 'user', // If the role is blank, default to 'user' for the UI.
        }));

        return { statusCode: 200, body: JSON.stringify(users) };
    } catch (error) {
        console.error('Error fetching users:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch user list.' }) };
    }
};