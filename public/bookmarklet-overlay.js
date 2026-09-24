(function() {
  if (document.getElementById('hendy-vietsub-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'hendy-vietsub-overlay';
  overlay.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.92);backdrop-filter:blur(8px);border:1px solid #3b82f6;color:#f8fafc;padding:12px 20px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.6);z-index:999999;font-family:system-ui,sans-serif;font-size:14px;display:flex;align-items:center;gap:12px;';
  
  overlay.innerHTML = `
    <span style="font-weight:bold;color:#60a5fa;display:flex;align-items:center;gap:6px;">
      🎬 Hendy Vietsub Overlay
    </span>
    <span style="color:#cbd5e1;font-size:12px;" id="hendy-overlay-status">Đang phát hiện video...</span>
    <button id="hendy-overlay-close" style="background:#334155;border:none;color:#94a3b8;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:12px;">Đóng</button>
  `;

  document.body.appendChild(overlay);

  const closeBtn = document.getElementById('hendy-overlay-close');
  if (closeBtn) {
    closeBtn.onclick = function() {
      overlay.remove();
      window.__HENDY_VIETSUB__ = false;
    };
  }

  const videos = document.querySelectorAll('video');
  const statusEl = document.getElementById('hendy-overlay-status');
  if (statusEl) {
    if (videos.length > 0) {
      statusEl.textContent = `Đã kết nối với ${videos.length} video trên trang. Sẵn sàng hiển thị phụ đề song ngữ.`;
      statusEl.style.color = '#34d399';
    } else {
      statusEl.textContent = 'Không tìm thấy thẻ video HTML5 trên trang này.';
      statusEl.style.color = '#fbbf24';
    }
  }
})();
