// Hendy Vietsub Pro - Extension Popup Script
document.addEventListener('DOMContentLoaded', () => {
  const videoStatus = document.getElementById('videoStatus');
  const btnAudioToggle = document.getElementById('btnAudioToggle');
  const audioBtnText = document.getElementById('audioBtnText');
  const inputDirect = document.getElementById('inputDirect');
  const btnTranslateDirect = document.getElementById('btnTranslateDirect');
  const outputDirect = document.getElementById('outputDirect');

  let isListening = false;

  // Check active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    const tabId = tabs[0].id;

    chrome.tabs.sendMessage(tabId, { action: 'PING' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        videoStatus.textContent = 'Chưa phát hiện video';
        videoStatus.style.background = '#475569';
        return;
      }

      if (response.videoCount > 0) {
        videoStatus.textContent = `Phát hiện ${response.videoCount} video`;
        videoStatus.style.background = '#15803d';
      } else {
        videoStatus.textContent = 'Không có video';
        videoStatus.style.background = '#64748b';
      }

      if (response.isListening) {
        isListening = true;
        audioBtnText.textContent = '⏹️ Dừng Nhận Diện Âm Thanh';
        btnAudioToggle.style.background = '#b91c1c';
      }
    });
  });

  // Toggle Audio Recognition
  btnAudioToggle.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      const tabId = tabs[0].id;

      if (!isListening) {
        chrome.tabs.sendMessage(tabId, { action: 'START_AUDIO_RECOGNITION' }, (res) => {
          if (res && res.success) {
            isListening = true;
            audioBtnText.textContent = '⏹️ Dừng Nhận Diện Âm Thanh';
            btnAudioToggle.style.background = '#b91c1c';
          } else {
            alert(res?.error || 'Không thể bắt đầu nhận diện âm thanh.');
          }
        });
      } else {
        chrome.tabs.sendMessage(tabId, { action: 'STOP_AUDIO_RECOGNITION' }, () => {
          isListening = false;
          audioBtnText.textContent = 'Bật Nhận Diện Âm Thanh Video';
          btnAudioToggle.style.background = 'linear-gradient(135deg, #2563eb, #4f46e5)';
        });
      }
    });
  });

  // Direct Translation
  btnTranslateDirect.addEventListener('click', () => {
    const text = inputDirect.value.trim();
    if (!text) return;

    outputDirect.textContent = 'Đang dịch...';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'TRANSLATE_DIRECT', text }, (res) => {
          if (res && res.translation) {
            outputDirect.textContent = res.translation;
          } else {
            // Fallback translation
            outputDirect.textContent = `[Vietsub] ${text}`;
          }
        });
      } else {
        outputDirect.textContent = `[Vietsub] ${text}`;
      }
    });
  });

  inputDirect.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnTranslateDirect.click();
    }
  });
});
