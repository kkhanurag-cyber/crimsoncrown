const { GoogleSpreadsheet } = require('google-spreadsheet');

// All credentials are read securely from Netlify's environment variables.
const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

exports.handler = async (event) => {
    // This is a public function to get details for one specific tournament.
    
    // Get the tournament ID from the query parameter (e.g., /getTournamentDetail?id=SCRIM123).
    const { id } = event.queryStringParameters;
    if (!id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Tournament ID is required.' }) };
    }

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();

        // 1. Fetch the specific tournament from the 'tournaments' sheet.
        const tournamentSheet = doc.sheetsByTitle['tournaments'];
        const tournamentRows = await tournamentSheet.getRows();
        const tournamentRow = tournamentRows.find(row => row.scrimId === id);

        if (!tournamentRow) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Tournament not found.' }) };
        }

        // 2. Fetch the list of teams that have already registered for this specific tournament.
        const registrationSheet = doc.sheetsByTitle['registrations'];
        const registrationRows = await registrationSheet.getRows();
        const registeredTeams = registrationRows
            .filter(row => row.scrimId === id)
            .map(row => ({ 
                clanName: row.clanName, 
                captainDiscord: row.captainDiscord 
            }));

        // 3. Format all the collected data into a single object for the detail page.
        const tournamentDetails = {
            scrimId: tournamentRow.scrimId,
            scrimName: tournamentRow.scrimName,
            game: tournamentRow.game,
            status: tournamentRow.status,
            slots: tournamentRow.slots,
            prizePool: tournamentRow.prizePool,
            bannerImage: tournamentRow.bannerImage,
            regStart: tournamentRow.regStart,
            regEnd: tournamentRow.regEnd,
            scrimStart: tournamentRow.scrimStart,
            scrimEnd: tournamentRow.scrimEnd,
            rounds: tournamentRow.rounds,
            mode: tournamentRow.mode,
            rules: tournamentRow.rules,
            pointTable: tournamentRow.pointTable,
            description: tournamentRow.description,
            registeredTeams: registeredTeams, // Include the list of registered teams.
            registeredCount: registeredTeams.length, // Include a count for convenience.
        };

        return {
            statusCode: 200,
            body: JSON.stringify(tournamentDetails),
        };
    } catch (error) {
        console.error('Error fetching tournament detail:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch tournament data.' }) };
    }
};