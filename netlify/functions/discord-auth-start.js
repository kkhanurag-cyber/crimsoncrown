// This function constructs the correct Discord authorization URL and redirects the user to it.

exports.handler = async (event) => {
    const { DISCORD_CLIENT_ID, SITE_URL } = process.env;

    // This is the URL the user will be sent back to after logging in on Discord
    const redirectURI = `${SITE_URL}/.netlify/functions/discord-auth-callback`;

    // We define the "scopes" or permissions we are asking for.
    // 'identify' lets us see their username and ID.
    // 'guilds.join' lets us add them to our server.
    const scope = ['identify', 'guilds.join'].join(' ');

    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectURI)}&response_type=code&scope=${scope}`;

    // Redirect the user's browser to the Discord login page
    return {
        statusCode: 302,
        headers: {
            Location: authUrl,
        },
    };
};
