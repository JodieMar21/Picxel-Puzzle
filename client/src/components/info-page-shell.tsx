import { Link } from "wouter";
import { ArrowLeft, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import StudioShell from "@/components/studio-shell";
import type { ReactNode } from "react";

interface InfoPageShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function InfoPageShell({ title, subtitle, children }: InfoPageShellProps) {
  return (
    <StudioShell
      maxWidthClassName="max-w-5xl"
      headerLeft={
        <div className="flex items-center gap-3 min-w-0">
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
      }
    >
      <div className="mb-10 sm:mb-14 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="text-sm font-semibold tracking-wide text-primary mb-3">Fractix Studio</p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground max-w-2xl">
          {title}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100 pb-6">
        {children}
      </div>
    </StudioShell>
  );
}
