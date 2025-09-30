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

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['users'];
        const rows = await sheet.getRows();
        const user = rows.find(u => u.userId === userPayload.userId);

        if (!user) {
            return { statusCode: 404, body: JSON.stringify({ error: 'User not found in database' }) };
        }

        const userData = {
            userId: user.userId,
            username: user.username,
            clanId: user.clanId,
            clanRole: user.clanRole
        };
        
        return { statusCode: 200, body: JSON.stringify(userData) };

    } catch (error) {
        console.error('Error fetching user data:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch user data' }) };
    }
};
