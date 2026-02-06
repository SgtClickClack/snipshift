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

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
}

export const WelcomeEmail = ({ userName, userEmail }: WelcomeEmailProps) => {
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
            <Heading style={h1}>Welcome to HospoGo!</Heading>
            
            <Text style={text}>
              Hi {userName || 'there'},
            </Text>
            
            <Text style={text}>
              We're thrilled to have you join the HospoGo community! You're now part of a platform
              that connects hospitality staff with venues for flexible work opportunities.
            </Text>
            
            <Text style={text}>
              Here's what you can do next:
            </Text>
            
            <Section style={list}>
              <Text style={listItem}>✨ Complete your profile to stand out to employers</Text>
              <Text style={listItem}>🔍 Browse available shifts in your area</Text>
              <Text style={listItem}>💼 Apply to jobs that match your skills</Text>
              <Text style={listItem}>💬 Connect with businesses and professionals</Text>
            </Section>
            
            <Section style={buttonContainer}>
              <Link href="https://hospogo.com/jobs" style={button}>
                Browse Shifts
              </Link>
            </Section>
            
            <Hr style={hr} />
            
            <Text style={footer}>
              If you have any questions, feel free to reach out to our support team.
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

const list = {
  margin: '24px 0',
  paddingLeft: '0',
};

const listItem = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '8px 0',
  paddingLeft: '24px',
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

