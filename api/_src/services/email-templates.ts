/**
 * Email Templates
 * 
 * Basic HTML email templates for HospoGo
 * Uses HospoGo brand colors (#0f172a)
 */

/**
 * Get welcome email HTML
 */
export function getWelcomeEmail(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to HospoGo</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">HospoGo</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 48px;">
              <h2 style="color: #0f172a; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">Welcome to HospoGo!</h2>
              
              <p style="color: #334155; font-size: 16px; line-height: 26px; margin: 16px 0;">
                Hi ${name || 'there'},
              </p>
              
              <p style="color: #334155; font-size: 16px; line-height: 26px; margin: 16px 0;">
                We're thrilled to have you join the HospoGo community! You're now part of a platform
                that connects hospitality staff with venues for flexible work opportunities.
              </p>
              
              <p style="color: #334155; font-size: 16px; line-height: 26px; margin: 16px 0;">
                Here's what you can do next:
              </p>
              
              <ul style="color: #334155; font-size: 16px; line-height: 26px; margin: 24px 0; padding-left: 24px;">
                <li style="margin: 8px 0;">✨ Complete your profile to stand out to employers</li>
                <li style="margin: 8px 0;">🔍 Browse available shifts in your area</li>
                <li style="margin: 8px 0;">💼 Apply to jobs that match your skills</li>
                <li style="margin: 8px 0;">💬 Connect with businesses and professionals</li>
              </ul>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://hospogo.com/jobs" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">Browse Shifts</a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              
              <p style="color: #64748b; font-size: 14px; line-height: 24px; margin: 16px 0;">
                If you have any questions, feel free to reach out to our support team.
              </p>
              
              <p style="color: #64748b; font-size: 14px; line-height: 24px; margin: 16px 0;">
                Happy shifting!<br>
                The HospoGo Team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Get application received email HTML
 */
export function getApplicationEmail(
  applicantName: string,
  jobTitle: string,
  link?: string
): string {
  const applicationLink = link || 'https://hospogo.com/manage-jobs';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Application Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">HospoGo</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 48px;">
              <h2 style="color: #0f172a; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">New Application Received</h2>
              
              <p style="color: #334155; font-size: 16px; line-height: 26px; margin: 16px 0;">
                Great news! You've received a new application.
              </p>
              
              <p style="color: #334155; font-size: 16px; line-height: 26px; margin: 16px 0;">
                <strong>${applicantName}</strong> has applied for your job posting:
              </p>
              
              <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; margin: 24px 0;">
                <p style="color: #0f172a; font-size: 18px; font-weight: bold; margin: 0;">${jobTitle}</p>
              </div>
              
              <p style="color: #334155; font-size: 16px; line-height: 26px; margin: 16px 0;">
                Review the application and connect with the candidate to discuss next steps.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${applicationLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">View Application</a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              
              <p style="color: #64748b; font-size: 14px; line-height: 24px; margin: 16px 0;">
                This is an automated notification from HospoGo.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

