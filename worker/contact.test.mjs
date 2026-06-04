import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateContact, buildRawEmail } from './validate.js';

test('rejects when required fields missing', () => {
  const r = validateContact({ name: '', email: '', message: '' });
  assert.equal(r.ok, false);
  assert.match(r.error, /required/i);
});

test('rejects invalid email', () => {
  const r = validateContact({ name: 'A', email: 'not-an-email', message: 'hi there' });
  assert.equal(r.ok, false);
  assert.match(r.error, /email/i);
});

test('rejects header-injection email (CR/LF, angle brackets, commas)', () => {
  for (const bad of ['a@b.com\r\nBcc: x@evil.com', 'a@b.com,c@d.com', 'a<x>@b.com']) {
    const r = validateContact({ name: 'A', email: bad, message: 'hello there' });
    assert.equal(r.ok, false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('rejects when honeypot filled', () => {
  const r = validateContact({ name: 'A', email: 'a@b.com', message: 'hello there', nickname: 'bot' });
  assert.equal(r.ok, false);
  assert.match(r.error, /spam/i);
});

test('rejects too-short message', () => {
  const r = validateContact({ name: 'A', email: 'a@b.com', message: 'hi' });
  assert.equal(r.ok, false);
  assert.match(r.error, /short/i);
});

test('accepts valid input and returns trimmed fields', () => {
  const r = validateContact({ name: '  Jamie ', email: 'jamie@shop.com', business: "Jamie's Office", message: 'Our printers keep dropping off the network.' });
  assert.equal(r.ok, true);
  assert.equal(r.fields.name, 'Jamie');
  assert.equal(r.fields.email, 'jamie@shop.com');
});

test('buildRawEmail produces valid headers and strips injection from name', () => {
  const raw = buildRawEmail(
    { name: 'Jamie\r\nSubject: hijack', email: 'jamie@shop.com', business: "Jamie's Office", message: 'Hello.' },
    'noreply@austinsmallofficetech.com',
    'browntag@gmail.com'
  );
  assert.match(raw, /^From: ASOT Contact Form <noreply@austinsmallofficetech\.com>/m);
  assert.match(raw, /^To: <browntag@gmail\.com>/m);
  assert.match(raw, /^Reply-To: Jamie  Subject: hijack <jamie@shop\.com>/m);
  assert.match(raw, /^Subject: austinsmallofficetech\.com: Jamie/m);
  assert.match(raw, /Jamie's Office/);
  const headerLines = raw.split('\r\n\r\n')[0].split('\r\n');
  assert.equal(headerLines.filter((l) => l.startsWith('Subject:')).length, 1);
});
