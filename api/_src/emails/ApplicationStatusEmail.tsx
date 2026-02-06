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

interface ApplicationStatusEmailProps {
  userName: string;
  jobTitle: string;
  shopName?: string;
  status: 'accepted' | 'rejected';
  applicationDate: string;
}

export const ApplicationStatusEmail = ({
  userName,
  jobTitle,
  shopName,
  status,
  applicationDate,
}: ApplicationStatusEmailProps) => {
  const isAccepted = status === 'accepted';
  
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://hospogo.com/brand-logo.png"
              width="120"
              height="40"
              alt="HospoGo"
              style={logo}
            />
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>
              {isAccepted ? '🎉 Congratulations!' : 'Application Update'}
            </Heading>
            
            <Text style={text}>
              Hi {userName},
            </Text>
            
            <Text style={text}>
              {isAccepted ? (
                <>
                  Great news! Your application for <strong>{jobTitle}</strong>
                  {shopName && ` at ${shopName}`} has been <strong style={acceptedStyle}>accepted</strong>!
                </>
              ) : (
                <>
                  Thank you for your interest. Unfortunately, your application for <strong>{jobTitle}</strong>
                  {shopName && ` at ${shopName}`} was not selected at this time.
                </>
              )}
            </Text>
            
            {isAccepted && (
              <>
                <Text style={text}>
                  The employer will be in touch with you soon to discuss next steps.
                </Text>
                
                <Section style={buttonContainer}>
                  <Link href="https://hospogo.com/my-applications" style={button}>
                    View Application
                  </Link>
                </Section>
              </>
            )}
            
            <Section style={detailsBox}>
              <Text style={detailsLabel}>Application Details:</Text>
              <Text style={detailsText}>Job: {jobTitle}</Text>
              {shopName && <Text style={detailsText}>Shop: {shopName}</Text>}
              <Text style={detailsText}>Applied: {new Date(applicationDate).toLocaleDateString()}</Text>
              <Text style={detailsText}>Status: <strong>{status.toUpperCase()}</strong></Text>
            </Section>
            
            {!isAccepted && (
              <Text style={text}>
                Don't be discouraged! Keep applying to other opportunities that match your skills.
                There are many shifts available on HospoGo.
              </Text>
            )}
            
            <Hr style={hr} />
            
            <Text style={footer}>
              Keep checking HospoGo for new opportunities!
            </Text>
            
            <Text style={footer}>
              Best regards,<br />
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
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '32px 24px',
  backgroundColor: '#0f172a',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
};

const content = {
  padding: '0 48px',
};

const h1 = {
  color: '#0f172a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
};

const text = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const acceptedStyle = {
  color: '#10b981',
};

const buttonContainer = {
  margin: '32px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const detailsBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
};

const detailsLabel = {
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const detailsText = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const footer = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
};

