import nodemailer from 'nodemailer';
import { logger } from '../utils/loggers';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: any;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const emailTemplates = {
  welcome: (data: any) => `
    <h1>Welcome to Lost & Found Platform!</h1>
    <p>Hi ${data.name},</p>
    <p>Thank you for joining our community. We're here to help you find your lost items and connect with others.</p>
    <p>Best regards,<br>Lost & Found Team</p>
  `,
  itemMatch: (data: any) => `
    <h1>Potential Match Found!</h1>
    <p>Hi ${data.name},</p>
    <p>We found a potential match for your ${data.itemType} item: "${data.itemTitle}"</p>
    <p>Check your dashboard to view the match and contact the other user.</p>
    <p>Best regards,<br>Lost & Found Team</p>
  `,
  newMessage: (data: any) => `
    <h1>New Message</h1>
    <p>Hi ${data.name},</p>
    <p>You have a new message regarding "${data.itemTitle}"</p>
    <p>Login to your account to view and respond to the message.</p>
    <p>Best regards,<br>Lost & Found Team</p>
  `
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const template = emailTemplates[options.template as keyof typeof emailTemplates];
    
    if (!template) {
      throw new Error(`Email template '${options.template}' not found`);
    }

    const html = template(options.data);

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${options.to}`);
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
};