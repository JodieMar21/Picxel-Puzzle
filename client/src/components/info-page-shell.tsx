import { Link } from "wouter";
import { ArrowLeft, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import SettingsMenu from "@/components/settings-menu";
import type { ReactNode } from "react";

interface InfoPageShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function InfoPageShell({ title, subtitle, children }: InfoPageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 10% -10%, hsl(207 90% 54% / 0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 0%, hsl(199 89% 48% / 0.12), transparent 50%), linear-gradient(180deg, hsl(210 40% 98% / 0.6), transparent 40%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />

      <header className="border-b border-border/70 bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Studio
              </Button>
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
              <span className="text-border">|</span>
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Box className="text-primary-foreground w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-foreground">Fractix</span>
            </div>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm">
            <Link href="/documentation" className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
              Docs
            </Link>
            <Link href="/support" className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
              Support
            </Link>
            <Link href="/contact" className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
              Contact
            </Link>
            <SettingsMenu />
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-10 sm:mb-14 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-sm font-semibold tracking-wide text-primary mb-3">Fractix Studio</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground max-w-2xl">
            {title}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
          {children}
        </div>
      </main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Fractix Studio</p>
          <div className="flex gap-5">
            <Link href="/support" className="hover:text-foreground transition-colors">
              Support
            </Link>
            <Link href="/documentation" className="hover:text-foreground transition-colors">
              Documentation
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
