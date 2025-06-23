const nodemailer = require('nodemailer');
const { emailConfig } = require('./config');

// Email configuration for Gmail
const transporter = nodemailer.createTransport({
    service: emailConfig.gmail.service,
    host: emailConfig.gmail.host,
    port: emailConfig.gmail.port,
    secure: emailConfig.gmail.secure,
    auth: {
        user: emailConfig.gmail.user,
        pass: emailConfig.gmail.pass
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify connection configuration
transporter.verify(function(error, success) {
    if (error) {
        console.log('Email server connection error:', error);
        console.log('Please ensure:');
        console.log('1. Gmail credentials are correct');
        console.log('2. 2-factor authentication is enabled');
        console.log('3. App password is generated and used');
    } else {
        console.log('Email server is ready to send messages');
    }
});

// A function to send an email
const sendEmail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"Shopy" <${emailConfig.gmail.user}>`, // sender address
            to: to, // list of receivers
            subject: subject, // Subject line
            html: html, // html body
        });

        console.log('Message sent: %s', info.messageId);
        console.log('Email sent successfully to:', to);
        
        return { 
            success: true, 
            messageId: info.messageId,
            message: 'Email sent successfully!'
        };
        
    } catch (error) {
        console.error('Error sending email:', error);
        
        // Provide specific error messages for common Gmail issues
        let errorMessage = error.message;
        if (error.code === 'EAUTH') {
            errorMessage = 'Authentication failed. Please check your Gmail credentials and ensure 2-factor authentication is properly configured.';
        } else if (error.code === 'ECONNECTION') {
            errorMessage = 'Connection failed. Please check your internet connection.';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timed out. Please try again.';
        }
        
        return { 
            success: false, 
            error: errorMessage,
            details: error.message
        };
    }
};

module.exports = { sendEmail }; 