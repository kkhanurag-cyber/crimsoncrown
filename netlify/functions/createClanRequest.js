const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // 1. Authenticate the user with their login token
    let userPayload;
    try {
        const token = event.headers.authorization.split(' ')[1];
        userPayload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const { clanId, clanName } = JSON.parse(event.body);
    if (!clanId || !clanName) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing clan information.' }) };
    }
    
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        
        // 2. Check if user is already in a clan
        const usersSheet = doc.sheetsByTitle['users'];
        const userRows = await usersSheet.getRows();
        const user = userRows.find(u => u.userId === userPayload.userId);
        if (user && user.clanId) {
             return { statusCode: 400, body: JSON.stringify({ error: 'You are already in a clan.' }) };
        }

        // 3. Add the request to the clan_requests sheet
        const requestsSheet = doc.sheetsByTitle['clan_requests'];
        await requestsSheet.addRow({
            requestId: `REQ_${Date.now()}`,
            clanId: clanId,
            clanName: clanName,
            userId: userPayload.userId,
            username: userPayload.username,
            status: 'pending',
            timestamp: new Date().toISOString()
        });
        
        return { statusCode: 200, body: JSON.stringify({ message: 'Request submitted successfully!' }) };

    } catch (error) {
        console.error('Error creating clan request:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to submit request.' }) };
    }
};