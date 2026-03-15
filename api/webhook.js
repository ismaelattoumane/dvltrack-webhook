export default async function handler(req, res) {

  const BREVO_KEY = process.env.BREVO_API_KEY;

  if (!BREVO_KEY) {
    return res.status(500).json({ status: 'error', message: 'BREVO_API_KEY not configured' });
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'webhook_ready' });
  }

  const { email, full_name, sale_id, refunded } = req.body || {};

  if (!email) return res.status(200).json({ status: 'test_ping_ok' });
  if (refunded === 'true') return res.status(200).json({ status: 'refund_ignored' });

  // Générer code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'DVL-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];

  const name = full_name || email;

  // 1. Sauvegarder le code sur InfinityFree via save_code.php
  try {
    await fetch('https://dvltracker.xo.je/save_code.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        buyer: name,
        email,
        order_id: sale_id || 'order_' + Date.now(),
      }),
    });
  } catch(e) {
    // Continue même si la sauvegarde échoue
  }

  // 2. Envoyer l'email
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f0f0f0;padding:2rem;margin:0">
<div style="max-width:500px;margin:0 auto;background:#080808;border-radius:16px;overflow:hidden">
  <div style="background:#C8FF00;padding:1.5rem;text-align:center">
    <div style="font-size:1.6rem;font-weight:900;color:#080808">DVLTrack</div>
    <div style="font-size:.8rem;color:#1a2200;font-weight:600">HABIT TRACKER PREMIUM</div>
  </div>
  <div style="padding:2rem">
    <h1 style="color:#fff;font-size:1.3rem;margin:0 0 1rem">Bienvenue ${name} ! 🎉</h1>
    <p style="color:#888;font-size:.88rem;line-height:1.6;margin:0 0 1.5rem">Merci pour ton achat ! Voici ton code d'accès personnel.</p>
    <div style="background:#111;border:2px solid #C8FF00;border-radius:12px;padding:1.5rem;text-align:center;margin-bottom:1.5rem">
      <div style="font-size:.7rem;color:#666;margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.1em">Ton code d'accès unique</div>
      <div style="font-size:2rem;font-weight:900;color:#C8FF00;letter-spacing:.1em;font-family:monospace">${code}</div>
    </div>
    <a href="https://dvltracker.xo.je/access.php" style="display:block;background:#C8FF00;color:#080808;padding:14px;border-radius:10px;text-align:center;text-decoration:none;font-weight:800;font-size:1rem;margin-bottom:1.5rem">Accéder à mon tracker →</a>
    <div style="background:#111;border-radius:10px;padding:1rem;font-size:.8rem;color:#888;line-height:1.8">
      <strong style="color:#fff;display:block;margin-bottom:.3rem">Comment ça marche :</strong>
      1. Clique sur le bouton ci-dessus<br>
      2. Entre ton code <strong style="color:#C8FF00;font-family:monospace">${code}</strong><br>
      3. Ton tracker s'ouvre immédiatement<br>
      4. <strong style="color:#fff">Sur iPhone</strong> → Safari → Partager 📤 → "Sur l'écran d'accueil"
    </div>
  </div>
  <div style="background:#0d0d0d;padding:1rem 2rem;text-align:center;border-top:1px solid #1a1a1a">
    <div style="font-size:.72rem;color:#444">Questions ? <a href="mailto:dvltracker@gmail.com" style="color:#666">dvltracker@gmail.com</a></div>
  </div>
</div>
</body></html>`;

  try {
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_KEY,
      },
      body: JSON.stringify({
        sender: { name: 'DVLTrack Premium', email: 'dvltracker@gmail.com' },
        to: [{ email, name }],
        subject: `🎉 Ton accès DVLTrack Premium — Code : ${code}`,
        htmlContent: html,
      }),
    });

    const emailBody = await emailRes.json();
    const sent = emailRes.ok;

    return res.status(200).json({
      status: sent ? 'ok' : 'email_error',
      code,
      email_sent: sent,
      brevo_response: emailBody,
    });

  } catch (err) {
    return res.status(200).json({ status: 'error', message: err.message });
  }
}
