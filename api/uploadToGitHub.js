const fetch = require('node-fetch');

// All credentials are read securely from Netlify's environment variables.
const { GITHUB_TOKEN, GITHUB_USER, GITHUB_REPO, GITHUB_BRANCH } = process.env;

exports.handler = async (event) => {
    // This function is public but secure. It can only act on behalf of your token.
    try {
        const { file, fileName } = JSON.parse(event.body);
        
        // The frontend sends a base64 string with a prefix (e.g., "data:image/png;base64,...").
        // The GitHub API only wants the part after the comma.
        const content = file.split('base64,')[1];
        
        // Define a unique path for the new file in your repository.
        // We'll put all new uploads in a temporary 'uploads' folder.
        const filePath = `uploads/logo-${Date.now()}-${fileName}`;
        
        // This is the GitHub API endpoint for creating a file.
        const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filePath}`;

        // Create the request payload.
        const payload = {
            message: `feat: Add new clan logo ${fileName}`, // This is the commit message.
            content: content, // The base64-encoded file content.
            branch: GITHUB_BRANCH,
        };

        // 2. Execute the API request to create the file on GitHub.
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API Error: ${errorData.message}`);
        }
        
        // 3. Construct the public URL for the newly created image.
        // This is the raw content URL that can be used in an <img> tag.
        const publicUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;

        // 4. Return the public URL to the frontend.
        return {
            statusCode: 200,
            body: JSON.stringify({ url: publicUrl }),
        };

    } catch (error) {
        console.error("GitHub Upload Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to upload image to GitHub.' }) };
    }
};