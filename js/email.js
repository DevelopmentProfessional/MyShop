const nodemailer = require('nodemailer');

// Email configuration for Ethereal (testing)
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'monroe.brekke@ethereal.email',
        pass: 'KKpB26tCjjNQnaX4XR'
    }
});

// A function to send an email
const sendEmail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: '"Shopy" <monroe.brekke@ethereal.email>', // sender address
            to: to, // list of receivers
            subject: subject, // Subject line
            html: html, // html body
        });

        console.log('Message sent: %s', info.messageId);
        console.log('Email sent successfully to:', to);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        
        return { 
            success: true, 
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info),
            message: 'Email sent successfully! Check the preview URL to see the email.'
        };
        
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { sendEmail }; 