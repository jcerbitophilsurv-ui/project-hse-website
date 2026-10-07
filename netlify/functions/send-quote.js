// Emails a customer's solar estimate to the address they gave on quote.html.
// Uses Resend's HTTP API directly via the global fetch available in Netlify's
// Node 18+ function runtime, so this needs no npm dependency/build step.
//
// Required environment variable (set in Netlify: Site configuration ->
// Environment variables): RESEND_API_KEY.

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'Horizon Solar Energy <quotes@horizonsolar.net>';
const REPLY_TO = 'sales@horizonsolar.net';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { name, email, consent } = data;

  if (!consent) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Consent to share personal data is required.' }) };
  }
  if (!name || !email || !isValidEmail(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'A name and a valid email address are required.' }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('send-quote: RESEND_API_KEY is not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'Email sending is not configured yet.' }) };
  }

  try {
    const resp = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [email],
        reply_to: REPLY_TO,
        subject: 'Your Horizon Solar Energy estimate',
        html: buildEmailHtml(data),
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('send-quote: Resend API error', resp.status, errText);
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not send the email.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('send-quote: unexpected error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error sending the email.' }) };
  }
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function buildEmailHtml(data) {
  const {
    name, kwh, gridCost, solarCost,
    productLabel, systemKwp, batteryKwh, price, monthlySavings, annualSavings, roiYears,
    coverageNote, assumptions,
  } = data;

  const safeName = escapeHtml(name) || 'there';
  const batteryLine = batteryKwh
    ? ` + ${escapeHtml(batteryKwh)} kWh battery`
    : '';
  const assumptionsHtml = Array.isArray(assumptions) && assumptions.length
    ? `<ul style="margin:0;padding-left:18px;color:#555555;font-size:14px;line-height:1.6;">${assumptions.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
    : '';

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
    <p style="color:#004E2E;font-weight:bold;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px;">Horizon Solar Energy</p>
    <h1 style="font-size:22px;margin:0 0 16px;color:#004E2E;">Hi ${safeName}, here's your solar estimate</h1>
    <p style="font-size:14px;line-height:1.6;color:#444;">Based on an estimated monthly usage of <strong>${escapeHtml(kwh)} kWh</strong>, here is what we recommend:</p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:8px 0;color:#7F7F7F;font-size:13px;">Recommended system</td><td style="padding:8px 0;text-align:right;font-weight:bold;">${escapeHtml(productLabel)}</td></tr>
      <tr><td style="padding:8px 0;color:#7F7F7F;font-size:13px;">System size</td><td style="padding:8px 0;text-align:right;">${escapeHtml(systemKwp)} kWp${batteryLine}</td></tr>
      <tr><td style="padding:8px 0;color:#7F7F7F;font-size:13px;">Estimated installed cost</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#004E2E;">${escapeHtml(price)}</td></tr>
      <tr><td style="padding:8px 0;color:#7F7F7F;font-size:13px;">Estimated savings</td><td style="padding:8px 0;text-align:right;">${escapeHtml(monthlySavings)}/mo &middot; ${escapeHtml(annualSavings)}/yr</td></tr>
      <tr><td style="padding:8px 0;color:#7F7F7F;font-size:13px;">Estimated payback</td><td style="padding:8px 0;text-align:right;">${escapeHtml(roiYears)}</td></tr>
      <tr><td style="padding:8px 0;color:#7F7F7F;font-size:13px;">Grid vs. solar cost</td><td style="padding:8px 0;text-align:right;">${escapeHtml(gridCost)} &rarr; ${escapeHtml(solarCost)} per kWh</td></tr>
    </table>

    ${coverageNote ? `<p style="font-size:13px;color:#555;background:#F5F5F0;padding:10px 14px;border-radius:8px;">${escapeHtml(coverageNote)}</p>` : ''}

    <p style="font-size:13px;color:#7F7F7F;margin-top:24px;">How we worked this out:</p>
    ${assumptionsHtml}

    <p style="font-size:13px;line-height:1.6;color:#444;margin-top:24px;">This is a ballpark estimate based on typical Philippine market pricing and average solar yield. Your final quote will depend on a free assessment of your roof, shading, and electrical setup.</p>

    <a href="https://horizonsolar.net/contact.html" style="display:inline-block;margin-top:16px;background:#FFC000;color:#1a1a1a;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px;">Request a Formal Quote</a>

    <p style="font-size:12px;color:#999;margin-top:32px;">Horizon Solar Energy &middot; sales@horizonsolar.net &middot; +63 976 311 3745<br>You're receiving this because you requested an estimate at horizonsolar.net.</p>
  </div>`;
}
