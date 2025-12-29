import { useState, useEffect, useCallback } from 'react';

interface FingerprintData {
  userAgent: string;
  language: string;
  screenResolution: string;
  timezone: string;
  platform: string;
  colorDepth: number;
  touchSupport: boolean;
  cookiesEnabled: boolean;
  doNotTrack: string | null;
  hardwareConcurrency: number;
  deviceMemory: number | undefined;
  webglVendor: string;
  webglRenderer: string;
  canvasFingerprint: string;
}

// Generate a stable fingerprint hash from browser characteristics
async function generateFingerprint(): Promise<string> {
  const data: FingerprintData = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenResolution: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform,
    colorDepth: screen.colorDepth,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory,
    webglVendor: '',
    webglRenderer: '',
    canvasFingerprint: '',
  };

  // WebGL fingerprinting
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        data.webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
        data.webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      }
    }
  } catch {
    // WebGL not available
  }

  // Canvas fingerprinting (simplified)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(10, 10, 100, 30);
      ctx.fillStyle = '#069';
      ctx.font = '14px Arial';
      ctx.fillText('FP Test 🔐', 20, 30);
      data.canvasFingerprint = canvas.toDataURL().slice(-50);
    }
  } catch {
    // Canvas not available
  }

  // Create fingerprint string
  const fingerprintString = JSON.stringify(data);
  
  // Hash the fingerprint
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for cached fingerprint first
    const cached = sessionStorage.getItem('_dfp');
    if (cached) {
      setFingerprint(cached);
      setIsLoading(false);
      return;
    }

    generateFingerprint().then(fp => {
      sessionStorage.setItem('_dfp', fp);
      setFingerprint(fp);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  const refreshFingerprint = useCallback(async () => {
    const fp = await generateFingerprint();
    sessionStorage.setItem('_dfp', fp);
    setFingerprint(fp);
    return fp;
  }, []);

  return { fingerprint, isLoading, refreshFingerprint };
}

export { generateFingerprint };
