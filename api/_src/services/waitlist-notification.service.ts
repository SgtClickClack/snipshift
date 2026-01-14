/**
 * Waitlist Approval Notification Service
 * 
 * Handles sending approval notifications to waitlist entries.
 * Uses a provider pattern to easily swap between Console (mock), SendGrid, Twilio, etc.
 */

import type { WaitlistEntry } from '../repositories/waitlist.repository.js';

/**
 * Notification payload structure
 */
export interface ApprovalNotificationPayload {
  to: string; // Email or phone number
  recipientName: string; // Venue name or staff full name
  role: 'venue' | 'staff';
  onboardingLink: string; // Temporary onboarding link
  approvedAt: Date; // ISO 8601 UTC timestamp
  approvedAtBrisbane: string; // Human-readable Brisbane time (AEST)
}

/**
 * Notification provider interface
 * Implementations: ConsoleNotificationProvider, SendGridProvider, TwilioProvider
 */
export interface NotificationProvider {
  send(payload: ApprovalNotificationPayload): Promise<boolean>;
}

/**
 * Console Notification Provider (Mock)
 * Logs the notification payload to console for development/testing
 */
export class ConsoleNotificationProvider implements NotificationProvider {
  async send(payload: ApprovalNotificationPayload): Promise<boolean> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 [WAITLIST APPROVAL NOTIFICATION]');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('To:', payload.to);
    console.log('Recipient:', payload.recipientName);
    console.log('Role:', payload.role);
    console.log('Approved At (Brisbane):', payload.approvedAtBrisbane);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Subject: Welcome to Neon Valley: Your HospoGo Access');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Body:');
    console.log('');
    console.log(this.formatEmailBody(payload));
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Onboarding Link:', payload.onboardingLink);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return true;
  }

  private formatEmailBody(payload: ApprovalNotificationPayload): string {
    const roleGreeting = payload.role === 'venue' 
      ? `Hey ${payload.recipientName}!` 
      : `Hey ${payload.recipientName}!`;
    
    const roleMessage = payload.role === 'venue'
      ? 'Your venue has been approved for early access to HospoGo\'s Brisbane marketplace. You can now start posting shifts and connecting with verified hospitality professionals in the Neon Valley.'
      : 'Your application has been approved! You\'re now part of Neon Valley\'s premier hospitality marketplace. Start browsing shifts and building your profile to get matched with Brisbane\'s best venues.';

    const callToAction = payload.role === 'venue'
      ? 'Complete your venue onboarding to start posting shifts and building your team.'
      : 'Complete your profile to start applying for shifts and earning in the Valley.';

    return `
${roleGreeting}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Welcome to Neon Valley: Your HospoGo Access
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Congratulations! ${roleMessage}

Your approval was processed on ${payload.approvedAtBrisbane}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Get Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${callToAction}

Click the link below to complete your onboarding:

${payload.onboardingLink}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This link is valid for 7 days. If you need a new link, contact support at support@hospogo.com.au.

See you in the Valley! ✨

— The HospoGo Team
Brisbane's On-Demand Hospitality Marketplace
    `.trim();
  }
}

/**
 * SendGrid Notification Provider (Future Implementation)
 * Uncomment and implement when ready to use SendGrid
 */
/*
export class SendGridNotificationProvider implements NotificationProvider {
  async send(payload: ApprovalNotificationPayload): Promise<boolean> {
    // TODO: Implement SendGrid email sending
    // Use SendGrid API to send email with HTML template
    return false;
  }
}
*/

/**
 * Twilio SMS Notification Provider (Future Implementation)
 * Uncomment and implement when ready to use Twilio for SMS
 */
/*
export class TwilioNotificationProvider implements NotificationProvider {
  async send(payload: ApprovalNotificationPayload): Promise<boolean> {
    // TODO: Implement Twilio SMS sending
    // Use Twilio API to send SMS with approval message
    return false;
  }
}
*/

