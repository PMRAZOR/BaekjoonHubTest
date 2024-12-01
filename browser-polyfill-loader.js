(function(global) {
  if (typeof browser === 'undefined') {
    global.browser = chrome;
  }
  
  // Firefox에서 chrome.runtime을 browser.runtime으로 매핑
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    if (!global.browser) global.browser = {};
    global.browser.runtime = chrome.runtime;
  }
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);