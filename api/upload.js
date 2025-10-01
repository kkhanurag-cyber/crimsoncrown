import { put } from '@vercel/blob';

// This is the unified upload function for both clan logos and tournament banners.
// It is configured to run as a standard Vercel Serverless Function, not an Edge Function.

export default async function handler(req, res) {
    // This function only accepts POST requests.
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // The filename is passed as a query parameter in the URL.
    // e.g., /api/upload?filename=my-logo.png
    const filename = req.query.filename || 'unknown-file';

    try {
        // The file is sent directly in the request body.
        // We pass the desired filename, the request body (which is the file),
        // and an 'access' level to the Vercel Blob 'put' function.
        const blob = await put(filename, req.body, {
            access: 'public', // This makes the uploaded file publicly accessible via its URL.
        });

        // If the upload is successful, Vercel Blob returns a JSON object
        // containing the URL of the uploaded file. We send this back to the frontend.
        return res.status(200).json(blob);

    } catch (error) {
        // If any part of the upload process fails, log the error for debugging
        // and return a 500 Internal Server Error to the client.
        console.error("Vercel Blob Upload Error:", error);
        return res.status(500).json({ error: 'Failed to upload file.' });
    }
}