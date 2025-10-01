const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // This is an admin-only function. First, verify the user's token and role.
    try {
        const token = event.headers.authorization.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.siteRole !== 'admin') {
            throw new Error('Insufficient permissions. Admin role required.');
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // If the admin is authorized, proceed to process the request.
    try {
        const { requestId, userId, clanId, action } = JSON.parse(event.body);
        if (!requestId || !userId || !action) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields for processing.' }) };
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

        // Process the action ('approve' or 'deny'), similar to the clan leader function.
        if (action === 'approve') {
            const userRows = await usersSheet.getRows();
            const userToUpdate = userRows.find(row => row.userId === userId);
            if (userToUpdate) {
                userToUpdate.clanId = clanId;
                userToUpdate.clanRole = 'member';
                await userToUpdate.save();

                // Also add user to the clan's roster
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
        console.error('Error processing request from admin panel:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process request.' }) };
    }
};