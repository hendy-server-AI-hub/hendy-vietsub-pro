// Cross-Platform Native Binary Packaging & Client Downloader Helper

export function triggerAppDownload(platform: 'windows' | 'mac' | 'linux' | 'pwa' | 'web') {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://hendystudio.pages.dev';

  if (platform === 'pwa') {
    if ((window as any).deferredInstallPrompt) {
      (window as any).deferredInstallPrompt.prompt();
      return { success: true, message: 'Đang mở cửa sổ cài đặt ứng dụng PWA vào hệ thống...' };
    }
    return {
      success: true,
      message: 'Nhấn biểu tượng Cài đặt trên thanh địa chỉ hoặc mục "Cài app" trên thanh điều khiển để cài đặt.'
    };
  }

  let filename = '';
  let content = '';
  let mimeType = 'text/plain';

  if (platform === 'windows') {
    filename = 'Launch-Hendy-Studio.bat';
    content = `@echo off
title Hendy Vietsub Studio Pro Launcher
echo Starting Hendy Vietsub Studio Pro in Standalone App Window...
start msedge --app="${currentOrigin}" || start chrome --app="${currentOrigin}" || start "" "${currentOrigin}"
exit
`;
  } else if (platform === 'mac') {
    filename = 'Launch-Hendy-Studio.command';
    content = `#!/bin/bash
# Hendy Vietsub Studio Pro macOS Launcher
open -na "Google Chrome" --args --app="${currentOrigin}" || open "${currentOrigin}"
`;
  } else if (platform === 'linux') {
    filename = 'hendy-vietsub-pro.desktop';
    content = `[Desktop Entry]
Version=1.0
Type=Application
Name=Hendy Vietsub Studio Pro
Comment=AI Subtitle Generator & Cinema Translation Studio
Exec=google-chrome --app="${currentOrigin}" || xdg-open "${currentOrigin}"
Icon=video-x-generic
Terminal=false
Categories=AudioVideo;Video;AudioVideoEditing;
StartupWMClass=HendyStudio
`;
  } else {
    filename = 'hendy-studio-config.json';
    content = JSON.stringify({
      name: "Hendy Vietsub Studio Pro",
      url: currentOrigin,
      display: "standalone",
      theme_color: "#0a0a0a"
    }, null, 2);
    mimeType = 'application/json';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    success: true,
    message: `Đã tải xuống tệp khởi chạy ứng dụng cho ${platform.toUpperCase()}`
  };
}
