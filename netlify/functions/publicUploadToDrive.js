const { google } = require('googleapis');
const stream = require('stream');

// Securely get credentials from Netlify's environment variables
const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID } = process.env;

exports.handler = async (event) => {
    // NOTE: This function does NOT have a JWT check, making it public.
    // It's safe because it can only add files to a specific folder.

    // 1. Set up Google Drive Authentication
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // 2. Process and Upload the File
    try {
        const { file, fileName } = JSON.parse(event.body);
        
        const buffer = Buffer.from(file.split(',')[1], 'base64');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);

        const fileMetadata = {
            name: `clan-logo-${Date.now()}-${fileName}`, // Add timestamp to prevent name conflicts
            parents: [GOOGLE_DRIVE_FOLDER_ID],
        };
        
        const media = {
            mimeType: 'image/jpeg',
            body: bufferStream,
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
        });

        const fileId = response.data.id;

        // 3. Make the File Publicly Readable
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
        
        // We need to construct the direct download link, not the viewer link.
        const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        // 4. Return the public link
        return {
            statusCode: 200,
            body: JSON.stringify({ url: publicUrl }),
        };

    } catch (error) {
        console.error("Public Google Drive Upload Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to upload image' }) };
    }
};
