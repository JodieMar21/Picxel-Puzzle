import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Copy, Download, Loader2, AlertCircle } from "lucide-react";

type PageState =
  | { status: "loading" }
  | { status: "success"; licenseKey: string }
  | { status: "pending" }
  | { status: "error"; message: string };

const GITHUB_RELEASES_URL =
  import.meta.env.VITE_GITHUB_RELEASES_URL ??
  "https://github.com/JodieMar21/Picxel-Puzzle/releases/latest";

export default function PurchaseSuccess() {
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  const sessionId = new URLSearchParams(window.location.search).get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setState({ status: "error", message: "No session ID found in URL." });
      return;
    }

    let attempts = 0;
    const maxAttempts = 15;
    const pollIntervalMs = 2500;

    async function poll() {
      const lookupUrl = apiUrl(`/api/license/lookup?session_id=${encodeURIComponent(sessionId!)}`);
      if (import.meta.env.DEV) {
        console.log("[purchase-success] lookup URL", lookupUrl);
      }

      try {
        const res = await fetch(lookupUrl, { credentials: "omit" });

        if (res.ok) {
          const text = await res.text();
          let data: { licenseKey?: unknown };
          try {
            data = JSON.parse(text) as { licenseKey?: unknown };
          } catch (parseErr) {
            console.error("[purchase-success] expected JSON from lookup, got:", text.slice(0, 240), parseErr);
            setState({
              status: "error",
              message:
                "Server returned an invalid response (expected JSON). Check VITE_API_URL points to your Railway API.",
            });
            return;
          }
          if (typeof data.licenseKey !== "string" || !data.licenseKey) {
            console.error("[purchase-success] missing licenseKey in body:", data);
            setState({ status: "error", message: "Server response was missing a license key." });
            return;
          }
          setState({ status: "success", licenseKey: data.licenseKey });
          return;
        }

        if (res.status === 404) {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, pollIntervalMs);
            return;
          }
          setState({ status: "pending" });
          return;
        }

        const errText = await res.text();
        let errMessage = "Unexpected error.";
        try {
          const parsed = JSON.parse(errText) as { message?: string };
          if (typeof parsed.message === "string") errMessage = parsed.message;
        } catch {
          if (errText) errMessage = `Unexpected response (${res.status}).`;
        }
        setState({ status: "error", message: errMessage });
      } catch (err) {
        console.error("[purchase-success] lookup failed", err);
        const msg = err instanceof Error ? err.message : String(err);
        const isNetwork =
          msg === "Failed to fetch" ||
          msg.includes("NetworkError") ||
          msg.toLowerCase().includes("network");
        const hint = isNetwork
          ? "Could not reach the API (often CORS or a wrong API URL). Ensure APP_BASE_URL on the server matches this site’s origin exactly, or add extra origins in CORS_ALLOWED_ORIGINS on Railway."
          : msg;
        setState({
          status: "error",
          message: `${hint} If checkout succeeded, check your email for your license key.`,
        });
      }
    }

    poll();
  }, [sessionId]);

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        {state.status === "loading" && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
              <p className="text-slate-600">Retrieving your license key…</p>
            </CardContent>
          </Card>
        )}

        {state.status === "success" && (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <h1 className="text-2xl font-bold">Purchase complete!</h1>
              <p className="text-slate-500 text-sm">
                Your license key is shown below and has been emailed to you.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your License Key</CardTitle>
                <CardDescription>
                  Enter this key when Fractix prompts you on first launch.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border bg-slate-100 px-4 py-3 font-mono text-lg font-semibold tracking-widest text-center select-all">
                    {state.licenseKey}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyKey(state.licenseKey)}
                    aria-label="Copy license key"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <p className="text-xs text-slate-500">
                  This key activates up to 2 devices. Keep it safe — we also sent it to your email.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Download Fractix</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1">
                  <a href={GITHUB_RELEASES_URL} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Windows (.exe)
                  </a>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href={GITHUB_RELEASES_URL} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    macOS (.dmg)
                  </a>
                </Button>
              </CardContent>
            </Card>

            <div className="text-center text-sm text-slate-500 space-y-1">
              <p>How to activate:</p>
              <ol className="text-left list-decimal list-inside space-y-1">
                <li>Download and install Fractix above.</li>
                <li>Open the app — a license prompt will appear.</li>
                <li>Paste your key and click <strong>"Activate and continue"</strong>.</li>
              </ol>
            </div>
          </>
        )}

        {state.status === "pending" && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Loader2 className="h-10 w-10 text-amber-400" />
              <div>
                <p className="font-semibold">Your license is being processed</p>
                <p className="text-slate-500 text-sm mt-1">
                  This can take a moment. Your license key will be delivered to the email you used at checkout.
                  Check your inbox (and spam folder) shortly.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {state.status === "error" && (
          <Card className="border-red-200">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <div>
                <p className="font-semibold text-red-700">Something went wrong</p>
                <p className="text-slate-500 text-sm mt-1">{state.message}</p>
                <p className="text-slate-500 text-sm mt-2">
                  Your license key will be delivered to the email you used at checkout.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
