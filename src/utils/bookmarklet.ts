export function generateBookmarkletCode(serverUrl: string): string {
  const jsCode = `
    (function(){
      if(window.__HENDY_VIETSUB__) return alert('Hendy Vietsub Pro đã hoạt động trên trang này!');
      window.__HENDY_VIETSUB__ = true;
      var script = document.createElement('script');
      script.src = '${serverUrl}/bookmarklet-overlay.js';
      document.body.appendChild(script);
    })();
  `;
  return `javascript:${encodeURIComponent(jsCode.replace(/\s+/g, ' '))}`;
}