/**
 * Get the active notification provider
 * Can be configured via environment variable: NOTIFICATION_PROVIDER=console|sendgrid|twilio
 */
function getNotificationProvider(): NotificationProvider {
  const provider = process.env.NOTIFICATION_PROVIDER || 'console';
  
  switch (provider.toLowerCase()) {
    case 'sendgrid':
      // return new SendGridNotificationProvider();
      console.warn('[WAITLIST NOTIFICATION] SendGrid provider not yet implemented, falling back to console');
      return new ConsoleNotificationProvider();
    case 'twilio':
      // return new TwilioNotificationProvider();
      console.warn('[WAITLIST NOTIFICATION] Twilio provider not yet implemented, falling back to console');
      return new ConsoleNotificationProvider();
    case 'console':
    default:
      return new ConsoleNotificationProvider();
  }
}

/**
 * Format date to Brisbane Local Time (AEST/AEDT)
 * Input: ISO 8601 UTC Date
 * Output: Human-readable Brisbane time string
 */
function formatBrisbaneTime(date: Date): string {
  try {
    // Format as 'DD MMM YYYY, HH:mm AEST' in Brisbane timezone
    const formatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Brisbane',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Get timezone abbreviation (AEST or AEDT)
    const timeZoneName = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Brisbane',
      timeZoneName: 'short',
    }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value || 'AEST';

    const formatted = formatter.format(date);
    return `${formatted} ${timeZoneName}`;
  } catch (error) {
    console.error('[WAITLIST NOTIFICATION] Error formatting Brisbane time:', error);
    return date.toISOString(); // Fallback to ISO string
  }
}

/**
 * Generate temporary onboarding link
 * In production, this would create a secure token and store it in the database
 * For now, generates a link with the waitlist entry ID
 */
function generateOnboardingLink(entryId: string, role: 'venue' | 'staff'): string {
  const baseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_URL || 'https://hospogo.com.au';
  const onboardingPath = role === 'venue' ? '/onboarding/hub' : '/onboarding';
  
  // TODO: Generate secure token and store in database with expiration
  // For now, use entry ID as token (in production, use crypto.randomBytes)
  const token = Buffer.from(entryId).toString('base64url');
  
  return `${baseUrl}${onboardingPath}?token=${token}&entry=${entryId}`;
}

/**
 * Send approval notification to waitlist entry
 * 
 * @param entry - Waitlist entry that was approved
 * @returns Promise<boolean> - true if notification was sent successfully
 */
export async function sendApprovalNotification(
  entry: WaitlistEntry
): Promise<boolean> {
  if (!entry.approvedAt) {
    console.error('[WAITLIST NOTIFICATION] Entry missing approvedAt timestamp:', entry.id);
    return false;
  }

  // Ensure approvedAt is a Date object
  const approvedAt = entry.approvedAt instanceof Date 
    ? entry.approvedAt 
    : new Date(entry.approvedAt);

  // Format Brisbane time
  const approvedAtBrisbane = formatBrisbaneTime(approvedAt);

  // Generate onboarding link
  const onboardingLink = generateOnboardingLink(entry.id, entry.role);

  // Prepare notification payload
  const payload: ApprovalNotificationPayload = {
    to: entry.contact, // Email for venues, phone for staff (or email if available)
    recipientName: entry.name,
    role: entry.role,
    onboardingLink,
    approvedAt,
    approvedAtBrisbane,
  };

  // Get active provider and send notification
  const provider = getNotificationProvider();
  
  try {
    const success = await provider.send(payload);
    
    if (success) {
      console.log(`[WAITLIST NOTIFICATION] ✅ Approval notification sent to ${entry.role} entry: ${entry.name} (${entry.contact})`);
    } else {
      console.error(`[WAITLIST NOTIFICATION] ❌ Failed to send approval notification to ${entry.name}`);
    }
    
    return success;
  } catch (error) {
    console.error('[WAITLIST NOTIFICATION] Error sending approval notification:', error);
    return false;
  }
}
