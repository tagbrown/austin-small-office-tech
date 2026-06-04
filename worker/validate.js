// Pure, runtime-agnostic helpers for the contact worker.
// No `cloudflare:email` import here, so this module is unit-testable under `node --test`.

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export function validateContact(payload) {
  // A valid JSON body can still be null / a string / an array. Coerce to an object
  // so property access below never throws (which would surface as a 500, not a 400).
  if (!payload || typeof payload !== 'object') payload = {};
  const name = (payload.name || '').trim().slice(0, 200);
  const email = (payload.email || '').trim().slice(0, 200);
  const business = (payload.business || '').trim().slice(0, 200);
  const message = (payload.message || '').trim().slice(0, 5000);
  const honeypot = (payload.nickname || '').trim();

  if (honeypot) return { ok: false, error: 'Rejected as spam.' };
  if (!name || !email || !message) return { ok: false, error: 'Name, email, and message are required.' };
  // EMAIL_RE forbids whitespace and , ; < > , which also blocks header injection in Reply-To.
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Please enter a valid email.' };
  if (message.length < 5) return { ok: false, error: 'Message is too short.' };
  return { ok: true, fields: { name, email, business, message } };
}

function headerSafe(s) {
  return String(s).replace(/[\r\n<>,;]/g, ' ').trim();
}

export function buildRawEmail(fields, fromAddress, toAddress) {
  const name = headerSafe(fields.name);
  const email = headerSafe(fields.email);
  const business = String(fields.business || '').replace(/[\r\n]/g, ' ').trim();
  const subject = `Austin Small Office Tech: ${name}`;

  const body = [
    'New message from the Austin Small Office Tech website (atxtechservices.com)',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Business: ${business || '(not given)'}`,
    '',
    'Message:',
    fields.message,
  ].join('\r\n');

  return [
    `From: ASOT Contact Form <${fromAddress}>`,
    `To: <${toAddress}>`,
    `Reply-To: ${name} <${email}>`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n');
}
