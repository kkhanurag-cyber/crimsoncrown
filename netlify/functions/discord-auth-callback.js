const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// All credentials are read securely from environment variables.
const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_SERVER_ID,
    URL, // Using Netlify's built-in URL variable for reliability
    SPREADSHEET_ID,
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY,
    JWT_SECRET,
    DISCORD_BOT_TOKEN
} = process.env;

// The redirectURI must exactly match the one used in the -start function
// and the one registered in the Discord Developer Portal.
const redirectURI = `${URL}/.netlify/functions/discord-auth-callback`;

exports.handler = async (event) => {
    const { code, state } = event.queryStringParameters;
    // The 'state' parameter tells us where to send the user after a successful login.
    const finalRedirect = state || '/';

    try {
        // 1. Exchange the temporary 'code' from Discord for a permanent 'access_token'.
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

        // 2. Use the access_token to get the authenticated user's details from Discord.
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const discordUser = await userResponse.json();
        
        // 3. (Optional) Automatically add the user to your Discord server.
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
        
        // 4. Connect to your Google Sheet and save or update the user's information.
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
            // If the user already exists in our sheet, update their username and avatar.
            userRow.username = discordUser.username;
            userRow.avatar = avatarUrl;
            await userRow.save();
        } else {
            // If it's a new user, add a new row for them.
            userRow = await sheet.addRow({
                userId: discordUser.id,
                username: discordUser.username,
                avatar: avatarUrl,
                clanId: '',
                clanRole: '',
                siteRole: '', // New users have no special site role by default.
            });
        }
        
        // 5. Create a secure JWT for your website's session. This token contains the user's roles.
        const siteToken = jwt.sign({
            userId: userRow.userId,
            username: userRow.username,
            avatar: userRow.avatar,
            clanId: userRow.clanId,
            clanRole: userRow.clanRole,
            siteRole: userRow.siteRole || null
        }, JWT_SECRET, { expiresIn: '30d' });

        // 6. Redirect the user back to your website, including the new session token.
        return {
            statusCode: 302,
            headers: {
                Location: `${URL}/?token=${siteToken}&redirect=${encodeURIComponent(finalRedirect)}`,
            },
        };

    } catch (error) {
        console.error('Discord auth error:', error);
        return { statusCode: 302, headers: { Location: `${URL}/?error=auth_failed` } };
    }
};