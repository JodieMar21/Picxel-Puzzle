export type LicenseEntitlement = {
  entitlement: string;
  deviceId: string;
  nextCheckAt: string;
  activatedAt: string;
};

export type LicenseActivateResponse = {
  entitlement: string;
  nextCheckAt: string;
  maxDevices: number;
  offlineGraceDays: number;
};

export type LicenseValidateResponse = {
  entitlement: string;
  nextCheckAt: string;
  requiresOnlineValidation: boolean;
};
