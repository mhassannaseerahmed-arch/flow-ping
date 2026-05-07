import nodemailer from 'nodemailer';

/** true = do not connect to SMTP (default when DRY_RUN unset). */
export function isMailDryRun() {
  const raw = String(process.env.DRY_RUN ?? 'true').trim().toLowerCase();
  return !(raw === 'false' || raw === '0' || raw === 'no');
}

export async function sendEmail({ to, subject, text, html }) {
  if (isMailDryRun()) {
    return {
      dryRun: true,
      accepted: [to],
      messageId: `dryrun_${Date.now()}`,
    };
  }

  const pass = process.env.SMTP_PASS
    ? String(process.env.SMTP_PASS).replace(/\s+/g, '')
    : undefined;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: process.env.SMTP_USER && pass
      ? { user: process.env.SMTP_USER, pass }
      : undefined,
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return {
    dryRun: false,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
    messageId: info.messageId,
  };
}

