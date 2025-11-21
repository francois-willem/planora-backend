const nodemailer = require('nodemailer');

// Create transporter (you'll need to configure this with your email service)
const createTransporter = () => {
  // For development, you can use a service like Gmail, SendGrid, or Mailgun
  // For production, use a proper email service
  return nodemailer.createTransport({
    service: 'gmail', // Change this to your preferred email service
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
};

// Send business activation email
const sendBusinessActivationEmail = async (businessEmail, businessName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@planora.com',
      to: businessEmail,
      subject: '🎉 Your Planora Business Account Has Been Activated!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">Planora</h1>
            <p style="color: #6b7280; margin: 5px 0;">Business Management Platform</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">🎉 Great News!</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Your business account for <strong>${businessName}</strong> has been successfully activated by our super admin team.
            </p>
            
            <div style="background: #dcfce7; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #166534; margin: 0; font-weight: 500;">
                ✅ Your account is now live and ready to use!
              </p>
            </div>
            
            <h3 style="color: #1f2937;">What you can do now:</h3>
            <ul style="color: #374151; line-height: 1.8;">
              <li>Access your business dashboard</li>
              <li>Set up classes and schedules</li>
              <li>Create instructor accounts</li>
              <li>Generate business codes for client registration</li>
              <li>Manage your business settings</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/business/login" 
                 style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                Access Your Dashboard
              </a>
            </div>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
            <p>Welcome to Planora! 🚀</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Business activation email sent to ${businessEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending business activation email:', error);
    return false;
  }
};

// Send business rejection email
const sendBusinessRejectionEmail = async (businessEmail, businessName, reason = '') => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@planora.com',
      to: businessEmail,
      subject: 'Business Account Application Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">Planora</h1>
            <p style="color: #6b7280; margin: 5px 0;">Business Management Platform</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Business Account Application</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Thank you for your interest in Planora. Unfortunately, we are unable to approve your business account for <strong>${businessName}</strong> at this time.
            </p>
            
            ${reason ? `
              <div style="background: #fef3c7; border: 1px solid #fde68a; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-weight: 500;">
                  Reason: ${reason}
                </p>
              </div>
            ` : ''}
            
            <p style="color: #374151; line-height: 1.6;">
              If you believe this is an error or would like to reapply, please contact our support team for assistance.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contact" 
                 style="background: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                Contact Support
              </a>
            </div>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>Thank you for your interest in Planora.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Business rejection email sent to ${businessEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending business rejection email:', error);
    return false;
  }
};

// Send new business registration notification to super admin
const sendNewBusinessNotification = async (businessData) => {
  try {
    const transporter = createTransporter();
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@planora.com';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@planora.com',
      to: superAdminEmail,
      subject: '🆕 New Business Registration - Requires Approval',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">Planora Admin</h1>
            <p style="color: #6b7280; margin: 5px 0;">New Business Registration</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">🆕 New Business Registration</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              A new business has registered and is awaiting your approval.
            </p>
            
            <div style="background: #dbeafe; border: 1px solid #93c5fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Business Details:</h3>
              <p style="color: #1e40af; margin: 5px 0;"><strong>Name:</strong> ${businessData.name}</p>
              <p style="color: #1e40af; margin: 5px 0;"><strong>Type:</strong> ${businessData.businessType}</p>
              <p style="color: #1e40af; margin: 5px 0;"><strong>Email:</strong> ${businessData.email}</p>
              <p style="color: #1e40af; margin: 5px 0;"><strong>Phone:</strong> ${businessData.phone || 'Not provided'}</p>
              <p style="color: #1e40af; margin: 5px 0;"><strong>Business Code:</strong> ${businessData.businessCode}</p>
              <p style="color: #1e40af; margin: 5px 0;"><strong>Registered:</strong> ${new Date(businessData.createdAt).toLocaleString()}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/super-admin" 
                 style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                Review & Approve
              </a>
            </div>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>Please review and approve this business registration in the super admin panel.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`New business notification sent to super admin`);
    return true;
  } catch (error) {
    console.error('Error sending new business notification:', error);
    return false;
  }
};

// Send instructor invitation email
const sendInstructorInvitationEmail = async (instructorEmail, businessName, invitationToken, message = '') => {
  try {
    const transporter = createTransporter();
    
    const registrationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/instructor/register?token=${invitationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@planora.com',
      to: instructorEmail,
      subject: `🏊‍♀️ You're Invited to Join ${businessName} as an Instructor!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">Planora</h1>
            <p style="color: #6b7280; margin: 5px 0;">Swimming School Management</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">🏊‍♀️ You're Invited!</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              <strong>${businessName}</strong> has invited you to join their team as a swimming instructor on Planora.
            </p>
            
            ${message ? `
              <div style="background: #dbeafe; border: 1px solid #93c5fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #1e40af; margin: 0; font-style: italic;">
                  "${message}"
                </p>
              </div>
            ` : ''}
            
            <div style="background: #dcfce7; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #166534; margin: 0; font-weight: 500;">
                🎯 Complete your registration to get started as an instructor
              </p>
            </div>
            
            <h3 style="color: #1f2937;">What you'll be able to do:</h3>
            <ul style="color: #374151; line-height: 1.8;">
              <li>View and manage your assigned classes</li>
              <li>Track student attendance and progress</li>
              <li>Access your instructor dashboard</li>
              <li>Communicate with students and parents</li>
              <li>Update your availability and schedule</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${registrationUrl}" 
                 style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                Complete Registration
              </a>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #fde68a; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Note:</strong> This invitation link will expire in 7 days. If you have any questions, please contact ${businessName} directly.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>Welcome to the Planora instructor community! 🚀</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Instructor invitation email sent successfully to:', instructorEmail);
    return true;
  } catch (error) {
    console.error('Error sending instructor invitation email:', error);
    return false;
  }
};

module.exports = {
  sendBusinessActivationEmail,
  sendBusinessRejectionEmail,
  sendNewBusinessNotification,
  sendInstructorInvitationEmail
};
