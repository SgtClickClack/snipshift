/**
 * Email Service
 * 
 * Handles sending transactional emails using Resend and React Email templates
 * RELIABILITY: Implements dead-letter office for failed email delivery
 */

import { render } from '@react-email/render';
import { resend, isEmailServiceAvailable } from '../lib/resend.js';
import WelcomeEmail from '../emails/WelcomeEmail.js';
import ApplicationStatusEmail from '../emails/ApplicationStatusEmail.js';
import NewMessageEmail from '../emails/NewMessageEmail.js';
import JobAlertEmail from '../emails/JobAlertEmail.js';
import SuspensionAlertEmail from '../emails/SuspensionAlertEmail.js';
import StrikeWarningEmail from '../emails/StrikeWarningEmail.js';
import AccountRestoredEmail from '../emails/AccountRestoredEmail.js';
import * as emailTemplates from './email-templates.js';
import { getDb } from '../db/index.js';
import { failedEmails } from '../db/schema/failed-emails.js';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'HospoGo <noreply@hospogo.com>';
const FROM_NAME = 'HospoGo';

/**
 * RELIABILITY: Log failed email to dead-letter office for manual recovery
 */
async function logFailedEmail(
  to: string,
  subject: string,
  html: string,
  from: string,
  error: any
): Promise<void> {
  try {
    const db = getDb();
    if (!db) {
      console.error('[EMAIL] Database not available, cannot log failed email');
      return;
    }

    const errorMessage = error?.message || String(error) || 'Unknown error';
    const errorCode = error?.code || error?.name || null;

    await db.insert(failedEmails).values({
      to,
      subject,
      html,
      from,
      errorMessage,
      errorCode,
    });

    console.log(`[EMAIL] Failed email logged to dead-letter office: ${to} - ${subject}`);
  } catch (logError) {
    // Don't throw - logging failure shouldn't break the app
    console.error('[EMAIL] Failed to log failed email to database:', logError);
  }
}

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
      // RELIABILITY: Log failed email to dead-letter office
      await logFailedEmail(to, subject, html, FROM_EMAIL, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    // RELIABILITY: Log failed email to dead-letter office
    await logFailedEmail(to, subject, html, FROM_EMAIL, error);
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

  let emailHtml: string = '';
  try {
    emailHtml = await render(WelcomeEmail({ userName, userEmail }));
    
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Welcome to ${FROM_NAME}!`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      await logFailedEmail(userEmail, `Welcome to ${FROM_NAME}!`, emailHtml, FROM_EMAIL, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // emailHtml may not be defined if render() failed, use empty string as fallback
    await logFailedEmail(userEmail, `Welcome to ${FROM_NAME}!`, emailHtml, FROM_EMAIL, error);
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

  let emailHtml: string = '';
  const subject = status === 'accepted' 
    ? `🎉 Your application for ${jobTitle} was accepted!`
    : `Application update for ${jobTitle}`;
  try {
    emailHtml = await render(
      ApplicationStatusEmail({
        userName,
        jobTitle,
        shopName,
        status,
        applicationDate,
      })
    );

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send application status email:', error);
      await logFailedEmail(userEmail, subject, emailHtml, FROM_EMAIL, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending application status email:', error);
    await logFailedEmail(userEmail, subject, emailHtml, FROM_EMAIL, error);
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

  let emailHtml: string = '';
  try {
    // Truncate message preview if too long
    const truncatedPreview = messagePreview.length > 150 
      ? messagePreview.substring(0, 150) + '...'
      : messagePreview;

    emailHtml = await render(
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
      await logFailedEmail(recipientEmail, `New message from ${senderName}`, emailHtml, FROM_EMAIL, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending new message email:', error);
    await logFailedEmail(recipientEmail, `New message from ${senderName}`, emailHtml, FROM_EMAIL, error);
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

  let emailHtml: string = '';
  try {
    emailHtml = await render(
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
      await logFailedEmail(userEmail, `New shift posted: ${jobTitle}`, emailHtml, FROM_EMAIL, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending job alert email:', error);
    await logFailedEmail(userEmail, `New shift posted: ${jobTitle}`, emailHtml, FROM_EMAIL, error);
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

/**
 * Send suspension alert email (no-show: +2 strikes)
 * Sent immediately when strikes increment by 2 in a single event
 */
export async function sendSuspensionAlertEmail(
  userEmail: string,
  userName: string,
  strikesAdded: number,
  totalStrikes: number,
  suspendedUntil: Date,
  shiftTitle?: string,
  shiftDate?: string
): Promise<boolean> {
  if (!isEmailServiceAvailable() || !resend) {
    console.warn('[EMAIL] Email service not available, skipping suspension alert email');
    return false;
  }

  let emailHtml: string = '';
  try {
    emailHtml = await render(
      SuspensionAlertEmail({
        userName,
        strikesAdded,
        totalStrikes,
        suspendedUntil: suspendedUntil.toLocaleString('en-AU', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        }),
        shiftTitle,
        shiftDate,
      })
    );

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: '⚠️ Account Suspended - No Show Violation',
      html: emailHtml,
    });

    if (error) {
      console.error('[EMAIL] Failed to send suspension alert email:', error);
      await logFailedEmail(userEmail, '⚠️ Account Suspended - No Show Violation', emailHtml, FROM_EMAIL, error);
      return false;
    }

    console.log(`[EMAIL] Suspension alert sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending suspension alert email:', error);
    await logFailedEmail(userEmail, '⚠️ Account Suspended - No Show Violation', emailHtml, FROM_EMAIL, error);
    return false;
  }
}

