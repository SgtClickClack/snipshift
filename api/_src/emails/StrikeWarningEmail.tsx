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

interface StrikeWarningEmailProps {
  userName: string;
  strikesAdded: number;
  totalStrikes: number;
  reason: 'late_cancellation' | 'no_show' | 'other';
  hoursNotice?: number;
  shiftTitle?: string;
  shiftDate?: string;
}

/**
 * Strike Warning Email Template
 * 
 * Sent immediately when a Pro receives strikes via late cancellation.
 * Warns them about their account status.
 */
export const StrikeWarningEmail = ({
  userName,
  strikesAdded,
  totalStrikes,
  reason,
  hoursNotice,
  shiftTitle,
  shiftDate,
}: StrikeWarningEmailProps) => {
  const getReasonText = () => {
    switch (reason) {
      case 'late_cancellation':
        return hoursNotice !== undefined
          ? `cancelling a shift with only ${hoursNotice.toFixed(1)} hours notice (minimum 4 hours required)`
          : 'cancelling a shift with insufficient notice';
      case 'no_show':
        return 'not showing up to a confirmed shift';
      default:
        return 'a policy violation';
    }
  };

  const getStatusLevel = () => {
    if (totalStrikes >= 3) return { label: 'Critical', color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fecaca' };
    if (totalStrikes === 2) return { label: 'At Risk', color: '#ea580c', bgColor: '#fff7ed', borderColor: '#fed7aa' };
    return { label: 'Warning', color: '#ca8a04', bgColor: '#fefce8', borderColor: '#fef08a' };
  };

  const status = getStatusLevel();

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={headerWarning}>
            <Img
              src="https://hospogo.com/brand-logo.png"
              width="120"
              height="40"
              alt="HospoGo"
              style={logo}
            />
          </Section>

          <Section style={{
            ...statusBanner,
            backgroundColor: status.bgColor,
            borderBottom: `2px solid ${status.borderColor}`,
          }}>
            <Text style={statusIcon}>⚡</Text>
            <Heading style={{ ...statusHeading, color: status.color }}>
              Strike Warning
            </Heading>
            <Text style={{ ...statusLabel, color: status.color }}>
              Account Status: {status.label}
            </Text>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hi {userName || 'there'},
            </Text>

            <Text style={text}>
              You've received a strike on your HospoGo account for {getReasonText()}.
            </Text>

            {(shiftTitle || shiftDate) && (
              <Section style={shiftDetails}>
                <Text style={detailLabel}>Affected Shift:</Text>
                <Text style={detailValue}>
                  {shiftTitle && <>{shiftTitle}<br /></>}
                  {shiftDate && <>Scheduled: {shiftDate}</>}
                </Text>
              </Section>
            )}

            <Section style={statsContainer}>
              <Section style={statBox}>
                <Text style={statNumber}>+{strikesAdded}</Text>
                <Text style={statLabel}>Strike{strikesAdded > 1 ? 's' : ''} Added</Text>
              </Section>
              <Section style={{
                ...statBoxHighlight,
                backgroundColor: status.bgColor,
                border: `1px solid ${status.borderColor}`,
              }}>
                <Text style={{ ...statNumberHighlight, color: status.color }}>{totalStrikes}</Text>
                <Text style={statLabel}>Total Strikes</Text>
              </Section>
            </Section>

            <Section style={infoBox}>
              <Text style={infoTitle}>📊 How Strikes Work</Text>
              <Section style={infoList}>
                <Text style={infoItem}>• <strong>0 strikes:</strong> Highly Reliable status</Text>
                <Text style={infoItem}>• <strong>1 strike:</strong> Good standing</Text>
                <Text style={infoItem}>• <strong>2+ strikes:</strong> At Risk status</Text>
                <Text style={infoItem}>• <strong>No-show:</strong> +2 strikes + 48h suspension</Text>
              </Section>
              <Text style={infoNote}>
                Complete 5 successful shifts to remove 1 strike.
              </Text>
            </Section>

            {totalStrikes >= 2 && (
              <Section style={warningBox}>
                <Text style={warningTitle}>⚠️ Important Notice</Text>
                <Text style={warningText}>
                  Your account is now in "At Risk" status. Further violations may result
                  in temporary or permanent suspension. Please ensure you can commit to
                  shifts before accepting them.
                </Text>
              </Section>
            )}

            <Hr style={hr} />

            <Text style={helpText}>
              Need to manage your availability? Update your schedule to prevent
              conflicts and avoid future strikes.
            </Text>

            <Section style={buttonContainer}>
              <Link href="https://hospogo.com/profile/schedule" style={button}>
                Manage Schedule
              </Link>
            </Section>

            <Text style={footer}>
              Questions? Contact our support team at{' '}
              <Link href="mailto:support@hospogo.com" style={link}>
                support@hospogo.com
              </Link>
            </Text>

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

const headerWarning = {
  padding: '32px 24px',
  backgroundColor: '#ea580c',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
};

const statusBanner = {
  padding: '24px',
  textAlign: 'center' as const,
};

const statusIcon = {
  fontSize: '40px',
  margin: '0 0 8px 0',
};

const statusHeading = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const statusLabel = {
  fontSize: '14px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
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
  borderLeft: '4px solid #ea580c',
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
  backgroundColor: '#f8fafc',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const statBoxHighlight = {
  flex: '1',
  padding: '20px',
  borderRadius: '8px',
};

const statNumber = {
  color: '#334155',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const statNumberHighlight = {
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const statLabel = {
  color: '#64748b',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '4px 0 0 0',
  letterSpacing: '0.5px',
};

const infoBox = {
  backgroundColor: '#f0f9ff',
  padding: '20px 24px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #bae6fd',
};

const infoTitle = {
  color: '#0369a1',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const infoList = {
  margin: '0 0 12px 0',
};

const infoItem = {
  color: '#0c4a6e',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '4px 0',
};

const infoNote = {
  color: '#0369a1',
  fontSize: '13px',
  fontStyle: 'italic',
  margin: '0',
};

const warningBox = {
  backgroundColor: '#fef2f2',
  padding: '16px 20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #fecaca',
};

const warningTitle = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const warningText = {
  color: '#991b1b',
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

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const link = {
  color: '#0369a1',
  textDecoration: 'underline',
};
