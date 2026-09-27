import { config } from '../config';

export interface EmailResult {
  success: boolean;
  id?: string;
  mocked?: boolean;
  error?: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send a transactional email using Resend HTTP API.
 * Gracefully falls back to structured console logging when RESEND_API_KEY is not configured
 * so development, CI, and testing run flawlessly without external API credentials.
 */
export async function sendTransactionalEmail(payload: SendEmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || 'Domain Attack Surface Scanner <onboarding@resend.dev>';

  if (!apiKey) {
    console.info(`[email:dev] RESEND_API_KEY not configured. Mocking delivery to ${payload.to}`);
    console.info(`[email:dev] Subject: ${payload.subject}`);
    console.info(`[email:dev] Content preview:\n${payload.text}`);
    return { success: true, id: 'mocked-email-' + Date.now(), mocked: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[email] Resend API error (${response.status}):`, errText);
      return { success: false, error: `Resend HTTP ${response.status}: ${errText}` };
    }

    const data = (await response.json()) as { id?: string };
    return { success: true, id: data.id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown email dispatch error';
    console.error('[email] Exception while delivering email:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Send an email verification link
 */
export async function sendVerificationEmail(to: string, token: string): Promise<EmailResult> {
  const verifyUrl = `${config.clientOrigin}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const safeVerifyUrl = escapeHtml(verifyUrl);
  const safeTo = escapeHtml(to);
  const subject = 'Verify your email — Domain Attack Surface Scanner';
  const text = `
Welcome to Domain Attack Surface Scanner.

Please verify your email address to unlock your 50 scans/hour quota allocation and persistent scan archive:
${verifyUrl}

This verification link will expire in 24 hours.

If you did not register for this account, you can safely disregard this email.
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #bae6fd; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0284c7; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; }
    .button { display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 12px 24px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; margin: 16px 0; }
    .url { font-family: monospace; font-size: 12px; color: #64748b; word-break: break-all; margin-top: 16px; }
    .footer { font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">Domain Attack Surface Scanner &middot; Account Security</div>
    <h1>Verify Your Workstation Account</h1>
    <p>Thank you for registering. Confirming your email unlocks your full registered operator allocation of <strong>50 scans per hour</strong> and enables persistent cloud recon archives.</p>
    <div>
      <a href="${safeVerifyUrl}" class="button" target="_blank" rel="noopener noreferrer">VERIFY OPERATOR EMAIL</a>
    </div>
    <p>Or paste this verification link into your browser:</p>
    <div class="url">${safeVerifyUrl}</div>
    <div class="footer">
      This link is valid for 24 hours. If you did not create this account, no further action is required.
    </div>
  </div>
</body>
</html>
`.trim();

  return sendTransactionalEmail({ to, subject, html, text });
}

/**
 * Send a password reset link
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<EmailResult> {
  const resetUrl = `${config.clientOrigin}/reset-password?token=${encodeURIComponent(token)}`;
  const safeResetUrl = escapeHtml(resetUrl);
  const safeTo = escapeHtml(to);
  const subject = 'Reset your password — Domain Attack Surface Scanner';
  const text = `
A password reset was requested for your Domain Attack Surface Scanner account.

To reset your password, visit the link below:
${resetUrl}

This link will expire in 1 hour. All active sessions will be invalidated upon successful password reset.

If you did not request this password reset, please ignore this email or review your account security.
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #bae6fd; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0284c7; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; }
    .button { display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 12px 24px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; margin: 16px 0; }
    .url { font-family: monospace; font-size: 12px; color: #64748b; word-break: break-all; margin-top: 16px; }
    .footer { font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">Domain Attack Surface Scanner &middot; Account Recovery</div>
    <h1>Password Reset Request</h1>
    <p>We received a request to reset the password for your operator account (<strong>${safeTo}</strong>). Click the button below to choose a new password:</p>
    <div>
      <a href="${safeResetUrl}" class="button" target="_blank" rel="noopener noreferrer">RESET PASSWORD</a>
    </div>
    <p>Or paste this recovery link into your browser:</p>
    <div class="url">${safeResetUrl}</div>
    <div class="footer">
      This link is valid for 1 hour. All active workstation sessions will be automatically terminated upon password update. If you did not request this change, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
`.trim();

  return sendTransactionalEmail({ to, subject, html, text });
}
