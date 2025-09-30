const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // 1. Authenticate the user (clan leader)
    let leaderPayload;
    try {
        const token = event.headers.authorization.split(' ')[1];
        leaderPayload = jwt.verify(token, JWT_SECRET);
        // Only clan leaders can manage requests
        if (leaderPayload.clanRole !== 'leader') throw new Error('Not a leader');
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Only clan leaders can perform this action.' }) };
    }

    try {
        const { requestId, userId, clanId, action } = JSON.parse(event.body);
        
        // Security Check: Make sure the leader is managing a request for their own clan
        if (leaderPayload.clanId !== clanId) {
            return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: You cannot manage requests for another clan.' }) };
        }

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const requestsSheet = doc.sheetsByTitle['clan_requests'];
        const usersSheet = doc.sheetsByTitle['users'];
        const clansSheet = doc.sheetsByTitle['clans'];

        const requestRows = await requestsSheet.getRows();
        const requestToProcess = requestRows.find(row => row.requestId === requestId);
        if (!requestToProcess) return { statusCode: 404, body: JSON.stringify({ error: 'Request not found.' }) };
        
        if (action === 'approve') {
            const userRows = await usersSheet.getRows();
            const userToUpdate = userRows.find(row => row.userId === userId);
            if (userToUpdate) {
                userToUpdate.clanId = clanId;
                userToUpdate.clanRole = 'member';
                await userToUpdate.save();
                
                // Add user to the clan's roster
                const clanRows = await clansSheet.getRows();
                const clanToUpdate = clanRows.find(c => c.clanId === clanId);
                if (clanToUpdate) {
                    const newRoster = clanToUpdate.roster ? `${clanToUpdate.roster}, ${userToUpdate.username}` : userToUpdate.username;
                    clanToUpdate.roster = newRoster;
                    await clanToUpdate.save();
                }

                requestToProcess.status = 'approved';
                await requestToProcess.save();
            } else {
                throw new Error('User to approve was not found.');
            }
        } else if (action === 'deny') {
            requestToProcess.status = 'denied';
            await requestToProcess.save();
        }
        
        return { statusCode: 200, body: JSON.stringify({ message: `Request has been ${action}d.` }) };

    } catch (error) {
        console.error('Error processing request:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process request.' }) };
    }
};