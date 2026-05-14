import 'dotenv/config';
import { sendEmail } from './src/mailer.js';

async function test() {
  console.log('📧 Attempting to send test email...');
  try {
    const res = await sendEmail({
      to: 'mhassannaseerahmed@gmail.com',
      subject: 'FlowPing REAL Verification - DRY_RUN=OFF',
      text: 'This is a real SMTP test. If you see this, the engine is LIVE! 🚀',
      html: '<h1>FlowPing Live Test</h1><p>The engine is LIVE! 🚀</p>'
    });

    if (res.dryRun) {
      console.log('⚠️ DRY_RUN is enabled. Email was not actually sent (simulated).');
    } else {
      console.log('✅ Success! Email sent. Message ID:', res.messageId);
    }
  } catch (err) {
    console.error('❌ Email failed:', err.message);
  }
}

test();
