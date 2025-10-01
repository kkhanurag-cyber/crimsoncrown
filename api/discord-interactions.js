const { InteractionType, InteractionResponseType, verifyKeyMiddleware } = require('discord-interactions');
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const fetch = require('node-fetch');

// All credentials are read securely from Vercel's environment variables.
const { DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, DISCORD_GUILD_ID, WEBHOOK_SECRET, URL } = process.env;

// Initialize a lightweight Discord client for making API calls when needed.
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(DISCORD_BOT_TOKEN);

// In-memory store for active tournament details. This will reset on deploy,
// but is used for quick access during a tournament's lifecycle.
const activeTournaments = {};

// This is the main handler for ALL bot-related interactions.
exports.handler = async (event) => {
    const { httpMethod, body, headers } = event;

    // --- A. Handle Webhook from Your Website (for New Tournaments) ---
    // This part of the function listens for a secure message from your `addTournament` function.
    if (headers['x-webhook-secret'] === WEBHOOK_SECRET) {
        try {
            const tournament = JSON.parse(body);
            console.log('Received new tournament via webhook:', tournament.scrimName);
            const guild = await client.guilds.fetch(DISCORD_GUILD_ID);

            // 1. Create a new role for the tournament.
            const role = await guild.roles.create({ name: tournament.scrimName, mentionable: true });

            // 2. Create a new private category visible only to that role.
            const category = await guild.channels.create({
                name: tournament.scrimName,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // @everyone cannot view.
                    { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel] },   // The new role CAN view.
                ],
            });

            // 3. Create a #tournament-details text channel inside the new category.
            const detailsChannel = await guild.channels.create({
                name: 'tournament-details',
                type: ChannelType.GuildText,
                parent: category.id,
            });
            
            // Store the IDs of created resources for later management by slash commands.
            activeTournaments[tournament.scrimId] = {
                roleId: role.id,
                categoryId: category.id,
                detailsChannelId: detailsChannel.id,
            };
            
            // 4. Announce the new tournament in your designated announcements channel.
            const announcementChannelId = 'YOUR_ANNOUNCEMENT_CHANNEL_ID'; // IMPORTANT: Replace with your actual channel ID.
            const announcementChannel = await guild.channels.fetch(announcementChannelId);
            
            if (announcementChannel) {
                await announcementChannel.send({
                    content: `${role.toString()}, registrations are now open for a new tournament!`,
                    embeds: [{
                        title: `🏆 ${tournament.scrimName}`,
                        description: `**Game:** ${tournament.game}\n**Mode:** ${tournament.mode}\n**Prize Pool:** ${tournament.prizePool}\n\nClick the link below to see more details and register!`,
                        color: 0xDC143C, // Crimson Red
                        url: `${URL}/tournament-detail.html?id=${tournament.scrimId}`,
                    }],
                });
            }
            
            return { statusCode: 200, body: 'Discord setup for tournament successful' };
        } catch (error) {
            console.error("Error setting up Discord tournament via webhook:", error);
            return { statusCode: 500, body: 'Internal Server Error' };
        }
    }

    // --- B. Handle Interactions from Discord (Slash Commands) ---
    // All other requests are assumed to be from Discord and must be verified.
    const signature = headers['x-signature-ed25519'];
    const timestamp = headers['x-signature-timestamp'];

    const isValidRequest = verifyKeyMiddleware(DISCORD_PUBLIC_KEY)(event);
    if (!isValidRequest) {
        return { statusCode: 401, body: 'Invalid signature' };
    }

    const interaction = JSON.parse(body);

    // 1. Handle the initial PING from Discord to verify the endpoint URL.
    if (interaction.type === InteractionType.PING) {
        return {
            statusCode: 200,
            body: JSON.stringify({ type: InteractionResponseType.PONG }),
        };
    }

    // 2. Handle slash commands used by admins in the Discord server.
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        switch (interaction.data.name) {
            case 'start_round':
                // For a command like this, you would typically open a modal to ask the admin for the Room ID and Password.
                // For simplicity, we will just acknowledge the command and post a message.
                const tournamentId = interaction.data.options.find(opt => opt.name === 'tournament_id').value;
                const roundNumber = interaction.data.options.find(opt => opt.name === 'round_number').value;

                const tournament = activeTournaments[tournamentId];
                if (!tournament) {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: { content: `Error: Tournament with ID "${tournamentId}" was not found or is not active.` },
                        }),
                    };
                }
                
                // Acknowledge the command immediately to prevent a timeout.
                // We will send the actual message in a follow-up.
                setTimeout(async () => {
                    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
                    const detailsChannel = await guild.channels.fetch(tournament.detailsChannelId);
                    if (detailsChannel) {
                        detailsChannel.send(`Admin has started **Round ${roundNumber}**! Prepare for battle!`);
                    }
                }, 1000); // 1-second delay to simulate work.

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
                        data: { content: "Starting the round..." }
                    }),
                };

            default:
                return { statusCode: 400, body: JSON.stringify({ error: 'Unknown command' }) };
        }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown interaction type' }) };
};