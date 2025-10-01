const { InteractionType, InteractionResponseType, verifyKeyMiddleware } = require('discord-interactions');
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const fetch = require('node-fetch');

// Initialize a lightweight Discord client for making API calls
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

// In-memory store for active tournament details
const activeTournaments = {};

// Main handler for ALL bot interactions
exports.handler = async (event, context) => {
    // --- Security Check for Webhook from Website ---
    // If the request is from our website, it will have a secret header.
    if (event.headers['x-webhook-secret'] === process.env.WEBHOOK_SECRET) {
        return handleNewTournament(JSON.parse(event.body));
    }

    // --- Security and Handling for Interactions from Discord ---
    // All other requests are assumed to be from Discord and must be verified.
    const signature = event.headers['x-signature-ed25519'];
    const timestamp = event.headers['x-signature-timestamp'];
    const rawBody = event.body;

    const isValidRequest = verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY)(event);
    if (!isValidRequest) {
        return { statusCode: 401, body: 'Invalid signature' };
    }

    const interaction = JSON.parse(rawBody);

    // --- Handle Different Interaction Types ---
    if (interaction.type === InteractionType.PING) {
        // This is the initial check from Discord to see if our URL is valid. We MUST respond correctly.
        return {
            statusCode: 200,
            body: JSON.stringify({ type: InteractionResponseType.PONG }),
        };
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        // This is a slash command from a user.
        switch (interaction.data.name) {
            case 'start_round':
                return handleStartRound(interaction);
            // Add other cases for more commands here
            default:
                return { statusCode: 400, body: 'Unknown command' };
        }
    }

    return { statusCode: 400, body: 'Unknown interaction type' };
};


// --- Handler for New Tournaments from the Website ---
async function handleNewTournament(tournament) {
    try {
        console.log('Received new tournament:', tournament.scrimName);
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);

        // 1. Create Role
        const role = await guild.roles.create({ name: tournament.scrimName, mentionable: true });

        // 2. Create Private Category
        const category = await guild.channels.create({
            name: tournament.scrimName,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // @everyone cannot view
                { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel] },   // Role CAN view
            ],
        });

        // 3. Create details channel
        const detailsChannel = await guild.channels.create({
            name: 'tournament-details',
            type: ChannelType.GuildText,
            parent: category.id,
        });
        
        // Store details for later use by slash commands
        activeTournaments[tournament.scrimId] = {
            roleId: role.id,
            categoryId: category.id,
            detailsChannelId: detailsChannel.id,
        };
        
        // 6. Announce the new tournament
        const announcementChannelId = 'YOUR_ANNOUNCEMENT_CHANNEL_ID'; // Replace with your actual channel ID
        const announcementChannel = await guild.channels.fetch(announcementChannelId);
        
        if (announcementChannel) {
            announcementChannel.send({
                content: `${role.toString()}, registrations are open!`,
                embeds: [{
                    title: `🏆 ${tournament.scrimName}`,
                    description: `**Game:** ${tournament.game}\n**Mode:** ${tournament.mode}\n**Prize Pool:** ${tournament.prizePool}`,
                    color: 0xDC143C,
                    url: `https://crimsoncrown.top/tournament-detail.html?id=${tournament.scrimId}`,
                }],
            });
        }
        
        return { statusCode: 200, body: 'Discord setup successful' };
    } catch (error) {
        console.error("Error setting up Discord tournament:", error);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
}


// --- Handler for /start_round Slash Command ---
async function handleStartRound(interaction) {
    const tournamentId = interaction.data.options.find(opt => opt.name === 'tournament_id').value;
    const roundNumber = interaction.data.options.find(opt => opt.name === 'round_number').value;

    const tournament = activeTournaments[tournamentId];
    if (!tournament) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `Error: Tournament with ID "${tournamentId}" was not found.` },
            }),
        };
    }
    
    // This is a deferred response. It shows "Bot is thinking..." to the user.
    // We will follow up later with the actual message.
    // This is REQUIRED for any command that might take more than 3 seconds.
    // In a real scenario, you would prompt the admin for Room ID/Password here.
    // For now, we will just post a message.
    
    setTimeout(async () => {
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        const detailsChannel = await guild.channels.fetch(tournament.detailsChannelId);
        if (detailsChannel) {
            detailsChannel.send(`Admin has started Round ${roundNumber}! Get ready!`);
        }
    }, 1000); // 1-second delay to simulate work

    return {
        statusCode: 200,
        body: JSON.stringify({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        }),
    };
}