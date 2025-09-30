const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // This is an admin-only function.
    try {
        const token = event.headers.authorization.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET);
        if (!payload.siteRole || payload.siteRole !== 'admin') {
            throw new Error('Insufficient permissions');
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    try {
        const { userId, newRole } = JSON.parse(event.body);
        if (!userId || !newRole) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId or newRole.' }) };
        }

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['users'];
        const rows = await sheet.getRows();
        const userRow = rows.find(row => row.userId === userId);

        if (userRow) {
            userRow.siteRole = newRole;
            await userRow.save();
            return { statusCode: 200, body: JSON.stringify({ message: 'User role updated successfully.' }) };
        } else {
            return { statusCode: 404, body: JSON.stringify({ error: 'User not found.' }) };
        }
    } catch (error) {
        console.error('Error updating role:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update role.' }) };
    }
};