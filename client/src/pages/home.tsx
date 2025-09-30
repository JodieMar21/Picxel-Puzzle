import { useState, useRef, useEffect } from "react";
import { Box, Settings, HelpCircle, FolderOpen } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import ImageUpload from "@/components/image-upload";
import BoardConfiguration from "@/components/board-configuration";
import ColorPalette from "@/components/color-palette";
import ProcessingView from "@/components/processing-view";
import ResultsView from "@/components/results-view";
import type { PixelationResult } from "@shared/schema";

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [boardCount, setBoardCount] = useState(4);
  const [boardLayout, setBoardLayout] = useState("2x2");
  const [boardRows, setBoardRows] = useState(2);
  const [boardCols, setBoardCols] = useState(2);
  const [projectName, setProjectName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<PixelationResult | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLButtonElement>(null);

  // Add these for Help dropdown
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLButtonElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node) &&
        helpRef.current &&
        !helpRef.current.contains(event.target as Node)
      ) {
        setSettingsOpen(false);
        setHelpOpen(false);
      }
      // If only one should close at a time, adjust logic accordingly
    }
    if (settingsOpen || helpOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [settingsOpen, helpOpen]);

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
    setCurrentStep(2); // Go back to Configure Boards step
  };

  const steps = [
    { number: 1, title: "Upload Image", active: currentStep >= 1, completed: currentStep > 1 },
    { number: 2, title: "Configure Boards", active: currentStep >= 2, completed: currentStep > 2 },
    { number: 3, title: "Generate Guide", active: currentStep >= 3, completed: false }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Box className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Picxel Studio</h1>
                <p className="text-sm text-gray-500">Professional Image to Brick Converter</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/projects">
                <Button variant="outline" size="sm">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  My Projects
                </Button>
              </Link>
              <div className="relative">
                <button
                  ref={helpRef}
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setHelpOpen((open) => !open)}
                  aria-label="Help"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                {helpOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>
                        <span className="font-medium">How to use:</span> Upload an image, configure your board, and generate your mosaic guide.
                      </li>
                      <li>
                        <span className="font-medium">Best results:</span> Use high-contrast, simple images. Square images work best.
                      </li>
                      <li>
                        <span className="font-medium">Support:</span> For more help, visit our <a href="#" className="text-primary underline">documentation</a> or <a href="#" className="text-primary underline">contact us</a>.
                      </li>
                    </ul>
                    <div className="mt-4 text-xs text-gray-400">
                      Tip: You can always return to this help menu if you get stuck!
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  ref={settingsRef}
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setSettingsOpen((open) => !open)}
                  aria-label="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                {settingsOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Settings</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>
                        <span className="font-medium">Theme:</span> Light (default)
                      </li>
                      <li>
                        <span className="font-medium">Tile Size:</span> 32x32
                      </li>
                      <li>
                        <span className="font-medium">Max Boards:</span> 12
                      </li>
                      <li>
                        <span className="font-medium">Export Format:</span> PDF, PNG
                      </li>
                    </ul>
                    <div className="mt-4 text-xs text-gray-400">
                      More settings coming soon!
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Process Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Create your custom mosaic</h2>
            <div className="relative">
              <button
                ref={settingsRef}
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setSettingsOpen((open) => !open)}
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Settings</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>
                      <span className="font-medium">Theme:</span> Light (default)
                    </li>
                    <li>
                      <span className="font-medium">Tile Size:</span> 32x32
                    </li>
                    <li>
                      <span className="font-medium">Max Boards:</span> 12
                    </li>
                    <li>
                      <span className="font-medium">Export Format:</span> PDF, PNG
                    </li>
                  </ul>
                  <div className="mt-4 text-xs text-gray-400">
                    More settings coming soon!
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4 mb-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step.completed ? 'bg-success text-white' : step.active ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {step.number}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${step.active ? 'text-gray-900' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-16 h-0.5 bg-gray-300 ml-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {processing ? (
          <ProcessingView 
            projectId={projectId!}
            onComplete={handleProcessingComplete}
          />
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
            {/* Main Content */}
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

            {/* Sidebar */}
            <div className="space-y-6">
              <ColorPalette />
              
              {/* Project Statistics */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Statistics</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Tiles</span>
                    <span className="font-semibold text-gray-900">{boardCount * 32 * 32}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Estimated Colors</span>
                    <span className="font-semibold text-gray-900">15-25</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Build Time</span>
                    <span className="font-semibold text-gray-900">~{Math.round((boardCount * 32 * 32 * 7) / 3600)}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Difficulty</span>
                    <span className="font-semibold text-warning">
                      {boardCount <= 4 ? 'Intermediate' : 'Advanced'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips for Best Results</h3>
                
                <ul className="space-y-3 text-sm text-gray-600">
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">© 2024 Picxel Studio. Professional mosaic creation tool.</p>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-700">Support</a>
              <a href="#" className="hover:text-gray-700">Documentation</a>
              <a href="#" className="hover:text-gray-700">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
