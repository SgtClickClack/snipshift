import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as emailService from '../../services/email.service.js';

// Mock Resend
vi.mock('../../lib/resend.js', () => ({
  resend: {
    emails: {
      send: vi.fn(),
    },
  },
  isEmailServiceAvailable: vi.fn(),
}));

// Mock React Email Render
vi.mock('@react-email/render', () => ({
  render: vi.fn((component: any) => `<html>Mock Rendered HTML for ${JSON.stringify(component)}</html>`),
}));

describe('Email Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Default to available service
    const resendLib = await import('../../lib/resend.js');
    vi.mocked(resendLib.isEmailServiceAvailable).mockReturnValue(true);
  });

  describe('sendWelcomeEmail', () => {
    it('should send a welcome email successfully', async () => {
      const resendLib = await import('../../lib/resend.js');
      vi.mocked(resendLib.resend!.emails.send).mockResolvedValue({ data: { id: 'email_123' }, error: null });

      const result = await emailService.sendWelcomeEmail('test@example.com', 'Test User');

      expect(result).toBe(true);
      expect(resendLib.resend!.emails.send).toHaveBeenCalledWith({
        from: expect.stringContaining('Snipshift'),
        to: 'test@example.com',
        subject: 'Welcome to Snipshift!',
        html: expect.stringContaining('Mock Rendered HTML'),
      });
    });

    it('should return false if email service is unavailable', async () => {
      const resendLib = await import('../../lib/resend.js');
      vi.mocked(resendLib.isEmailServiceAvailable).mockReturnValue(false);

      const result = await emailService.sendWelcomeEmail('test@example.com', 'Test User');

      expect(result).toBe(false);
      expect(resendLib.resend!.emails.send).not.toHaveBeenCalled();
    });

    it('should handle send failures gracefully', async () => {
      const resendLib = await import('../../lib/resend.js');
      vi.mocked(resendLib.resend!.emails.send).mockResolvedValue({ data: null, error: { message: 'Limit reached' } as any });

      const result = await emailService.sendWelcomeEmail('test@example.com', 'Test User');

      expect(result).toBe(false);
    });

    it('should catch exceptions', async () => {
        const resendLib = await import('../../lib/resend.js');
        vi.mocked(resendLib.resend!.emails.send).mockRejectedValue(new Error('Network Error'));
  
        const result = await emailService.sendWelcomeEmail('test@example.com', 'Test User');
  
        expect(result).toBe(false);
    });
  });

  describe('sendJobAlertEmail', () => {
    it('should send job alert with correct data', async () => {
      const resendLib = await import('../../lib/resend.js');
      vi.mocked(resendLib.resend!.emails.send).mockResolvedValue({ data: { id: 'email_123' }, error: null });

      const result = await emailService.sendJobAlertEmail(
        'user@test.com',
        'User',
        'Barber',
        'Shop A',
        '30',
        'NYC',
        '2025-01-01',
        'job_1'
      );

      expect(result).toBe(true);
      expect(resendLib.resend!.emails.send).toHaveBeenCalledWith(expect.objectContaining({
        subject: expect.stringContaining('New shift posted: Barber'),
      }));
    });
  });

  describe('sendApplicationStatusEmail', () => {
      it('should send acceptance email', async () => {
        const resendLib = await import('../../lib/resend.js');
        vi.mocked(resendLib.resend!.emails.send).mockResolvedValue({ data: { id: 'email_123' }, error: null });

        const result = await emailService.sendApplicationStatusEmail(
            'u@test.com',
            'User',
            'Job 1',
            'Shop',
            'accepted',
            '2025-01-01'
        );

        expect(result).toBe(true);
        expect(resendLib.resend!.emails.send).toHaveBeenCalledWith(expect.objectContaining({
            subject: expect.stringContaining('accepted'),
        }));
      });
  });
});

