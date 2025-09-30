const { google } = require('googleapis');
const stream = require('stream');

// All credentials are read securely from Netlify's environment variables.
const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID } = process.env;

exports.handler = async (event) => {
    // This is a public function for clan logo uploads. It does NOT require a JWT token.
    // Its security comes from the fact that it can only add files to one specific, designated folder.

    // 1. Set up Google Drive Authentication using service account credentials.
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive.file'], // Scope limited to file creation.
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // 2. Process the file data from the request body.
    try {
        const { file, fileName } = JSON.parse(event.body);
        
        // The frontend sends the image as a base64 string. We convert it back to a buffer.
        const buffer = Buffer.from(file.split('split,')[1] || file.split(',')[1], 'base64');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);

        // Define the metadata for the file we are creating on Google Drive.
        const fileMetadata = {
            name: `clan-logo-${Date.now()}-${fileName}`, // Add a timestamp to prevent name conflicts.
            parents: [GOOGLE_DRIVE_FOLDER_ID], // This ensures the file goes into our designated folder.
        };
        
        // Define the media content of the upload request.
        const media = {
            mimeType: 'image/jpeg', // Assuming jpeg/png for logos.
            body: bufferStream,
        };

        // 3. Execute the file creation request to the Google Drive API.
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id', // We only need the file ID back from the response.
            supportsAllDrives: true // <-- ADD THIS LINE
        });

        const fileId = response.data.id;

        // 4. Make the newly uploaded file publicly readable by anyone with the link.
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
        
        // 5. Construct the direct-view URL for the image and return it to the frontend.
        const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        return {
            statusCode: 200,
            body: JSON.stringify({ url: publicUrl }),
        };

    } catch (error) {
        console.error("Public Google Drive Upload Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to upload image.' }) };
    }
};