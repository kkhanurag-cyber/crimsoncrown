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
        const sheet = doc.sheetsByTitle['messages'];
        const rows = await sheet.getRows();

        const messages = rows.map(row => ({
            messageId: row.messageId,
            name: row.name,
            email: row.email,
            subject: row.subject,
            message: row.message,
            status: row.status,
            timestamp: row.timestamp,
        })).reverse(); // Show newest messages first

        return { statusCode: 200, body: JSON.stringify(messages) };
    } catch (error) {
        console.error('Error fetching messages:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch messages.' }) };
    }
};