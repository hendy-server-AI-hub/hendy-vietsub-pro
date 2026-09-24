// Hendy Vietsub Pro - Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  console.log('Hendy Vietsub Pro Extension installed.');

  // Create context menu for direct translation
  chrome.contextMenus.create({
    id: 'hendy-translate-selection',
    title: 'Dịch sang tiếng Việt điện ảnh bằng Hendy AI',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'hendy-translate-selection' && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'TRANSLATE_DIRECT',
      text: info.selectionText
    });
  }
});
