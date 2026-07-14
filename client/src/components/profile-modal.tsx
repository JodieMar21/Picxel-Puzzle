import { useEffect, useRef, useState } from "react";
import { Camera, LogOut, Monitor, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useLicense } from "@/features/license/LicenseGate";
import { getProfile, saveProfile, clearProfile } from "@/features/profile/storage";
import type { UserProfile } from "@/features/profile/types";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LogoutTarget = "device" | "all" | null;

function getInitials(name: string, username: string): string {
  const source = name.trim() || username.trim();
  if (!source) return "U";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { logout, logoutAll } = useLicense();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const [logoutTarget, setLogoutTarget] = useState<LogoutTarget>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const stored = getProfile();
      setName(stored?.name ?? "");
      setUsername(stored?.username ?? "");
      setAvatarDataUrl(stored?.avatarDataUrl ?? null);
      setSavedBanner(false);
    }
  }, [open]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setIsSaving(true);
    const profile: UserProfile = { name, username, avatarDataUrl };
    saveProfile(profile);
    setIsSaving(false);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const handleConfirmLogout = async () => {
    if (!logoutTarget) return;
    setIsLoggingOut(true);
    try {
      clearProfile();
      if (logoutTarget === "all") {
        await logoutAll();
      } else {
        await logout();
      }
    } finally {
      setIsLoggingOut(false);
      setLogoutTarget(null);
    }
  };

  const initials = getInitials(name, username);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar className="h-20 w-20 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <AvatarImage src={avatarDataUrl ?? undefined} alt="Profile avatar" />
                  <AvatarFallback className="text-xl font-semibold bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Change avatar"
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Click avatar to upload a photo</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Profile fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-username">Username</Label>
                <Input
                  id="profile-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username"
                />
              </div>
            </div>

            {savedBanner && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-center">
                Profile saved.
              </p>
            )}

            <Button className="w-full" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save profile"}
            </Button>

            <Separator />

            {/* Logout section */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Session</p>
              <Button
                variant="outline"
                className="w-full justify-start text-left gap-2"
                onClick={() => setLogoutTarget("device")}
              >
                <Monitor className="h-4 w-4 text-gray-500" />
                Log out from this device
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-left gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setLogoutTarget("all")}
              >
                <LogOut className="h-4 w-4" />
                Log out from all devices
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation: log out this device */}
      <AlertDialog open={logoutTarget === "device"} onOpenChange={(o) => !o && setLogoutTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out from this device?</AlertDialogTitle>
            <AlertDialogDescription>
              Your license will be deactivated on this device. You can reactivate it later using your license key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLogout}
              disabled={isLoggingOut}
              className="bg-gray-900 hover:bg-gray-800"
            >
              {isLoggingOut ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging out…</> : "Log out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation: log out all devices */}
      <AlertDialog open={logoutTarget === "all"} onOpenChange={(o) => !o && setLogoutTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out from all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate your license on every device, including this one. You'll need to reactivate on each device using your license key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLogout}
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isLoggingOut ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging out…</> : "Log out from all devices"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
