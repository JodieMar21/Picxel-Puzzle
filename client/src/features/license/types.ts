export type LicenseEntitlement = {
  entitlement: string;
  deviceId: string;
  nextCheckAt: string;
  activatedAt: string;
};

export type LicenseActivateSuccess = {
  entitlement: string;
  nextCheckAt: string;
  maxDevices: number;
  offlineGraceDays: number;
};

export type LicenseActivateTwoFactorChallenge = {
  requiresTwoFactor: true;
  challengeToken: string;
};

export type LicenseActivateResponse = LicenseActivateSuccess | LicenseActivateTwoFactorChallenge;

export function isActivateTwoFactorChallenge(
  response: LicenseActivateResponse,
): response is LicenseActivateTwoFactorChallenge {
  return "requiresTwoFactor" in response && response.requiresTwoFactor === true;
}

export type LicenseTwoFactorStatus = {
  enabled: boolean;
  pendingSetup: boolean;
};

export type LicenseValidateResponse = {
  entitlement: string;
  nextCheckAt: string;
  requiresOnlineValidation: boolean;
};
