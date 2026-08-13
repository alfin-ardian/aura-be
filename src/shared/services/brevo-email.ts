import axios, { type AxiosError } from 'axios';
import https from 'node:https';
import { appConfig } from '../../config/index.js';
import { logger } from '../utils/logger.js';

export interface SendEmailInput {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

/** Force IPv4 — many VPS hosts advertise broken IPv6; Brevo AAAA then times out. */
const brevoHttpsAgent = new https.Agent({ family: 4, keepAlive: true });

const MAX_ATTEMPTS = 3;

function isRetryable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const err = error as AxiosError;
  const code = err.code ?? '';
  if (['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENETUNREACH', 'EAI_AGAIN'].includes(code)) {
    return true;
  }
  const status = err.response?.status;
  return status === 429 || (typeof status === 'number' && status >= 500);
}

/**
 * Transactional email via Brevo (Sendinblue) REST API.
 * No-ops with a warning when BREVO_API_KEY is missing (local/dev without mail).
 */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<boolean> {
  const { apiKey, senderEmail, senderName } = appConfig.brevo;
  if (!apiKey || !senderEmail) {
    logger.warn('Brevo not configured — email skipped', {
      to: input.toEmail,
      subject: input.subject,
    });
    return false;
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { email: senderEmail, name: senderName },
          to: [{ email: input.toEmail, name: input.toName || input.toEmail }],
          subject: input.subject,
          htmlContent: input.htmlContent,
          textContent: input.textContent,
        },
        {
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'api-key': apiKey,
          },
          timeout: 20_000,
          httpsAgent: brevoHttpsAgent,
          // Prefer IPv4 at the axios/request layer as well.
          family: 4,
        },
      );
      logger.info('Brevo email sent', { to: input.toEmail, subject: input.subject, attempt });
      return true;
    } catch (error) {
      lastError = error;
      logger.error('Brevo email failed', {
        to: input.toEmail,
        attempt,
        error: error instanceof Error ? error.message : 'unknown',
      });
      if (attempt < MAX_ATTEMPTS && isRetryable(error)) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Brevo email failed');
}

export function buildActivationEmail(params: {
  name: string;
  activateUrl: string;
}): { subject: string; htmlContent: string; textContent: string } {
  const year = new Date().getFullYear();
  const subject = 'Aktifkan akun Afiliator AuraAI';
  const textContent = `Halo ${params.name},\n\nTerima kasih sudah mendaftar sebagai Afiliator AuraAI.\nAktifkan akunmu lewat tautan ini (berlaku 24 jam):\n${params.activateUrl}\n\nJika kamu tidak mendaftar, abaikan email ini.\n\n© ${year} AuraAI. All rights reserved.`;
  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#fafafa;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #eeeeee;">
          <tr><td style="font-size:22px;font-weight:700;">AuraAI</td></tr>
          <tr><td style="padding-top:20px;font-size:16px;">Halo <strong>${escapeHtml(params.name)}</strong>,</td></tr>
          <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#4b4b4b;">
            Terima kasih sudah mendaftar sebagai Afiliator. Klik tombol di bawah untuk mengaktifkan akunmu.
          </td></tr>
          <tr><td style="padding-top:28px;" align="center">
            <a href="${params.activateUrl}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:600;">
              Aktifkan akun
            </a>
          </td></tr>
          <tr><td style="padding-top:24px;font-size:13px;line-height:1.5;color:#6e6e73;">
            Tautan berlaku 24 jam. Jika tombol tidak berfungsi, salin tautan ini:<br/>
            <a href="${params.activateUrl}" style="color:#e879a9;word-break:break-all;">${params.activateUrl}</a>
          </td></tr>
          <tr><td style="padding-top:28px;border-top:1px solid #eeeeee;font-size:12px;line-height:1.5;color:#8e8e93;text-align:center;">
            © ${year} AuraAI. All rights reserved.
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
  return { subject, htmlContent, textContent };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
