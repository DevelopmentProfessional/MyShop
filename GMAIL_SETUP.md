# Gmail Email Configuration Setup Guide

## Current Configuration
- **Email**: ShopyTester123@gmail.com
- **Password**: ShopyTester!
- **Service**: Gmail SMTP

## Setup Steps

### 1. Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to Security → 2-Step Verification
3. Turn on 2-Step Verification if not already enabled

### 2. Generate App Password
1. Go to Google Account → Security → 2-Step Verification
2. Scroll down to "App passwords"
3. Select "Mail" and "Other (Custom name)"
4. Name it "Shopy Application"
5. Copy the 16-character password

### 3. Update Configuration (if needed)
If the regular password doesn't work, update `js/config.js`:
```javascript
pass: 'your-16-character-app-password'
```

### 4. Test Email Configuration
Run the test script:
```bash
node js/test-email.js
```

## Troubleshooting

### Common Issues:

1. **Authentication Failed (EAUTH)**
   - Ensure 2-factor authentication is enabled
   - Use App Password instead of regular password
   - Check credentials in config file

2. **Connection Failed (ECONNECTION)**
   - Check internet connection
   - Verify Gmail SMTP settings
   - Check firewall settings

3. **Timeout (ETIMEDOUT)**
   - Try again later
   - Check network stability

### Gmail SMTP Settings:
- **Host**: smtp.gmail.com
- **Port**: 587
- **Security**: TLS
- **Authentication**: Required

## Files Updated:
- `js/email.js` - Main email functionality
- `js/config.js` - Configuration settings
- `js/test-email.js` - Test script

## Usage in Application:
```javascript
const { sendEmail } = require('./js/email');

const result = await sendEmail({
    to: 'recipient@example.com',
    subject: 'Test Subject',
    html: '<h1>Test Email</h1>'
});
```

## Security Notes:
- App passwords are more secure than regular passwords
- Never commit credentials to version control
- Consider using environment variables for production 