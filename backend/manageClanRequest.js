const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // 1. Authenticate the user with their JWT login token.
    let leaderPayload;
    try {
        const token = event.headers.authorization.split(' ')[1];
        leaderPayload = jwt.verify(token, JWT_SECRET);
        // This is a protected action. Verify that the user's token contains the 'leader' role.
        if (leaderPayload.clanRole !== 'leader') {
            throw new Error('Not a clan leader.');
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Only clan leaders can perform this action.' }) };
    }

    try {
        // 2. Get the details of the request from the frontend.
        const { requestId, userId, clanId, action } = JSON.parse(event.body);
        
        // Security Check: Make sure the leader is only managing requests for their own clan.
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
        if (!requestToProcess) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Request not found.' }) };
        }
        
        // 3. Process the action ('approve' or 'deny').
        if (action === 'approve') {
            // Find the user who made the request in the 'users' sheet.
            const userRows = await usersSheet.getRows();
            const userToUpdate = userRows.find(row => row.userId === userId);
            if (userToUpdate) {
                // Update the user's profile to add them to the clan with the 'member' role.
                userToUpdate.clanId = clanId;
                userToUpdate.clanRole = 'member';
                await userToUpdate.save();
                
                // Add the user's name to the clan's roster string in the 'clans' sheet.
                const clanRows = await clansSheet.getRows();
                const clanToUpdate = clanRows.find(c => c.clanId === clanId);
                if (clanToUpdate) {
                    const currentRoster = clanToUpdate.roster ? clanToUpdate.roster.split(',').map(name => name.trim()) : [];
                    if (!currentRoster.includes(userToUpdate.username)) {
                        currentRoster.push(userToUpdate.username);
                        clanToUpdate.roster = currentRoster.join(', ');
                        await clanToUpdate.save();
                    }
                }

                // Mark the request as 'approved' so it doesn't show up again.
                requestToProcess.status = 'approved';
                await requestToProcess.save();
            } else {
                throw new Error('User who made the request was not found.');
            }
        } else if (action === 'deny') {
            // If denying, simply update the request status.
            requestToProcess.status = 'denied';
            await requestToProcess.save();
        }
        
        return { statusCode: 200, body: JSON.stringify({ message: `Request has been successfully ${action}d.` }) };

    } catch (error) {
        console.error('Error processing clan request:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process the request.' }) };
    }
};