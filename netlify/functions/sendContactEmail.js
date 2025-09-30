const nodemailer = require('nodemailer');

// These credentials will be stored securely in Netlify's environment variables
const { MAIL_USER, MAIL_PASS } = process.env;

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { name, email, subject, message } = JSON.parse(event.body);

        // Create a transporter object using a service like Gmail
        // You'll need to generate an "App Password" from your email provider for this
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Or another email service
            auth: {
                user: MAIL_USER,
                pass: MAIL_PASS,
            },
        });

        // Set up email data
        const mailOptions = {
            from: `"${name}" <${email}>`, // Sender address
            to: MAIL_USER, // The email address you want to receive the message at
            subject: `New Contact Form Submission: ${subject}`, // Subject line
            text: `You have a new message from:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            html: `<p>You have a new message from:</p><ul><li><strong>Name:</strong> ${name}</li><li><strong>Email:</strong> ${email}</li></ul><p><strong>Message:</strong></p><p>${message}</p>`,
        };

        // Send the email
        await transporter.sendMail(mailOptions);

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
