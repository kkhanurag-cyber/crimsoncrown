const { DISCORD_CLIENT_ID, URL } = process.env;

exports.handler = async (event) => {
    // This is the URL the user will be sent back to after logging in on Discord.
    const redirectURI = `${URL}/api/discord-auth-callback`;

    // We capture the original page the user was on so we can send them back there after login.
    const state = event.queryStringParameters.redirect || '/';

    // We define the "scopes" or permissions we are asking for:
    // 'identify' lets us see their username and ID.
    // 'guilds.join' lets us add them to our server.
    const scope = ['identify', 'guilds.join'].join(' ');

    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectURI)}&response_type=code&scope=${scope}&state=${encodeURIComponent(state)}`;

    // Redirect the user's browser to the Discord login page.
    return {
        statusCode: 302,
        headers: {
            Location: authUrl,
        },
    };
};