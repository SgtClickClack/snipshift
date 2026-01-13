/**
 * Enterprise Leads API Routes
 * 
 * Handles enterprise lead submissions from the ContactSalesForm
 */

import { Router } from 'express';
import { render } from '@react-email/render';
import { asyncHandler } from '../middleware/errorHandler.js';
import { EnterpriseLeadSchema } from '../validation/schemas.js';
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
router.post('/enterprise', asyncHandler(async (req, res) => {
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

    // 2. Send internal notification email to admin
    if (isEmailServiceAvailable() && resend) {
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
      } catch (emailError) {
        // Log error but don't fail the request
        console.error('[LEADS] Failed to send thank you email:', emailError);
      }
    } else {
      console.log('[LEADS] Email service not available, skipping email notifications');
    }

    // Return success response
    res.status(200).json({ 
      success: true, 
      id: lead.id,
      message: 'Thank you for your inquiry. Our team will be in touch shortly.',
    });
  } catch (error) {
    console.error('[LEADS] Lead submission error:', error);
    res.status(500).json({ error: 'Failed to process inquiry. Please try again later.' });
  }
}));

export default router;