/**
 * Send strike warning email (late cancellation: +1 strike)
 * Sent immediately when strikes reach 1 or 2 via cancellation
 */
export async function sendStrikeWarningEmail(
  userEmail: string,
  userName: string,
  strikesAdded: number,
  totalStrikes: number,
  reason: 'late_cancellation' | 'no_show' | 'other',
  hoursNotice?: number,
  shiftTitle?: string,
  shiftDate?: string
): Promise<boolean> {
  if (!isEmailServiceAvailable() || !resend) {
    console.warn('[EMAIL] Email service not available, skipping strike warning email');
    return false;
  }

  let emailHtml: string = '';
  let subject: string = '';
  try {
    emailHtml = await render(
      StrikeWarningEmail({
        userName,
        strikesAdded,
        totalStrikes,
        reason,
        hoursNotice,
        shiftTitle,
        shiftDate,
      })
    );

    subject = totalStrikes >= 2
      ? '⚡ Strike Warning - Account At Risk'
      : '⚡ Strike Warning - Late Cancellation';

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error('[EMAIL] Failed to send strike warning email:', error);
      await logFailedEmail(userEmail, subject, emailHtml, FROM_EMAIL, error);
      return false;
    }

    console.log(`[EMAIL] Strike warning sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending strike warning email:', error);
    const fallbackSubject = totalStrikes >= 2
      ? '⚡ Strike Warning - Account At Risk'
      : '⚡ Strike Warning - Late Cancellation';
    await logFailedEmail(userEmail, fallbackSubject, emailHtml, FROM_EMAIL, error);
    return false;
  }
}

/**
 * Send account restored email (after 48h suspension expires)
 * Notifies Pro when their suspension period ends
 */
export async function sendAccountRestoredEmail(
  userEmail: string,
  userName: string,
  currentStrikes: number,
  shiftsUntilStrikeRemoval: number
): Promise<boolean> {
  if (!isEmailServiceAvailable() || !resend) {
    console.warn('[EMAIL] Email service not available, skipping account restored email');
    return false;
  }

  let emailHtml: string = '';
  try {
    emailHtml = await render(
      AccountRestoredEmail({
        userName,
        currentStrikes,
        shiftsUntilStrikeRemoval,
      })
    );

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: '✅ Your HospoGo Account Has Been Restored',
      html: emailHtml,
    });

    if (error) {
      console.error('[EMAIL] Failed to send account restored email:', error);
      await logFailedEmail(userEmail, '✅ Your HospoGo Account Has Been Restored', emailHtml, FROM_EMAIL, error);
      return false;
    }

    console.log(`[EMAIL] Account restored email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending account restored email:', error);
    await logFailedEmail(userEmail, '✅ Your HospoGo Account Has Been Restored', emailHtml, FROM_EMAIL, error);
    return false;
  }
}
