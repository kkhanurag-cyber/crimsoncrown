import { put } from '@vercel/blob';

// This is the updated, unified upload function for both clan logos and tournament banners.
// It is now configured to run as a standard Serverless Function.

export default async function handler(req, res) {
    // We only accept POST requests for uploads.
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const filename = req.query.filename || 'unknown-file';

    try {
        // The file is sent directly in the request body.
        // We pass the filename, the request body, and the access level to Vercel Blob.
        const blob = await put(filename, req.body, {
            access: 'public', // Make the uploaded file publicly accessible.
        });

        // Return a JSON response with the URL of the uploaded file.
        return res.status(200).json(blob);

    } catch (error) {
        console.error("Vercel Blob Upload Error:", error);
        return res.status(500).json({ error: 'Failed to upload file.' });
    }
}