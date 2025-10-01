import { put } from '@vercel/blob';

// This is the new, unified upload function for both clan logos and tournament banners.
// It is secure because the BLOB_READ_WRITE_TOKEN is a secret environment variable.
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
        return new Response(JSON.stringify({ error: 'Missing filename parameter.' }), { status: 400 });
    }

    try {
        // The file is sent directly in the request body.
        const blob = await put(filename, request.body, {
            access: 'public', // Make the uploaded file publicly accessible.
        });

        // Return the JSON response with the URL of the uploaded file.
        return new Response(JSON.stringify(blob), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error) {
        console.error("Vercel Blob Upload Error:", error);
        return new Response(JSON.stringify({ error: 'Failed to upload file.' }), { status: 500 });
    }
}