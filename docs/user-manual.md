# HospoGo User Manual

> Your complete guide to mastering the HospoGo hospitality logistics platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [For Venue Owners (The Hub)](#for-venue-owners-the-hub)
   - [Dashboard Overview](#dashboard-overview)
   - [Capacity Templates](#capacity-templates)
   - [Invite A-Team (Smart Fill)](#invite-a-team-smart-fill)
   - [Rostering & Calendar](#rostering--calendar)
   - [Xero Integration](#xero-integration)
   - [The Vault (Compliance)](#the-vault-compliance)
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

### Invite A-Team (Smart Fill)

The "Invite A-Team" feature bulk-invites your favorite staff members to fill open shifts.

#### Setting Up Your A-Team

1. Navigate to **Venue** → **Staff**
2. Click on a staff member's profile
3. Click the **Star** icon to add them to your Favorites (A-Team)
4. Repeat for all trusted staff members

#### Using Invite A-Team

1. From the Calendar view, click **Roster Tools**
2. Select **Invite A-Team**
3. The system will:
   - Identify all unfilled shifts in the visible period
   - Match shifts with available A-Team members based on their skills
   - Send bulk invitation notifications
4. Wait for confirmations—status updates in real-time

#### Smart Fill Logic

The A-Team invitation system considers:
- **Availability**: Staff must have marked themselves available
- **Skills**: Staff qualifications must match shift requirements
- **Past Performance**: Priority given to reliable team members
- **Proximity**: Considers travel time where applicable

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

### Xero Integration

HospoGo integrates seamlessly with Xero Payroll to export timesheets.

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

#### Understanding Mutex Sync

Mutex Sync ensures data integrity during synchronization:
- Prevents duplicate timesheet entries
- Queues concurrent sync requests
- Provides real-time status updates
- Rolls back on partial failures

#### Troubleshooting Xero Issues

| Issue | Solution |
|-------|----------|
| "Pay period is locked" | Unlock the period in Xero Payroll settings |
| "Employee not found" | Check employee mapping in Team settings |
| "Token expired" | Reconnect Xero in Integrations settings |
| "Duplicate timesheet" | Timesheet already exists—check Xero directly |

### The Vault (Compliance)

The Vault stores and validates compliance documents for your staff.

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

#### Compliance Alerts

HospoGo automatically notifies you when:
- Documents are about to expire (30 days warning)
- Required documents are missing
- Verification status changes

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
| **Mutex Sync** | Synchronized Xero data transfer with conflict prevention |
| **RSA** | Responsible Service of Alcohol certification |

---

*Last updated: February 2026*
*Version: 1.0*
