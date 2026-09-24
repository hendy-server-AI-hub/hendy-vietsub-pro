import { useState, useEffect } from 'react';

export type OperatingSystem = 'windows' | 'mac' | 'linux' | 'ios' | 'android' | 'other';

export function detectOperatingSystem(): OperatingSystem {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/win/.test(ua)) return 'windows';
  if (/mac/.test(ua)) return 'mac';
  if (/linux/.test(ua)) return 'linux';
  return 'other';
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [os, setOs] = useState<OperatingSystem>('windows');

  useEffect(() => {
    setOs(detectOperatingSystem());

    // Check if already in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      (window as any).deferredInstallPrompt = e;
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      (window as any).deferredInstallPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'manual-ios'> => {
    if (os === 'ios') {
      return 'manual-ios';
    }

    if (!deferredPrompt) {
      return 'dismissed';
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
    (window as any).deferredInstallPrompt = null;
    return outcome;
  };

  const getOsLabel = () => {
    switch (os) {
      case 'windows': return 'Windows';
      case 'mac': return 'macOS';
      case 'linux': return 'Linux';
      case 'ios': return 'iOS';
      case 'android': return 'Android';
      default: return 'Desktop';
    }
  };

  const handleInstallClick = async () => {
    const outcome = await promptInstall();
    if (outcome === 'manual-ios') {
      alert("Trên Safari iOS: Nhấn biểu tượng 'Chia sẻ' ở dưới cùng rồi chọn 'Thêm vào Màn hình chính' (Add to Home Screen).");
    } else if (outcome === 'dismissed' && !isInstalled) {
      alert(`Để cài đặt ứng dụng trên ${getOsLabel()}: Nhấn biểu tượng Cài đặt (+) trên thanh địa chỉ trình duyệt hoặc Menu > Cài đặt ứng dụng.`);
    }
  };

  return {
    isInstallable,
    isInstalled,
    os,
    getOsLabel,
    handleInstallClick,
    promptInstall,
  };
}
