import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT ?? "587");
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.warn("[email] SMTP credentials not fully configured. Emails will not be sent.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const DOWNLOAD_BASE_URL =
  process.env.GITHUB_RELEASES_URL ??
  "https://github.com/JodieMar21/Picxel-Puzzle/releases/latest";

export async function sendLicenseKeyEmail(input: { to: string; licenseKey: string }): Promise<void> {
  const transport = createTransport();
  if (!transport) {
    console.log(`[email] Would send license key to ${input.to}: ${input.licenseKey}`);
    return;
  }

  const fromName = process.env.EMAIL_FROM_NAME ?? "Fractix Puzzle";
  const fromAddress = process.env.EMAIL_USER!;

  const subject = "Your Fractix License Key";

  const text = [
    `Thank you for purchasing Fractix!`,
    ``,
    `Your license key is:`,
    ``,
    `  ${input.licenseKey}`,
    ``,
    `Download the app:`,
    `  Windows (.exe): ${DOWNLOAD_BASE_URL}`,
    `  macOS (.dmg):   ${DOWNLOAD_BASE_URL}`,
    ``,
    `How to activate:`,
    `  1. Install and open Fractix.`,
    `  2. Enter the license key above when prompted.`,
    `  3. Click "Activate and continue".`,
    ``,
    `Your key works on up to 2 devices. To move it to a new machine, deactivate it on an old one first.`,
    ``,
    `If you have any issues, reply to this email.`,
    ``,
    `— The Fractix Team`,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:560px;margin:40px auto;color:#1a1a1a">
  <h1 style="font-size:24px;margin-bottom:8px">Your Fractix License Key</h1>
  <p>Thank you for purchasing Fractix!</p>

  <div style="background:#f4f4f5;border-radius:8px;padding:20px 24px;margin:24px 0;text-align:center">
    <p style="margin:0 0 8px;font-size:13px;color:#555;text-transform:uppercase;letter-spacing:.05em">License key</p>
    <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:.15em;font-family:monospace">${input.licenseKey}</p>
  </div>

  <h2 style="font-size:16px">Download Fractix</h2>
  <ul>
    <li><a href="${DOWNLOAD_BASE_URL}">Windows installer (.exe)</a></li>
    <li><a href="${DOWNLOAD_BASE_URL}">macOS installer (.dmg)</a></li>
  </ul>

  <h2 style="font-size:16px">How to activate</h2>
  <ol>
    <li>Install and open Fractix.</li>
    <li>Enter the license key above when prompted.</li>
    <li>Click <strong>"Activate and continue"</strong>.</li>
  </ol>

  <p style="font-size:13px;color:#666">
    Your key works on up to 2 devices. To move it to a new machine, deactivate it on an old one first.
  </p>
  <p style="font-size:13px;color:#666">If you have any issues, reply to this email.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="font-size:12px;color:#999">© Fractix. All rights reserved.</p>
</body>
</html>
`;

  await transport.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: input.to,
    subject,
    text,
    html,
  });

  console.log(`[email] License key email sent to ${input.to}`);
}

const DEFAULT_CONTACT_TO = "jodie-mar@hotmail.com";

export async function sendContactEmail(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<{ delivered: boolean; to: string }> {
  const to = process.env.CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_TO;
  const transport = createTransport();
  const subject = `[Fractix Support] ${input.topic} — ${input.name}`;
  const text = [
    `New support message from Fractix Studio`,
    ``,
    `Name: ${input.name}`,
    `Reply-to: ${input.email}`,
    `Topic: ${input.topic}`,
    ``,
    input.message,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:560px;margin:40px auto;color:#1a1a1a">
  <h1 style="font-size:22px;margin-bottom:8px">Fractix support message</h1>
  <p style="margin:0 0 16px;color:#555">Submitted from the Studio support / contact form.</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr><td style="padding:8px 0;color:#666;width:100px">Name</td><td style="padding:8px 0;font-weight:600">${escapeHtml(input.name)}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0"><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></td></tr>
    <tr><td style="padding:8px 0;color:#666">Topic</td><td style="padding:8px 0">${escapeHtml(input.topic)}</td></tr>
  </table>
  <div style="background:#f4f4f5;border-radius:8px;padding:16px 20px;white-space:pre-wrap;line-height:1.5">${escapeHtml(input.message)}</div>
</body>
</html>
`;

  if (!transport) {
    console.log(`[email] Would send contact form to ${to}:`, text);
    return { delivered: false, to };
  }

  const fromName = process.env.EMAIL_FROM_NAME ?? "Fractix Puzzle";
  const fromAddress = process.env.EMAIL_USER!;

  await transport.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    replyTo: input.email,
    subject,
    text,
    html,
  });

  console.log(`[email] Contact form sent to ${to} from ${input.email}`);
  return { delivered: true, to };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
