import fetch from 'node-fetch';

const BREVO_API_KEY = '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';
const CODES_API = 'https://dvltracker.xo.je/generate_code.php';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'DVL-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function sendEmail(toEmail, toName, code) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f0f0f0;padding:2rem">
<div style="max-width:500px;margin:0 auto;background:#080808;border-radius:16px;overflow:hidden">
  <div style="background:#C8FF00;padding:1.5rem;text-align:center">
    <div style="font-size:1.6rem;font-weight:900;color:#080808">DVLTrack</div>
  </div>
  <div style="padding:2rem">
    <h1 style="color:#fff;font-size:1.3rem">Bienvenue ${toName} ! 🎉</h1>
    <p style="color:#888;font-size:.88rem;margin:1rem 0">Ton code d'accès personnel :</p>
    <div style="background:#111;border:2px solid #C8FF00;border-radius:12px;padding:1.5rem;text-align:center;margin-bottom:1.5rem">
      <div style="font-size:2rem;font-weight:900;color:#C8FF00;font-family:monospace">${code}</div>
    </div>
    <a href="https://dvltracker.xo.je/access.php" style="display:block;background:#C8FF00;color:#080808;padding:14px;border-radius:10px;text-align:center;text-decoration:none;font-weight:800">Accéder à mon tracker →</a>
  </div>
</div>
</body></html>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: 'DVLTrack Premium', email: 'noreply@dvltracker.xo.je' },
      to: [{ email: toEmail, name: toName }],
      subject: `🎉 Ton accès DVLTrack — Code : ${code}`,
      htmlContent: html,
    }),
  });
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'webhook_ready' });
  }

  const { email, full_name, sale_id, refunded, test } = req.body;

  if (!email) return res.status(200).json({ status: 'test_ping_ok' });
  if (refunded === 'true') return res.status(200).json({ status: 'refund_ignored' });

  const code = generateCode();
  const name = full_name || email;

  // Sauvegarder le code sur InfinityFree
  await fetch(CODES_API + `?buyer=${encodeURIComponent(name)}`, { method: 'GET' });

  // Envoyer l'email
  const sent = await sendEmail(email, name, code);

  return res.status(200).json({ status: 'ok', code, email_sent: sent });
}
