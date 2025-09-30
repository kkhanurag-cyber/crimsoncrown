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
        const { scrimId, ...updatedData } = JSON.parse(event.body);
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
        const rowToUpdate = rows.find(row => row.scrimId === scrimId);

        if (rowToUpdate) {
            // Update each property from the incoming data
            for (const key in updatedData) {
                if (rowToUpdate.hasOwnProperty(key)) {
                    rowToUpdate[key] = updatedData[key];
                }
            }
            await rowToUpdate.save();
            return { statusCode: 200, body: JSON.stringify({ message: 'Tournament updated successfully.' }) };
        } else {
            return { statusCode: 404, body: JSON.stringify({ error: 'Tournament not found.' }) };
        }
    } catch (error) {
        console.error('Error updating tournament:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update tournament.' }) };
    }
};