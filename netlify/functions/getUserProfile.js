const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
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

        const usersSheet = doc.sheetsByTitle['users'];
        const clansSheet = doc.sheetsByTitle['clans'];
        const registrationsSheet = doc.sheetsByTitle['registrations'];
        const leaderboardSheet = doc.sheetsByTitle['leaderboard'];

        const users = await usersSheet.getRows();
        const user = users.find(u => u.userId === userPayload.userId);
        
        let clanInfo = null;
        if (user && user.clanId) {
            const clans = await clansSheet.getRows();
            const clan = clans.find(c => c.clanId === user.clanId);
            if(clan) {
                clanInfo = { clanName: clan.clanName, clanLogo: clan.clanLogo };
            }
        }

        const registrations = await registrationsSheet.getRows();
        // FIXED: Check history using username, as discriminator isn't in our JWT
        const playedTournaments = registrations.filter(r => {
            return r.captainDiscord.startsWith(userPayload.username) || 
                   (r.roster && r.roster.includes(userPayload.username));
        }).length;

        let leaderboardRank = 'N/A';
        if (clanInfo) {
            const leaderboardRows = await leaderboardSheet.getRows();
            leaderboardRows.sort((a, b) => (parseInt(b.totalPoints, 10) || 0) - (parseInt(a.totalPoints, 10) || 0));
            const rankIndex = leaderboardRows.findIndex(row => row.teamName === clanInfo.clanName);
            if (rankIndex !== -1) {
                leaderboardRank = `${rankIndex + 1}`;
            }
        }

        const userProfile = {
            userId: userPayload.userId,
            username: userPayload.username,
            avatar: userPayload.avatar,
            clan: clanInfo,
            tournamentsPlayed: playedTournaments,
            leaderboardPosition: leaderboardRank,
        };
        
        return { statusCode: 200, body: JSON.stringify(userProfile) };

    } catch (error) {
        console.error('Error fetching user profile:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch profile data' }) };
    }
};