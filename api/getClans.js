const { GoogleSpreadsheet } = require('google-spreadsheet');

// All credentials are read securely from Netlify's environment variables.
const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

exports.handler = async (event) => {
    // This function is public, so no JWT check is needed.
    
    // Initialize a new GoogleSpreadsheet object with our Sheet ID.
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        // Authenticate with the Google Sheets API using the service account credentials.
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newline characters correctly.
        });
        
        // Load the document properties and worksheets.
        await doc.loadInfo();
        
        // Access the specific sheet (tab) named 'clans'.
        const sheet = doc.sheetsByTitle['clans'];
        
        // Fetch all rows from the 'clans' sheet.
        const rows = await sheet.getRows();

        // Map over each row to format the data into a clean JSON object for the frontend.
        // This ensures we only send the data that's needed.
        const clans = rows.map(row => ({
            clanId: row.clanId,
            clanName: row.clanName,
            clanTag: row.clanTag,
            clanLogo: row.clanLogo,
            captainName: row.captainName,
            roster: row.roster || '', // Provide an empty string as a fallback if roster is empty.
        }));

        // If successful, return a 200 OK status with the list of clans.
        return { 
            statusCode: 200, 
            body: JSON.stringify(clans) 
        };
    } catch (error) {
        // If any part of the process fails, log the error for debugging
        // and return a 500 Internal Server Error to the client.
        console.error('Error fetching clans:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Failed to fetch clans.' }) 
        };
    }
};