const nodemailer = require('nodemailer');

// The user's email credentials are read securely from Netlify's environment variables.
const { MAIL_USER, MAIL_PASS } = process.env;

exports.handler = async (event, context) => {
    // This function should only respond to POST requests from the contact form.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        // Parse the form data sent from the frontend.
        const { name, email, subject, message } = JSON.parse(event.body);

        // Create a "transporter" object, which is responsible for sending the email.
        // This configuration is for Gmail. You'll need to generate a 16-character "App Password"
        // from your Google Account security settings for this to work.
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: MAIL_USER,
                pass: MAIL_PASS,
            },
        });

        // Set up the email's content.
        const mailOptions = {
            from: `"${name}" <${email}>`, // Show the sender's name and email.
            to: MAIL_USER, // The email address you want to receive the message at (your own).
            subject: `New Crimson Crown Contact Form: ${subject}`, // Subject line.
            // Provide both a plain text and an HTML version of the email for compatibility.
            text: `You have a new message from:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            html: `<p>You have a new message from:</p><ul><li><strong>Name:</strong> ${name}</li><li><strong>Email:</strong> ${email}</li></ul><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
        };

        // Send the email using the transporter object.
        await transporter.sendMail(mailOptions);

        // If the email is sent successfully, return a success message.
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Message sent successfully!' }),
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to send message.' }),
        };
    }
};