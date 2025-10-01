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
        const { originalName, ...updatedData } = JSON.parse(event.body);
        if (!originalName) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing original partner name for update.' }) };
        }

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['partners'];
        const rows = await sheet.getRows();
        const rowToUpdate = rows.find(row => row.partnerName === originalName);

        if (rowToUpdate) {
            rowToUpdate.partnerName = updatedData.partnerName;
            rowToUpdate.logoUrl = updatedData.logoUrl;
            rowToUpdate.websiteUrl = updatedData.websiteUrl;
            rowToUpdate.category = updatedData.category;
            await rowToUpdate.save();
            return { statusCode: 200, body: JSON.stringify({ message: 'Partner updated successfully.' }) };
        } else {
            return { statusCode: 404, body: JSON.stringify({ error: 'Partner not found.' }) };
        }
    } catch (error) {
        console.error('Error updating partner:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update partner.' }) };
    }
};