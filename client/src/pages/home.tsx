import { useState, useRef, useEffect } from "react";
import { Box, HelpCircle, FolderOpen } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ImageUpload from "@/components/image-upload";
import BoardConfiguration from "@/components/board-configuration";
import ColorPalette from "@/components/color-palette";
import ProcessingView from "@/components/processing-view";
import ResultsView from "@/components/results-view";
import ProfileModal from "@/components/profile-modal";
import SettingsMenu from "@/components/settings-menu";
import { getProfile } from "@/features/profile/storage";
import { useAppSettings } from "@/features/settings/use-app-settings";
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
    { number: 1, title: "Upload Image", active: currentStep >= 1, completed: currentStep > 1 },
    { number: 2, title: "Configure Boards", active: currentStep >= 2, completed: currentStep > 2 },
    { number: 3, title: "Generate Guide", active: currentStep >= 3, completed: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Box className="text-primary-foreground w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Fractix Studio</h1>
                <p className="text-sm text-muted-foreground">Professional Image to Brick Converter</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/projects">
                <Button variant="outline" size="sm">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  My Projects
                </Button>
              </Link>
              <div className="relative" ref={helpRef}>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setHelpOpen((open) => !open)}
                  aria-label="Help"
                  aria-expanded={helpOpen}
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                {helpOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 p-4 text-popover-foreground">
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
                        <span className="font-medium text-foreground">Support:</span> For more help,
                        visit our{" "}
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
                    <div className="mt-4 text-xs text-muted-foreground">
                      Tip: You can always return to this help menu if you get stuck!
                    </div>
                  </div>
                )}
              </div>
              <SettingsMenu />
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Open profile"
              >
                <Avatar className="h-8 w-8">
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
            </div>
          </div>
        </div>
      </header>

      <ProfileModal
        open={profileOpen}
        onOpenChange={(o) => {
          setProfileOpen(o);
          if (!o) setProfileData(getProfile());
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Create your custom mosaic</h2>
          </div>
          <div className="flex items-center space-x-4 mb-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                      step.completed
                        ? "bg-success text-success-foreground"
                        : step.active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.number}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      step.active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-16 h-0.5 bg-border ml-4" />
                )}
              </div>
            ))}
          </div>
        </div>

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <ImageUpload
                onImageUpload={handleImageUpload}
                uploadedImage={uploadedImage}
                imagePreview={imagePreview}
              />

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

              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Project Statistics</h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Tiles</span>
                    <span className="font-semibold text-foreground">
                      {boardCount * tileSize * tileSize}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Estimated Colors</span>
                    <span className="font-semibold text-foreground">15-25</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Build Time</span>
                    <span className="font-semibold text-foreground">
                      ~{Math.round((boardCount * tileSize * tileSize * 7) / 3600)}h
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Difficulty</span>
                    <span className="font-semibold text-warning">
                      {boardCount <= 4 ? "Intermediate" : "Advanced"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Tips for Best Results</h3>

                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start space-x-2">
                    <span className="text-warning mt-0.5">💡</span>
                    <span>Use high-contrast images for better pixelation</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-warning mt-0.5">💡</span>
                    <span>Square images work best for even board layouts</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-warning mt-0.5">💡</span>
                    <span>Avoid images with too much fine detail</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-warning mt-0.5">💡</span>
                    <span>Test with smaller board counts first</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-card border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              © 2024 Fractix Studio. Professional mosaic creation tool.
            </p>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
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
        </div>
      </footer>
    </div>
  );
}
