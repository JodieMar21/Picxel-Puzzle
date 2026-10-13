import { Link } from "wouter";
import {
  CheckCircle2,
  Download,
  Layers,
  Monitor,
  Smartphone,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import InfoPageShell from "@/components/info-page-shell";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Upload,
    title: "Upload",
    body: "Choose a PNG or JPG. Crop toward the subject — mosaics reward clear silhouettes over fine texture.",
  },
  {
    icon: Layers,
    title: "Configure boards",
    body: "Set rows × columns (or a preset). Tile size and max boards live in Settings and apply to new projects.",
  },
  {
    icon: Wand2,
    title: "Generate guide",
    body: "Fractix maps pixels to the brick palette, splits boards, and builds a construction-ready colour map.",
  },
  {
    icon: Download,
    title: "Export & build",
    body: "Download PNG guides, colour keys, and project files. Assemble board-by-board using the labels (A1, B1…).",
  },
];

const PLATFORMS = [
  {
    icon: Monitor,
    title: "Web & desktop",
    items: [
      "Activate with your license key on first launch",
      "My Projects stores completed mosaics for re-download",
      "Theme, tile size, and max boards sync in local settings",
    ],
  },
  {
    icon: Smartphone,
    title: "iPad (Capacitor)",
    items: [
      "Uses the same Fractix Studio UI inside a native shell",
      "Install via signed IPA / TestFlight — not by opening App.app in Files",
      "API calls use your production backend URL baked at build time",
    ],
  },
];

const TIPS = [
  "Prefer square or near-square sources for even board grids.",
  "Increase board count for portraits with subtle gradients.",
  "Edit individual studs in the pixel editor before you export.",
  "Save to App if you want the project listed under My Projects.",
];

export default function Documentation() {
  return (
    <InfoPageShell
      title="Documentation built for makers."
      subtitle="From first upload to finished brick wall — the Fractix workflow, platform notes, and settings that shape every mosaic."
    >
      <div className="space-y-14">
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Core workflow</h2>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li
                key={title}
                className="relative rounded-2xl border border-border bg-card/70 p-5 sm:p-6 overflow-hidden"
              >
                <span className="absolute top-4 right-4 text-4xl font-semibold text-primary/10 tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          {PLATFORMS.map(({ icon: Icon, title, items }) => (
            <div key={title} className="rounded-2xl border border-border bg-card/70 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
              </div>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
          <h2 className="text-xl font-semibold mb-4">Pro tips</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {TIPS.map((tip) => (
              <li
                key={tip}
                className="flex gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm text-foreground/90"
              >
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-2xl border border-border bg-gradient-to-r from-card to-primary/5 p-6">
          <div>
            <h2 className="text-lg font-semibold">Need troubleshooting?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Support covers licenses, failed jobs, and install paths.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/support">
              <Button variant="outline">Open Support</Button>
            </Link>
            <Link href="/">
              <Button>Back to Studio</Button>
            </Link>
          </div>
        </section>
      </div>
    </InfoPageShell>
  );
}
