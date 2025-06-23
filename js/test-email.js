const { sendEmail } = require('./email');

// Test email function
async function testEmail() {
    console.log('Testing Gmail email configuration...');
    
    const testEmail = {
        to: 'ShopyTester123@gmail.com', // Send to yourself for testing
        subject: 'Shopy Email Test',
        html: `
            <h2>Shopy Email Test</h2>
            <p>This is a test email to verify that your Gmail configuration is working correctly.</p>
            <p><strong>Test Details:</strong></p>
            <ul>
                <li>Sender: ShopyTester123@gmail.com</li>
                <li>Recipient: ShopyTester123@gmail.com</li>
                <li>Time: ${new Date().toLocaleString()}</li>
            </ul>
            <p>If you receive this email, your Gmail configuration is working properly!</p>
            <hr>
            <p><em>This is an automated test email from your Shopy application.</em></p>
        `
    };

    try {
        const result = await sendEmail(testEmail);
        
        if (result.success) {
            console.log('✅ Email test successful!');
            console.log('Message ID:', result.messageId);
            console.log('Message:', result.message);
        } else {
            console.log('❌ Email test failed!');
            console.log('Error:', result.error);
            console.log('Details:', result.details);
        }
    } catch (error) {
        console.log('❌ Email test failed with exception!');
        console.log('Error:', error.message);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testEmail();
}

module.exports = { testEmail }; 