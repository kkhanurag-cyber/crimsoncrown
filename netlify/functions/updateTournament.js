const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // This is an admin-only function. First, verify the user's token and role.
    try {
        const token = event.headers.authorization.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET);
        // Check if the 'siteRole' in the token payload is 'admin'.
        if (payload.siteRole !== 'admin') {
            throw new Error('Insufficient permissions. Admin role required.');
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // If the admin is authorized, proceed to update the tournament.
    try {
        // The frontend sends the scrimId and all the fields to be updated.
        const { scrimId, ...updatedData } = JSON.parse(event.body);
        if (!scrimId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing scrimId for update.' }) };
        }

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['tournaments'];
        const rows = await sheet.getRows();
        
        // Find the specific row in the 'tournaments' sheet that matches the scrimId.
        const rowToUpdate = rows.find(row => row.scrimId === scrimId);

        if (rowToUpdate) {
            // Loop through all the properties in the data sent from the frontend.
            for (const key in updatedData) {
                // Check if the sheet's row has a column with the same name.
                if (rowToUpdate.hasOwnProperty(key)) {
                    // Update the value in the row object.
                    rowToUpdate[key] = updatedData[key];
                }
            }
            // Save the entire row back to the Google Sheet with the updated values.
            await rowToUpdate.save();
            return { statusCode: 200, body: JSON.stringify({ message: 'Tournament updated successfully.' }) };
        } else {
            // If no row with the matching scrimId was found.
            return { statusCode: 404, body: JSON.stringify({ error: 'Tournament not found.' }) };
        }
    } catch (error) {
        console.error('Error updating tournament:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update tournament.' }) };
    }
};