/**
 * Weekly Report Email Script
 * 
 * Generates and sends the weekly founder report via email
 * Uses Steel/Chrome styled template to match HospoGo brand
 */

import { getWeeklyMetrics } from '../services/reporting.service.js';
import { resend, isEmailServiceAvailable } from '../lib/resend.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@hospogo.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'HospoGo <noreply@hospogo.com>';

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format currency for display (AUD, rounded to 2 decimal places)
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage for display
 */
function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Generate HTML email template for weekly report with Steel/Chrome styling
 */
function generateEmailHTML(report: Awaited<ReturnType<typeof getWeeklyMetrics>>): string {
  const startDate = formatDate(report.dateRange.start);
  const endDate = formatDate(report.dateRange.end);
  const transactionVolume = formatCurrency(report.totalTransactionVolume);
  const completionRate = formatPercentage(report.shiftCompletionRate);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HospoGo Weekly Pulse</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 650px;
      margin: 0 auto;
      padding: 0;
      background-color: #f5f5f7;
    }
    .email-wrapper {
      background-color: #ffffff;
      margin: 20px auto;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: #ffffff;
      padding: 40px 30px;
      text-align: center;
      border-bottom: 4px solid #7f8c8d;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.5px;
      text-transform: uppercase;
      color: #ecf0f1;
    }
    .header .subtitle {
      margin-top: 12px;
      font-size: 14px;
      color: #bdc3c7;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .header .date-range {
      margin-top: 16px;
      font-size: 13px;
      color: #95a5a6;
      font-weight: 400;
    }
    .content {
      padding: 40px 30px;
      background-color: #ffffff;
    }
    .metric {
      background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
      border: 1px solid #e1e8ed;
      border-left: 4px solid #7f8c8d;
      padding: 24px;
      margin-bottom: 24px;
      border-radius: 8px;
      transition: box-shadow 0.2s ease;
    }
    .metric:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .metric-title {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .metric-value {
      font-size: 36px;
      font-weight: 700;
      color: #2c3e50;
      margin: 0;
      line-height: 1.2;
      letter-spacing: -1px;
    }
    .metric-description {
      font-size: 13px;
      color: #95a5a6;
      margin-top: 8px;
      line-height: 1.5;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-excellent {
      background-color: #d5e8d4;
      color: #2d5016;
      border: 1px solid #a8d5a5;
    }
    .status-good {
      background-color: #e8f4f8;
      color: #1e3a5f;
      border: 1px solid #b8d4e3;
    }
    .status-warning {
      background-color: #fff4e6;
      color: #8b6914;
      border: 1px solid #ffd699;
    }
    .status-critical {
      background-color: #ffe6e6;
      color: #8b1a1a;
      border: 1px solid #ffb3b3;
    }
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #e1e8ed, transparent);
      margin: 32px 0;
    }
    .footer {
      background-color: #2c3e50;
      color: #bdc3c7;
      padding: 30px;
      text-align: center;
      font-size: 12px;
      line-height: 1.6;
    }
    .footer p {
      margin: 8px 0;
    }
    .footer .brand {
      color: #ecf0f1;
      font-weight: 600;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>📊 Founder's Weekly Pulse</h1>
      <div class="subtitle">HospoGo Performance Metrics</div>
      <div class="date-range">${startDate} - ${endDate}</div>
    </div>

    <div class="content">
      <div class="metric">
        <div class="metric-title">Total Transaction Volume</div>
        <p class="metric-value">${transactionVolume}</p>
        <div class="metric-description">Sum of all payout amounts in AUD for the last 7 days</div>
      </div>

      <div class="metric">
        <div class="metric-title">Shift Completion Rate</div>
        <p class="metric-value">${completionRate}</p>
        <div class="metric-description">Ratio of completed vs cancelled shifts</div>
        ${report.shiftCompletionRate >= 0.8 
          ? '<span class="status-badge status-excellent">✓ Excellent</span>'
          : report.shiftCompletionRate >= 0.6
          ? '<span class="status-badge status-good">✓ Good</span>'
          : report.shiftCompletionRate >= 0.4
          ? '<span class="status-badge status-warning">⚠ Needs Attention</span>'
          : '<span class="status-badge status-critical">✗ Critical</span>'
        }
      </div>

      <div class="metric">
        <div class="metric-title">Geofence Failures</div>
        <p class="metric-value">${report.geofenceFailures}</p>
        <div class="metric-description">Failed clock-in/check-in attempts due to distance in the last week</div>
        ${report.geofenceFailures === 0
          ? '<span class="status-badge status-excellent">✓ No Issues</span>'
          : report.geofenceFailures < 10
          ? '<span class="status-badge status-good">✓ Low</span>'
          : report.geofenceFailures < 25
          ? '<span class="status-badge status-warning">⚠ Monitor</span>'
          : '<span class="status-badge status-critical">✗ High Volume</span>'
        }
      </div>

      <div class="metric">
        <div class="metric-title">Failed Communications</div>
        <p class="metric-value">${report.failedCommunications}</p>
        <div class="metric-description">Failed email deliveries in the last 7 days</div>
        ${report.failedCommunications === 0
          ? '<span class="status-badge status-excellent">✓ All Clear</span>'
          : report.failedCommunications < 5
          ? '<span class="status-badge status-good">✓ Low</span>'
          : report.failedCommunications < 15
          ? '<span class="status-badge status-warning">⚠ Review Needed</span>'
          : '<span class="status-badge status-critical">✗ Action Required</span>'
        }
      </div>

      <div class="divider"></div>
    </div>

    <div class="footer">
      <p class="brand">HospoGo</p>
      <p>This is an automated weekly report generated by the HospoGo reporting system</p>
      <p>Generated on ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', dateStyle: 'full', timeStyle: 'short' })}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send weekly founder report via email
 */
export async function sendWeeklyReport(): Promise<boolean> {
  try {
    // Check if email service is available
    if (!isEmailServiceAvailable() || !resend) {
      console.warn('[Weekly Report] Email service not available. Report would be sent to:', ADMIN_EMAIL);
      console.log('[Weekly Report] Mock mode - Report data:');
      
      const report = await getWeeklyMetrics();
      console.log(JSON.stringify(report, null, 2));
      
      return true; // Return true in mock mode so cron doesn't fail
    }

    // Generate report
    console.log('[Weekly Report] Generating weekly founder report...');
    const report = await getWeeklyMetrics();
    
    // Format date range for subject
    const startDate = formatDate(report.dateRange.start);
    const endDate = formatDate(report.dateRange.end);
    const subject = `HospoGo Weekly Pulse: ${startDate} - ${endDate}`;
    
    // Generate HTML email
    const html = generateEmailHTML(report);
    
    // Send email
    console.log('[Weekly Report] Sending email to:', ADMIN_EMAIL);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html,
    });

    if (error) {
      console.error('[Weekly Report] Failed to send email:', error);
      return false;
    }

    console.log('[Weekly Report] ✅ Weekly report sent successfully');
    return true;
  } catch (error: any) {
    console.error('[Weekly Report] Error generating or sending report:', error);
    throw error;
  }
}
