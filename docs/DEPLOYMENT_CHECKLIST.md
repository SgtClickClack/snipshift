# Production Deployment Checklist

Use this checklist to ensure your SnipShift deployment is production-ready.

## ✅ Pre-Deployment

### Email Service
- [ ] Resend account created
- [ ] API key generated
- [ ] `RESEND_API_KEY` added to environment variables
- [ ] Domain verified in Resend dashboard
- [ ] `RESEND_FROM_EMAIL` updated to use verified domain
- [ ] Test email sent successfully
- [ ] See [Email Setup Guide](EMAIL_SETUP.md) for details

### Database
- [ ] Production database configured
- [ ] Migrations applied
- [ ] Database backups configured
- [ ] Connection pooling configured

### Environment Variables
- [ ] `DATABASE_URL` - Production database connection string
- [ ] `RESEND_API_KEY` - Email service API key
- [ ] `RESEND_FROM_EMAIL` - Verified sender email
- [ ] Firebase credentials configured
- [ ] Stripe keys configured (if using payments)

### Testing
- [ ] All E2E tests passing
- [ ] Booking flow test verified
- [ ] Core functionality tested manually

## 🚀 Deployment Steps

### 1. Deploy Backend API
- [ ] Deploy to Vercel/your hosting platform
- [ ] Verify API health endpoint responds
- [ ] Check server logs for errors

### 2. Deploy Frontend
- [ ] Build and deploy frontend
- [ ] Verify environment variables are set
- [ ] Test authentication flow
- [ ] Verify API connectivity

### 3. Post-Deployment

#### Seed Initial Data
```bash
# Seed sample data for business users
npm run seed:data
```

- [ ] Run data seeding script
- [ ] Verify sample shifts/jobs created
- [ ] Test calendar displays correctly

#### Verify Email Service
- [ ] Send test email via admin endpoint
- [ ] Verify email received
- [ ] Check email formatting

#### Monitor
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure logging
- [ ] Set up uptime monitoring
- [ ] Monitor API response times

## 🔍 Post-Launch Verification

### Core Features
- [ ] User registration works
- [ ] Email notifications sent
- [ ] Calendar displays correctly
- [ ] Shift creation works
- [ ] Shift invitation works
- [ ] Shift acceptance works
- [ ] Messaging works
- [ ] Notifications work

### Performance
- [ ] Page load times acceptable
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] Images loading correctly

### Security
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] API keys not exposed
- [ ] CORS configured correctly
- [ ] Rate limiting configured

## 📝 Quick Reference

### Useful Commands

```bash
# Seed data for all business users
npm run seed:data

# Seed data for specific user
npm run seed:data <userId>

# Test email service
curl -X POST https://your-api.com/api/admin/test-email \
  -H "Content-Type: application/json" \
  -d '{"type": "welcome", "email": "test@example.com"}'
```

### Important URLs
- API Health: `https://your-api.com/health`
- Admin Test Email: `https://your-api.com/api/admin/test-email`

## 🆘 Troubleshooting

### Emails not sending
- Check `RESEND_API_KEY` is set
- Verify domain is verified in Resend
- Check server logs for errors
- Test with admin endpoint

### Empty calendars
- Run data seeding script: `npm run seed:data`
- Check database for shifts/jobs
- Verify user has business role

### API errors
- Check environment variables
- Verify database connection
- Check server logs
- Verify CORS settings

## 📚 Additional Resources

- [Email Setup Guide](EMAIL_SETUP.md)
- [Data Seeding Guide](../api/scripts/README.md)
- [Main README](../README.md)

