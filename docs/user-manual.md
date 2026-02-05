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
4. [The Reputation Engine (Professionals)](#the-reputation-engine-professionals)
   - [Demerit Strikes](#demerit-strikes)
   - [Strike Redemption (Clean Streak)](#strike-redemption-clean-streak)
   - [Rating System](#rating-system)
5. [High-Velocity Logistics](#high-velocity-logistics)
   - [Standby Mode](#standby-mode)
   - [Running Late Button](#running-late-button)
6. [Messaging & Communication](#messaging--communication)
7. [Settings & Account](#settings--account)
8. [Troubleshooting](#troubleshooting)
9. [The Golden Paths (Outcomes)](#the-golden-paths-outcomes)
   - [Scenario: Filling an Urgent Gap (Under 60 Seconds)](#scenario-filling-an-urgent-gap-under-60-seconds)
   - [Scenario: Monthly Payroll Audit (Xero Sync Verification)](#scenario-monthly-payroll-audit-xero-sync-verification)
   - [Scenario: Ensuring 100% Compliance for a New Hire (The Vault)](#scenario-ensuring-100-compliance-for-a-new-hire-the-vault)
10. [The Logic Behind the Engine](#the-logic-behind-the-engine)
    - [Mutex Locking: Your Data Bodyguard](#mutex-locking-your-data-bodyguard)
    - [Suburban Loyalty: The Local Priority Algorithm](#suburban-loyalty-the-local-priority-algorithm)
11. [Troubleshooting FAQ](#troubleshooting-faq)
12. [Glossary](#glossary)

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

### Configuring Your Venue Canvas

Your Venue Canvas is the foundation of your HospoGo experience—it defines when you operate, how many staff you need, and who gets priority for shifts.

#### Setting Opening Hours

Configure your venue's operating hours to ensure Smart Fill only invites staff during times you're open:

1. Navigate to **Settings** → **Business Settings** → **Operating Hours**
2. For each day of the week:
   - Toggle **Open/Closed** status
   - Set **Opening Time** (e.g., 10:00 AM)
   - Set **Closing Time** (e.g., 11:00 PM)
   - Add **Split Sessions** if you close between lunch and dinner (optional)
3. Set **Public Holidays**:
   - Choose whether your venue operates on public holidays
   - Set special hours if different from regular days
4. Click **Save Operating Hours**

**Why This Matters:**
- Smart Fill respects your operating hours—staff won't receive invitations outside these times
- The calendar view highlights non-operating hours in gray
- Wage cost estimates are calculated only for operating hours

#### Defining Capacity per Slot

Capacity defines how many staff you need for each time slot. This powers the traffic light system and Smart Fill calculations.

1. Navigate to **Settings** → **Business Settings** → **Capacity Planner**
2. Click **Create New Template** or edit an existing one
3. For each time block, define:
   - **Slot Name**: e.g., "Breakfast", "Lunch Rush", "Dinner Service"
   - **Time Range**: Start and end times
   - **Roles Required**:
     | Role | Minimum | Maximum | Notes |
     |------|---------|---------|-------|
     | Bartender | 2 | 3 | Main bar coverage |
     | Server | 4 | 6 | Scale up for weekends |
     | Host | 1 | 1 | Front of house |
     | Kitchen Hand | 2 | 3 | Prep and plating |
4. Enable **Weekend Boost** to automatically increase capacity on Fri/Sat
5. Click **Save Template**

**Capacity Calculation Logic:**
- **Green**: Current confirmed staff ≥ Minimum required
- **Amber**: Some positions filled, others pending
- **Red**: Current confirmed < Minimum required

#### A-Team Starring Logic (Favorites System)

The A-Team is your curated list of trusted staff who get priority for shift invitations. Building a strong A-Team ensures consistent, reliable coverage.

**How to Add Staff to Your A-Team:**

1. Navigate to **Venue** → **Staff**
2. Click on any staff member's profile
3. Click the **⭐ Star** icon in their profile header
4. Confirm: "Add [Name] to your A-Team?"

**How A-Team Priority Works:**

When you click **Invite A-Team**, Smart Fill follows this priority order:

1. **A-Team + Available**: Staff you've starred AND who have marked themselves available
2. **A-Team + No Preference**: Starred staff who haven't set availability (defaults to available)
3. **Regular Staff + Available**: Non-starred staff who are available (only if A-Team is exhausted)

**A-Team Best Practices:**

| Recommendation | Why |
|---------------|-----|
| Star 15-20 staff | Ensures coverage even when some decline |
| Mix skill levels | Balance experienced staff with newer team members |
| Review quarterly | Remove inactive staff, add new reliable ones |
| Check reliability scores | Star staff with >90% acceptance rate |

**Removing from A-Team:**
- Click the **⭐ Star** icon again to unstar
- Staff member will no longer receive priority invitations

### Financial Integrity

HospoGo's Financial Engine ensures your payroll data flows accurately from rostering to Xero, with enterprise-grade safeguards preventing duplicates and ensuring audit compliance.

#### Xero Mutex Sync (Double-Sync Prevention)

The Mutex (Mutual Exclusion) Lock prevents duplicate timesheet entries when multiple managers sync simultaneously or when a user accidentally clicks "Sync" twice.

**How It Works:**

```
Manager A clicks "Sync Now" → Lock acquired
Manager B clicks "Sync Now" → Queued (sees "Sync in progress...")
Manager A's sync completes → Lock released
Manager B's queued request → Checks if sync needed → Skips if already synced
```

**Visual Indicators:**

| Status | Icon | Meaning |
|--------|------|---------|
| 🔒 Lock Acquired | Spinning loader | Your sync is in progress |
| 🔄 Queued | Pulse animation | Another sync is running, you'll be notified |
| ✅ Complete | Green checkmark | Sync successful, timesheets exported |
| ⚠️ Partial | Amber badge | Some records synced, some need attention |

**Mutex Lock Safeguards:**

1. **5-Minute Timeout**: Locks automatically release after 5 minutes (prevents deadlocks)
2. **Server-Side Enforcement**: Cannot be bypassed from browser developer tools
3. **Audit Trail**: Every lock acquire/release event is logged with timestamp and user ID

#### 1:1 Handshake (Employee Mapping)

The 1:1 Handshake ensures each HospoGo staff member maps exactly to one Xero employee—no duplicates, no orphans.

**Setting Up Employee Mapping:**

1. Navigate to **Settings** → **Team** → **Xero Employee Mapper**
2. For each HospoGo staff member, you'll see:
   - **HospoGo Name**: Their profile name
   - **Email**: Their registered email
   - **Xero Dropdown**: Select matching Xero employee
3. Use **Auto-Match** to automatically link by email address
4. Click **Save Mappings**

**Mapping Status Indicators:**

| Status | Description | Action |
|--------|-------------|--------|
| ✅ Mapped | HospoGo staff → Xero employee linked | None required |
| ⚠️ Unmapped | No Xero employee selected | Select from dropdown |
| ❌ Orphan | Xero employee has no HospoGo profile | Create profile or ignore |
| 🔄 Pending | Recently added, awaiting sync | Will resolve on next sync |

**Why 1:1 Matters:**

- Prevents duplicate timesheet entries in Xero
- Ensures accurate pay calculations
- Required for ATO Single Touch Payroll compliance
- Enables seamless timesheet export without manual reconciliation

#### Est. Wage Cost Tracking

The Estimated Wage Cost tracker provides real-time labor cost visibility directly in your calendar view.

**Where to Find It:**

- **Calendar View**: Top-right corner shows "Est. Wage Cost: $X,XXX" for visible period
- **Dashboard Summary**: Weekly labor cost card with trend indicator
- **Shift Details**: Individual shift cost breakdown

**Calculation Method:**

```
Est. Wage Cost = Σ (Confirmed Staff × Shift Hours × Hourly Rate)

Example for a single shift:
- 3 Bartenders × 6 hours × $35/hr = $630
- 4 Servers × 5 hours × $32/hr = $640
- 1 Host × 6 hours × $30/hr = $180
────────────────────────────────────────
Total Shift Est. Wage Cost = $1,450
```

**Cost Tracking Features:**

| Feature | Description |
|---------|-------------|
| **Live Updates** | Recalculates instantly when staff confirm/decline |
| **Period Comparison** | Compare this week vs. last week |
| **Budget Alerts** | Notify when approaching weekly labor budget |
| **Export to CSV** | Download wage cost report for accounting |

**Understanding the Numbers:**

- **Estimated**: Based on scheduled hours, not actual clock-in times
- **Excludes**: Superannuation, payroll tax, WorkCover (added in Xero)
- **Includes**: Base hourly rate × confirmed hours only
- **Updates**: When Xero sync completes, "Estimated" becomes "Confirmed"

**Pro Tip**: Set a weekly labor budget in **Settings** → **Financial** → **Labor Budget** to receive alerts when estimated costs exceed your target.

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

## The Reputation Engine (Professionals)

HospoGo uses a transparent reputation system to reward reliability and maintain marketplace quality. Your reputation directly impacts your visibility in Smart Fill and your access to premium shifts.

### Demerit Strikes

Demerit Strikes are issued for actions that negatively impact venue operations. The strike system is designed to be fair while protecting venues from no-shows and last-minute cancellations.

**When Strikes Are Issued:**

| Action | Strikes Issued | Reason |
|--------|----------------|--------|
| **Cancellation within 4 hours** | 1 strike | Venues cannot find replacement with such short notice |
| **No-show (did not arrive)** | 2 strikes | Most severe disruption to venue operations |
| **Cancellation within 24 hours** | 0.5 strikes | Some impact, but venue has time to find cover |

**Automatic Strike Issuance:**
- Strikes are issued **automatically** when you cancel a confirmed shift within 4 hours of the start time
- No manual intervention required—the system timestamps your cancellation and applies the strike instantly
- You'll receive a push notification: "Demerit Strike Applied: Late cancellation for [Shift Name]"

**The Shadow-Ban Consequence:**

| Strikes Accumulated | Consequence |
|---------------------|-------------|
| 1 strike | Warning notification sent |
| 2 strikes | Visibility reduced in Smart Fill (ranked lower) |
| **3 strikes** | **7-day Marketplace Shadow-Ban** |

**What is a 7-Day Shadow-Ban?**
- During a shadow-ban, you **will not appear** in any venue's Smart Fill or A-Team invitations
- You can still **manually apply** to posted shifts, but won't receive automatic invitations
- Your profile remains visible, but venues see a warning badge
- After 7 days, the ban lifts automatically and your visibility is restored

**Checking Your Strike Status:**
1. Navigate to **Profile** → **Reputation**
2. View your current strike count
3. See expiry dates for each strike (strikes expire after 90 days of good behavior)

---

### Strike Redemption (Clean Streak)

The **Clean Streak** policy rewards professionals who demonstrate consistent reliability. It's your path to redemption after receiving demerit strikes.

**How Clean Streak Works:**

```
Complete 5 consecutive "Confirmed & On-Time" shifts
                    ↓
        1 active demerit strike is removed
                    ↓
  Strike count decreases (e.g., 2 strikes → 1 strike)
```

**What Qualifies as "Confirmed & On-Time":**

| Criterion | Definition |
|-----------|------------|
| **Confirmed** | You accepted the shift AND worked it (no cancellation) |
| **On-Time** | You clocked in within 10 minutes of shift start time |
| **Completed** | You worked the full shift duration without early departure |

**Clean Streak Progress Tracking:**
1. Go to **Profile** → **Reputation** → **Clean Streak Progress**
2. See your current streak count (e.g., "3 of 5 shifts completed")
3. View which shifts counted toward your streak

**Clean Streak Rules:**

| Scenario | Effect on Streak |
|----------|------------------|
| Complete a shift on time | +1 to streak counter |
| Late arrival (>10 min) | Streak resets to 0 |
| Cancellation (any time) | Streak resets to 0 |
| No-show | Streak resets to 0 + additional strikes |

**Example Redemption Journey:**
```
Starting State: 2 demerit strikes

Week 1: Complete Shift #1 ✅ (Streak: 1/5)
Week 1: Complete Shift #2 ✅ (Streak: 2/5)
Week 2: Complete Shift #3 ✅ (Streak: 3/5)
Week 2: Complete Shift #4 ✅ (Streak: 4/5)
Week 3: Complete Shift #5 ✅ (Streak: 5/5)

🎉 Clean Streak Complete!
Result: 2 strikes → 1 strike
New streak starts for next redemption
```

**Pro Tips for Maintaining Clean Streak:**
- Set calendar reminders for confirmed shifts
- Use the **Running Late** button if delayed (see High-Velocity Logistics section)
- Only accept shifts you're confident you can complete
- Enable push notifications to avoid missing shift reminders

---

### Rating System

HospoGo uses a **5-star peer-review loop** where both Venue Owners and Professionals rate each other after completed shifts.

**The Peer-Review Loop:**

```
After shift ends:
    ↓
Venue Owner rates Professional (1-5 stars)
    ↓
Professional rates Venue (1-5 stars)
    ↓
Both ratings visible after 48 hours (anonymous cool-down period)
```

**Rating Criteria for Professionals (Venue → Professional):**

| Star Rating | Meaning |
|-------------|---------|
| ⭐ (1 star) | Did not meet expectations, serious issues |
| ⭐⭐ (2 stars) | Below average, multiple concerns |
| ⭐⭐⭐ (3 stars) | Met basic expectations, room for improvement |
| ⭐⭐⭐⭐ (4 stars) | Good performance, minor issues |
| ⭐⭐⭐⭐⭐ (5 stars) | Excellent, would highly recommend |

**Rating Criteria for Venues (Professional → Venue):**

| Star Rating | Meaning |
|-------------|---------|
| ⭐ (1 star) | Poor working conditions, avoid |
| ⭐⭐ (2 stars) | Below average experience |
| ⭐⭐⭐ (3 stars) | Acceptable, standard venue |
| ⭐⭐⭐⭐ (4 stars) | Good environment, well-managed |
| ⭐⭐⭐⭐⭐ (5 stars) | Excellent, highly recommend working here |

**How Ratings Affect Your Profile:**

| Average Rating | Visibility Impact |
|----------------|-------------------|
| 4.5+ stars | Featured in A-Team recommendations, priority in Smart Fill |
| 4.0-4.4 stars | Standard visibility |
| 3.5-3.9 stars | Reduced visibility in Smart Fill |
| Below 3.5 stars | Warning badge on profile, may affect invitations |

**Rating Best Practices:**
- Be honest and constructive in your ratings
- Rate within 48 hours while the experience is fresh
- Include specific feedback in the optional comment
- Report serious issues through the official channels (not just low ratings)

**Disputing a Rating:**
1. Go to **Profile** → **Ratings** → Find the rating in question
2. Click **Request Review**
3. Provide your perspective with supporting details
4. HospoGo Support reviews within 72 hours
5. Invalid ratings may be removed or adjusted

---

## High-Velocity Logistics

These features enable rapid response to emergencies and last-minute changes—essential for the fast-paced hospitality industry.

### Standby Mode

**Standby Mode** allows professionals to signal they're immediately available for emergency "Gap Shifts" with premium rates.

**What is Standby Mode?**

When you toggle Standby ON, you become:
- **Top-of-list** for urgent shift fills (ahead of A-Team members not on Standby)
- **Eligible for premium rates** (Gap Shifts often pay 10-25% above standard rate)
- **First to receive** emergency notifications when someone cancels last-minute

**Activating Standby Mode:**

1. Navigate to **Profile** → **Availability**
2. Find the **Standby Mode** toggle (⚡ icon)
3. Toggle **ON** to enter Standby
4. Set your **Standby Window** (how long you'll remain on Standby):
   - "Next 2 hours"
   - "Rest of today"
   - "Next 24 hours"
   - "Custom end time"
5. Your profile badge changes to ⚡ **On Standby**

**How Venues Use Standby:**

When a venue has an urgent gap (e.g., bartender called in sick 1 hour before shift):

```
Venue Manager clicks "Emergency Fill"
            ↓
System queries: Who is on Standby + Available + Qualified?
            ↓
Standby professionals receive PRIORITY notification
            ↓
First to accept gets the shift (with premium rate)
```

**Standby Priority Order:**

| Priority | Criteria |
|----------|----------|
| 1st | On Standby + A-Team + Hyperlocal (<5km) |
| 2nd | On Standby + A-Team + Any distance |
| 3rd | On Standby + Non-A-Team + Hyperlocal |
| 4th | On Standby + Non-A-Team |
| 5th | Not on Standby (regular Smart Fill) |

**Premium Rate Structure:**

| Urgency | Premium |
|---------|---------|
| <2 hours notice | +25% |
| 2-4 hours notice | +15% |
| 4-8 hours notice | +10% |
| >8 hours notice | Standard rate |

**Standby Best Practices:**
- Only activate when you're genuinely free and near potential venues
- Keep your phone charged and notifications ON
- Respond quickly—Gap Shifts fill within minutes
- Maintain a packed bag with work essentials

**Deactivating Standby:**
- Toggle OFF manually anytime
- Automatically deactivates at your set window end time
- Accepting a shift automatically ends your Standby session

---

### Running Late Button

The **Running Late Button** is your communication lifeline when unexpected delays occur. It triggers an automated notification to the Venue Manager with your live ETA.

**Why This Matters:**

Arriving late without notice = Trust broken + Potential strike
Arriving late WITH notice = Venue can plan + No penalty (within reason)

**How to Use the Running Late Button:**

1. Navigate to **Profile** → **Active Shift** (or tap the shift notification)
2. Click **"I'm Running Late"** button (amber/yellow styling)
3. Select your reason (optional but recommended):
   - Traffic delay
   - Public transport issue
   - Personal emergency
   - Other (custom message)
4. Confirm your **Updated ETA**:
   - System auto-suggests based on your GPS location
   - You can adjust manually if needed
5. Click **Send Notification**

**What Happens When You Press the Button:**

```
You tap "I'm Running Late"
            ↓
System captures your current GPS location
            ↓
Calculates estimated arrival time
            ↓
Sends automated SMS to Venue Manager:
   "[Your Name] is running late for the 6PM Bartender shift.
    Updated ETA: 6:15 PM
    Reason: Traffic delay"
            ↓
Push notification also sent to Venue Manager's app
            ↓
Your shift card updates with "Delayed - ETA 6:15 PM" badge
```

**UI Navigation Path:**
> **Profile** → **Active Shift** → **I'm Running Late**

**Grace Period Policy:**

| Delay Duration | Impact |
|----------------|--------|
| ≤10 minutes (with notice) | No penalty, shift proceeds normally |
| 11-30 minutes (with notice) | Venue may deduct time, no strike |
| >30 minutes (with notice) | Venue may reassign, counts as late arrival |
| Any delay (without notice) | May count as no-show, strike risk |

**Pro Tips:**
- Press the button as SOON as you know you'll be late
- Earlier notification = More time for venue to adjust
- Honest ETAs build trust (don't underestimate delay)
- Even 5 minutes late is worth notifying

**Repeated Late Arrivals:**

While the Running Late button protects you from immediate strikes, a pattern of late arrivals affects your profile:

| Pattern | Consequence |
|---------|-------------|
| 3+ late arrivals in 30 days | "Punctuality Warning" badge |
| 5+ late arrivals in 30 days | Reduced Smart Fill priority |
| Consistent on-time arrivals | "Reliable" badge + priority boost |

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

---

## The Golden Paths (Outcomes)

These are the most common scenarios HospoGo users encounter, with step-by-step guidance to achieve the desired outcome in minimal time.

### Scenario: Filling an Urgent Gap (Under 60 Seconds)

**Situation:** It's 2 PM and your bartender just called in sick for tonight's 6 PM shift. You need coverage NOW.

**The 60-Second Fill:**

1. **Open Calendar** → Navigate to today's date (should already be visible)
2. **Click the Red Shift** → The unfilled 6 PM bartender shift will be red (Vacant)
3. **Click "Invite A-Team"** → This button appears in the shift detail panel
4. **Watch the Magic:**
   - Smart Fill queries your A-Team's availability
   - Sends bulk notifications to all available bartenders
   - Status changes from 🔴 Red → 🟡 Amber (Invited)
5. **Monitor Responses:**
   - Push notifications alert you when someone accepts
   - Status changes from 🟡 Amber → 🟢 Green (Confirmed)
   - Average response time: 3-7 minutes

**Pro Tips:**
- Keep your A-Team populated with 15-20+ trusted staff
- Bartenders with "Accept All" enabled will auto-confirm instantly
- Check the "14-Day Availability Window" in their profile to see who's likely free

**If No A-Team Responds (5+ minutes):**
1. Click **"Open to Market"** on the shift
2. Shift posts to the Professional Job Feed
3. Any qualified professional in your area can apply
4. You approve and assign—still faster than phone calls

---

### Scenario: Monthly Payroll Audit (Xero Sync Verification)

**Situation:** It's the end of the pay period and Lucas (your accountant) needs to verify that all timesheets synced correctly to Xero before running payroll.

**The Audit Walkthrough:**

**Step 1: Navigate to Sync History**
- Go to **Settings** → **Integrations** → **Xero** → **Sync History**
- You'll see a chronological list of all sync events

**Step 2: Check the Pay Period**
- Filter by date range: [Start of Pay Period] to [End of Pay Period]
- Look for the most recent sync event

**Step 3: Verify Sync Status**
| Status | Meaning | Action |
|--------|---------|--------|
| ✅ **Complete** | All timesheets exported | None—proceed to Xero |
| ⚠️ **Partial Success** | Some records failed | Review failed employees |
| ❌ **Failed** | Sync did not complete | Check Xero connection |

**Step 4: Drill Down on Partial Success**
- Click the sync event to expand details
- Review the **Success/Fail Table**:
  - ✅ Synced employees: Already in Xero, no action needed
  - ❌ Failed employees: Note the error message
  
**Step 5: Resolve Failed Records**
- Common fixes:
  - "Employee not mapped" → Go to **Team** → **Xero Employee Mapper**
  - "Pay period locked" → Unlock in Xero Payroll Settings
  - "Duplicate detected" → Mutex prevented double-entry (check Xero—it's likely already there)

**Step 6: Re-Sync Failed Records Only**
- Click **"Retry Failed"** on the sync event
- Only failed employees are re-attempted (successful ones are skipped)
- Verify ✅ Complete status

**Step 7: Cross-Reference in Xero**
- Open Xero Payroll → Timesheets
- Confirm total hours match HospoGo calendar
- Run payroll with confidence

---

### Scenario: Ensuring 100% Compliance for a New Hire (The Vault)

**Situation:** A new bartender, Sarah, just started. Before she works her first shift, you need to ensure she's fully compliant with all required certifications.

**The Compliance Checklist:**

**Step 1: Navigate to Sarah's Profile**
- Go to **Venue** → **Staff**
- Search for "Sarah" or scroll to find her
- Click her profile card

**Step 2: Check Compliance Status Panel**
- Look for the **Vault** section in her profile
- Status indicators:
  - ✅ **Verified**: Document valid and authenticated
  - ⚠️ **Pending**: Awaiting verification or upload
  - ❌ **Expired/Missing**: Action required before scheduling

**Step 3: Request Missing Documents**
- Click **"Request Documents"** button
- Select required documents:
  - [ ] RSA Certificate (Responsible Service of Alcohol)
  - [ ] Food Safety Certificate
  - [ ] Working with Children Check (if applicable)
  - [ ] Tax File Number Declaration
  - [ ] Emergency Contact
- Click **"Send Request"**
- Sarah receives an email/push notification with upload instructions

**Step 4: Sarah Uploads (Her Side)**
- Sarah clicks the link in her notification
- Uploads each document photo/PDF
- Enters certificate number and expiry date
- Submits for verification

**Step 5: DVS Handshake (Automatic RSA Verification)**
- For RSA certificates, HospoGo initiates a **DVS Handshake**:
  - Certificate details sent to Government Document Verification Service
  - Response received in 5-30 seconds
  - ✅ **DVS Verified**: Certificate is authentic and valid
  - ❌ **DVS Failed**: Certificate not found in government records

**Step 6: Verify Compliance Status**
- Return to Sarah's profile
- All documents should now show ✅ Verified
- Her compliance badge changes from ⚠️ Pending to ✅ Compliant

**Step 7: Schedule with Confidence**
- Sarah can now be added to shifts
- Smart Fill will include her in A-Team invitations
- If any document expires, you'll receive 30-day advance warning

**The 30-Day Safety Net:**
- HospoGo automatically tracks expiry dates
- Notifications sent at: 30 days, 14 days, 7 days, day of expiry
- Expired staff can be auto-excluded from Smart Fill (configurable)

---

## The Logic Behind the Engine

Understanding how HospoGo's intelligent systems work helps you leverage them more effectively. Here's a plain-English explanation of the core algorithms.

### Mutex Locking: Your Data Bodyguard

**What It Is (Plain English):**

Imagine two managers both click "Sync to Xero" at the exact same time. Without protection, both requests would try to write the same timesheet data to Xero—creating duplicate entries and payroll chaos.

**Mutex** (short for "Mutual Exclusion") is like a bathroom door lock. Only one person can use it at a time, and everyone else has to wait until they're done.

**How It Works in HospoGo:**

```
Manager Alice clicks "Sync Now"
├── System: "Is anyone else syncing?" → No
├── System: "Acquiring lock..." → Lock acquired ✅
├── Alice: Sees spinning "Sync in progress..."
│
│   [5 seconds later...]
│
├── Manager Bob clicks "Sync Now"
│   ├── System: "Is anyone else syncing?" → Yes, Alice is
│   ├── System: "Queuing Bob's request..."
│   └── Bob: Sees "Sync in progress... (queued)"
│
│   [10 seconds later...]
│
├── Alice's sync completes → Timesheets written to Xero
├── System: "Releasing lock..." → Lock released ✅
├── Alice: Sees "Sync complete! 15 timesheets exported."
│
│   [Bob's queued request activates...]
│
├── System: "Checking if Bob's sync is still needed..."
├── System: "All employees already synced → Skip"
└── Bob: Sees "Sync complete! Already up to date."
```

**Why You Should Care:**
- **No duplicates**: You can click "Sync" 10 times in a row—only one sync runs
- **No race conditions**: Multiple managers can work simultaneously without stepping on each other
- **Audit trail**: Every lock/unlock event is logged with timestamp and user ID
- **Automatic timeout**: If something crashes, the lock releases after 5 minutes (no stuck states)

**Visual Indicators:**
| What You See | What It Means |
|--------------|---------------|
| 🔄 Spinning loader | Your sync is running (you hold the lock) |
| 🔄 "Queued" message | Someone else is syncing, you're in line |
| ✅ Green checkmark | Sync complete, your data is in Xero |
| ⚠️ Amber badge | Partial success—some records need attention |

---

### Suburban Loyalty: The Local Priority Algorithm

**What It Is (Plain English):**

HospoGo tracks where your staff live and have historically worked. We've found that **staff who live within 10km of your venue are 4.6% more likely to accept shifts** and have higher reliability scores.

**Suburban Loyalty** is the algorithm that prioritizes "Neighborhood Locals" when Smart Fill sends invitations.

**The Data Behind It:**

| Distance from Venue | Acceptance Rate | No-Show Rate | Avg. Rating |
|---------------------|-----------------|--------------|-------------|
| < 5 km (Hyperlocal) | 78% | 1.2% | 4.8 ⭐ |
| 5-10 km (Local) | 72% | 2.1% | 4.6 ⭐ |
| 10-20 km (Nearby) | 64% | 3.8% | 4.4 ⭐ |
| > 20 km (Far) | 51% | 6.2% | 4.2 ⭐ |

**How Smart Fill Uses Suburban Loyalty:**

When you click **"Invite A-Team"**, the system:

1. **Fetches your A-Team list** (starred favorites)
2. **Checks 14-day availability** (excludes anyone who blocked the time)
3. **Ranks by Suburban Loyalty Score:**
   ```
   Priority Order:
   1. A-Team + Available + Hyperlocal (< 5 km)    → Invited first
   2. A-Team + Available + Local (5-10 km)        → Invited second
   3. A-Team + Available + Nearby (10-20 km)      → Invited third
   4. A-Team + Available + Far (> 20 km)          → Invited last
   ```
4. **Sends invitations in priority waves** (highest priority gets 30-second head start)

**Why Locals Are Better:**
- **Shorter commute** = More likely to accept last-minute shifts
- **Know the area** = Less likely to get lost or arrive late
- **Community stake** = Care about local reputation
- **Weather-resistant** = Won't cancel due to rain/traffic as often

**How to Leverage This:**
- When building your A-Team, **prioritize staff who live nearby**
- Check the **"Distance" badge** on staff profiles (Hyperlocal 🏠, Local 🚗, Far ✈️)
- For urgent fills, Hyperlocal staff respond fastest

**Note:** Suburban Loyalty is a **tiebreaker**, not a filter. If your only available bartender lives 25km away, they'll still be invited. The algorithm simply prioritizes locals when multiple candidates are equal.

---

## Troubleshooting FAQ

Quick answers to the most common questions and issues users encounter.

### "Why can't I see my Xero employees?"

**Symptoms:**
- Xero Employee Mapper shows "No employees found"
- Dropdown is empty when trying to map staff
- "Unable to fetch Xero employees" error

**Diagnosis & Fix:**

**1. Check Xero Connection Status**
- Go to **Settings** → **Integrations** → **Xero**
- Look for connection indicator:
  - 🟢 **Connected**: Connection is active
  - 🔴 **Disconnected**: Token expired or revoked

**If Disconnected:**
- Click **"Reconnect to Xero"**
- Sign in to your Xero account
- Re-authorize HospoGo access
- Select your Xero Organisation again

**2. Check Xero Permissions**
- In Xero, go to **Settings** → **Connected Apps**
- Find HospoGo and click **Manage**
- Ensure these permissions are granted:
  - ✅ Payroll Employees (Read)
  - ✅ Payroll Timesheets (Write)
  - ✅ Payroll Settings (Read)

**If Missing Permissions:**
- Disconnect HospoGo in Xero
- Return to HospoGo and reconnect
- Approve ALL permission requests

**3. Check Xero Organisation**
- You may have multiple Xero organisations
- Go to **Settings** → **Integrations** → **Xero**
- Verify the correct organisation is selected
- If wrong, click **"Change Organisation"** and select the right one

**4. Check Employee Status in Xero**
- Employees must be **Active** in Xero to appear
- Archived or terminated employees won't show
- Go to Xero → Payroll → Employees → check status filters

**Still Not Working?**
- Clear browser cache and cookies
- Try a different browser
- Contact support@hospogo.com with screenshot of the error

---

### "Why is a shift bucket Red even though I invited people?"

**Symptoms:**
- You clicked "Invite A-Team" on a shift
- Notifications were sent (you saw the confirmation)
- But the shift is still showing 🔴 Red instead of 🟡 Amber

**Understanding the Status Logic:**

| Status | Condition | Meaning |
|--------|-----------|---------|
| 🔴 **Red (Vacant)** | 0 confirmed + 0 pending invitations | No one assigned or invited |
| 🟡 **Amber (Invited)** | 0 confirmed + 1+ pending invitations | People invited, awaiting response |
| 🟢 **Green (Confirmed)** | 1+ confirmed (meets minimum capacity) | Position filled |

**Why Red Might Persist:**

**Scenario 1: Invitations Were Declined**
- All invited staff may have declined
- Declinations return the shift to Red
- Check **Shift Details** → **Invitation History** to see responses

**Scenario 2: No Available A-Team**
- Smart Fill only invites **available** A-Team members
- If all your A-Team marked themselves unavailable, no invitations were sent
- The "success" message meant the **process ran**, not that invitations sent

**How to Check:**
1. Click the Red shift to open details
2. Look at **"Invitations Sent"** count
3. If it shows **"0 invitations sent"**:
   - Your A-Team has no available members for this time
   - Solution: Expand your A-Team or use **"Open to Market"**

**Scenario 3: Timing Issue**
- Invitations may still be processing
- Wait 10-15 seconds and refresh the calendar
- Push notifications to staff can take 5-30 seconds

**The Fix:**
- If 0 invitations sent → **Open to Market** to reach wider pool
- If invitations declined → **Manual Assignment** with specific staff
- If A-Team too small → **Add more staff** to your A-Team (aim for 15-20)

---

### "Why did my Xero sync show 'Partial Success'?"

**Symptoms:**
- Sync completed but showed ⚠️ Partial Success instead of ✅ Complete
- Some timesheets exported, others didn't

**What Partial Success Means:**
- HospoGo successfully synced **most** of your staff
- **Some records failed** due to specific issues with those employees
- Successful records ARE in Xero—only failures need attention

**Common Failure Causes:**

| Error Message | Cause | Fix |
|---------------|-------|-----|
| "Employee not mapped" | HospoGo staff has no linked Xero employee | Go to **Team** → **Xero Employee Mapper** |
| "Employee archived in Xero" | Xero employee was terminated/archived | Reactivate in Xero or unmap in HospoGo |
| "Invalid pay rate" | Hourly rate conflict between systems | Update rate in HospoGo or Xero |
| "Timesheet already exists" | Duplicate detection (mutex worked!) | Check Xero—it's already there |
| "Pay period locked" | Xero period is closed for edits | Unlock in Xero Payroll Settings |

**Resolution Steps:**
1. Click the Partial Success notification to see details
2. Note which employees failed and why
3. Fix the underlying issue (mapping, Xero status, etc.)
4. Click **"Retry Failed"** to re-sync only failed records
5. Verify ✅ Complete status

---

### "How do I set my operating hours?"

**Step-by-Step:**

1. Go to **Sidebar** → **Settings** → **Business**
2. Click **"Operating Hours"** tab
3. For each day of the week:
   - Toggle **Open/Closed**
   - Set **Opening Time** (e.g., 10:00 AM)
   - Set **Closing Time** (e.g., 11:00 PM)
4. Click **"Save Operating Hours"**

**Why This Matters:**
- Smart Fill respects your hours—no invitations outside operating times
- Calendar grays out non-operating hours
- Wage cost estimates only calculate for open hours

---

### "What's the difference between 'Invited' and 'Confirmed'?"

**Invited (🟡 Amber):**
- You've sent a shift invitation to one or more staff members
- They've received the notification
- They haven't responded yet (accepted or declined)
- The position is NOT yet filled—still waiting for confirmation

**Confirmed (🟢 Green):**
- A staff member has **accepted** the invitation
- They've committed to working the shift
- The position IS filled—no further action needed
- Their name appears on the shift details

**The Journey:**
```
Vacant (🔴 Red)
    ↓ You click "Invite"
Invited (🟡 Amber)
    ↓ Staff clicks "Accept"
Confirmed (🟢 Green)
```

**Important:** A shift can be Amber with 5 invitations pending—but until someone **accepts**, you don't have coverage. Always check that shifts reach Green status before considering them filled.

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
*Version: 3.1 - Reputation Engine & High-Velocity Logistics*
