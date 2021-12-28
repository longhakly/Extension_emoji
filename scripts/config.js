'use strict';

var config = {
    "plugin-enabled":true,
    "autoAdmit":false,
    "autoReject":false,
    "autoCaptions":false,
    "autoChat":false,
    "autoFullScreen":false,
    "autoJoin":false,
    "hideCommentBubble":false,
    "hideComments":false,
    "keyCode":{
        keyCode: 32,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
    },
    "speakerBorder":false,
    "borderColor":"#64ffda",
    "muteMicrophone":false,
    "mutePopup":false,
    "muteVideo":false,
    "quickLeave":false,
    "smartUnmute":false,
    "transBar":false,
    "displayClock":false,
    "darkMode":false,
    "pictureInPicture":false,
    "noAddOthers":false,
    "mirrorVideos":false,
    "meetingTimer":false,
    "pinBottomBar":false,
    "toggleBottomBar":false,
    "removeAll":false,
    "hideNames":false,
    "leavePrompt":false,
    "setBackgroundColor":false,
    "backgroundColor":"#111111",
    "autoUnmute":false,
    "muteAll":false,
    "findActive":false,
    "quickEmoji":true
};

const features = [
  "quickEmoji"
];

config.get = arr => new Promise(resolve => {
  const ps = arr.reduce((p, c) => {
    p[c] = config[c];
    return p;
  }, {});
  chrome.storage.sync.get(ps, resolve);
});

config.getStorage = () => new Promise(resolve =>{
    config.get(features).then(resolve);
})
