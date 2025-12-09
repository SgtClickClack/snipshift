/**
 * Email Service
 * 
 * Handles sending transactional emails using Resend and React Email templates
 */

import { render } from '@react-email/render';
import { resend, isEmailServiceAvailable } from '../lib/resend.js';
import WelcomeEmail from '../emails/WelcomeEmail.js';
import ApplicationStatusEmail from '../emails/ApplicationStatusEmail.js';
import NewMessageEmail from '../emails/NewMessageEmail.js';
import JobAlertEmail from '../emails/JobAlertEmail.js';
import * as emailTemplates from './email-templates.js';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Snipshift <noreply@snipshift.com.au>';
const FROM_NAME = 'Snipshift';

/**
 * Generic email sending function
 * Works with or without API key (mocks in dev mode)
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !resend) {
    // Mock mode: just log the email
    console.log('📧 [MOCK EMAIL]: To:', to, 'Subject:', subject);
    return true; // Return true so the app continues to work
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string
): Promise<boolean> {
  if (!isEmailServiceAvailable() || !resend) {
    console.warn('Email service not available, skipping welcome email');
    return false;
  }

  try {
    const emailHtml = await render(WelcomeEmail({ userName, userEmail }));
    
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: 'Welcome to Snipshift!',
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

/**
 * Send application status update email
 */
export async function sendApplicationStatusEmail(
  userEmail: string,
  userName: string,
  jobTitle: string,
  shopName: string | undefined,
  status: 'accepted' | 'rejected',
  applicationDate: string
): Promise<boolean> {
  if (!isEmailServiceAvailable() || !resend) {
    console.warn('Email service not available, skipping application status email');
    return false;
  }

  try {
    const emailHtml = await render(
      ApplicationStatusEmail({
        userName,
        jobTitle,
        shopName,
        status,
        applicationDate,
      })
    );

    const subject = status === 'accepted' 
      ? `🎉 Your application for ${jobTitle} was accepted!`
      : `Application update for ${jobTitle}`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send application status email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending application status email:', error);
    return false;
  }
}

/**
 * Send new message notification email
 */
export async function sendNewMessageEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  messagePreview: string,
  conversationId: string
): Promise<boolean> {
  if (!isEmailServiceAvailable() || !resend) {
    console.warn('Email service not available, skipping new message email');
    return false;
  }

  try {
    // Truncate message preview if too long
    const truncatedPreview = messagePreview.length > 150 
      ? messagePreview.substring(0, 150) + '...'
      : messagePreview;

    const emailHtml = await render(
      NewMessageEmail({
        recipientName,
        senderName,
        messagePreview: truncatedPreview,
        conversationId,
      })
    );

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `New message from ${senderName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send new message email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending new message email:', error);
    return false;
  }
}

/**
 * Send job alert email
 */
export async function sendJobAlertEmail(
  userEmail: string,
  userName: string,
  jobTitle: string,
  shopName: string | undefined,
  payRate: string,
  location: string,
  date: string,
  jobId: string
): Promise<boolean> {
  if (!isEmailServiceAvailable() || !resend) {
    console.warn('Email service not available, skipping job alert email');
    return false;
  }

  try {
    const emailHtml = await render(
      JobAlertEmail({
        userName,
        jobTitle,
        shopName,
        payRate,
        location,
        date,
        jobId,
      })
    );

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `New shift posted: ${jobTitle}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send job alert email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending job alert email:', error);
    return false;
  }
}

/**
 * Notify job owner when an application is received
 */
export async function notifyApplicationReceived(
  ownerEmail: string,
  applicantName: string,
  jobTitle: string,
  applicationLink?: string
): Promise<boolean> {
  const html = emailTemplates.getApplicationEmail(applicantName, jobTitle, applicationLink);
  const subject = `New Application: ${applicantName} applied for ${jobTitle}`;
  
  return await sendEmail(ownerEmail, subject, html);
}

