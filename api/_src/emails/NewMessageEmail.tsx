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

interface NewMessageEmailProps {
  recipientName: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
}

export const NewMessageEmail = ({
  recipientName,
  senderName,
  messagePreview,
  conversationId,
}: NewMessageEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://snipshift.com.au/brand-logo.png"
              width="120"
              height="40"
              alt="Snipshift"
              style={logo}
            />
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>New Message</Heading>
            
            <Text style={text}>
              Hi {recipientName},
            </Text>
            
            <Text style={text}>
              You have a new message from <strong>{senderName}</strong>.
            </Text>
            
            <Section style={messageBox}>
              <Text style={messagePreviewStyle}>{messagePreview}</Text>
            </Section>
            
            <Section style={buttonContainer}>
              <Link href={`https://snipshift.com.au/messages?conversation=${conversationId}`} style={button}>
                View Message
              </Link>
            </Section>
            
            <Hr style={hr} />
            
            <Text style={footer}>
              You're receiving this email because you have message notifications enabled.
            </Text>
            
            <Text style={footer}>
              Best regards,<br />
              The Snipshift Team
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

const messageBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderLeft: '4px solid #3b82f6',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const messagePreviewStyle = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  fontStyle: 'italic' as const,
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

export default NewMessageEmail;

