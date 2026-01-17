/**
 * Health Monitor Script
 * 
 * Monitors the /api/health endpoint and sends email alerts
 * when the system status is not 'ok'
 * 
 * DRY RUN MODE: Set DRY_RUN=true to test email alerts without affecting production
 * In dry run mode, the script will simulate a 'degraded' status to test the alert flow
 */

import { performHealthChecks } from '../services/health-check.service.js';
import { resend } from '../lib/resend.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL || 'info@hospogo.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'HospoGo <noreply@hospogo.com>';
const DRY_RUN = process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1';

/**
 * Monitor health and send alert if status is not 'ok'
 * 
 * @param dryRun - If true, simulates a 'degraded' status to test email alerts without affecting production
 */
export async function monitorHealth(dryRun: boolean = DRY_RUN): Promise<void> {
  try {
    // DRY RUN MODE: Simulate degraded status to test email alerts
    if (dryRun) {
      console.log('[Health Monitor] 🧪 DRY RUN MODE: Simulating degraded status for testing');
      const healthCheck = await performHealthChecks();
      
      // Override status to 'degraded' for testing
      const mockHealthCheck = {
        ...healthCheck,
        status: 'degraded' as const,
        checks: healthCheck.checks.map(check => ({
          ...check,
          status: check.status === 'healthy' ? 'degraded' as const : check.status,
          message: `[DRY RUN] ${check.message} - This is a test alert`,
        })),
      };
      
      console.log('[Health Monitor] 🧪 DRY RUN: Mock health check created:', {
        status: mockHealthCheck.status,
        timestamp: mockHealthCheck.timestamp,
        checks: mockHealthCheck.checks.length,
      });
      
      // Continue with alert flow using mock data
      await sendHealthAlert(mockHealthCheck, true);
      return;
    }

    // Perform health checks
    const healthCheck = await performHealthChecks();

    // If status is 'ok', no action needed
    if (healthCheck.status === 'ok') {
      console.log('[Health Monitor] All systems operational:', {
        timestamp: healthCheck.timestamp,
        status: healthCheck.status,
      });
      return;
    }

    // Status is 'degraded' or 'unhealthy' - send alert
    await sendHealthAlert(healthCheck, false);
  } catch (error: any) {
    console.error('[Health Monitor] Error monitoring health:', error);
    // Don't throw - we don't want the cron job to fail silently
    // but we also don't want it to crash the entire system
  }
}

/**
 * Send health alert email
 * 
 * @param healthCheck - Health check result
 * @param isDryRun - Whether this is a dry run test
 */
async function sendHealthAlert(healthCheck: Awaited<ReturnType<typeof performHealthChecks>>, isDryRun: boolean): Promise<void> {
  try {
    // Status is 'degraded' or 'unhealthy' - send alert
    console.warn(`[Health Monitor] ${isDryRun ? '🧪 DRY RUN: ' : ''}System health issue detected:`, {
      status: healthCheck.status,
      timestamp: healthCheck.timestamp,
      checks: healthCheck.checks,
      isDryRun,
    });

    // Check if Resend is configured
    if (!RESEND_API_KEY || !resend) {
      console.error('[Health Monitor] RESEND_API_KEY not configured. Cannot send alert email.');
      return;
    }

    // Prepare email content
    const subject = `${isDryRun ? '🧪 [DRY RUN TEST] ' : ''}🚨 HospoGo Health Alert: System ${healthCheck.status.toUpperCase()}`;
    
    // Format the health check data for email
    const checksHtml = healthCheck.checks
      .map((check) => {
        const statusIcon = check.status === 'healthy' ? '✅' : check.status === 'degraded' ? '⚠️' : '❌';
        return `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              ${statusIcon} <strong>${check.service}</strong>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              ${check.status}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              ${check.message}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              ${check.responseTime ? `${check.responseTime}ms` : 'N/A'}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              ${check.error || 'None'}
            </td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: ${healthCheck.status === 'unhealthy' ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
            .status-ok { background: #10b981; color: white; }
            .status-degraded { background: #f59e0b; color: white; }
            .status-unhealthy { background: #dc2626; color: white; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; }
            th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #e5e7eb; }
            td { padding: 8px; }
            .json-block { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 12px; margin-top: 20px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${isDryRun ? '🧪 [DRY RUN TEST] ' : ''}🚨 HospoGo Health Alert</h1>
              <p style="margin: 10px 0 0 0;">System Status: <span class="status-badge status-${healthCheck.status}">${healthCheck.status}</span>${isDryRun ? ' <strong>(TEST MODE - No actual issues)</strong>' : ''}</p>
            </div>
            <div class="content">
              <h2>Health Check Details</h2>
              <p><strong>Timestamp:</strong> ${new Date(healthCheck.timestamp).toLocaleString()}</p>
              <p><strong>Overall Status:</strong> <span class="status-badge status-${healthCheck.status}">${healthCheck.status}</span></p>
              <p><strong>Version:</strong> ${healthCheck.version}</p>
              <p><strong>Uptime:</strong> ${Math.floor(healthCheck.uptime / 60)} minutes</p>
              
              <h3>Service Checks</h3>
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Message</th>
                    <th>Response Time</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  ${checksHtml}
                </tbody>
              </table>

              <h3>Full Health Check JSON</h3>
              <div class="json-block">
                <pre>${JSON.stringify(healthCheck, null, 2)}</pre>
              </div>

              <div class="footer">
                <p>This is an automated alert from the HospoGo health monitoring system.${isDryRun ? ' <strong>This is a DRY RUN test - no actual issues detected.</strong>' : ''}</p>
                <p>Health checks run every 10 minutes. If you continue to receive alerts, please investigate the service issues listed above.</p>
                ${isDryRun ? '<p style="color: #f59e0b; font-weight: bold;">🧪 DRY RUN MODE: This alert was triggered for testing purposes. The system is actually healthy.</p>' : ''}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email alert
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html,
    });

    if (error) {
      console.error(`[Health Monitor] ${isDryRun ? '🧪 DRY RUN: ' : ''}Failed to send alert email:`, error);
      throw error;
    }

    console.log(`[Health Monitor] ${isDryRun ? '🧪 DRY RUN: ' : ''}Alert email sent successfully to:`, ADMIN_EMAIL);
    if (isDryRun) {
      console.log('[Health Monitor] 🧪 DRY RUN completed successfully. Check your email to verify the alert format.');
    }
  } catch (error: any) {
    console.error(`[Health Monitor] ${isDryRun ? '🧪 DRY RUN: ' : ''}Error sending health alert:`, error);
    throw error;
  }
}

// If run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  monitorHealth()
    .then(() => {
      console.log('[Health Monitor] Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Health Monitor] Script failed:', error);
      process.exit(1);
    });
}
