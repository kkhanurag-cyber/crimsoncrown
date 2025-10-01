const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET, URL, WEBHOOK_SECRET } = process.env;

exports.handler = async (event) => {
    // 1. Admin-only function: Verify the user has an 'admin' role in their token
    try {
        const token = event.headers.authorization.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.siteRole !== 'admin') {
            throw new Error('Insufficient permissions');
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // 2. Proceed only if authorized
    try {
        const tournamentData = JSON.parse(event.body);
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['tournaments'];
        
        // 3. Add the new tournament data as a new row in the 'tournaments' sheet
        await sheet.addRow(tournamentData);
        
        // --- MOVED AND CORRECTED: This logic now runs *after* the tournament is saved. ---
        // 4. After successfully saving to the sheet, send a notification to our bot.
        try {
            // The endpoint for all bot interactions
            const botEndpoint = `${URL}/.netlify/functions/discord-interactions`;
            
            await fetch(botEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-webhook-secret': WEBHOOK_SECRET, // The secret key to prove it's from us
                },
                body: JSON.stringify(tournamentData),
            });
        } catch (webhookError) {
            // If the bot notification fails, we just log it but don't fail the whole process.
            console.error("Failed to notify bot, but tournament was created:", webhookError);
        }
        // --- END MOVED CODE ---

        // 5. Return success message to the admin panel
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Tournament added successfully and bot notified.' }),
        };
    } catch (error) {
        console.error('Error adding tournament to Google Sheet:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to add tournament' }) };
    }
};