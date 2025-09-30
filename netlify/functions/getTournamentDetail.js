const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

exports.handler = async (event) => {
    const { id } = event.queryStringParameters;
    if (!id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Tournament ID is required.' }) };
    }

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: CLIENT_EMAIL,
            private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();

        // Fetch tournament details
        const tournamentSheet = doc.sheetsByTitle['tournaments'];
        const tournamentRows = await tournamentSheet.getRows();
        const tournamentRow = tournamentRows.find(row => row.scrimId === id);

        if (!tournamentRow) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Tournament not found.' }) };
        }

        // UPDATED: Also fetch the list of teams already registered for this tournament
        const registrationSheet = doc.sheetsByTitle['registrations'];
        const registrationRows = await registrationSheet.getRows();
        const registeredTeams = registrationRows
            .filter(row => row.scrimId === id)
            .map(row => ({ teamName: row.teamName, captain: row.captain }));

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
            registeredTeams: registeredTeams // Add the new data
        };

        return {
            statusCode: 200,
            body: JSON.stringify(tournamentDetails),
        };
    } catch (error) {
        console.error('Error fetching tournament detail:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch data' }) };
    }
};