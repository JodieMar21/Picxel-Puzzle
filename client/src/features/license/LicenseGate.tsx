import { FormEvent, PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { configureLicenseHeaders } from "@/lib/queryClient";
import { activateLicense, deactivateLicense, validateLicense } from "./api";
import { getDeviceId, getDeviceName } from "./device";
import { clearStoredEntitlement, getStoredEntitlement, saveStoredEntitlement } from "./storage";
import type { LicenseEntitlement } from "./types";

const FIVE_MINUTES = 5 * 60 * 1000;

export default function LicenseGate({ children }: PropsWithChildren) {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [licenseKey, setLicenseKey] = useState("");
  const [entitlement, setEntitlement] = useState<LicenseEntitlement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    configureLicenseHeaders(() => {
      if (!entitlement) return {} as Record<string, string>;
      return {
        "x-license-entitlement": entitlement.entitlement,
        "x-device-id": entitlement.deviceId,
      };
    });
  }, [entitlement]);

  useEffect(() => {
    async function bootstrap() {
      const stored = await getStoredEntitlement();
      if (!stored) {
        setIsLoading(false);
        return;
      }

      try {
        const validated = await validateLicense({
          entitlement: stored.entitlement,
          deviceId,
          forceRemote: new Date(stored.nextCheckAt) <= new Date(),
        });

        const refreshed: LicenseEntitlement = {
          entitlement: validated.entitlement,
          nextCheckAt: validated.nextCheckAt,
          deviceId,
          activatedAt: stored.activatedAt,
        };
        await saveStoredEntitlement(refreshed);
        setEntitlement(refreshed);
      } catch (_error) {
        await clearStoredEntitlement();
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [deviceId]);

  useEffect(() => {
    if (!entitlement) return;

    const timer = window.setInterval(async () => {
      const now = new Date();
      const nextCheckAt = new Date(entitlement.nextCheckAt);
      if (nextCheckAt > now) return;

      try {
        const refreshed = await validateLicense({
          entitlement: entitlement.entitlement,
          deviceId,
          forceRemote: true,
        });
        const updated: LicenseEntitlement = {
          ...entitlement,
          entitlement: refreshed.entitlement,
          nextCheckAt: refreshed.nextCheckAt,
        };
        await saveStoredEntitlement(updated);
        setEntitlement(updated);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "License validation failed.");
      }
    }, FIVE_MINUTES);

    return () => window.clearInterval(timer);
  }, [deviceId, entitlement]);

  const handleActivate = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await activateLicense({
        licenseKey: licenseKey.trim(),
        deviceId,
        deviceName: getDeviceName(),
      });

      const payload: LicenseEntitlement = {
        entitlement: response.entitlement,
        nextCheckAt: response.nextCheckAt,
        deviceId,
        activatedAt: new Date().toISOString(),
      };
      await saveStoredEntitlement(payload);
      setEntitlement(payload);
      setLicenseKey("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not activate license.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!entitlement) return;
    setIsSubmitting(true);
    try {
      await deactivateLicense({ entitlement: entitlement.entitlement, deviceId });
    } catch (_error) {
      // Local cleanup should still happen so the user can swap license key.
    } finally {
      await clearStoredEntitlement();
      setEntitlement(null);
      setIsSubmitting(false);
    }
  };

  const handleBuyLicense = async () => {
    setIsBuying(true);
    setErrorMessage(null);
    try {
      const res = await fetch(apiUrl("/api/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "omit",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Could not start checkout." }));
        throw new Error(err.message);
      }
      const { url } = await res.json();
      if (window.desktopApi?.openExternal) {
        await window.desktopApi.openExternal(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not open purchase page.");
    } finally {
      setIsBuying(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Checking license...</div>;
  }

  if (!entitlement) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="pb-2 text-center">
            <div className="flex justify-center mb-3">
              <ShieldCheck className="h-10 w-10 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Activate Fractix</CardTitle>
            <CardDescription>Enter your license key to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <form className="space-y-3" onSubmit={handleActivate}>
              <div className="space-y-1.5">
                <Label htmlFor="licenseKey">License key</Label>
                <Input
                  id="licenseKey"
                  value={licenseKey}
                  onChange={(event) => setLicenseKey(event.target.value)}
                  placeholder="FRACTIX-XXXX-XXXX-XXXX-XXXX"
                  className="font-mono tracking-wide"
                  required
                />
              </div>
              {errorMessage && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {errorMessage}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting || isBuying}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating…</>
                ) : (
                  "Activate and continue"
                )}
              </Button>
            </form>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-slate-400 uppercase tracking-wider">
                or
              </span>
            </div>

            <div className="space-y-3 text-center">
              <p className="text-sm text-slate-500">Don't have a license yet?</p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleBuyLicense}
                disabled={isBuying || isSubmitting}
              >
                {isBuying ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Opening checkout…</>
                ) : (
                  <><ExternalLink className="mr-2 h-4 w-4" />Buy a license</>
                )}
              </Button>
              <p className="text-xs text-slate-400">
                Each license activates on up to 2 devices.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {errorMessage && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm px-4 py-2 flex items-center justify-between">
          <span>{errorMessage}</span>
          <Button variant="outline" size="sm" onClick={handleDeactivate} disabled={isSubmitting}>
            Change license
          </Button>
        </div>
      )}
      {children}
    </>
  );
}
