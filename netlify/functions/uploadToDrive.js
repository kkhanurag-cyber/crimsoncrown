const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const stream = require('stream');

const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET, GOOGLE_DRIVE_FOLDER_ID } = process.env;

exports.handler = async (event) => {
    // 1. Protect this function with JWT Authentication
    try {
        const token = event.headers.authorization.split(' ')[1];
        jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // 2. Set up Google Drive Authentication
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive'], // Specify Drive API scope
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // 3. Process and Upload the File
    try {
        const { file, fileName } = JSON.parse(event.body);
        
        // Convert base64 image data to a buffer
        const buffer = Buffer.from(file.split(',')[1], 'base64');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);

        // Define file metadata
        const fileMetadata = {
            name: fileName,
            parents: [GOOGLE_DRIVE_FOLDER_ID], // Specify the folder to upload into
        };
        
        // Define the upload request
        const media = {
            mimeType: 'image/jpeg', // You can adjust this based on file type
            body: bufferStream,
        };

        // Create the file on Google Drive
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink', // Ask for the ID and link back
        });

        const fileId = response.data.id;
        const webViewLink = response.data.webViewLink;

        // 4. Make the File Publicly Readable
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // 5. Return the public link to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ url: webViewLink }),
        };

    } catch (error) {
        console.error("Google Drive Upload Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to upload image to Google Drive' }) };
    }
};