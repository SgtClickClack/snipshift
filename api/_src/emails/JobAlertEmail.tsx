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

interface JobAlertEmailProps {
  userName: string;
  jobTitle: string;
  shopName?: string;
  payRate: string;
  location: string;
  date: string;
  jobId: string;
}

export const JobAlertEmail = ({
  userName,
  jobTitle,
  shopName,
  payRate,
  location,
  date,
  jobId,
}: JobAlertEmailProps) => {
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
            <Heading style={h1}>New Shift Posted Near You!</Heading>
            
            <Text style={text}>
              Hi {userName},
            </Text>
            
            <Text style={text}>
              A new shift matching your preferences has been posted:
            </Text>
            
            <Section style={jobBox}>
              <Text style={jobTitleStyle}>{jobTitle}</Text>
              {shopName && <Text style={jobDetail}>📍 {shopName}</Text>}
              <Text style={jobDetail}>💰 ${payRate}/hr</Text>
              <Text style={jobDetail}>📍 {location}</Text>
              <Text style={jobDetail}>📅 {new Date(date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</Text>
            </Section>
            
            <Section style={buttonContainer}>
              <Link href={`https://hospogo.com/jobs/${jobId}`} style={button}>
                View Shift Details
              </Link>
            </Section>
            
            <Text style={text}>
              Don't wait too long - great shifts get filled quickly!
            </Text>
            
            <Hr style={hr} />
            
            <Text style={footer}>
              You're receiving this because you have job alerts enabled for your area.
            </Text>
            
            <Text style={footer}>
              Happy shifting!<br />
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

const jobBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
};

const jobTitleStyle = {
  color: '#0f172a',
  fontSize: '20px',
  fontWeight: 'bold' as const,
  margin: '0 0 12px 0',
};

const jobDetail = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '4px 0',
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

export default JobAlertEmail;

