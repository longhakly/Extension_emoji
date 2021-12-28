
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    config.getStorage().then(features => {
      chrome.storage.sync.set(features);
    });
  }

  if (details.reason === "update") {

  }
  chrome.browserAction.setBadgeBackgroundColor({ color: [240, 104, 104, 1] });
  chrome.browserAction.setBadgeText({ text: "new" });

});

chrome.runtime.onMessage.addListener((message) => {
  if (message.popupOpen) {
    chrome.browserAction.setBadgeText({ text: "" });
  }
});
 
chrome.runtime.onMessage.addListener(() => {
  config.get(['findActive']).then(({findActive}) => {
    if(findActive === true){
      let found = false;
      let tabId = undefined;
      let currentTabId = undefined;
    
      chrome.tabs.query(
        { active: true, windowType: "normal", currentWindow: true },
        (tab) => {
          currentTabId = tab[0].id;
          chrome.tabs.query({}, (tabs) => {
            for (var i = 0; i < tabs.length; i++) {
              if (tabs[i].audible) {
                found = true;
                tabId = tabs[i].id;
                winId = tabs[i].windowId;
              }
            }
        
            if (found == true && tabId != currentTabId) {
              chrome.tabs.update(tabId, { active: true });
              setTimeout(() => {
                chrome.windows.update(winId, { focused: true });
              }, 200);
            }
          });
        });
    }
  });    


});

