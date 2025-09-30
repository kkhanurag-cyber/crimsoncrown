const { GoogleSpreadsheet } = require('google-spreadsheet');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

exports.handler = async (event) => {
    const { id } = event.queryStringParameters;
    if (!id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Clan ID is required.' }) };
    }

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['clans'];
        const rows = await sheet.getRows();
        const clanRow = rows.find(row => row.clanId === id);

        if (!clanRow) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Clan not found.' }) };
        }

        const clanDetails = {
            clanId: clanRow.clanId,
            clanName: clanRow.clanName,
            clanTag: clanRow.clanTag,
            clanLogo: clanRow.clanLogo,
            captainName: clanRow.captainName,
            roster: clanRow.roster ? clanRow.roster.split(',').map(name => name.trim()) : [],
        };

        return {
            statusCode: 200,
            body: JSON.stringify(clanDetails),
        };
    } catch (error) {
        console.error('Error fetching clan detail:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch data.' }) };
    }
};