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

interface SuspensionAlertEmailProps {
  userName: string;
  strikesAdded: number;
  totalStrikes: number;
  suspendedUntil: string;
  shiftTitle?: string;
  shiftDate?: string;
}

/**
 * Suspension Alert Email Template
 * 
 * Sent immediately when a Pro receives strikes that result in a 48h suspension.
 * Triggered by no-show events (+2 strikes).
 */
export const SuspensionAlertEmail = ({
  userName,
  strikesAdded,
  totalStrikes,
  suspendedUntil,
  shiftTitle,
  shiftDate,
}: SuspensionAlertEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={headerAlert}>
            <Img
              src="https://hospogo.com/brand-logo.png"
              width="120"
              height="40"
              alt="HospoGo"
              style={logo}
            />
          </Section>

          <Section style={alertBanner}>
            <Text style={alertIcon}>⚠️</Text>
            <Heading style={alertHeading}>Account Suspended</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hi {userName || 'there'},
            </Text>

            <Text style={text}>
              Your HospoGo account has been <strong>temporarily suspended</strong> due to a
              no-show violation.
            </Text>

            {(shiftTitle || shiftDate) && (
              <Section style={shiftDetails}>
                <Text style={detailLabel}>Missed Shift:</Text>
                <Text style={detailValue}>
                  {shiftTitle && <>{shiftTitle}<br /></>}
                  {shiftDate && <>Scheduled: {shiftDate}</>}
                </Text>
              </Section>
            )}

            <Section style={statsContainer}>
              <Section style={statBox}>
                <Text style={statNumber}>+{strikesAdded}</Text>
                <Text style={statLabel}>Strikes Added</Text>
              </Section>
              <Section style={statBox}>
                <Text style={statNumberHighlight}>{totalStrikes}</Text>
                <Text style={statLabel}>Total Strikes</Text>
              </Section>
            </Section>

            <Section style={suspensionBox}>
              <Text style={suspensionTitle}>Suspension Period</Text>
              <Text style={suspensionDetail}>
                Your account is suspended until:
              </Text>
              <Text style={suspensionDate}>{suspendedUntil}</Text>
              <Text style={suspensionNote}>
                During this time, you cannot accept new shifts or apply to jobs.
              </Text>
            </Section>

            <Section style={warningBox}>
              <Text style={warningTitle}>⚠️ Important</Text>
              <Text style={warningText}>
                Repeated no-shows may result in permanent account suspension.
                Please ensure you can commit to shifts before accepting them.
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={helpText}>
              If you believe this was an error or had an emergency, please contact
              our support team immediately.
            </Text>

            <Section style={buttonContainer}>
              <Link href="https://hospogo.com/support" style={buttonSecondary}>
                Contact Support
              </Link>
            </Section>

            <Text style={footer}>
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

const headerAlert = {
  padding: '32px 24px',
  backgroundColor: '#dc2626',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
};

const alertBanner = {
  backgroundColor: '#fef2f2',
  padding: '24px',
  textAlign: 'center' as const,
  borderBottom: '2px solid #fecaca',
};

const alertIcon = {
  fontSize: '48px',
  margin: '0 0 8px 0',
};

const alertHeading = {
  color: '#dc2626',
  fontSize: '28px',
  fontWeight: 'bold',
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

const shiftDetails = {
  backgroundColor: '#f8fafc',
  padding: '16px 20px',
  borderRadius: '8px',
  margin: '24px 0',
  borderLeft: '4px solid #dc2626',
};

const detailLabel = {
  color: '#64748b',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px 0',
  letterSpacing: '0.5px',
};

const detailValue = {
  color: '#0f172a',
  fontSize: '16px',
  margin: '0',
  lineHeight: '24px',
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

const statNumber = {
  color: '#c2410c',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const statNumberHighlight = {
  color: '#dc2626',
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

const suspensionBox = {
  backgroundColor: '#fef2f2',
  padding: '24px',
  borderRadius: '8px',
  margin: '24px 0',
  textAlign: 'center' as const,
  border: '1px solid #fecaca',
};

const suspensionTitle = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 8px 0',
};

const suspensionDetail = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0 0 8px 0',
};

const suspensionDate = {
  color: '#0f172a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const suspensionNote = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0',
};

const warningBox = {
  backgroundColor: '#fffbeb',
  padding: '16px 20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #fde68a',
};

const warningTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const warningText = {
  color: '#78350f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const helpText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const buttonContainer = {
  margin: '24px 0',
  textAlign: 'center' as const,
};

const buttonSecondary = {
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
  border: '1px solid #e2e8f0',
};

const footer = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

export default SuspensionAlertEmail;
