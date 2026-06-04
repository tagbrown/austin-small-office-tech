// Cloudflare Worker: handles POST /api/contact for austinsmallofficetech.com.
// Sends mail via Cloudflare's email relay (Email Routing send_email binding) — no third-party API.
// Deployed separately from the Pages site; a Workers route on austinsmallofficetech.com/api/*
// intercepts the request ahead of Pages (Pages Functions cannot use send_email; a Worker route can).
import { EmailMessage } from "cloudflare:email";
import { validateContact, buildRawEmail } from "./validate.js";

const FROM_ADDRESS = "noreply@austinsmallofficetech.com";
// TO_ADDRESS must equal the verified Email Routing destination_address in wrangler.toml.
const TO_ADDRESS = "browntag@gmail.com";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/contact") return json({ ok: false, error: "Not found." }, 404);
    if (request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: "Could not read your submission." }, 400);
    }

    const v = validateContact(payload);
    if (!v.ok) return json(v, 400);

    const token = payload.turnstileToken || "";
    if (!token) return json({ ok: false, error: "Please complete the verification challenge." }, 400);
    let verified = false;
    try {
      const form = new FormData();
      form.append("secret", env.TURNSTILE_SECRET);
      form.append("response", token);
      form.append("remoteip", request.headers.get("CF-Connecting-IP") || "");
      const resp = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: form });
      const data = await resp.json();
      verified = !!data.success;
    } catch {
      verified = false;
    }
    if (!verified) return json({ ok: false, error: "Verification failed. Please try again." }, 403);

    const raw = buildRawEmail(v.fields, FROM_ADDRESS, TO_ADDRESS);
    try {
      await env.SEND_EMAIL.send(new EmailMessage(FROM_ADDRESS, TO_ADDRESS, raw));
      return json({ ok: true });
    } catch (err) {
      console.error("send_email failure:", err);
      return json({ ok: false, error: "Could not send right now. Please email us directly." }, 502);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
