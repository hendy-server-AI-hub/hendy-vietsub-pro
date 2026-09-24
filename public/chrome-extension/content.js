// Hendy Vietsub Pro - In-Page Content Script
(() => {
  if (window.__HENDY_EXTENSION_INJECTED__) return;
  window.__HENDY_EXTENSION_INJECTED__ = true;

  let overlayContainer = null;
  let subBox = null;
  let recognition = null;
  let isListening = false;

  // Dictionary for direct translation
  const cinemaDict = {
    'hello': 'Xin chào.',
    'welcome': 'Chào mừng bạn.',
    'welcome to our movie': 'Chào mừng bạn đến với bộ phim của chúng tôi.',
    'what are you doing': 'Cậu đang làm cái gì vậy?',
    'i need help': 'Tôi cần sự giúp đỡ.',
    'let us go': 'Đi thôi!',
    "let's go": 'Đi thôi nào!',
    'look at this': 'Hãy nhìn vào đây.',
    'be careful': 'Cẩn thận đấy!',
    'thank you': 'Cảm ơn bạn.',
    'goodbye': 'Tạm biệt.'
  };

  function translateDirectly(text) {
    if (!text) return '';
    const norm = text.toLowerCase().trim().replace(/[.,!?]+$/, '');
    if (cinemaDict[norm]) return cinemaDict[norm];
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text)) {
      return text;
    }
    return `[Vietsub] ${text}`;
  }

  function createOverlay(targetVideo) {
    if (overlayContainer) return;

    overlayContainer = document.createElement('div');
    overlayContainer.className = 'hendy-sub-container';

    subBox = document.createElement('div');
    subBox.className = 'hendy-sub-box';
    subBox.innerHTML = `<div>Hendy Vietsub Pro: Sẵn sàng dịch trực tiếp</div>`;

    overlayContainer.appendChild(subBox);

    const parent = targetVideo.parentElement || document.body;
    if (window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(overlayContainer);
  }

  function updateSubtitle(vietnamese, original) {
    if (!subBox) return;
    subBox.innerHTML = `
      <div>${vietnamese}</div>
      ${original ? `<div class="hendy-sub-original">${original}</div>` : ''}
    `;
    if (overlayContainer) {
      overlayContainer.style.display = 'block';
    }
  }

  // Setup Web Speech Recognition for Live Audio Recognition
  function setupSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }

    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const activeText = final || interim;
      if (activeText) {
        const trans = translateDirectly(activeText);
        updateSubtitle(trans, activeText);
      }
    };

    recognition.onerror = (e) => {
      console.warn('Hendy Speech Recognition error:', e.error);
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch (_) {}
      }
    };
  }

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING') {
      const videoCount = document.querySelectorAll('video').length;
      sendResponse({ status: 'OK', videoCount, isListening });
      return true;
    }

    if (request.action === 'START_AUDIO_RECOGNITION') {
      const videos = document.querySelectorAll('video');
      if (videos.length > 0) {
        createOverlay(videos[0]);
      }
      if (!recognition) setupSpeechRecognition();
      if (recognition) {
        try {
          recognition.start();
          isListening = true;
          sendResponse({ success: true, message: 'Đã bật nhận diện âm thanh trực tiếp' });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      } else {
        sendResponse({ success: false, error: 'Trình duyệt không hỗ trợ Web Speech Recognition' });
      }
      return true;
    }

    if (request.action === 'STOP_AUDIO_RECOGNITION') {
      isListening = false;
      if (recognition) {
        try { recognition.stop(); } catch (_) {}
      }
      if (overlayContainer) {
        overlayContainer.style.display = 'none';
      }
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'TRANSLATE_DIRECT') {
      const trans = translateDirectly(request.text);
      sendResponse({ success: true, translation: trans });
      return true;
    }
  });

  // Inject floating quick trigger badge on page
  const badge = document.createElement('div');
  badge.className = 'hendy-floating-badge';
  badge.innerHTML = `<span>🎬 Hendy Vietsub</span>`;
  badge.title = 'Nhấp để mở chế độ dịch phụ đề trực tiếp';
  badge.onclick = () => {
    const videos = document.querySelectorAll('video');
    if (videos.length > 0) {
      createOverlay(videos[0]);
      updateSubtitle('Đang kích hoạt nhận diện âm thanh trực tiếp...', 'Hendy Vietsub Pro Active');
      if (!recognition) setupSpeechRecognition();
      if (recognition && !isListening) {
        try {
          recognition.start();
          isListening = true;
        } catch (_) {}
      }
    } else {
      alert('Không tìm thấy video nào trên trang web này.');
    }
  };
  document.body.appendChild(badge);
})();
