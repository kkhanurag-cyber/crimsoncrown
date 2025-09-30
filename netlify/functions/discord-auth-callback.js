const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_SERVER_ID,
    SITE_URL,
    SPREADSHEET_ID,
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY,
    JWT_SECRET,
    DISCORD_BOT_TOKEN
} = process.env;

const redirectURI = `${SITE_URL}/.netlify/functions/discord-auth-callback`;

exports.handler = async (event) => {
    const { code, state } = event.queryStringParameters;
    // If the user was on a specific page before logging in, we'll send them back there. Otherwise, to the homepage.
    const finalRedirect = state || '/';

    try {
        // 1. Exchange Discord code for an access token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectURI,
            }),
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            throw new Error("Could not retrieve access token from Discord.");
        }

        // 2. Fetch user's details from Discord
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const discordUser = await userResponse.json();
        
        // 3. Add user to your Discord server
        if (DISCORD_SERVER_ID && DISCORD_BOT_TOKEN) {
            await fetch(`https://discord.com/api/guilds/${DISCORD_SERVER_ID}/members/${discordUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                },
                body: JSON.stringify({ access_token: accessToken }),
            });
        }
        
        // 4. Save or update user in Google Sheet
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['users'];
        const rows = await sheet.getRows();
        let userRow = rows.find(row => row.userId === discordUser.id);
        
        const avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`;

        if (userRow) {
            // User exists, update their info
            userRow.username = discordUser.username;
            userRow.avatar = avatarUrl;
            await userRow.save();
        } else {
            // New user, add them to the sheet with a blank siteRole
            userRow = await sheet.addRow({
                userId: discordUser.id,
                username: discordUser.username,
                avatar: avatarUrl,
                clanId: '',
                clanRole: '',
                siteRole: '', // New users have no site role by default
            });
        }
        
        // 5. Create a JWT for your website's session, including the user's siteRole
        const siteToken = jwt.sign({
            userId: userRow.userId,
            username: userRow.username,
            avatar: userRow.avatar,
            clanId: userRow.clanId,
            clanRole: userRow.clanRole,
            siteRole: userRow.siteRole || null // Include the siteRole
        }, JWT_SECRET, { expiresIn: '30d' });

        // 6. Redirect user back to the frontend with the token, sending them to their original page
        return {
            statusCode: 302,
            headers: {
                Location: `${SITE_URL}/?token=${siteToken}&redirect=${encodeURIComponent(finalRedirect)}`,
            },
        };

    } catch (error) {
        console.error('Discord auth error:', error);
        return { statusCode: 302, headers: { Location: `${SITE_URL}/?error=auth_failed` } };
    }
};