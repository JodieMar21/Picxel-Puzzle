import { useState, useRef, useEffect } from "react";
import { HelpCircle, FolderOpen, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ImageUpload from "@/components/image-upload";
import BoardConfiguration from "@/components/board-configuration";
import ColorPalette from "@/components/color-palette";
import SampleTemplates from "@/components/sample-templates";
import ProcessingView from "@/components/processing-view";
import ResultsView from "@/components/results-view";
import ProfileModal from "@/components/profile-modal";
import StudioShell from "@/components/studio-shell";
import { getProfile } from "@/features/profile/storage";
import { useAppSettings } from "@/features/settings/use-app-settings";
import { consumeOpenProject } from "@/lib/project-session";
import type { PixelationResult } from "@shared/schema";

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [boardCount, setBoardCount] = useState(4);
  const [boardLayout, setBoardLayout] = useState("2x2");
  const [boardRows, setBoardRows] = useState(2);
  const [boardCols, setBoardCols] = useState(2);
  const [projectName, setProjectName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<PixelationResult | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => getProfile());
  const { settings } = useAppSettings();
  const tileSize = settings.tileSize;

  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opened = consumeOpenProject();
    if (!opened?.pixelationResult) return;
    setProjectId(opened.projectId);
    setProjectName(opened.name);
    setBoardCount(opened.boardCount);
    setBoardLayout(opened.boardLayout);
    setBoardRows(opened.boardRows || Math.max(1, Math.ceil(Math.sqrt(opened.boardCount))));
    setBoardCols(opened.boardCols || Math.max(1, Math.ceil(Math.sqrt(opened.boardCount))));
    setResults(opened.pixelationResult);
    setProcessing(false);
    setCurrentStep(3);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setHelpOpen(false);
      }
    }
    if (helpOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [helpOpen]);

  const handleImageUpload = (file: File, preview: string) => {
    setUploadedImage(file);
    setImagePreview(preview);
    setCurrentStep(2);
  };

  const handleStartPixelation = (projectId: string) => {
    setProjectId(projectId);
    setCurrentStep(3);
    setProcessing(true);
  };

  const handleProcessingComplete = (result: PixelationResult) => {
    setResults(result);
    setProcessing(false);
  };

  const handleGoBack = () => {
    setResults(null);
    setProcessing(false);
    setCurrentStep(2);
  };

  const steps = [
    { number: 1, title: "Upload", active: currentStep >= 1, completed: currentStep > 1 },
    { number: 2, title: "Configure", active: currentStep >= 2, completed: currentStep > 2 },
    { number: 3, title: "Generate", active: currentStep >= 3, completed: false },
  ];

  return (
    <StudioShell
      headerActions={
        <>
          <Link href="/projects">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl border-border/80 bg-card/60">
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">My Projects</span>
            </Button>
          </Link>
          <div className="relative" ref={helpRef}>
            <button
              type="button"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              onClick={() => setHelpOpen((open) => !open)}
              aria-label="Help"
              aria-expanded={helpOpen}
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            {helpOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-popover/95 backdrop-blur border border-border rounded-2xl shadow-lg z-50 p-4 text-popover-foreground">
                <h4 className="font-semibold mb-2">Need Help?</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">How to use:</span> Upload an
                    image, configure your board, and generate your mosaic guide.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Best results:</span> Use
                    high-contrast, simple images. Square images work best.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Support:</span> Visit{" "}
                    <Link href="/documentation" className="text-primary underline">
                      documentation
                    </Link>{" "}
                    or{" "}
                    <Link href="/contact" className="text-primary underline">
                      contact us
                    </Link>
                    .
                  </li>
                </ul>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Open profile"
          >
            <Avatar className="h-8 w-8 ring-2 ring-border/60">
              <AvatarImage src={profileData?.avatarDataUrl ?? undefined} alt="Profile" />
              <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                {profileData?.name
                  ? profileData.name.slice(0, 2).toUpperCase()
                  : profileData?.username
                    ? profileData.username.slice(0, 2).toUpperCase()
                    : "U"}
              </AvatarFallback>
            </Avatar>
          </button>
        </>
      }
    >
      <ProfileModal
        open={profileOpen}
        onOpenChange={(o) => {
          setProfileOpen(o);
          if (!o) setProfileData(getProfile());
        }}
      />

      <div className="mb-8 sm:mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="text-sm font-semibold tracking-wide text-primary mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Fractix Studio
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground max-w-2xl">
          Create your custom mosaic
        </h2>
        <p className="mt-3 text-muted-foreground max-w-xl leading-relaxed">
          Upload a photo, lay out your boards, and generate a brick-ready build guide.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center gap-2 sm:gap-3">
              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${
                  step.completed
                    ? "border-success/30 bg-success/10 text-foreground"
                    : step.active
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border bg-card/60 text-muted-foreground"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step.completed
                      ? "bg-success text-success-foreground"
                      : step.active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.number}
                </span>
                <span className="text-sm font-medium">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden sm:block w-8 h-px bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
        {processing ? (
          <ProcessingView projectId={projectId!} onComplete={handleProcessingComplete} />
        ) : results ? (
          <ResultsView
            results={results}
            boardCount={boardCount}
            boardLayout={boardLayout}
            boardRows={boardRows}
            boardCols={boardCols}
            projectId={projectId || undefined}
            onGoBack={handleGoBack}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <ImageUpload
                onImageUpload={handleImageUpload}
                uploadedImage={uploadedImage}
                imagePreview={imagePreview}
              />

              {!uploadedImage && (
                <SampleTemplates onSelect={handleImageUpload} />
              )}

              {uploadedImage && imagePreview && (
                <BoardConfiguration
                  boardCount={boardCount}
                  setBoardCount={setBoardCount}
                  boardLayout={boardLayout}
                  setBoardLayout={setBoardLayout}
                  boardRows={boardRows}
                  setBoardRows={setBoardRows}
                  boardCols={boardCols}
                  setBoardCols={setBoardCols}
                  projectName={projectName}
                  setProjectName={setProjectName}
                  uploadedImage={uploadedImage}
                  imagePreview={imagePreview}
                  onStartPixelation={handleStartPixelation}
                />
              )}
            </div>

            <div className="space-y-6">
              <ColorPalette />

              <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">Project Statistics</h3>
                <div className="space-y-3">
                  {[
                    { label: "Total Tiles", value: String(boardCount * tileSize * tileSize) },
                    { label: "Estimated Colors", value: "15–25" },
                    {
                      label: "Build Time",
                      value: `~${Math.round((boardCount * tileSize * tileSize * 7) / 3600)}h`,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5"
                    >
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="font-semibold text-foreground">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center rounded-xl bg-muted/40 px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">Difficulty</span>
                    <span className="font-semibold text-warning">
                      {boardCount <= 4 ? "Intermediate" : "Advanced"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">Tips for best results</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {[
                    "Use high-contrast images for cleaner pixelation",
                    "Square images work best for even board layouts",
                    "Avoid images with too much fine detail",
                    "Test with smaller board counts first",
                  ].map((tip) => (
                    <li key={tip} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudioShell>
  );
}
