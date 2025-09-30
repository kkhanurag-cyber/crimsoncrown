// This script initializes our Google Sheet "database" with the required tabs and headers.
// Run this once from your terminal using: node init-db.js

require('dotenv').config(); // Load environment variables from .env file
const { GoogleSpreadsheet } = require('google-spreadsheet');

// --- CONFIGURATION ---
// Pull credentials from the .env file
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

// Define the sheets we need and their header columns
const SHEET_CONFIG = {
    "tournaments": [
        "scrimId", "scrimName", "game", "status", "slots", "prizePool", "bannerImage", 
        "regStart", "regEnd", "scrimStart", "scrimEnd", "rounds", "mode", "rules", 
        "pointTable", "description", "default"
    ],
    "registrations": [
        "registrationId", "scrimId", "teamName", "captain", "player1", "player2", 
        "player3", "player4", "sub1", "sub2", "sub3", "teamLogo", "timestamp"
    ],
    "leaderboard": [
        "teamName", "match1", "match2", "match3", "match4", "totalPoints", 
        "avgRank", "totalKills", "teamLogo"
    ],
    "clans": [
        "clanId", "clanName", "clanTag", "clanLogo", "captainName", "captainDiscord", "roster", "timestamp"
    ],
    "users": [
        "userId", "username", "avatar", "clanId", "clanRole", "siteRole"
    ],

    // Add this to your SHEET_CONFIG object in init-db.js
"clan_requests": [
    "requestId", "clanId", "clanName", "userId", "username", "status", "timestamp"
],
};

// --- SCRIPT LOGIC ---
async function initializeDatabase() {
    console.log("🚀 Initializing Google Sheet Database...");

    if (!SPREADSHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
        console.error("❌ Error: Missing credentials in .env file. Please check your configuration.");
        return;
    }
    
    // Initialize the sheet
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

    try {
        // Authenticate with the service account
        await doc.useServiceAccountAuth({
            client_email: CLIENT_EMAIL,
            private_key: PRIVATE_KEY.replace(/\\n/g, '\n'), // Ensure newlines are handled correctly
        });

        console.log("✅ Authenticated with Google Sheets API.");

        // Load spreadsheet info
        await doc.loadInfo();
        console.log(`- Connected to spreadsheet: "${doc.title}"`);

        // Loop through our configuration to create sheets
        for (const sheetTitle in SHEET_CONFIG) {
            const headers = SHEET_CONFIG[sheetTitle];
            let sheet = doc.sheetsByTitle[sheetTitle];

            if (sheet) {
                console.log(`- Sheet "${sheetTitle}" already exists. Skipping creation.`);
            } else {
                console.log(`- Sheet "${sheetTitle}" not found. Creating...`);
                sheet = await doc.addSheet({ title: sheetTitle, headerValues: headers });
                console.log(`  ✅ Sheet "${sheetTitle}" created with correct headers.`);
            }
        }
        
        console.log("\n🎉 Database initialization complete!");

    } catch (error) {
        console.error("\n❌ An error occurred during initialization:");
        console.error(error);
    }
}

// Run the initialization function
initializeDatabase();