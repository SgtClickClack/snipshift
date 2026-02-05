# HospoGo User Manual

> Your complete guide to mastering the HospoGo hospitality logistics platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [For Venue Owners (The Hub)](#for-venue-owners-the-hub)
   - [Dashboard Overview](#dashboard-overview)
   - [Capacity Templates](#capacity-templates)
   - [The A-Team & Smart Fill](#the-a-team--smart-fill)
   - [Rostering & Calendar](#rostering--calendar)
   - [The Financial Engine (Xero Sync)](#the-financial-engine-xero-sync)
   - [The Vault (Compliance)](#the-vault-compliance)
   - [Lead Tracker (Executive CRM)](#lead-tracker-executive-crm)
3. [For Professionals](#for-professionals)
   - [Finding Shifts](#finding-shifts)
   - [Accept All Feature](#accept-all-feature)
   - [Digital Resume](#digital-resume)
   - [Earnings & Payments](#earnings--payments)
4. [Messaging & Communication](#messaging--communication)
5. [Settings & Account](#settings--account)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### What is HospoGo?

HospoGo is the hospitality industry's logistics engine—connecting venue owners with skilled professionals through intelligent rostering, seamless payroll integration, and compliance management.

### Creating Your Account

1. Visit [hospogo.com](https://hospogo.com) and click **Sign Up**
2. Choose your sign-up method:
   - **Google Sign-In** (recommended for fastest setup)
   - **Email & Password** (traditional method)
3. Select your role:
   - **Venue Owner/Manager** (Hub) - If you manage a hospitality venue
   - **Professional** - If you're seeking hospitality work
4. Complete the onboarding wizard to set up your profile

### Navigating the Dashboard

After logging in, you'll see your personalized dashboard based on your role:
- **Venue Dashboard**: Schedule view, staff management, and analytics
- **Professional Dashboard**: Available shifts, applications, and earnings

---

## For Venue Owners (The Hub)

### Dashboard Overview

Your Hub Dashboard provides a command center for all operations:

- **Schedule Calendar**: Visual representation of all shifts
- **Est. Wage Cost**: Real-time labor cost estimation for the visible period
- **Roster Tools**: Quick access to auto-fill, A-Team invitations, and Xero sync
- **Staff List**: View and manage your team members
- **Applications**: Review incoming shift applications

### Capacity Templates

Capacity Templates allow you to define standard staffing patterns that can be reused across weeks.

#### Creating a Capacity Template

1. Navigate to **Settings** → **Business Settings** → **Capacity Planner**
2. Click **Create New Template**
3. Define your template:
   - **Template Name**: e.g., "Standard Weekend Setup"
   - **Day Pattern**: Select which days this applies to
   - **Time Blocks**: Define shift start/end times
   - **Roles Required**: Specify positions needed (Bartender, Server, etc.)
   - **Staff Count**: Number of staff per role
4. Click **Save Template**

#### Using Capacity Templates

1. From the Calendar view, click **Roster Tools** → **Auto-Fill from Templates**
2. Select the template to apply
3. Choose the date range
4. Click **Apply** to generate shifts automatically

#### Editing Templates

Templates can be modified at any time:
1. Go to **Settings** → **Business Settings** → **Capacity Planner**
2. Click the edit icon next to the template
3. Make your changes and save

### The A-Team & Smart Fill

The "Invite A-Team" feature is HospoGo's intelligent rostering engine, designed to fill shifts with your best people while respecting their schedules and preferences.

#### Setting Up Your A-Team

1. Navigate to **Venue** → **Staff**
2. Click on a staff member's profile
3. Click the **Star** icon to add them to your Favorites (A-Team)
4. Repeat for all trusted staff members

**Pro Tip:** Build a strong A-Team of 15-20 members to ensure coverage even when some are unavailable.

#### Using Invite A-Team

1. From the Calendar view, click **Roster Tools**
2. Select **Invite A-Team**
3. The system will:
   - Identify all unfilled shifts in the visible period
   - Match shifts with available A-Team members based on their skills
   - Send bulk invitation notifications
4. Wait for confirmations—status updates in real-time

#### The Availability Logic (14-Day Window)

Smart Fill doesn't just blast invitations to everyone—it intelligently filters based on **real-time availability**. Here's the complete logic:

**Step 1: Availability Check**
Before any invitation is sent, the system queries the staff member's availability:
- **Available**: Staff has marked themselves available for the shift day/time
- **Unavailable**: Staff has blocked this time in their calendar
- **No Preference Set**: Defaults to available (can be configured per venue)

**Step 2: The 14-Day Rolling Window**
HospoGo uses a 14-day forward-looking availability window:
- Staff set availability up to 14 days in advance
- Beyond 14 days, the system assumes "no preference" (configurable)
- This window updates daily at midnight

**Step 3: Filtering Logic**
When you click **Invite A-Team**, the Smart Fill engine:
1. Fetches all A-Team members (starred staff)
2. Queries each member's 14-day availability calendar
3. **Excludes** anyone who has marked themselves unavailable for the shift time
4. **Includes** anyone who is available OR has no preference set
5. Ranks remaining candidates by skill match and reliability score

**Why This Matters:**
- Staff aren't bothered with invitations they'll decline
- Higher acceptance rates (your A-Team only sees shifts they can work)
- Reduces notification fatigue and keeps staff engaged

**Staff Availability Settings:**
Staff can set their availability in several ways:
- **Recurring patterns**: "I'm unavailable every Tuesday"
- **Date ranges**: "I'm on holiday Dec 20-Jan 5"
- **Day-of requests**: "Mark me unavailable tomorrow"

**Venue Settings:**
As a venue owner, you can configure:
- **Default availability**: Treat "no preference" as available or unavailable
- **Advance notice**: Require X hours notice for availability changes
- **Override capability**: Emergency shifts can override normal availability (use sparingly)

#### The Status Legend

Shift cards in the calendar use a traffic light system to show staffing status at a glance:

| Color | Status | Meaning | Action Needed |
|-------|--------|---------|---------------|
| 🔴 **Red** | Vacant | Position is completely unfilled. No one has been invited or assigned. | Use Invite A-Team or manually assign staff |
| 🟡 **Amber** | Invited | Invitation(s) sent, awaiting response. Staff have been notified but haven't confirmed. | Wait for responses or send reminders |
| 🟢 **Green** | Confirmed | Staff member has accepted the shift. Position is filled and locked. | No action needed—you're covered! |
| ⚫ **Gray** | Past/Cancelled | Shift has ended or was cancelled. Historical record only. | Review for payroll/timesheets |

**Multi-Position Shifts:**
For shifts requiring multiple staff (e.g., "3 Bartenders needed"):
- 🔴 **Red**: 0/3 confirmed
- 🟡 **Amber**: 1-2/3 confirmed (partially filled)
- 🟢 **Green**: 3/3 confirmed (fully staffed)

**Real-Time Updates:**
Status colors update instantly when:
- You send invitations (Red → Amber)
- Staff accept (Amber → Green)
- Staff decline (may remain Amber if others pending, or → Red if all declined)
- Shift time passes (→ Gray)

**Dashboard Summary:**
Your Hub Dashboard shows aggregate status:
- "12 shifts this week: 8 Green, 3 Amber, 1 Red"
- Click to filter calendar by status

### Rostering & Calendar

#### Calendar Views

Switch between views using the toolbar:
- **Month View**: Overview of the entire month
- **Week View**: Detailed weekly planning
- **Day View**: Hour-by-hour breakdown

#### Creating Shifts

1. Click any empty slot in the calendar
2. Fill in shift details:
   - **Title/Role**: e.g., "Bartender - Evening"
   - **Date & Time**: Start and end times
   - **Hourly Rate**: Pay rate for this shift
   - **Description**: Any special requirements
3. Click **Create Shift**

#### Managing Shift Status

Shifts follow a traffic light system:
- 🟢 **Green (Confirmed)**: All required staff have confirmed
- 🟡 **Amber (Pending)**: Invitations sent, awaiting responses
- 🔴 **Red (Vacant)**: Open positions need filling
- ⚫ **Gray (Past)**: Completed or expired shifts

#### Shift Assignment

1. Click on a shift block
2. Click **Assign Staff**
3. Browse available staff or search by name
4. Click **Invite** to send the invitation
5. Staff will receive a notification and can accept/decline

### The Financial Engine (Xero Sync)

HospoGo integrates seamlessly with Xero Payroll to export timesheets, providing a robust financial pipeline with enterprise-grade reliability.

#### Connecting Xero

1. Navigate to **Settings** → **Integrations**
2. Click **Connect to Xero**
3. Sign in to your Xero account
4. Authorize HospoGo access
5. Select your Xero Organisation
6. Connection status will show "Connected" with a green indicator

#### Mapping Employees to Xero

Before syncing timesheets, map your HospoGo staff to Xero employees:

1. Go to **Settings** → **Team** → **Xero Employee Mapper**
2. For each staff member:
   - Click the dropdown next to their name
   - Select the corresponding Xero employee
   - Click **Save Mapping**

#### Syncing Timesheets

1. Navigate to **Settings** → **Integrations** → **Manual Sync**
2. Select your **Payroll Calendar** (e.g., "Weekly", "Fortnightly")
3. Choose the **Date Range** for the pay period
4. Click **Sync Now**
5. Review the results:
   - ✅ **Synced**: Successfully exported to Xero
   - ⚠️ **Skipped**: Missing mapping or no hours logged

#### The Mutex-Locking Pattern (Double-Sync Prevention)

HospoGo employs a **Mutex-Locking Pattern** to ensure bulletproof data integrity during synchronization. Here's how it works:

**What is Mutex Locking?**
A mutex (mutual exclusion) lock is a software mechanism that prevents two processes from accessing the same resource simultaneously. In HospoGo, this prevents:

- **Double-syncing**: If you accidentally click "Sync Now" twice, only the first sync executes
- **Race conditions**: Multiple managers syncing the same pay period simultaneously
- **Duplicate entries**: The lock ensures each timesheet line is written exactly once

**How the Lock Works:**
1. When you click **Sync Now**, HospoGo acquires a lock for your organisation + pay period
2. While the lock is held, additional sync requests are queued (not rejected)
3. The sync completes, data is committed to Xero
4. The lock releases, and any queued requests check if sync is still needed
5. If already synced, queued requests complete without re-syncing

**Visual Indicators:**
- 🔒 **Lock Acquired**: "Sync in progress..." spinner appears
- 🔄 **Queued**: "Another sync is running, you'll be notified when complete"
- ✅ **Lock Released**: Sync complete notification with results

**Technical Safeguards:**
- Automatic lock timeout after 5 minutes (prevents deadlocks)
- Server-side lock enforcement (cannot be bypassed client-side)
- Audit trail logs all lock acquire/release events

#### Partial Success Reports

Real-world payroll sync rarely fails completely—it's more common for 9 out of 10 staff to sync successfully while 1 encounters an issue. HospoGo handles this gracefully with **Partial Success Reports**.

**What Triggers Partial Success:**
- A staff member is missing their Xero employee mapping
- A staff member's Xero profile has been archived or deleted
- Pay rate conflicts between HospoGo and Xero settings
- Individual timesheet validation errors

**Understanding the Report:**

When a partial success occurs, you receive a detailed breakdown:

| Status | Staff | Issue | Action Required |
|--------|-------|-------|-----------------|
| ✅ Synced | Sarah Jones | — | None |
| ✅ Synced | Mike Chen | — | None |
| ✅ Synced | 7 others... | — | None |
| ❌ Failed | Tom Wilson | "Employee not mapped" | Update mapping |

**Key Behaviors:**
1. **Successful records ARE committed**: The 9 successful timesheets are already in Xero
2. **Failed records are isolated**: Only Tom Wilson needs attention
3. **Retrying is safe**: Re-running sync will only attempt Tom Wilson (mutex prevents duplicates)
4. **Detailed error messages**: Each failure includes actionable guidance

**Fixing Partial Failures:**
1. Review the sync results for highlighted failures
2. Navigate to **Settings** → **Team** → **Xero Employee Mapper**
3. Find the flagged staff member and update their mapping
4. Click **Retry Failed** or run a new sync—only failed records are retried

**Audit Trail:**
All partial success events are logged with:
- Timestamp of sync attempt
- List of successful and failed employees
- Error codes and messages for each failure
- User who initiated the sync

#### Troubleshooting Xero Issues

| Issue | Solution |
|-------|----------|
| "Pay period is locked" | Unlock the period in Xero Payroll settings |
| "Employee not found" | Check employee mapping in Team settings |
| "Token expired" | Reconnect Xero in Integrations settings |
| "Duplicate timesheet" | Timesheet already exists—check Xero directly |
| "Partial success" | See Partial Success Reports section above |
| "Lock timeout" | Wait 5 minutes, then retry—a previous sync may have stalled |

### The Vault (Compliance)

The Vault is HospoGo's secure compliance management system, storing and validating all staff documents with automated verification and proactive expiry management.

#### Required Documents

- **RSA Certificate** (Responsible Service of Alcohol)
- **Food Safety Certificate**
- **Working with Children Check** (where applicable)
- **Right to Work Documentation**
- **Tax File Number Declaration**
- **Emergency Contact Details**

#### Managing Staff Compliance

1. Navigate to **Venue** → **Staff**
2. Click on a staff member
3. View their **Compliance Status**:
   - ✅ **Verified**: All documents valid and current
   - ⚠️ **Pending**: Documents awaiting verification
   - ❌ **Expired**: Documents need renewal

#### Uploading Documents

1. Click **Add Document** in the staff profile
2. Select document type
3. Upload the file (PDF, JPG, PNG supported)
4. Enter expiry date if applicable
5. Submit for verification

#### The DVS Handshake (Automatic RSA Verification)

HospoGo integrates with the **Document Verification Service (DVS)**, the Australian Government's real-time document checking system, to automatically verify RSA certificates.

**What is the DVS Handshake?**
The DVS Handshake is an automated verification process that confirms the authenticity of compliance documents against government databases—no manual checking required.

**How RSA Verification Works:**

1. **Staff uploads RSA certificate** with their:
   - Certificate number
   - Issue date
   - State of issue (QLD, NSW, VIC, etc.)
   
2. **HospoGo initiates DVS Handshake:**
   - Encrypted request sent to DVS gateway
   - Certificate details matched against state liquor authority records
   - Response received within 5-30 seconds

3. **Verification Result:**
   - ✅ **Verified**: Certificate is valid and matches government records
   - ❌ **Failed**: Certificate not found or details don't match
   - ⚠️ **Manual Review**: DVS couldn't verify (rare edge cases)

**Verification Status Indicators:**
| Status | Icon | Meaning |
|--------|------|---------|
| DVS Verified | 🛡️✅ | Government-verified authentic |
| Manually Verified | ✅ | Staff verified by venue manager |
| Pending | 🔄 | Awaiting verification |
| Failed | ❌ | Could not verify—action required |

**States Currently Supported:**
- ✅ Queensland (OLGR)
- ✅ New South Wales (Liquor & Gaming NSW)
- ✅ Victoria (VCGLR)
- ✅ Western Australia (Racing, Gaming & Liquor)
- ⏳ South Australia (coming soon)
- ⏳ Tasmania (coming soon)

**Why DVS Matters:**
- **Instant verification**: No waiting for manual checks
- **Fraud prevention**: Fake certificates are immediately flagged
- **Audit compliance**: Government-verified trail for liquor inspectors
- **Peace of mind**: Know your staff are legitimately certified

#### Document Expiry Alerts (30-Day Proactive Notifications)

HospoGo's proactive alert system ensures you're never caught with expired compliance documents.

**The 30-Day Early Warning System:**

1. **30 Days Before Expiry:**
   - 📧 Email sent to staff member: "Your RSA expires in 30 days"
   - 📧 Email sent to venue manager: "[Staff Name]'s RSA expiring soon"
   - 🔔 Dashboard alert: Yellow warning on staff card

2. **14 Days Before Expiry:**
   - 📧 Reminder email to both staff and manager
   - 📲 Push notification to staff mobile
   - 🔔 Dashboard escalation: Orange warning

3. **7 Days Before Expiry:**
   - 📧 Urgent email: "Action Required—Document Expiring"
   - 📲 Push notification with direct upload link
   - 🔔 Dashboard: Red warning with action button

4. **Day of Expiry:**
   - ❌ Document marked expired
   - 🚫 Staff may be restricted from shifts (configurable)
   - 📧 Final notice sent

5. **Post-Expiry:**
   - Staff compliance status changes to ❌ Non-Compliant
   - Smart Fill excludes staff from invitations (if configured)
   - Audit log records expiry event

**Alert Channels:**
- **Email**: Always sent (cannot be disabled for compliance)
- **Push Notifications**: Staff can configure
- **SMS**: Available for critical alerts (venue configurable)
- **Dashboard**: Always visible to managers

**Document Types Tracked:**
| Document | Typical Validity | Alert Schedule |
|----------|------------------|----------------|
| RSA Certificate | 1-5 years (varies by state) | 30/14/7/0 days |
| Food Safety | 5 years | 30/14/7/0 days |
| Working with Children | 3-5 years | 60/30/14/7 days |
| First Aid | 3 years | 30/14/7/0 days |
| Work Visa | Varies | 90/60/30/14/7 days |

**Manager Dashboard View:**
The **Compliance Overview** panel shows:
- ✅ 45 staff fully compliant
- ⚠️ 3 staff with documents expiring within 30 days
- ❌ 1 staff with expired documents

Click any category to see the detailed breakdown and take action.

**Configurable Settings:**
- **Restriction on Expiry**: Automatically prevent scheduling of non-compliant staff
- **Grace Period**: Allow X days after expiry before restriction (default: 0)
- **Custom Alert Days**: Modify the 30/14/7 schedule per document type
- **Bulk Reminder**: Send reminders to all expiring staff at once

### Lead Tracker (Executive CRM)

The Lead Tracker is HospoGo's executive-level CRM system, designed for strategic sales management and revenue forecasting. This tool is used by the executive team to manage venue acquisition campaigns and track projected revenue.

#### Overview

The Lead Tracker provides:
- **Pipeline Management**: Track prospects from initial contact to signed venue
- **Campaign Tracking**: Organize leads by geographic or strategic campaigns
- **Revenue Forecasting**: Calculate projected ARR based on pipeline stage
- **Activity Logging**: Record calls, meetings, and follow-ups

#### The Brisbane 100 Campaign (Case Study)

The Lead Tracker was purpose-built for strategic rollout campaigns like the **Brisbane 100**—an initiative to onboard 100 premium venues across Brisbane.

**How Rick Uses Lead Tracker for Brisbane 100:**

1. **Campaign Creation:**
   - Navigate to **Lead Tracker** → **Campaigns**
   - Click **Create Campaign**
   - Name: "Brisbane 100"
   - Target: 100 venues
   - Region: Brisbane Metro
   - Timeline: Q1-Q2 2026

2. **Lead Import & Qualification:**
   - Import venue lists from industry sources
   - Each lead tagged with: venue name, contact, venue type, estimated staff count
   - AI-assisted scoring based on venue size and market fit

3. **Pipeline Stages:**
   | Stage | Description | Probability |
   |-------|-------------|-------------|
   | 🎯 Prospect | Identified, not yet contacted | 5% |
   | 📞 Contacted | Initial outreach made | 15% |
   | 📅 Meeting Set | Demo scheduled | 30% |
   | 🎪 Demo Complete | Product demonstrated | 50% |
   | 📝 Proposal Sent | Pricing/contract sent | 70% |
   | 🤝 Negotiating | Terms being finalized | 85% |
   | ✅ Won | Contract signed, onboarding | 100% |
   | ❌ Lost | Did not proceed | 0% |

4. **Activity Tracking:**
   - Log every touchpoint: calls, emails, meetings
   - Set follow-up reminders
   - Track response rates per campaign

5. **Progress Dashboard:**
   - Campaign progress: "Brisbane 100: 47/100 Won (47%)"
   - Pipeline value: Total and weighted
   - Conversion funnel visualization

#### Projected ARR Calculation

The Lead Tracker calculates **Projected Annual Recurring Revenue (ARR)** to forecast business growth based on your sales pipeline.

**How ARR is Calculated:**

```
Projected ARR = Σ (Lead License Value × Stage Probability)
```

**Detailed Breakdown:**

1. **License Value per Lead:**
   Each lead has an estimated monthly license value based on:
   - **Venue Size**: Small (<20 staff), Medium (20-50), Large (50+)
   - **Plan Tier**: Starter, Professional, Enterprise
   - **Add-ons**: Xero integration, advanced reporting, etc.

2. **Probability Weighting:**
   The probability from the pipeline stage weights the revenue:
   - A $500/month lead at "Demo Complete" (50%) = $250/month weighted
   - A $500/month lead at "Won" (100%) = $500/month weighted

3. **ARR Aggregation:**
   ```
   Example Pipeline:
   ├── Lead A: $600/mo × 100% (Won)      = $600/mo
   ├── Lead B: $400/mo × 70% (Proposal)  = $280/mo
   ├── Lead C: $500/mo × 50% (Demo)      = $250/mo
   ├── Lead D: $350/mo × 30% (Meeting)   = $105/mo
   └── Lead E: $450/mo × 15% (Contacted) = $67.50/mo
   ─────────────────────────────────────────────────
   Total Weighted Monthly = $1,302.50/mo
   Projected ARR = $1,302.50 × 12 = $15,630/year
   ```

**Dashboard Metrics:**

| Metric | Description |
|--------|-------------|
| **Confirmed ARR** | Revenue from Won deals only (100% probability) |
| **Weighted ARR** | All pipeline deals × probability |
| **Best Case ARR** | All pipeline deals at 100% (if everything closes) |
| **Pipeline Coverage** | Weighted ARR ÷ Revenue Target (should be >3x) |

**Using ARR for Forecasting:**

1. **Monthly Revenue Projection:**
   - View projected revenue by close month
   - Track against targets

2. **Territory Analysis:**
   - Brisbane 100 ARR projection vs. actual
   - Compare campaigns by weighted ARR

3. **Sales Rep Performance:**
   - ARR generated per rep
   - Conversion rates at each stage

4. **Board Reporting:**
   - Export ARR trends for investor updates
   - Historical ARR growth charts

**Active License Tracking:**

For existing customers, the Lead Tracker also monitors:
- **Active Licenses**: Currently paying venues
- **Current ARR**: Actual recurring revenue
- **Churn Risk**: Venues with declining usage
- **Expansion Opportunities**: Upsell potential based on usage

**Example Executive View:**
```
Brisbane 100 Campaign Summary
─────────────────────────────
Target: 100 venues
Won: 47 venues (47%)
Pipeline: 38 active leads

Revenue Metrics:
├── Confirmed ARR: $282,000/year (47 venues)
├── Weighted Pipeline ARR: $89,400/year
├── Best Case Total: $412,800/year
└── Target ARR: $600,000/year

Pipeline Health: Needs +25 qualified leads to hit target
```

---

## For Professionals

### Finding Shifts

#### Browse Available Shifts

1. Navigate to **Find Shifts** or **Job Feed**
2. Use filters to narrow your search:
   - **Location**: City or suburb
   - **Date Range**: When you're available
   - **Role Type**: Bartender, Server, Chef, etc.
   - **Pay Rate**: Minimum hourly rate
3. Click on a shift card for full details

#### Applying for Shifts

1. Click **Apply** on the shift card
2. Add a brief cover note (optional but recommended)
3. Submit your application
4. Track status in **My Applications**

#### Application Status

- **Pending**: Awaiting venue review
- **Accepted**: You got the shift!
- **Declined**: Position filled or not selected

### Accept All Feature

The "Accept All" feature allows professionals to auto-accept invitations from trusted venues.

#### Enabling Accept All

1. Go to **Settings** → **Professional Settings**
2. Find **Auto-Accept Invitations**
3. Toggle **ON**
4. Configure preferences:
   - **Trusted Venues Only**: Only from venues you've marked
   - **Minimum Rate**: Only accept above a certain rate
   - **Max Hours/Week**: Prevent over-scheduling

#### How It Works

When enabled:
1. Venue sends you a shift invitation
2. If criteria match, shift is auto-accepted
3. You receive a confirmation notification
4. Shift appears in your calendar immediately

#### Managing Trusted Venues

1. After completing a shift, rate the venue
2. Mark venues as "Trusted" from your shift history
3. Only trusted venues trigger auto-accept

### Digital Resume

Your professional profile serves as a digital resume visible to venues.

#### Building Your Profile

1. Navigate to **Profile** → **Edit Profile**
2. Complete these sections:
   - **Photo**: Professional headshot
   - **Bio**: Brief introduction
   - **Experience**: Previous hospitality roles
   - **Certifications**: RSA, Food Safety, etc.
   - **Availability**: General working hours

#### Showcasing Certifications

1. Go to **Profile** → **Certifications**
2. Click **Add Certification**
3. Upload your certificate
4. Enter details and expiry date
5. Verified certificates show a badge

### Earnings & Payments

#### Viewing Earnings

1. Navigate to **Earnings** from the dashboard
2. See your earnings breakdown:
   - **This Week**: Current period earnings
   - **This Month**: Monthly total
   - **All Time**: Lifetime earnings
3. Click on any shift for detailed breakdown

#### Payment Schedule

Payments are processed according to venue payment terms:
- **Weekly**: Paid every Friday
- **Fortnightly**: Paid every second Friday
- **Monthly**: Paid on the last day of month

#### Bank Account Setup

1. Go to **Settings** → **Payment Details**
2. Enter your bank details:
   - Account Name
   - BSB
   - Account Number
3. Verify via micro-deposit

---

## Messaging & Communication

### In-App Messaging

#### Starting a Conversation

1. From a shift or profile, click **Message**
2. Type your message
3. Send

#### Managing Conversations

- Access all conversations from **Messages** in the navbar
- Unread messages show a badge
- Real-time updates via push notifications

### Notifications

Configure your notification preferences:
- **Push Notifications**: Mobile and browser alerts
- **Email Notifications**: Daily digest or real-time
- **SMS Notifications**: Critical updates only

---

## Settings & Account

### Account Settings

Access via **Profile Menu** → **Settings**:

- **Profile Information**: Name, email, phone
- **Password**: Change your password
- **Two-Factor Authentication**: Extra security
- **Privacy**: Control data visibility

### Business Settings (Venues Only)

- **Venue Profile**: Business details, logo, description
- **Operating Hours**: When your venue is open
- **Capacity Planning**: Staff templates
- **Integrations**: Xero, payment systems

### Professional Settings

- **Availability**: Set your working hours
- **Preferences**: Preferred venues and roles
- **Auto-Accept**: Configure smart features

---

## Troubleshooting

### Common Issues

#### "Unable to load shifts"

1. Check your internet connection
2. Try refreshing the page
3. Clear browser cache
4. If persists, contact support

#### "Xero sync failed"

1. Check if pay period is locked in Xero
2. Verify employee mappings are complete
3. Ensure Xero connection is active
4. Try reconnecting Xero integration

#### "Notification not received"

1. Check notification settings in profile
2. Verify browser permissions for notifications
3. Check email spam folder
4. Ensure push notifications are enabled

#### "Calendar not showing shifts"

1. Check the date range filter
2. Verify status filter settings
3. Try switching calendar views
4. Refresh the page

### Getting Help

- **Help Center**: Access from the Help & Support menu
- **AI Support Bot**: Click the support bubble for instant help
- **Email Support**: support@hospogo.com
- **Knowledge Base**: docs.hospogo.com

---

## Glossary

| Term | Definition |
|------|------------|
| **Hub** | Venue owner or manager account |
| **Professional** | Worker seeking hospitality shifts |
| **A-Team** | Favorite staff members for priority invitations |
| **Smart Fill** | Automated shift filling with A-Team members |
| **Capacity Template** | Reusable staffing pattern for rostering |
| **The Vault** | Secure compliance document storage |
| **Mutex Lock** | Software mechanism preventing duplicate sync operations |
| **Partial Success** | Sync result where some records succeed and others fail |
| **DVS Handshake** | Government Document Verification Service integration |
| **RSA** | Responsible Service of Alcohol certification |
| **Lead Tracker** | Executive CRM for sales pipeline management |
| **Projected ARR** | Annual Recurring Revenue weighted by pipeline probability |
| **14-Day Window** | Rolling availability period for Smart Fill logic |

---

*Last updated: February 2026*
*Version: 2.0*
