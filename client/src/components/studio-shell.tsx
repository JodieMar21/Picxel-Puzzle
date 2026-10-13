import type { ReactNode } from "react";
import { Link } from "wouter";
import { Box } from "lucide-react";
import StudioAtmosphere from "@/components/studio-atmosphere";
import SettingsMenu from "@/components/settings-menu";
import { cn } from "@/lib/utils";

interface StudioShellProps {
  children: ReactNode;
  /** Extra controls on the right of the header (before settings). */
  headerActions?: ReactNode;
  /** Optional left-side override (defaults to Fractix brand). */
  headerLeft?: ReactNode;
  maxWidthClassName?: string;
  showFooter?: boolean;
  className?: string;
}

export default function StudioShell({
  children,
  headerActions,
  headerLeft,
  maxWidthClassName = "max-w-7xl",
  showFooter = true,
  className,
}: StudioShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground relative overflow-hidden",
        className,
      )}
    >
      <StudioAtmosphere />

      <header className="border-b border-border/70 bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div
          className={cn(
            "mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3",
            maxWidthClassName,
          )}
        >
          {headerLeft ?? (
            <Link href="/" className="flex items-center gap-3 min-w-0 group">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm shadow-primary/25 transition-transform group-hover:scale-[1.03]">
                <Box className="text-primary-foreground w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-semibold tracking-tight text-foreground truncate">
                  Fractix Studio
                </p>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  Image to brick mosaics
                </p>
              </div>
            </Link>
          )}

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <nav className="hidden md:flex items-center gap-0.5 text-sm mr-1">
              <Link
                href="/documentation"
                className="px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                Docs
              </Link>
              <Link
                href="/support"
                className="px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                Support
              </Link>
              <Link
                href="/contact"
                className="px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                Contact
              </Link>
            </nav>
            {headerActions}
            <SettingsMenu />
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10",
          maxWidthClassName,
        )}
      >
        {children}
      </main>

      {showFooter && (
        <footer className="border-t border-border/70 mt-10">
          <div
            className={cn(
              "mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-sm text-muted-foreground",
              maxWidthClassName,
            )}
          >
            <p>© {new Date().getFullYear()} Fractix Studio</p>
            <div className="flex flex-wrap gap-5">
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
      )}
    </div>
  );
}
