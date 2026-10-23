import Stripe from "stripe";
import crypto from "crypto";
import https from "node:https";
import { storage } from "../storage";
import { hashLicenseKey } from "./licenseService";
import { sendLicenseKeyEmail } from "./emailService";
import type { LicensePlan } from "@shared/schema";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function getStripe(): Stripe {
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  const tlsVerify =
    process.env.STRIPE_TLS_REJECT_UNAUTHORIZED !== "false" &&
    process.env.STRIPE_TLS_REJECT_UNAUTHORIZED !== "0";

  const httpAgent = tlsVerify
    ? undefined
    : new https.Agent({ rejectUnauthorized: false });

  return new Stripe(stripeSecretKey, {
    apiVersion: "2026-03-25.dahlia",
    ...(httpAgent ? { httpAgent } : {}),
  });
}

function generateLicenseKey(): string {
  const segments = Array.from({ length: 4 }, () =>
    crypto.randomBytes(3).toString("hex").toUpperCase()
  );
  return `FRACTIX-${segments.join("-")}`;
}

/** Resolve Stripe Price ID from signup plan (price keys stay server-side). */
export function resolvePriceIdForPlan(plan: LicensePlan): string {
  if (plan === "pro") {
    const proPrice = process.env.STRIPE_PRICE_PRO_ID;
    if (!proPrice) {
      throw new Error("STRIPE_PRICE_PRO_ID is not configured for Pro licenses.");
    }
    return proPrice;
  }
  const basicPrice = process.env.STRIPE_PRICE_ID;
  if (!basicPrice) {
    throw new Error("STRIPE_PRICE_ID is not configured for Basic licenses.");
  }
  return basicPrice;
}

export function mapStripePriceToPlan(priceId: string | null | undefined): LicensePlan {
  const proPrice = process.env.STRIPE_PRICE_PRO_ID;
  const basicPrice = process.env.STRIPE_PRICE_ID;
  if (priceId && proPrice && priceId === proPrice) return "pro";
  if (priceId && basicPrice && priceId === basicPrice) return "basic";
  if (priceId && proPrice && priceId !== basicPrice) {
    console.warn(`[stripe] Unknown price ${priceId} — defaulting license plan to basic.`);
  }
  return "basic";
}

async function getSessionPriceId(sessionId: string): Promise<string | null> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price"],
  });
  const first = session.line_items?.data?.[0];
  const price = first?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

async function issueLicenseForSession(input: {
  sessionId: string;
  customerEmail: string;
  stripePriceId?: string | null;
}): Promise<string> {
  const existing = await storage.getLicenseByStripeSession(input.sessionId);
  if (existing) {
    console.log(`[stripe] License already issued for session ${input.sessionId} — reusing existing key.`);
    return existing.licenseKey;
  }

  const stripePriceId =
    input.stripePriceId ?? (await getSessionPriceId(input.sessionId).catch(() => null));
  const plan = mapStripePriceToPlan(stripePriceId);

  const licenseKey = generateLicenseKey();
  const licenseKeyHash = hashLicenseKey(licenseKey);

  await storage.createLicense({
    licenseKey,
    licenseKeyHash,
    stripeSessionId: input.sessionId,
    customerEmail: input.customerEmail,
    plan,
    stripePriceId: stripePriceId ?? null,
  });

  await storage.createLicenseEvent({
    licenseKeyHash,
    eventType: "license_issued",
    metadata: {
      stripeSessionId: input.sessionId,
      customerEmail: input.customerEmail,
      plan,
      stripePriceId,
    },
  });

  await sendLicenseKeyEmail({ to: input.customerEmail, licenseKey });
  console.log(
    `[stripe] License issued for ${input.customerEmail} plan=${plan} (session: ${input.sessionId})`,
  );

  return licenseKey;
}

export async function createCheckoutSession(input: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_creation: "always",
    invoice_creation: { enabled: true },
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe checkout session URL.");
  }

  return { url: session.url };
}

export async function handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[stripe:webhook] Received event: ${event.type}`);

  if (event.type !== "checkout.session.completed") {
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;
  const customerEmail = session.customer_details?.email;

  if (!customerEmail) {
    console.error(`[stripe] No customer email for session ${sessionId} — skipping license generation.`);
    return;
  }

  let stripePriceId: string | null = null;
  try {
    stripePriceId = await getSessionPriceId(sessionId);
  } catch (error) {
    console.warn(`[stripe] Could not expand line items for ${sessionId}:`, error);
  }

  await issueLicenseForSession({ sessionId, customerEmail, stripePriceId });
}

export async function getLicenseKeyForSession(sessionId: string): Promise<string | null> {
  let license;
  try {
    license = await storage.getLicenseByStripeSession(sessionId);
  } catch (e: unknown) {
    const m = e instanceof Error ? e.message : String(e);
    if (/certificate|self-signed|ssl|tls/i.test(m)) {
      throw new Error(
        `${m} (Postgres TLS: use sslmode=verify-full and DATABASE_SSL_CA_FILE for strict verify, or DATABASE_SSL_REJECT_UNAUTHORIZED=false if you must disable verification.)`,
      );
    }
    throw e;
  }
  if (license) return license.licenseKey;

  // Fallback for delayed/missed webhook delivery in development:
  // verify paid status directly with Stripe, then issue the key once.
  const stripe = getStripe();
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price"],
    });
  } catch (e: unknown) {
    const m = e instanceof Error ? e.message : String(e);
    if (/certificate|self-signed|ssl|tls/i.test(m)) {
      throw new Error(
        `${m} (Stripe API TLS: set STRIPE_TLS_REJECT_UNAUTHORIZED=false only if you are behind a TLS-inspecting proxy.)`,
      );
    }
    throw e;
  }
  const customerEmail = session.customer_details?.email;
  const paymentCompleted =
    session.payment_status === "paid" ||
    session.status === "complete";

  if (!paymentCompleted) {
    return null;
  }
  if (!customerEmail) {
    throw new Error("Paid Stripe session is missing customer email.");
  }

  const first = session.line_items?.data?.[0];
  const price = first?.price;
  const stripePriceId = !price ? null : typeof price === "string" ? price : price.id;

  return issueLicenseForSession({ sessionId, customerEmail, stripePriceId });
}
