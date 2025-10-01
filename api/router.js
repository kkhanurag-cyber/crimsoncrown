const { GoogleSpreadsheet } = require('google-spreadsheet');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

// All environment variables for all functions are loaded here.
const { 
    SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET, 
    MAIL_USER, MAIL_PASS, WEBHOOK_SECRET,
    DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_SERVER_ID, DISCORD_BOT_TOKEN
} = process.env;

// This is the main handler for all API requests, using Vercel's standard syntax.
module.exports = async (req, res) => {
    // For Vercel, we get parameters, body, and headers from the `req` object.
    const { action } = req.query;
    const { body, headers } = req;

    // Vercel provides a `VERCEL_URL` environment variable for the deployment's URL.
    // We use this for production and fall back to localhost for local `vercel dev` testing.
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

    try {
        // --- AUTHENTICATION ACTIONS (Handled Separately) ---
        if (action === 'discord-auth-start') {
            const redirectURI = `${baseUrl}/api/router?action=discord-auth-callback`;
            const state = req.query.redirect || '/';
            const scope = ['identify', 'guilds.join'].join(' ');
            const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectURI)}&response_type=code&scope=${scope}&state=${encodeURIComponent(state)}`;
            return res.redirect(302, authUrl);
        }

        if (action === 'discord-auth-callback') {
            const { code, state } = req.query;
            const finalRedirect = state || '/';
            const redirectURI = `${baseUrl}/api/router?action=discord-auth-callback`;

            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ client_id: DISCORD_CLIENT_ID, client_secret: DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: redirectURI }),
            });
            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;
            if (!accessToken) throw new Error("Could not retrieve access token from Discord.");

            const userResponse = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } });
            const discordUser = await userResponse.json();
            
            if (DISCORD_SERVER_ID && DISCORD_BOT_TOKEN) {
                await fetch(`https://discord.com/api/guilds/${DISCORD_SERVER_ID}/members/${discordUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
                    body: JSON.stringify({ access_token: accessToken }),
                });
            }
            
            const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
            await doc.useServiceAccountAuth({ client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') });
            await doc.loadInfo();
            const sheet = doc.sheetsByTitle['users'];
            const rows = await sheet.getRows();
            let userRow = rows.find(row => row.userId === discordUser.id);
            const avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`;

            if (userRow) {
                userRow.username = discordUser.username;
                userRow.avatar = avatarUrl;
                await userRow.save();
            } else {
                userRow = await sheet.addRow({ userId: discordUser.id, username: discordUser.username, avatar: avatarUrl, clanId: '', clanRole: '', siteRole: '' });
            }
            
            const siteToken = jwt.sign({ userId: userRow.userId, username: userRow.username, avatar: userRow.avatar, clanId: userRow.clanId, clanRole: userRow.clanRole, siteRole: userRow.siteRole || null }, JWT_SECRET, { expiresIn: '30d' });

            return res.redirect(302, `${baseUrl}/?token=${siteToken}&redirect=${encodeURIComponent(finalRedirect)}`);
        }

        // --- All other actions require a DB connection ---
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        
        // The main switch statement routes the request to the correct logic.
        switch (action) {

            // --- PUBLIC GET ACTIONS ---
            case 'getTournaments': {
                await doc.loadInfo();
                const sheet = doc.sheetsByTitle['tournaments'];
                const rows = await sheet.getRows();
                const data = rows.map(r => ({ scrimId: r.scrimId, scrimName: r.scrimName, game: r.game, status: r.status, slots: r.slots, prizePool: r.prizePool, bannerImage: r.bannerImage }));
                return res.status(200).json(data);
            }
            case 'getLeaderboard': {
                await doc.loadInfo();
                const sheet = doc.sheetsByTitle['leaderboard'];
                const rows = await sheet.getRows();
                const data = rows.map(r => ({ teamName: r.teamName, totalPoints: parseInt(r.totalPoints, 10) || 0, avgRank: parseFloat(r.avgRank) || 0, totalKills: parseInt(r.totalKills, 10) || 0, teamLogo: r.teamLogo || 'assets/images/default-logo.png' }));
                data.sort((a, b) => (b.totalPoints - a.totalPoints) || (a.avgRank - b.avgRank));
                return res.status(200).json(data);
            }
            case 'getClans': {
                await doc.loadInfo();
                const sheet = doc.sheetsByTitle['clans'];
                const rows = await sheet.getRows();
                const data = rows.map(r => ({ clanId: r.clanId, clanName: r.clanName, clanTag: r.clanTag, clanLogo: r.clanLogo, captainName: r.captainName, roster: r.roster || '' }));
                return res.status(200).json(data);
            }
            case 'getClanDetail': {
                const { id } = req.query;
                if (!id) return res.status(400).json({ error: 'Missing ID' });
                await doc.loadInfo();
                const sheet = doc.sheetsByTitle['clans'];
                const rows = await sheet.getRows();
                const row = rows.find(r => r.clanId === id);
                if (!row) return res.status(404).json({ error: 'Not Found' });
                const data = { clanId: row.clanId, clanName: row.clanName, clanTag: row.clanTag, clanLogo: row.clanLogo, captainName: row.captainName, roster: row.roster ? row.roster.split(',').map(n => n.trim()) : [] };
                return res.status(200).json(data);
            }
            case 'getTournamentDetail': {
                const { id } = req.query;
                if (!id) return res.status(400).json({ error: 'Missing ID' });
                await doc.loadInfo();
                const tourneySheet = doc.sheetsByTitle['tournaments'];
                const tourneyRows = await tourneySheet.getRows();
                const tourney = tourneyRows.find(r => r.scrimId === id);
                if (!tourney) return res.status(404).json({ error: 'Not Found' });
                const regSheet = doc.sheetsByTitle['registrations'];
                const regRows = await regSheet.getRows();
                const registeredTeams = regRows.filter(r => r.scrimId === id).map(r => ({ clanName: r.clanName, captainDiscord: r.captainDiscord }));
                const data = { scrimId: tourney.scrimId, scrimName: tourney.scrimName, game: tourney.game, status: tourney.status, slots: tourney.slots, prizePool: tourney.prizePool, bannerImage: tourney.bannerImage, regStart: tourney.regStart, regEnd: tourney.regEnd, scrimStart: tourney.scrimStart, scrimEnd: tourney.scrimEnd, rules: tourney.rules, pointTable: tourney.pointTable, description: tourney.description, registeredTeams: registeredTeams, registeredCount: registeredTeams.length };
                return res.status(200).json(data);
            }
            case 'getPartners': {
                await doc.loadInfo();
                const sheet = doc.sheetsByTitle['partners'];
                const rows = await sheet.getRows();
                const data = rows.map(r => ({ partnerName: r.partnerName, logoUrl: r.logoUrl, websiteUrl: r.websiteUrl, category: r.category }));
                return res.status(200).json(data);
            }

            // --- CONTACT FORM (PUBLIC POST) ---
            case 'sendContactEmail': {
                 const { name, email, subject, message } = body;
                 await doc.loadInfo();
                 const messagesSheet = doc.sheetsByTitle['messages'];
                 await messagesSheet.addRow({ messageId: `MSG_${Date.now()}`, name, email, subject, message, status: 'unread', timestamp: new Date().toISOString() });
                 const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: MAIL_USER, pass: MAIL_PASS }});
                 await transporter.sendMail({ from: `"${name}" <${email}>`, to: MAIL_USER, subject: `New Contact: ${subject}`, text: message, html: `<p>Message from ${name} (${email}):</p><p>${message}</p>` });
                 return res.status(200).json({ message: 'Message sent' });
            }

            // --- USER-AUTHENTICATED ACTIONS ---
            case 'getUser':
            case 'getUserProfile':
            case 'createClan':
            case 'createClanRequest':
            case 'registerForTournament':
            case 'manageClanRequest': {
                let userPayload;
                try {
                    const token = headers.authorization.split(' ')[1];
                    userPayload = jwt.verify(token, JWT_SECRET);
                } catch (e) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                
                await doc.loadInfo();
                const usersSheet = doc.sheetsByTitle['users'];
                const userRows = await usersSheet.getRows();
                const user = userRows.find(u => u.userId === userPayload.userId);

                if (action === 'getUser') {
                    if (!user) return res.status(404).json({ error: 'User not found' });
                    return res.status(200).json({ userId: user.userId, username: user.username, clanId: user.clanId, clanRole: user.clanRole });
                }
                
                if (action === 'getUserProfile') {
                    const clansSheet = doc.sheetsByTitle['clans'];
                    const regSheet = doc.sheetsByTitle['registrations'];
                    const lbSheet = doc.sheetsByTitle['leaderboard'];
                    let clanInfo = null;
                    if (user && user.clanId) {
                        const clanRows = await clansSheet.getRows();
                        const clan = clanRows.find(c => c.clanId === user.clanId);
                        if(clan) clanInfo = { clanName: clan.clanName, clanLogo: clan.clanLogo };
                    }
                    const regRows = await regSheet.getRows();
                    const played = regRows.filter(r => r.clanId === (user ? user.clanId : null)).length;
                    let rank = 'N/A';
                    if (clanInfo) {
                        const lbRows = await lbSheet.getRows();
                        lbRows.sort((a,b) => (parseInt(b.totalPoints,10)||0) - (parseInt(a.totalPoints,10)||0));
                        const idx = lbRows.findIndex(r => r.teamName === clanInfo.clanName);
                        if(idx !== -1) rank = `${idx + 1}`;
                    }
                    const profile = { userId: userPayload.userId, username: userPayload.username, avatar: userPayload.avatar, clan: clanInfo, tournamentsPlayed: played, leaderboardPosition: rank };
                    return res.status(200).json(profile);
                }

                if (action === 'createClan') {
                    const { clanName, clanTag, clanLogo, roster } = body;
                    if (!clanName || !clanTag || !clanLogo) return res.status(400).json({ error: 'Missing required fields.' });
                    if (user && user.clanId) return res.status(400).json({ error: 'You are already in a clan.' });
                    const clanId = `CLAN_${Date.now()}`;
                    const clansSheet = doc.sheetsByTitle['clans'];
                    await clansSheet.addRow({ clanId, clanName, clanTag, clanLogo, captainId: userPayload.userId, captainName: userPayload.username, roster, timestamp: new Date().toISOString() });
                    if (user) {
                        user.clanId = clanId;
                        user.clanRole = 'leader';
                        await user.save();
                    }
                    return res.status(200).json({ message: 'Clan created successfully' });
                }

                if (action === 'createClanRequest') {
                    const { clanId, clanName } = body;
                    if (!clanId || !clanName) return res.status(400).json({ error: 'Missing clan info.' });
                    if (user && user.clanId) return res.status(400).json({ error: 'You are already in a clan.' });
                    const requestsSheet = doc.sheetsByTitle['clan_requests'];
                    await requestsSheet.addRow({ requestId: `REQ_${Date.now()}`, clanId, clanName, userId: userPayload.userId, username: userPayload.username, status: 'pending', timestamp: new Date().toISOString() });
                    return res.status(200).json({ message: 'Request submitted' });
                }

                if (action === 'registerForTournament') {
                    if (userPayload.clanRole !== 'leader' && userPayload.clanRole !== 'co-leader') return res.status(403).json({ error: 'Permission denied.' });
                    const { scrimId, clanId, clanName, captainDiscord, roster } = body;
                    const regSheet = doc.sheetsByTitle['registrations'];
                    const regRows = await regSheet.getRows();
                    const existing = regRows.find(r => r.scrimId === scrimId && r.clanId === clanId);
                    if (existing) return res.status(400).json({ error: 'Your clan is already registered.' });
                    await regSheet.addRow({ registrationId: `REG_${Date.now()}`, scrimId, clanId, clanName, captainDiscord, roster, timestamp: new Date().toISOString() });
                    return res.status(200).json({ message: 'Registration successful' });
                }

                if (action === 'manageClanRequest') {
                     if (userPayload.clanRole !== 'leader') return res.status(403).json({ error: 'Permission denied.' });
                     const { requestId, userId, clanId, action: reqAction } = body;
                     if (userPayload.clanId !== clanId) return res.status(403).json({ error: 'Cannot manage another clan.' });
                     const requestsSheet = doc.sheetsByTitle['clan_requests'];
                     const reqRows = await requestsSheet.getRows();
                     const request = reqRows.find(r => r.requestId === requestId);
                     if (!request) return res.status(404).json({ error: 'Request not found' });
                     if (reqAction === 'approve') {
                         const userToUpdate = userRows.find(u => u.userId === userId);
                         if(userToUpdate) {
                             userToUpdate.clanId = clanId;
                             userToUpdate.clanRole = 'member';
                             await userToUpdate.save();
                             const clansSheet = doc.sheetsByTitle['clans'];
                             const clanRows = await clansSheet.getRows();
                             const clan = clanRows.find(c => c.clanId === clanId);
                             if (clan) {
                                 const roster = clan.roster ? clan.roster.split(',').map(n=>n.trim()) : [];
                                 if (!roster.includes(userToUpdate.username)) {
                                     roster.push(userToUpdate.username);
                                     clan.roster = roster.join(', ');
                                     await clan.save();
                                 }
                             }
                         }
                     }
                     request.status = reqAction === 'approve' ? 'approved' : 'denied';
                     await request.save();
                     return res.status(200).json({ message: 'Request processed' });
                }
                
                return res.status(501).json({ error: 'Action not implemented.' });
            }
            
            // --- ADMIN-ONLY ACTIONS ---
            default: {
                let adminPayload;
                try {
                    const token = headers.authorization.split(' ')[1];
                    adminPayload = jwt.verify(token, JWT_SECRET);
                    if (adminPayload.siteRole !== 'admin') throw new Error('Permissions error');
                } catch (e) {
                    return res.status(401).json({ error: 'Unauthorized Admin' });
                }

                await doc.loadInfo();
                const requestBody = body; // Body is already parsed by Vercel

                switch(action) {
                    case 'addTournament': {
                         const sheet = doc.sheetsByTitle['tournaments'];
                         await sheet.addRow(requestBody);
                         const botEndpoint = `${baseUrl}/api/discord-interactions`;
                         await fetch(botEndpoint, { method: 'POST', headers: {'Content-Type': 'application/json', 'x-webhook-secret': WEBHOOK_SECRET}, body: JSON.stringify(requestBody) });
                         return res.status(200).json({ message: 'Tournament Added' });
                    }
                    case 'updateTournament': {
                        const { scrimId, ...updatedData } = requestBody;
                        const sheet = doc.sheetsByTitle['tournaments'];
                        const rows = await sheet.getRows();
                        const row = rows.find(r => r.scrimId === scrimId);
                        if (row) {
                            Object.assign(row, updatedData);
                            await row.save();
                            return res.status(200).json({ message: 'Tournament updated' });
                        }
                        return res.status(404).json({ error: 'Not Found' });
                    }
                    case 'deleteTournament': {
                        const { scrimId } = requestBody;
                        const sheet = doc.sheetsByTitle['tournaments'];
                        const rows = await sheet.getRows();
                        const row = rows.find(r => r.scrimId === scrimId);
                        if (row) await row.delete();
                        return res.status(200).json({ message: 'Tournament deleted' });
                    }
                    case 'getUsers': {
                        const sheet = doc.sheetsByTitle['users'];
                        const rows = await sheet.getRows();
                        const users = rows.map(r => ({userId: r.userId, username: r.username, avatar: r.avatar, siteRole: r.siteRole || 'user'}));
                        return res.status(200).json(users);
                    }
                    case 'updateUserRole': {
                        const { userId, newRole } = requestBody;
                        const sheet = doc.sheetsByTitle['users'];
                        const rows = await sheet.getRows();
                        const row = rows.find(r => r.userId === userId);
                        if (row) {
                            row.siteRole = newRole;
                            await row.save();
                            return res.status(200).json({ message: 'Role updated' });
                        }
                        return res.status(404).json({ error: 'Not Found' });
                    }
                    case 'getClanRequests': {
                        const sheet = doc.sheetsByTitle['clan_requests'];
                        const rows = await sheet.getRows();
                        const requests = rows.filter(r => r.status === 'pending').map(r => ({requestId: r.requestId, clanId: r.clanId, clanName: r.clanName, userId: r.userId, username: r.username, timestamp: r.timestamp}));
                        return res.status(200).json(requests);
                    }
                    case 'processClanRequest': {
                        const { requestId, userId, clanId, action: reqAction } = requestBody;
                        const requestsSheet = doc.sheetsByTitle['clan_requests'];
                        const usersSheet = doc.sheetsByTitle['users'];
                        const clansSheet = doc.sheetsByTitle['clans'];
                        const reqRows = await requestsSheet.getRows();
                        const request = reqRows.find(r => r.requestId === requestId);
                        if (!request) return res.status(404).json({ error: 'Not Found' });
                        if (reqAction === 'approve') {
                             const userRows = await usersSheet.getRows();
                             const user = userRows.find(u => u.userId === userId);
                             if (user) {
                                 user.clanId = clanId;
                                 user.clanRole = 'member';
                                 await user.save();
                                 const clanRows = await clansSheet.getRows();
                                 const clan = clanRows.find(c => c.clanId === clanId);
                                 if (clan) {
                                     const roster = clan.roster ? clan.roster.split(',').map(n=>n.trim()) : [];
                                     if (!roster.includes(user.username)) {
                                         roster.push(user.username);
                                         clan.roster = roster.join(', ');
                                         await clan.save();
                                     }
                                 }
                             }
                        }
                        request.status = reqAction === 'approve' ? 'approved' : 'denied';
                        await request.save();
                        return res.status(200).json({ message: 'Request processed' });
                    }
                    case 'getRegistrations': {
                        const { id } = req.query;
                        const sheet = doc.sheetsByTitle['registrations'];
                        const rows = await sheet.getRows();
                        const registrations = rows.filter(r => r.scrimId === id).map(r => ({ clanName: r.clanName, captainDiscord: r.captainDiscord, roster: r.roster, timestamp: r.timestamp }));
                        return res.status(200).json(registrations);
                    }
                    case 'getMessages': {
                        const sheet = doc.sheetsByTitle['messages'];
                        const rows = await sheet.getRows();
                        const messages = rows.map(r => ({ messageId: r.messageId, name: r.name, email: r.email, subject: r.subject, message: r.message, status: r.status, timestamp: r.timestamp })).reverse();
                        return res.status(200).json(messages);
                    }
                    case 'addPartner': {
                        const sheet = doc.sheetsByTitle['partners'];
                        await sheet.addRow(requestBody);
                        return res.status(200).json({ message: 'Partner added' });
                    }
                    case 'updatePartner': {
                        const { originalName, ...updatedData } = requestBody;
                        const sheet = doc.sheetsByTitle['partners'];
                        const rows = await sheet.getRows();
                        const row = rows.find(r => r.partnerName === originalName);
                        if (row) {
                            Object.assign(row, updatedData);
                            await row.save();
                        }
                        return res.status(200).json({ message: 'Partner updated' });
                    }
                    case 'deletePartner': {
                        const { partnerName } = requestBody;
                        const sheet = doc.sheetsByTitle['partners'];
                        const rows = await sheet.getRows();
                        const row = rows.find(r => r.partnerName === partnerName);
                        if (row) await row.delete();
                        return res.status(200).json({ message: 'Partner deleted' });
                    }
                    default:
                        return res.status(404).json({ error: 'Admin action not found' });
                }
            }
        }
    } catch (error) {
        console.error(`Error in router action "${action}":`, error);
        return res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
};