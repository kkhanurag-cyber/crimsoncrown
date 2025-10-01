const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

// All credentials are read securely from Netlify's environment variables.
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
        // If token verification fails or the role is incorrect, return an Unauthorized error.
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Get the specific tournament ID from the query parameter (e.g., /getRegistrations?id=SCRIM123).
    const scrimId = event.queryStringParameters.id;
    if (!scrimId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing tournament ID parameter.' }) };
    }

    // If the admin is authorized, proceed to fetch the registration data.
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['registrations'];
        const rows = await sheet.getRows();

        // Filter all registrations to find only those matching the requested tournament ID.
        const registrations = rows
            .filter(row => row.scrimId === scrimId)
            .map(row => ({
                // Format the data for the admin panel table.
                teamName: row.clanName, // Using clanName for consistency
                captain: row.captainDiscord,
                roster: row.roster,
                timestamp: row.timestamp,
            }));

        return {
            statusCode: 200,
            body: JSON.stringify(registrations),
        };

    } catch (error) {
        console.error("Error fetching registrations:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch registration data.' }) };
    }
};