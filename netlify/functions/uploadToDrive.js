const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const stream = require('stream');

// All credentials are read securely from Netlify's environment variables.
const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET, GOOGLE_DRIVE_FOLDER_ID } = process.env;

exports.handler = async (event) => {
    // 1. This is a protected admin function. First, verify the user's JWT.
    try {
        const token = event.headers.authorization.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET);
        // Ensure the user has the 'admin' role.
        if (payload.siteRole !== 'admin') {
            throw new Error('Insufficient permissions');
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // 2. Set up Google Drive Authentication using the service account credentials.
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive.file'], // Scope limited to file creation.
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // 3. Process the file data from the request body.
    try {
        const { file, fileName } = JSON.parse(event.body);
        
        // The frontend sends the image as a base64 string. We convert it back to a buffer.
        const buffer = Buffer.from(file.split('split,')[1] || file.split(',')[1], 'base64');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);

        // Define the metadata for the file we are creating on Google Drive.
        const fileMetadata = {
            name: `tournament-banner-${Date.now()}-${fileName}`, // Add a timestamp to prevent name conflicts.
            parents: [GOOGLE_DRIVE_FOLDER_ID], // This ensures the file goes into our designated folder.
        };
        
        // Define the media content of the upload request.
        const media = {
            mimeType: 'image/jpeg', // Assuming jpeg/png for banners.
            body: bufferStream,
        };

        // 4. Execute the file creation request to the Google Drive API.
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id', // We only need the file ID back.
        });

        const fileId = response.data.id;

        // 5. Make the newly uploaded file publicly readable by anyone with the link.
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
        
        // 6. Construct the direct-view URL for the image and return it to the frontend.
        const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        return {
            statusCode: 200,
            body: JSON.stringify({ url: publicUrl }),
        };

    } catch (error) {
        console.error("Admin Google Drive Upload Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to upload image to Google Drive.' }) };
    }
};