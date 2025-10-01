const nodemailer = require('nodemailer');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Add Google credentials to the list of environment variables
const { MAIL_USER, MAIL_PASS, SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { name, email, subject, message } = JSON.parse(event.body);

        // --- Step 1: Save the message to Google Sheets ---
        try {
            const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
            await doc.useServiceAccountAuth({
                client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            });
            await doc.loadInfo();
            const sheet = doc.sheetsByTitle['messages'];
            await sheet.addRow({
                messageId: `MSG_${Date.now()}`,
                name: name,
                email: email,
                subject: subject,
                message: message,
                status: 'unread', // Default status for new messages
                timestamp: new Date().toISOString(),
            });
        } catch (sheetError) {
            // If saving to the sheet fails, log the error but continue to try sending the email.
            console.error("Failed to save message to Google Sheet:", sheetError);
        }

        // --- Step 2: Send the email notification ---
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: MAIL_USER,
                pass: MAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"${name}" <${email}>`,
            to: MAIL_USER,
            subject: `New Crimson Crown Contact Form: ${subject}`,
            text: `You have a new message from:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            html: `<p>You have a new message from:</p><ul><li><strong>Name:</strong> ${name}</li><li><strong>Email:</strong> ${email}</li></ul><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
        };

        await transporter.sendMail(mailOptions);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Message sent and saved successfully!' }),
        };
    } catch (error) {
        console.error('Error in contact form function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process message.' }),
        };
    }
};