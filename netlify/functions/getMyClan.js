const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // Authenticate the user with their JWT
    let userPayload;
    try {
        const token = event.headers.authorization.split(' ')[1];
        userPayload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    if (!userPayload.clanId) {
        return { statusCode: 404, body: JSON.stringify({ error: 'User is not in a clan.' }) };
    }

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        
        // 1. Fetch Clan Details
        const clansSheet = doc.sheetsByTitle['clans'];
        const clanRows = await clansSheet.getRows();
        const clan = clanRows.find(c => c.clanId === userPayload.clanId);
        if (!clan) throw new Error('Clan not found.');

        const clanDetails = {
            clanId: clan.clanId,
            clanName: clan.clanName,
            clanTag: clan.clanTag,
            clanLogo: clan.clanLogo,
            captainId: clan.captainId,
            roster: clan.roster ? clan.roster.split(',').map(name => name.trim()) : []
        };
        
        // 2. Fetch Pending Join Requests (only if the user is the leader)
        let pendingRequests = [];
        if (userPayload.userId === clan.captainId) {
            const requestsSheet = doc.sheetsByTitle['clan_requests'];
            const requestRows = await requestsSheet.getRows();
            pendingRequests = requestRows
                .filter(r => r.clanId === userPayload.clanId && r.status === 'pending')
                .map(r => ({
                    requestId: r.requestId,
                    userId: r.userId,
                    username: r.username,
                }));
        }

        const myClanData = { clanDetails, pendingRequests };
        
        return { statusCode: 200, body: JSON.stringify(myClanData) };

    } catch (error) {
        console.error('Error fetching my clan data:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch clan data.' }) };
    }
};