import * as Application from 'expo-application';

const VERSIONS_URL = 'https://downloads.kaviar.com.br/app-versions.json';

export interface VersionInfo {
  latestVersion: string;
  minSupportedVersion: string;
  versionCode: number;
  mandatory: boolean;
  apkUrl: string;
  message: string;
}

export interface VersionCheckResult {
  needsUpdate: boolean;
  mandatory: boolean;
  message: string;
  apkUrl: string;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

export async function checkAppVersion(variant: 'driver' | 'passenger'): Promise<VersionCheckResult | null> {
  try {
    const res = await fetch(VERSIONS_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const info: VersionInfo | undefined = data[variant];
    if (!info) return null;

    const current = (Application.nativeApplicationVersion || '0.0.0').split('-')[0];
    const isBelowLatest = compareVersions(current, info.latestVersion) < 0;
    const isBelowMin = compareVersions(current, info.minSupportedVersion) < 0;

    if (!isBelowLatest) return null;

    return {
      needsUpdate: true,
      mandatory: info.mandatory || isBelowMin,
      message: info.message,
      apkUrl: info.apkUrl,
    };
  } catch {
    return null;
  }
}
