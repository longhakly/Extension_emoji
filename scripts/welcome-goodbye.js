var homepage = function () {return chrome.runtime.getManifest().homepage_url};
chrome.runtime.setUninstallURL(homepage() + "uninstall", function () {});
chrome.runtime.onInstalled.addListener(function (e) {
    if (e.reason === "install") {
      chrome.tabs.create({url:homepage() + "successful-installation", active:true});
    }
});