const jwt = require('jsonwebtoken');

const { ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET } = process.env;

exports.handler = async (event, context) => {
    // We only accept POST requests for logging in
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { username, password } = JSON.parse(event.body);

        // Check if the provided username and password match the secure environment variables
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            // If they match, create a secure token (JWT) that expires in 8 hours
            const token = jwt.sign({ user: username, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });

            // Send the token back to the frontend
            return {
                statusCode: 200,
                body: JSON.stringify({ token }),
            };
        } else {
            // If credentials do not match, send an unauthorized error
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Invalid credentials' }),
            };
        }
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Bad request' }) };
    }
};