import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Img,
  Link,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface AccountRestoredEmailProps {
  userName: string;
  currentStrikes: number;
  shiftsUntilStrikeRemoval: number;
}

/**
 * Account Restored Email Template
 * 
 * Sent after 48-hour suspension period expires.
 * Notifies Pro that their account has been reactivated.
 */
export const AccountRestoredEmail = ({
  userName,
  currentStrikes,
  shiftsUntilStrikeRemoval,
}: AccountRestoredEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSuccess}>
            <Img
              src="https://hospogo.com/brand-logo.png"
              width="120"
              height="40"
              alt="HospoGo"
              style={logo}
            />
          </Section>

          <Section style={successBanner}>
            <Text style={successIcon}>✓</Text>
            <Heading style={successHeading}>Account Restored</Heading>
            <Text style={successSubtext}>
              Your suspension period has ended
            </Text>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hi {userName || 'there'},
            </Text>

            <Text style={text}>
              Great news! Your HospoGo account has been <strong>reactivated</strong>.
              You can now accept shifts and apply to jobs again.
            </Text>

            <Section style={statsContainer}>
              <Section style={statBox}>
                <Text style={statNumber}>{currentStrikes}</Text>
                <Text style={statLabel}>Current Strikes</Text>
              </Section>
              <Section style={statBoxHighlight}>
                <Text style={statNumberHighlight}>{shiftsUntilStrikeRemoval}</Text>
                <Text style={statLabelHighlight}>Shifts to Remove 1 Strike</Text>
              </Section>
            </Section>

            <Section style={tipsBox}>
              <Text style={tipsTitle}>💡 Tips to Stay in Good Standing</Text>
              <Section style={tipsList}>
                <Text style={tipItem}>
                  <strong>✓ Only accept shifts you can commit to</strong><br />
                  Review your schedule before accepting any shift.
                </Text>
                <Text style={tipItem}>
                  <strong>✓ Cancel early if needed</strong><br />
                  Need to cancel? Do it at least 4 hours before the shift starts.
                </Text>
                <Text style={tipItem}>
                  <strong>✓ Communicate proactively</strong><br />
                  Let the business know if you're running late or have an emergency.
                </Text>
                <Text style={tipItem}>
                  <strong>✓ Complete shifts successfully</strong><br />
                  Every 5 completed shifts removes 1 strike from your record.
                </Text>
              </Section>
            </Section>

            <Hr style={hr} />

            <Text style={ctaText}>
              Ready to get back to work? Browse available shifts in your area.
            </Text>

            <Section style={buttonContainer}>
              <Link href="https://hospogo.com/jobs" style={button}>
                Browse Available Shifts
              </Link>
            </Section>

            <Text style={supportText}>
              If you have questions about your account status, our support team is
              here to help.
            </Text>

            <Section style={buttonContainer}>
              <Link href="https://hospogo.com/support" style={buttonSecondary}>
                Contact Support
              </Link>
            </Section>

            <Text style={footer}>
              Welcome back!<br />
              The HospoGo Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0 0 48px',
  marginBottom: '64px',
};

const headerSuccess = {
  padding: '32px 24px',
  backgroundColor: '#059669',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
};

const successBanner = {
  backgroundColor: '#ecfdf5',
  padding: '32px 24px',
  textAlign: 'center' as const,
  borderBottom: '2px solid #a7f3d0',
};

const successIcon = {
  fontSize: '48px',
  color: '#059669',
  backgroundColor: '#d1fae5',
  width: '64px',
  height: '64px',
  lineHeight: '64px',
  borderRadius: '50%',
  display: 'inline-block',
  margin: '0 0 16px 0',
};

const successHeading = {
  color: '#059669',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const successSubtext = {
  color: '#047857',
  fontSize: '16px',
  margin: '0',
};

const content = {
  padding: '32px 48px',
};

const text = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const statsContainer = {
  display: 'flex',
  gap: '16px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const statBox = {
  flex: '1',
  backgroundColor: '#fff7ed',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #fed7aa',
};

const statBoxHighlight = {
  flex: '1',
  backgroundColor: '#ecfdf5',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #a7f3d0',
};

const statNumber = {
  color: '#c2410c',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const statNumberHighlight = {
  color: '#059669',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const statLabel = {
  color: '#9a3412',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '4px 0 0 0',
  letterSpacing: '0.5px',
};

const statLabelHighlight = {
  color: '#047857',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '4px 0 0 0',
  letterSpacing: '0.5px',
};

const tipsBox = {
  backgroundColor: '#f0f9ff',
  padding: '24px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #bae6fd',
};

const tipsTitle = {
  color: '#0369a1',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const tipsList = {
  margin: '0',
};

const tipItem = {
  color: '#0c4a6e',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '12px 0',
  padding: '12px 16px',
  backgroundColor: '#ffffff',
  borderRadius: '6px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const ctaText = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const buttonContainer = {
  margin: '24px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#059669',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
};

const buttonSecondary = {
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  color: '#334155',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
  border: '1px solid #e2e8f0',
};

const supportText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const footer = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
  textAlign: 'center' as const,
};

export default AccountRestoredEmail;
