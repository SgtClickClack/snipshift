/**
 * Leads API Routes
 * 
 * Handles lead submissions from contact forms (enterprise and general)
 */

import { Router } from 'express';
import { render } from '@react-email/render';
import { asyncHandler } from '../middleware/errorHandler.js';
import { rateLimitPublic } from '../middleware/auth.js';
import { EnterpriseLeadSchema, GeneralContactSchema } from '../validation/schemas.js';
import * as leadsRepo from '../repositories/leads.repository.js';
import { resend, isEmailServiceAvailable } from '../lib/resend.js';
import { EnterpriseLeadNotification, EnterpriseLeadThankYou } from '../emails/EnterpriseLeadEmail.js';

const router = Router();

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'HospoGo <noreply@hospogo.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL || 'sales@hospogo.com';

/**
 * POST /api/leads/enterprise
 * 
 * Submit an enterprise lead inquiry
 * Public endpoint - no authentication required
 */
router.post('/enterprise', rateLimitPublic, asyncHandler(async (req, res) => {
  // Validate request body
  const validationResult = EnterpriseLeadSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      error: 'Validation error',
      details: validationResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const data = validationResult.data;
  
  // Normalize field names (support both frontend and API naming conventions)
  const companyName = data.companyName || data.company || '';
  const contactName = data.contactName || data.name || undefined;
  const email = data.email;
  const phone = data.phone || undefined;
  const message = data.message || undefined;
  const inquiryType = data.inquiryType || 'enterprise_plan';
  
  // Parse locations to number
  const locationsValue = data.numberOfLocations || data.locations;
  const numberOfLocations = locationsValue 
    ? (typeof locationsValue === 'string' ? parseInt(locationsValue, 10) : locationsValue)
    : undefined;

  try {
    // 1. Store the lead in database
    const lead = await leadsRepo.createLead({
      companyName,
      contactName,
      email,
      phone,
      numberOfLocations,
      inquiryType,
      message,
      source: 'enterprise_contact_form',
    });

    if (!lead) {
      console.error('[LEADS] Failed to create lead in database');
      res.status(500).json({ error: 'Failed to process inquiry. Please try again later.' });
      return;
    }

    console.log(`[LEADS] New enterprise lead created: ${lead.id} - ${companyName}`);

    // Track email delivery status for user feedback
    let confirmationEmailSent = false;
    const emailServiceAvailable = isEmailServiceAvailable() && resend;

    // 2. Send internal notification email to admin
    if (emailServiceAvailable && resend) {
      try {
        const adminEmailHtml = await render(
          EnterpriseLeadNotification({
            contactName: contactName || 'Not provided',
            email,
            company: companyName,
            locations: numberOfLocations || 0,
            message,
            phone,
          })
        );

        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `🚀 New Enterprise Lead: ${companyName}`,
          html: adminEmailHtml,
        });

        console.log(`[LEADS] Admin notification sent for lead: ${lead.id}`);
      } catch (emailError) {
        // Log error but don't fail the request
        console.error('[LEADS] Failed to send admin notification email:', emailError);
      }

      // 3. Send automated "Thank You" to the lead
      try {
        const thankYouHtml = await render(
          EnterpriseLeadThankYou({
            contactName: contactName || 'there',
            company: companyName,
          })
        );

        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: 'HospoGo Enterprise Inquiry Received',
          html: thankYouHtml,
        });

        console.log(`[LEADS] Thank you email sent to: ${email}`);
        confirmationEmailSent = true;
      } catch (emailError) {
        // Log error but don't fail the request
        console.error('[LEADS] Failed to send thank you email:', emailError);
      }
    } else {
      console.log('[LEADS] Email service not available, skipping email notifications');
    }

    // Return success response with email status for fail-soft UX
    const responseMessage = confirmationEmailSent
      ? 'Thank you for your inquiry. A confirmation has been sent to your email. Our team will be in touch shortly.'
      : 'Thank you for your inquiry. Our team will be in touch shortly. (Note: Confirmation email may be delayed)';

    res.status(200).json({ 
      success: true, 
      id: lead.id,
      message: responseMessage,
      emailSent: confirmationEmailSent,
    });
  } catch (error) {
    console.error('[LEADS] Lead submission error:', error);
    res.status(500).json({ error: 'Failed to process inquiry. Please try again later.' });
  }
}));

/**
 * POST /api/leads/general
 * 
 * Submit a general contact inquiry
 * Public endpoint - no authentication required
 */
router.post('/general', rateLimitPublic, asyncHandler(async (req, res) => {
  // Validate request body
  const validationResult = GeneralContactSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      error: 'Validation error',
      details: validationResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const { name, email, message, subject } = validationResult.data;

  try {
    // Store the lead in database
    const lead = await leadsRepo.createLead({
      companyName: '', // General contacts don't have a company name
      contactName: name,
      email,
      message,
      inquiryType: 'general',
      source: 'general_contact_form',
    });

    if (!lead) {
      console.error('[LEADS] Failed to create general contact lead in database');
      res.status(500).json({ error: 'Failed to process inquiry. Please try again later.' });
      return;
    }

    console.log(`[LEADS] New general contact lead created: ${lead.id} - ${name}`);

    // Track email delivery status for user feedback
    let confirmationEmailSent = false;
    const emailServiceAvailable = isEmailServiceAvailable() && resend;

    // Send notification email to admin
    if (emailServiceAvailable && resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `📬 New Contact Form: ${subject || 'General Inquiry'}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${name} (${email})</p>
            ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
            <p><strong>Message:</strong></p>
            <blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin: 12px 0;">
              ${message.replace(/\n/g, '<br>')}
            </blockquote>
            <hr>
            <p style="color: #666; font-size: 12px;">Lead ID: ${lead.id}</p>
          `,
        });

        console.log(`[LEADS] Admin notification sent for general contact: ${lead.id}`);
      } catch (emailError) {
        console.error('[LEADS] Failed to send admin notification email:', emailError);
      }

      // Send confirmation email to the user
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: 'Thanks for contacting HospoGo',
          html: `
            <h2>Thanks for reaching out, ${name}!</h2>
            <p>We've received your message and will get back to you within 24-48 hours.</p>
            <p>In the meantime, feel free to explore our platform:</p>
            <ul>
              <li><a href="https://hospogo.com/pricing">View our pricing plans</a></li>
              <li><a href="https://hospogo.com/about">Learn more about HospoGo</a></li>
            </ul>
            <p>Best regards,<br>The HospoGo Team</p>
          `,
        });

        console.log(`[LEADS] Confirmation email sent to: ${email}`);
        confirmationEmailSent = true;
      } catch (emailError) {
        console.error('[LEADS] Failed to send confirmation email:', emailError);
      }
    } else {
      console.log('[LEADS] Email service not available, skipping email notifications');
    }

    // Return success response
    const responseMessage = confirmationEmailSent
      ? "Thanks! We've received your message and will reply within 24–48 hours."
      : "Thanks! We've received your message and will reply within 24–48 hours. (Note: Confirmation email may be delayed)";

    res.status(200).json({ 
      success: true, 
      id: lead.id,
      message: responseMessage,
      emailSent: confirmationEmailSent,
    });
  } catch (error) {
    console.error('[LEADS] General contact submission error:', error);
    res.status(500).json({ error: 'Failed to process inquiry. Please try again later.' });
  }
}));

export default router;
