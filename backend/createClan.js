const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // 1. Authenticate user with their login token
    let userPayload;
    try {
        const token = event.headers.authorization.split(' ')[1];
        userPayload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    
    // 2. Process the clan registration form data from the request body
    const { clanName, clanTag, clanLogo, roster } = JSON.parse(event.body);
    if (!clanName || !clanTag || !clanLogo) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields.' }) };
    }

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();

        // 3. Check if the user is already part of a clan
        const usersSheet = doc.sheetsByTitle['users'];
        const userRows = await usersSheet.getRows();
        const userRow = userRows.find(u => u.userId === userPayload.userId);
        
        if (!userRow) {
             return { statusCode: 404, body: JSON.stringify({ error: 'Your user profile was not found. Please log in again.' }) };
        }
        if (userRow.clanId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'You are already in a clan.' }) };
        }
        
        // 4. Create the new clan in the 'clans' sheet
        const clanId = `CLAN_${Date.now()}`;
        const clansSheet = doc.sheetsByTitle['clans'];
        await clansSheet.addRow({
            clanId: clanId,
            clanName: clanName,
            clanTag: clanTag,
            clanLogo: clanLogo,
            captainId: userPayload.userId,
            captainName: userPayload.username,
            roster: roster,
            timestamp: new Date().toISOString()
        });
        
        // 5. Update the user's row to assign them as the 'leader' of the new clan
        userRow.clanId = clanId;
        userRow.clanRole = 'leader';
        await userRow.save();

        return { statusCode: 200, body: JSON.stringify({ message: 'Clan created successfully', clanId }) };

    } catch (error) {
        console.error("Error creating clan:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create clan.' }) };
    }
};