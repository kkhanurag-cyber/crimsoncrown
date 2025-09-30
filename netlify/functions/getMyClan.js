const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // 1. Authenticate the user with their JWT login token.
    let userPayload;
    try {
        const token = event.headers.authorization.split(' ')[1];
        userPayload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        // If the token is missing or invalid, the user is not logged in.
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Check if the user's token indicates they are in a clan.
    if (!userPayload.clanId) {
        // If they are not in a clan, return a 404 Not Found status.
        return { statusCode: 404, body: JSON.stringify({ error: 'User is not in a clan.' }) };
    }

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        
        // 2. Fetch the user's clan details from the 'clans' sheet.
        const clansSheet = doc.sheetsByTitle['clans'];
        const clanRows = await clansSheet.getRows();
        const clan = clanRows.find(c => c.clanId === userPayload.clanId);
        if (!clan) {
            // This case handles data inconsistency, e.g., if a clan was deleted but the user wasn't updated.
            throw new Error('Clan data not found for the user.');
        }

        const clanDetails = {
            clanId: clan.clanId,
            clanName: clan.clanName,
            clanTag: clan.clanTag,
            clanLogo: clan.clanLogo,
            captainId: clan.captainId,
            // Split the roster string into an array of names for easier display on the frontend.
            roster: clan.roster ? clan.roster.split(',').map(name => name.trim()) : []
        };
        
        // 3. Fetch pending join requests, but ONLY if the logged-in user is the clan leader.
        let pendingRequests = [];
        // The user's role is checked from their login token payload.
        if (userPayload.clanRole === 'leader') {
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

        // 4. Combine all the data into a single response object.
        const myClanData = { clanDetails, pendingRequests };
        
        return { statusCode: 200, body: JSON.stringify(myClanData) };

    } catch (error) {
        console.error('Error fetching my clan data:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch clan data.' }) };
    }
};