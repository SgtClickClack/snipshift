# Email Service Setup Guide

SnipShift uses [Resend](https://resend.com) for transactional emails. The system is designed to work gracefully with or without an API key (mocks emails in development).

## Quick Setup

### 1. Get a Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Navigate to **API Keys** in your dashboard
3. Create a new API key
4. Copy the key (starts with `re_`)

### 2. Configure Environment Variables

Add the following to your `.env` file (or environment variables in production):

```bash
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Snipshift <noreply@snipshift.com.au>
```

**Note:** Replace `noreply@snipshift.com.au` with your verified domain email address in Resend.

### 3. Verify Your Domain (Production)

For production, you need to verify your sending domain:

1. Go to **Domains** in Resend dashboard
2. Add your domain (e.g., `snipshift.com.au`)
3. Add the DNS records provided by Resend
4. Wait for verification (usually a few minutes)
5. Update `RESEND_FROM_EMAIL` to use your verified domain

## Email Templates

The following email templates are available:

- **Welcome Email** - Sent to new users upon registration
- **Application Status Email** - Notifies professionals when their application is accepted/rejected
- **New Message Email** - Alerts users of new messages
- **Job Alert Email** - Notifies professionals of new job postings matching their preferences

## Development Mode

If `RESEND_API_KEY` is not set, the system will:
- Log emails to console instead of sending
- Continue functioning normally (no crashes)
- Display a warning: `⚠️ RESEND_API_KEY not found. Email functionality will be disabled.`

This allows development and testing without requiring an API key.

## Testing Emails

You can test email functionality using the admin endpoint:

```bash
POST /api/admin/test-email
Content-Type: application/json

{
  "type": "welcome",
  "email": "test@example.com"
}
```

Available email types: `welcome`, `application-status`, `new-message`, `job-alert`

## Production Checklist

- [ ] Resend account created
- [ ] API key generated and added to environment variables
- [ ] Domain verified in Resend dashboard
- [ ] `RESEND_FROM_EMAIL` updated to use verified domain
- [ ] Test email sent successfully
- [ ] All email templates tested

## Troubleshooting

### Emails not sending

1. Check that `RESEND_API_KEY` is set correctly
2. Verify the API key is active in Resend dashboard
3. Check server logs for error messages
4. Ensure domain is verified (for production)

### Domain verification issues

1. Ensure DNS records are added correctly
2. Wait 5-10 minutes for DNS propagation
3. Check Resend dashboard for verification status
4. Contact Resend support if issues persist

## Cost

Resend offers:
- **Free tier**: 3,000 emails/month
- **Pro tier**: $20/month for 50,000 emails
- **Enterprise**: Custom pricing

See [Resend Pricing](https://resend.com/pricing) for details.

