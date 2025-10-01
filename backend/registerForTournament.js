const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // 1. This is a protected action. Authenticate the user with their JWT.
    let userPayload;
    try {
        const token = event.headers.authorization.split(' ')[1];
        userPayload = jwt.verify(token, JWT_SECRET);
        // Only clan leaders or co-leaders can register for tournaments.
        if (userPayload.clanRole !== 'leader' && userPayload.clanRole !== 'co-leader') {
            throw new Error('Insufficient permissions. Must be a clan leader or co-leader.');
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: ' + error.message }) };
    }

    // Ensure this function only handles POST requests.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { scrimId, clanId, clanName, captainDiscord, roster } = JSON.parse(event.body);

        // Basic validation to ensure required fields are present.
        if (!scrimId || !clanId || !clanName) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required registration fields.' }) };
        }

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['registrations'];
        
        // 2. Prevent duplicate registrations. Check if the clan is already registered for this tournament.
        const rows = await sheet.getRows();
        const existingRegistration = rows.find(r => r.scrimId === scrimId && r.clanId === clanId);
        if (existingRegistration) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Your clan is already registered for this tournament.' }) };
        }

        // 3. If no duplicates are found, add the new registration data to the 'registrations' sheet.
        await sheet.addRow({
            registrationId: `REG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            scrimId: scrimId,
            clanId: clanId,
            clanName: clanName,
            captainDiscord: captainDiscord,
            roster: roster
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Registration successful!' }),
        };

    } catch (error) {
        console.error("Tournament Registration Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to submit registration.' }) };
    }
};