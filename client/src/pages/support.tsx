import { Link } from "wouter";
import {
  BookOpen,
  HelpCircle,
  KeyRound,
  LifeBuoy,
  Puzzle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import InfoPageShell from "@/components/info-page-shell";
import ContactForm from "@/components/contact-form";
import { Button } from "@/components/ui/button";

const TOPICS = [
  {
    icon: Puzzle,
    title: "Building your first mosaic",
    body: "Upload a clear photo, pick a board layout, then generate your brick guide. Start with 1–4 boards to learn the workflow.",
  },
  {
    icon: KeyRound,
    title: "License & devices",
    body: "Each license activates on a limited number of devices. Use Logout on this device, or Logout all devices from Profile if you need to move seats.",
  },
  {
    icon: RefreshCw,
    title: "Projects not loading",
    body: "Confirm you’re online and still licensed. Then refresh My Projects. If a project failed processing, re-upload and try a simpler image.",
  },
  {
    icon: ShieldCheck,
    title: "Export & privacy",
    body: "Guides and images export to your device. Keep your license key private — it unlocks your Fractix seat.",
  },
];

const FAQS = [
  {
    q: "What image formats work best?",
    a: "PNG and JPG up to 10MB. High-contrast subjects with simple shapes mosaic cleanly. Very busy photos need more boards or a stronger crop.",
  },
  {
    q: "Why did processing fail?",
    a: "Usually a corrupt upload, oversized file, or session timeout. Try a smaller JPG, sign in again if prompted, then re-run Generate Guide.",
  },
  {
    q: "Can I use Fractix offline?",
    a: "Desktop builds can work offline after activation until the next license check window. Web always needs a connection to the API.",
  },
  {
    q: "iPad / desktop install questions?",
    a: "Desktop installers ship via GitHub Releases. iPad installs need a signed IPA / TestFlight build — see Documentation for the current path.",
  },
];

export default function Support() {
  return (
    <InfoPageShell
      title="We’re here when a board gets stuck."
      subtitle="Quick answers for licensing, pixelation, and exports — plus a direct line to the Fractix team when you need a human."
    >
      <div className="space-y-14">
        <section className="grid sm:grid-cols-2 gap-4">
          {TOPICS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card/70 p-5 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
                <Icon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-5">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Common questions</h2>
          </div>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card/60 overflow-hidden">
            {FAQS.map((item) => (
              <details key={item.q} className="group px-5 sm:px-6 py-4 open:bg-muted/30 transition-colors">
                <summary className="cursor-pointer list-none font-medium text-foreground flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-muted-foreground text-lg leading-none group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed pr-8">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
            <div className="space-y-2 max-w-lg">
              <div className="inline-flex items-center gap-2 text-primary text-sm font-semibold">
                <LifeBuoy className="w-4 h-4" />
                Still stuck?
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Send a message to support
              </h2>
              <p className="text-sm text-muted-foreground">
                Include your device (web / desktop / iPad) and a short description of what you tried.
                Messages go to jodie-mar@hotmail.com.
              </p>
            </div>
            <Link href="/documentation">
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <BookOpen className="w-4 h-4" />
                Documentation
              </Button>
            </Link>
          </div>
        </section>

        <section id="contact-form" className="scroll-mt-24">
          <h2 className="text-xl font-semibold mb-4">Contact form</h2>
          <ContactForm />
        </section>
      </div>
    </InfoPageShell>
  );
}
