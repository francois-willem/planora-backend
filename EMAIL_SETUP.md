# Email Service Setup Guide

## Overview
The Planora application uses Nodemailer to send emails for various purposes including instructor invitations, business notifications, and more.

## Environment Variables Required

Add these environment variables to your `.env` file in the `planora-backend` directory:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@planora.com
FRONTEND_URL=http://localhost:3000

# Super Admin Email (for notifications)
SUPER_ADMIN_EMAIL=admin@planora.com
```

## Email Service Options

### Option 1: Gmail (Recommended for Development)
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password as `EMAIL_PASS`

```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-character-app-password
```

### Option 2: SendGrid (Recommended for Production)
1. **Sign up** for a SendGrid account
2. **Create an API Key** with mail send permissions
3. **Configure the transporter** in `utils/emailService.js`:

```javascript
// Replace the createTransporter function with:
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
};
```

```env
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### Option 3: Mailgun (Alternative for Production)
1. **Sign up** for a Mailgun account
2. **Get your SMTP credentials** from the dashboard
3. **Configure the transporter**:

```javascript
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAILGUN_SMTP_USER,
      pass: process.env.MAILGUN_SMTP_PASS
    }
  });
};
```

```env
MAILGUN_SMTP_USER=your-mailgun-smtp-user
MAILGUN_SMTP_PASS=your-mailgun-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

## Testing Email Functionality

### Test Instructor Invitation Email
1. **Set up your environment variables**
2. **Start the backend server**
3. **Use the business dashboard** to invite an instructor
4. **Check the console** for email sending logs
5. **Check the recipient's email** for the invitation

### Manual Email Test
You can test the email service directly by creating a simple test script:

```javascript
// test-email.js
const { sendInstructorInvitationEmail } = require('./utils/emailService');

async function testEmail() {
  const result = await sendInstructorInvitationEmail(
    'test@example.com',
    'Test Swimming School',
    'test-token-123',
    'Welcome to our team!'
  );
  
  console.log('Email sent:', result);
}

testEmail();
```

## Email Templates

The system includes the following email templates:
- **Instructor Invitations**: Welcome new instructors with registration link
- **Business Activation**: Notify businesses when their account is approved
- **Business Rejection**: Notify businesses when their account is rejected
- **New Business Notifications**: Alert super admins of new registrations

## Troubleshooting

### Common Issues:

1. **"Invalid login" error**:
   - Check your email credentials
   - Ensure 2FA is enabled and app password is used (for Gmail)
   - Verify the email service settings

2. **"Connection timeout" error**:
   - Check your internet connection
   - Verify SMTP server settings
   - Check firewall settings

3. **Emails not being received**:
   - Check spam/junk folder
   - Verify the recipient email address
   - Check email service logs

### Debug Mode:
Add this to your `.env` file to see detailed email logs:
```env
NODE_ENV=development
DEBUG=nodemailer:*
```

## Production Considerations

1. **Use a dedicated email service** (SendGrid, Mailgun, AWS SES)
2. **Set up proper DNS records** (SPF, DKIM, DMARC)
3. **Monitor email delivery rates**
4. **Implement email templates** for better deliverability
5. **Set up email bounces and complaints handling**

## Security Notes

- **Never commit email credentials** to version control
- **Use environment variables** for all sensitive data
- **Rotate API keys** regularly
- **Monitor for suspicious email activity**
- **Implement rate limiting** for email sending
