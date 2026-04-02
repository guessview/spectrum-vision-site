import { Resend } from 'resend';

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function clean(s, max = 2000) {
  return String(s ?? '').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'Invalid JSON' });
  }

  // Basic spam trap
  if (clean(body.companyWebsite, 200)) return json(res, 200, { ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 180);
  const projectType = clean(body.projectType, 80);
  const timeline = clean(body.timeline, 120);
  const budget = clean(body.budget, 80);
  const message = clean(body.message, 5000);
  const references = clean(body.references, 5000);

  if (!email || !message) {
    return json(res, 400, { ok: false, error: 'Missing required fields' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json(res, 500, { ok: false, error: 'Server not configured' });

  const to = (process.env.BRIEF_TO || 'hello@spectrumvision.ge')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const from = clean(process.env.BRIEF_FROM || 'Spectrum Vision <onboarding@resend.dev>', 200);

  const subject = `New brief — ${projectType || 'Project'}${name ? ` — ${name}` : ''}`;
  const text =
`New brief received

Name: ${name || '-'}
Email: ${email}
Project type: ${projectType || '-'}
Timeline: ${timeline || '-'}
Budget: ${budget || '-'}

Message:
${message}

References/links:
${references || '-'}
`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      subject,
      replyTo: email,
      text
    });
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { ok: false, error: 'Failed to send' });
  }
}

