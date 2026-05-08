import nodemailer from 'nodemailer';

export async function sendEmail({ to, subject, text, html, headers }) {
  const dryRun = String(process.env.DRY_RUN || 'true').toLowerCase() === 'true';
  if (dryRun) {
    return {
      dryRun: true,
      accepted: [to],
      messageId: `dryrun_${Date.now()}`,
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  const replyTo = process.env.SMTP_REPLY_TO || undefined;

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    replyTo,
    to,
    subject,
    text,
    html,
    headers: headers || undefined,
  });

  return {
    dryRun: false,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
    messageId: info.messageId,
  };
}

