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

    try {
        const { partnerName } = JSON.parse(event.body);
        if (!partnerName) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing partner name.' }) };
        }

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['partners'];
        const rows = await sheet.getRows();
        const rowToDelete = rows.find(row => row.partnerName === partnerName);

        if (rowToDelete) {
            await rowToDelete.delete();
            return { statusCode: 200, body: JSON.stringify({ message: 'Partner deleted successfully.' }) };
        } else {
            return { statusCode: 404, body: JSON.stringify({ error: 'Partner not found.' }) };
        }
    } catch (error) {
        console.error('Error deleting partner:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete partner.' }) };
    }
};