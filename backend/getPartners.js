const { GoogleSpreadsheet } = require('google-spreadsheet');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

exports.handler = async (event) => {
    // This is a public function to display partners.
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['partners'];
        const rows = await sheet.getRows();

        const partners = rows.map(row => ({
            partnerName: row.partnerName,
            logoUrl: row.logoUrl,
            websiteUrl: row.websiteUrl,
            category: row.category,
        }));

        return { statusCode: 200, body: JSON.stringify(partners) };
    } catch (error) {
        console.error('Error fetching partners:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch partners.' }) };
    }
};