const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');

// All credentials are read securely from Netlify's environment variables.
const { SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } = process.env;

exports.handler = async (event) => {
    // 1. Authenticate the user with their JWT login token.
    let userPayload;
    try {
        const token = event.headers.authorization.split(' ')[1];
        userPayload = jwt.verify(token, JWT_SECRET);
        if (!userPayload) {
            // This handles cases where the token might be malformed but doesn't throw an error.
            throw new Error('Invalid token payload');
        }
    } catch (error) {
        // If the token is missing or invalid, the user is not authorized.
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // If the token is valid, proceed to fetch the user's complete profile data.
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    try {
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();

        // Access all the sheets we need to build the profile.
        const usersSheet = doc.sheetsByTitle['users'];
        const clansSheet = doc.sheetsByTitle['clans'];
        const registrationsSheet = doc.sheetsByTitle['registrations'];
        const leaderboardSheet = doc.sheetsByTitle['leaderboard'];

        // 2. Fetch the user's primary data and clan information.
        const users = await usersSheet.getRows();
        const user = users.find(u => u.userId === userPayload.userId);
        let clanInfo = null;

        if (!user) {
             return { statusCode: 404, body: JSON.stringify({ error: 'User data not found in the database.' }) };
        }

        if (user.clanId) {
            const clans = await clansSheet.getRows();
            const clan = clans.find(c => c.clanId === user.clanId);
            if (clan) {
                clanInfo = { clanName: clan.clanName, clanLogo: clan.clanLogo };
            }
        }

        // 3. Fetch the user's tournament history by checking the 'registrations' sheet.
        const registrations = await registrationsSheet.getRows();
        // We filter registrations to find any where the user's clan was registered.
        const playedTournaments = registrations.filter(r => r.clanId === user.clanId).length;

        // 4. Fetch the user's clan leaderboard position.
        let leaderboardRank = 'N/A';
        if (clanInfo) {
            const leaderboardRows = await leaderboardSheet.getRows();
            // Sort the leaderboard to get the correct rankings.
            leaderboardRows.sort((a, b) => (parseInt(b.totalPoints, 10) || 0) - (parseInt(a.totalPoints, 10) || 0));
            const rankIndex = leaderboardRows.findIndex(row => row.teamName === clanInfo.clanName);
            // The rank is the index in the sorted array + 1.
            if (rankIndex !== -1) {
                leaderboardRank = `${rankIndex + 1}`;
            }
        }

        // 5. Combine all collected data into a single profile object to send to the frontend.
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
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch profile data.' }) };
    }
};