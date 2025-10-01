const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // Admin-only function: Verify the user has an 'admin' role
    try {
        const token = event.headers.authorization.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.siteRole !== 'admin') {
            throw new Error('Insufficient permissions');
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    try {
        const { scrimId } = JSON.parse(event.body);
        if (!scrimId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing scrimId.' }) };
        }

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['tournaments'];
        const rows = await sheet.getRows();
        const rowToDelete = rows.find(row => row.scrimId === scrimId);

        if (rowToDelete) {
            await rowToDelete.delete();
            return { statusCode: 200, body: JSON.stringify({ message: 'Tournament deleted successfully.' }) };
        } else {
            return { statusCode: 404, body: JSON.stringify({ error: 'Tournament not found.' }) };
        }
    } catch (error) {
        console.error('Error deleting tournament:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete tournament.' }) };
    }
};