import { test, expect, Page } from '@playwright/test';

test.describe('Security & Access Control', () => {
  test.describe('Authentication Security', () => {
    test('should prevent brute force attacks', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Login');
      
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');
        
        await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
      }
      
      // Should show account lockout warning
      await expect(page.locator('[data-testid="account-lockout-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="account-lockout-warning"]')).toContainText('Too many failed attempts');
      
      // Should implement rate limiting
      await expect(page.locator('[data-testid="rate-limit-message"]')).toBeVisible();
    });

    test('should enforce strong password requirements', async ({ page }) => {
      await page.goto('/signup');
      
      // Test weak password
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'weak');
      await page.fill('[data-testid="first-name-input"]', 'John');
      await page.fill('[data-testid="last-name-input"]', 'Doe');
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
      
      // Test password without special characters
      await page.fill('[data-testid="password-input"]', 'Password123');
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must contain at least one special character');
      
      // Test password without numbers
      await page.fill('[data-testid="password-input"]', 'Password!');
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must contain at least one number');
    });

    test('should implement session timeout', async ({ page }) => {
      // Login first
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Simulate session timeout
      await page.evaluate(() => {
        // Set session to expired
        localStorage.setItem('sessionExpiry', Date.now() - 1000);
      });
      
      // Try to access protected page
      await page.goto('/dashboard');
      
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="session-timeout"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-timeout"]')).toContainText('Session expired');
    });

    test('should prevent session hijacking', async ({ page }) => {
      // Login first
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Get session token
      const sessionToken = await page.evaluate(() => localStorage.getItem('authToken'));
      
      // Simulate session token change (hijacking attempt)
      await page.evaluate((token) => {
        localStorage.setItem('authToken', token + 'hijacked');
      }, sessionToken);
      
      // Try to access protected page
      await page.goto('/dashboard');
      
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="security-alert"]')).toBeVisible();
    });
  });

  test.describe('Authorization & Access Control', () => {
    test('should enforce role-based access control', async ({ page }) => {
      // Login as regular user
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Try to access admin page
      await page.goto('/admin');
      
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
      await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
      await expect(page.locator('[data-testid="required-role"]')).toContainText('Admin role required');
    });

    test('should prevent privilege escalation', async ({ page }) => {
      // Login as regular user
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Try to modify user role via API
      await page.evaluate(() => {
        fetch('/api/users/role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'admin' })
        });
      });
      
      // Verify role wasn't changed
      await page.goto('/profile');
      await expect(page.locator('[data-testid="user-role"]')).not.toContainText('admin');
    });

    test('should enforce resource ownership', async ({ page }) => {
      // Login as user
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Try to access another user's profile
      await page.goto('/profile/other-user-id');
      
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
      await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
    });

    test('should validate API permissions', async ({ page }) => {
      // Login as user
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Try to access admin API endpoint
      const response = await page.evaluate(() => {
        return fetch('/api/admin/users', {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
        }).then(r => r.status);
      });
      
      expect(response).toBe(403); // Forbidden
    });
  });

  test.describe('Input Validation & Sanitization', () => {
    test('should prevent XSS attacks', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="create-post-button"]');
      
      // Try to inject XSS payload
      const xssPayload = '<script>alert("XSS")</script>';
      await page.fill('[data-testid="post-content"]', xssPayload);
      await page.click('[data-testid="publish-post"]');
      
      // Check if script was sanitized
      await expect(page.locator('[data-testid="post-content"]')).not.toContainText('<script>');
      await expect(page.locator('[data-testid="post-content"]')).toContainText('&lt;script&gt;');
    });

    test('should prevent SQL injection', async ({ page }) => {
      await page.goto('/jobs');
      
      // Try SQL injection in search
      const sqlPayload = "'; DROP TABLE users; --";
      await page.fill('[data-testid="job-search"]', sqlPayload);
      await page.click('[data-testid="search-button"]');
      
      // Should handle input safely
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      // Database should still be intact (no error messages about missing tables)
    });

    test('should validate file uploads', async ({ page }) => {
      await page.goto('/profile');
      
      // Try to upload executable file
      const fileInput = page.locator('[data-testid="profile-picture-input"]');
      await fileInput.setInputFiles({
        name: 'malicious.exe',
        mimeType: 'application/x-executable',
        buffer: Buffer.from('malicious content')
      });
      
      await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-type-error"]')).toContainText('Invalid file type');
    });

    test('should sanitize user input in forms', async ({ page }) => {
      await page.goto('/signup');
      
      // Try to inject HTML in form fields
      await page.fill('[data-testid="first-name-input"]', '<img src=x onerror=alert("XSS")>');
      await page.fill('[data-testid="last-name-input"]', 'Doe');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="register-button"]');
      
      // Check if HTML was sanitized
      await expect(page.locator('[data-testid="first-name-input"]')).not.toContainText('<img');
    });
  });

  test.describe('Data Protection & Privacy', () => {
    test('should encrypt sensitive data', async ({ page }) => {
      // Login and check if sensitive data is encrypted
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Check if password is not stored in plain text
      const storedData = await page.evaluate(() => {
        return localStorage.getItem('userData');
      });
      
      expect(storedData).not.toContain('SecurePassword123!');
    });

    test('should implement data anonymization', async ({ page }) => {
      await page.goto('/analytics');
      
      // Check if user data is anonymized in analytics
      await expect(page.locator('[data-testid="anonymized-data"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-id"]')).not.toContainText('user@example.com');
    });

    test('should enforce data retention policies', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="privacy-settings"]');
      
      await expect(page.locator('[data-testid="data-retention-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="data-retention-info"]')).toContainText('Data will be deleted after');
    });

    test('should provide data export functionality', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="privacy-settings"]');
      
      await page.click('[data-testid="export-data"]');
      await expect(page.locator('[data-testid="data-export-modal"]')).toBeVisible();
      
      await page.click('[data-testid="request-export"]');
      await expect(page.locator('text=Data export requested')).toBeVisible();
    });
  });

  test.describe('API Security', () => {
    test('should implement rate limiting on API endpoints', async ({ page }) => {
      // Make multiple rapid API calls
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(page.evaluate(() => {
          return fetch('/api/jobs', { method: 'GET' }).then(r => r.status);
        }));
      }
      
      const responses = await Promise.all(promises);
      
      // Should eventually get rate limited
      expect(responses.some(status => status === 429)).toBeTruthy();
    });

    test('should validate API request headers', async ({ page }) => {
      // Make request without proper headers
      const response = await page.evaluate(() => {
        return fetch('/api/jobs', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
            // Missing Authorization header
          }
        }).then(r => r.status);
      });
      
      expect(response).toBe(401); // Unauthorized
    });

    test('should prevent CSRF attacks', async ({ page }) => {
      // Login first
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Try to make request without CSRF token
      const response = await page.evaluate(() => {
        return fetch('/api/profile/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('authToken')
            // Missing CSRF token
          },
          body: JSON.stringify({ name: 'Hacked' })
        }).then(r => r.status);
      });
      
      expect(response).toBe(403); // Forbidden
    });

    test('should implement API versioning', async ({ page }) => {
      // Try to access API without version
      const response = await page.evaluate(() => {
        return fetch('/api/jobs', { method: 'GET' }).then(r => r.status);
      });
      
      expect(response).toBe(400); // Bad Request - version required
      
      // Try with proper version
      const versionedResponse = await page.evaluate(() => {
        return fetch('/api/v1/jobs', { method: 'GET' }).then(r => r.status);
      });
      
      expect(versionedResponse).toBe(200); // OK
    });
  });

  test.describe('Content Security Policy', () => {
    test('should enforce CSP headers', async ({ page }) => {
      const response = await page.goto('/');
      
      // Check if CSP header is present
      const cspHeader = response?.headers()['content-security-policy'];
      expect(cspHeader).toBeDefined();
      expect(cspHeader).toContain('script-src');
    });

    test('should prevent inline script execution', async ({ page }) => {
      // Try to execute inline script
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.textContent = 'window.inlineScriptExecuted = true;';
        document.head.appendChild(script);
      });
      
      // Check if inline script was blocked
      const inlineScriptExecuted = await page.evaluate(() => {
        return window.inlineScriptExecuted;
      });
      
      expect(inlineScriptExecuted).toBeUndefined();
    });

    test('should restrict external resource loading', async ({ page }) => {
      // Try to load external resource
      await page.evaluate(() => {
        const img = document.createElement('img');
        img.src = 'https://malicious-site.com/image.jpg';
        document.body.appendChild(img);
      });
      
      // Check if external resource was blocked
      const externalResourceLoaded = await page.evaluate(() => {
        const img = document.querySelector('img[src*="malicious-site"]');
        return img && img.complete;
      });
      
      expect(externalResourceLoaded).toBeFalsy();
    });
  });

  test.describe('Security Headers', () => {
    test('should include security headers', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // Check for security headers
      expect(headers['x-frame-options']).toBeDefined();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-xss-protection']).toBeDefined();
      expect(headers['strict-transport-security']).toBeDefined();
    });

    test('should prevent clickjacking', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // Check X-Frame-Options header
      expect(headers['x-frame-options']).toBe('DENY');
    });

    test('should enforce HTTPS', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // Check HSTS header
      expect(headers['strict-transport-security']).toContain('max-age');
    });
  });

  test.describe('Vulnerability Testing', () => {
    test('should prevent directory traversal', async ({ page }) => {
      // Try directory traversal attack
      const response = await page.evaluate(() => {
        return fetch('/api/files/../../../etc/passwd').then(r => r.status);
      });
      
      expect(response).toBe(403); // Forbidden
    });

    test('should prevent command injection', async ({ page }) => {
      await page.goto('/jobs');
      
      // Try command injection in search
      await page.fill('[data-testid="job-search"]', 'test; rm -rf /');
      await page.click('[data-testid="search-button"]');
      
      // Should handle input safely
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    });

    test('should prevent path traversal in file uploads', async ({ page }) => {
      await page.goto('/profile');
      
      // Try path traversal in filename
      const fileInput = page.locator('[data-testid="profile-picture-input"]');
      await fileInput.setInputFiles({
        name: '../../../etc/passwd',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      await expect(page.locator('[data-testid="file-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-name-error"]')).toContainText('Invalid filename');
    });

    test('should prevent SSRF attacks', async ({ page }) => {
      // Try SSRF attack
      const response = await page.evaluate(() => {
        return fetch('/api/proxy?url=http://localhost:22').then(r => r.status);
      });
      
      expect(response).toBe(403); // Forbidden
    });
  });

  test.describe('Security Monitoring', () => {
    test('should log security events', async ({ page }) => {
      const securityEvents: string[] = [];
      
      page.on('console', msg => {
        if (msg.text().includes('SECURITY')) {
          securityEvents.push(msg.text());
        }
      });
      
      // Trigger security event (failed login)
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      // Check if security event was logged
      expect(securityEvents.length).toBeGreaterThan(0);
      expect(securityEvents.some(event => event.includes('FAILED_LOGIN'))).toBeTruthy();
    });

    test('should detect suspicious activity', async ({ page }) => {
      // Login first
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Simulate suspicious activity (rapid API calls)
      for (let i = 0; i < 50; i++) {
        await page.evaluate(() => {
          fetch('/api/jobs', { method: 'GET' });
        });
      }
      
      // Should show security warning
      await expect(page.locator('[data-testid="security-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="security-warning"]')).toContainText('Suspicious activity detected');
    });

    test('should implement security alerts', async ({ page }) => {
      // Simulate security alert
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('securityAlert', {
          detail: { type: 'BRUTE_FORCE', ip: '192.168.1.1' }
        }));
      });
      
      await expect(page.locator('[data-testid="security-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="security-alert"]')).toContainText('Security alert');
    });
  });
});
