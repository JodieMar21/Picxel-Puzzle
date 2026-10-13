import { Link } from "wouter";
import { Clock, Mail, MapPin, Sparkles } from "lucide-react";
import InfoPageShell from "@/components/info-page-shell";
import ContactForm from "@/components/contact-form";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "jodie-mar@hotmail.com";

export default function Contact() {
  return (
    <InfoPageShell
      title="Say hello to the Fractix team."
      subtitle="Licensing questions, build issues, or mosaic feedback — tell us what you’re working on and we’ll help you finish the wall."
    >
      <div className="grid lg:grid-cols-[1fr_1.15fr] gap-8 lg:gap-10 items-start">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/70 p-5 sm:p-6 space-y-5">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Email</p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-sm text-primary hover:underline break-all"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Response time</p>
                <p className="text-sm text-muted-foreground">
                  Usually within 1–2 business days
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Product</p>
                <p className="text-sm text-muted-foreground">
                  Fractix Studio — web, desktop & iPad
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-5">
            <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2">
              <Sparkles className="w-4 h-4" />
              Faster answers
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Check Documentation and Support first — many license and export questions are covered
              there.
            </p>
            <div className="flex gap-2">
              <Link href="/documentation">
                <Button variant="outline" size="sm">
                  Docs
                </Button>
              </Link>
              <Link href="/support">
                <Button variant="outline" size="sm">
                  Support
                </Button>
              </Link>
            </div>
          </div>
        </aside>

        <ContactForm />
      </div>
    </InfoPageShell>
  );
}
