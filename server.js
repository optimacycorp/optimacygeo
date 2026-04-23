const express = require('express');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 3000);
const siteUrl = process.env.SITE_URL || 'https://optimacygeo.com';
const toEmail = process.env.TO_EMAIL || 'optimacycorp@gmail.com';
const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'optimacycorp@gmail.com';
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const recentSubmissions = new Map();

const cspDirectives = {
  defaultSrc: ["'self'"],
  imgSrc: ["'self'", 'data:'],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  connectSrc: ["'self'"],
  fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  frameAncestors: ["'none'"],
  formAction: ["'self'"],
};

if (siteUrl.startsWith('https://')) {
  cspDirectives.upgradeInsecureRequests = [];
}

const transporter = smtpHost && smtpUser && smtpPass
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(
  helmet({
    contentSecurityPolicy: { directives: cspDirectives },
    referrerPolicy: { policy: 'no-referrer-when-downgrade' },
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalize(value) {
  return String(value || '').trim();
}

function getIp(req) {
  return (req.headers['cf-connecting-ip'] || req.ip || '').toString();
}

function validatePayload(payload) {
  const cleaned = {
    name: normalize(payload.name),
    email: normalize(payload.email),
    phone: normalize(payload.phone),
    company: normalize(payload.company),
    propertyLocation: normalize(payload.propertyLocation),
    serviceType: normalize(payload.serviceType),
    supportNeeds: Array.isArray(payload.supportNeeds)
      ? payload.supportNeeds.map((item) => normalize(item)).filter(Boolean)
      : normalize(payload.supportNeeds)
        ? [normalize(payload.supportNeeds)]
        : [],
    existingDocuments: normalize(payload.existingDocuments),
    timeline: normalize(payload.timeline),
    message: normalize(payload.message),
  };

  if (!cleaned.name || !cleaned.email || !cleaned.message || !cleaned.serviceType) {
    return { ok: false, error: 'Please complete the required fields.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)) {
    return { ok: false, error: 'Please provide a valid email address.' };
  }

  if (cleaned.message.length < 20) {
    return { ok: false, error: 'Please add a little more project detail so we can respond helpfully.' };
  }

  return { ok: true, cleaned };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/contact', async (req, res) => {
  const ip = getIp(req);
  const now = Date.now();
  const lastSentAt = recentSubmissions.get(ip) || 0;

  if (now - lastSentAt < 60_000) {
    return res.status(429).json({ ok: false, error: 'Please wait a minute before submitting again.' });
  }

  const validation = validatePayload(req.body || {});
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.error });
  }

  if (!transporter) {
    return res.status(500).json({ ok: false, error: 'Email service is not configured yet.' });
  }

  const { cleaned } = validation;

  const lines = [
    'New inquiry from optimacygeo.com',
    '',
    `Name: ${cleaned.name}`,
    `Email: ${cleaned.email}`,
    `Phone: ${cleaned.phone || 'Not provided'}`,
    `Company: ${cleaned.company || 'Not provided'}`,
    `Property / Project Location: ${cleaned.propertyLocation || 'Not provided'}`,
    `Service Needed: ${cleaned.serviceType}`,
    `Support Needs: ${cleaned.supportNeeds.length ? cleaned.supportNeeds.join(', ') : 'Not provided'}`,
    `Existing Documents: ${cleaned.existingDocuments || 'Not provided'}`,
    `Timeline: ${cleaned.timeline || 'Not provided'}`,
    '',
    'Project details:',
    cleaned.message,
  ];

  try {
    await transporter.sendMail({
      to: toEmail,
      from: fromEmail,
      replyTo: cleaned.email,
      subject: `Optimacy inquiry: ${cleaned.serviceType} - ${cleaned.name}`,
      text: lines.join('\n'),
      html: `
        <h2>New inquiry from optimacygeo.com</h2>
        <p><strong>Name:</strong> ${escapeHtml(cleaned.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(cleaned.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(cleaned.phone || 'Not provided')}</p>
        <p><strong>Company:</strong> ${escapeHtml(cleaned.company || 'Not provided')}</p>
        <p><strong>Property / Project Location:</strong> ${escapeHtml(cleaned.propertyLocation || 'Not provided')}</p>
        <p><strong>Service Needed:</strong> ${escapeHtml(cleaned.serviceType)}</p>
        <p><strong>Support Needs:</strong> ${escapeHtml(cleaned.supportNeeds.length ? cleaned.supportNeeds.join(', ') : 'Not provided')}</p>
        <p><strong>Existing Documents:</strong> ${escapeHtml(cleaned.existingDocuments || 'Not provided')}</p>
        <p><strong>Timeline:</strong> ${escapeHtml(cleaned.timeline || 'Not provided')}</p>
        <p><strong>Project Details:</strong></p>
        <p>${escapeHtml(cleaned.message).replace(/\n/g, '<br>')}</p>
      `,
    });

    recentSubmissions.set(ip, now);
    res.json({ ok: true, message: 'Thanks. Your project details were sent successfully.' });
  } catch (error) {
    console.error('Contact form delivery failed:', error);
    res.status(500).json({ ok: false, error: 'Message delivery failed. Please email optimacycorp@gmail.com directly.' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Optimacy website listening on port ${port}`);
});
