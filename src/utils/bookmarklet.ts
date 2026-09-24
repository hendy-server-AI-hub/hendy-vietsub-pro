export function generateBookmarkletCode(serverUrl: string): string {
  const jsCode = `
    (function(){
      if(window.__HENDY_VIETSUB__) {
        console.log('Hendy Vietsub Pro đã hoạt động trên trang này!');
        return;
      }
      window.__HENDY_VIETSUB__ = true;
      var script = document.createElement('script');
      script.src = '${serverUrl}/bookmarklet-overlay.js';
      document.body.appendChild(script);
    })();
  `;
  return `javascript:${encodeURIComponent(jsCode.replace(/\s+/g, ' '))}`;
}
