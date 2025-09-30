const { GoogleSpreadsheet } = require('google-spreadsheet');

// Securely get credentials from Netlify's environment variables
const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, SPREADSHEET_ID } = process.env;

exports.handler = async (event) => {
    // This function is public, as anyone can register for a tournament.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);

        // Basic validation
        if (!data.scrimId || !data.teamName || !data.captain) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields.' }) };
        }

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['registrations'];

        // Add the new registration data to the sheet
        await sheet.addRow({
            registrationId: `REG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            ...data // Spread the rest of the form data into the columns
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Registration successful!' }),
        };

    } catch (error) {
        console.error("Registration Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to submit registration.' }) };
    }
};
