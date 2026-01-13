/**
 * Enterprise Lead Email Templates
 * 
 * React Email templates for enterprise lead notifications
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface EnterpriseLeadNotificationProps {
  contactName: string;
  email: string;
  company: string;
  locations: number;
  message?: string;
  phone?: string;
}

/**
 * Internal notification email sent to admin when new enterprise lead is received
 */
export function EnterpriseLeadNotification({
  contactName,
  email,
  company,
  locations,
  message,
  phone,
}: EnterpriseLeadNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>🚀 New Enterprise Lead: {company}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>🚀 New Enterprise Lead</Heading>
          
          <Section style={section}>
            <Text style={label}>Company</Text>
            <Text style={value}>{company}</Text>
          </Section>

          <Section style={section}>
            <Text style={label}>Contact Name</Text>
            <Text style={value}>{contactName}</Text>
          </Section>

          <Section style={section}>
            <Text style={label}>Email</Text>
            <Text style={value}>{email}</Text>
          </Section>

          {phone && (
            <Section style={section}>
              <Text style={label}>Phone</Text>
              <Text style={value}>{phone}</Text>
            </Section>
          )}

          <Section style={section}>
            <Text style={label}>Number of Locations</Text>
            <Text style={value}>{locations}</Text>
          </Section>

          {message && (
            <Section style={section}>
              <Text style={label}>Message</Text>
              <Text style={messageText}>{message}</Text>
            </Section>
          )}

          <Hr style={hr} />
          
          <Text style={footer}>
            This lead was submitted via the HospoGo Enterprise Contact Form.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

interface EnterpriseLeadThankYouProps {
  contactName: string;
  company: string;
}

/**
 * Thank you email sent to the lead after submission
 */
export function EnterpriseLeadThankYou({
  contactName,
  company,
}: EnterpriseLeadThankYouProps) {
  return (
    <Html>
      <Head />
      <Preview>Thank you for your interest in HospoGo Enterprise</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Thank You for Reaching Out!</Heading>
          
          <Text style={text}>
            Hi {contactName},
          </Text>

          <Text style={text}>
            Thank you for your interest in HospoGo Enterprise for {company}. 
            We've received your inquiry and our partnerships manager will be in touch shortly.
          </Text>

          <Text style={text}>
            In the meantime, here's what you can expect:
          </Text>

          <Section style={listSection}>
            <Text style={listItem}>✓ A response within 1-2 business days</Text>
            <Text style={listItem}>✓ A personalized demo of our enterprise features</Text>
            <Text style={listItem}>✓ Custom pricing based on your needs</Text>
          </Section>

          <Text style={text}>
            If you have any urgent questions, feel free to reply to this email.
          </Text>

          <Hr style={hr} />
          
          <Text style={footer}>
            Best regards,<br />
            The HospoGo Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
  borderRadius: '8px',
};

const heading = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  marginBottom: '24px',
};

const section = {
  marginBottom: '16px',
};

const label = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const value = {
  color: '#1a1a1a',
  fontSize: '16px',
  margin: '0',
};

const messageText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  marginBottom: '16px',
};

const listSection = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '16px 20px',
  marginBottom: '24px',
};

const listItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.8',
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  marginTop: '32px',
  marginBottom: '24px',
};

const footer = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '1.5',
};

export default EnterpriseLeadNotification;
