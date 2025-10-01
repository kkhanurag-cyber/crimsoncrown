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

    // If the admin is authorized, proceed to update the user's role.
    try {
        // The frontend sends the userId of the user to be updated and the new role.
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
        
        // Find the specific row in the 'users' sheet that matches the userId.
        const userRow = rows.find(row => row.userId === userId);

        if (userRow) {
            // Update the 'siteRole' column with the new value.
            userRow.siteRole = newRole;
            // Save the changes back to the Google Sheet.
            await userRow.save();
            return { statusCode: 200, body: JSON.stringify({ message: 'User role updated successfully.' }) };
        } else {
            // If no user with the matching ID was found.
            return { statusCode: 404, body: JSON.stringify({ error: 'User not found.' }) };
        }
    } catch (error) {
        console.error('Error updating user role:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update role.' }) };
    }
};