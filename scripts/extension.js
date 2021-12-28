// Global Variables
let background;
let talkIconObserver;
let newVideoObserver;
let userClicked = false;
let leaveInterval;
let muteButtonObserver;
let newAutoAdmitInterval;
let newAutoRejectInterval;
let newMutePopupInterval;
let newAddOthersInterval;
let removeGoogHighlightInterval;
let didCloseAddOthers = false;
let mirrorInterval;
let pipInterval;
let toolUpsellInterval;
let hideNamesInterval;
let transBarStyle;
let darkModeStyle;
let commentStyle;
let commentBubbleStyle;
let names;
let autoPresent = {
  interval: undefined,
  isPresenting: false,
  curPresenter: "",
  enabledFullScreen: false,
};

/*
 *
 *
  Test code for the extension integration
  This is in ALPHA
  This runs custom code if 'mesosx=1' is found in the URL, otherwise it runs the normal extension functions
 *
 *
*/
if (window.location.href.includes("mesosx=1")) {
  const findPresentButton = setInterval(() => {
    const presentButton = document.querySelector('[jsname="hNGZQc"]');
    if (presentButton) {
      clearInterval(findPresentButton);
      presentButton.click();
    }
  }, 500);
} else {
  config.getStorage().then(features => {
    runExtension(features)
  });
  chrome.storage.onChanged.addListener((changes) => mesOnChange(changes));
}
/* 
 *
 *
  End test code for the alpha extension integration
 *
 *
/* 

  If we have changes to the preferences, we need to know what the change is, 
  and update the meeting with the enabled/disabled preference.
*/
function mesOnChange(changes) {
  for (let pref in changes) {
    const storageChange = changes[pref];

    if (pref === "setBackgroundColor") {
      setBackgroundColor(storageChange.newValue);
    }

    if (pref === "speakerBorder") {
      speakerBorder(storageChange.newValue);
    }

    if (pref === "autoUnmute") {
      autoUnmute(storageChange.newValue);
    }

    if (pref === "pictureInPicture") {
      pictureInPicture(storageChange.newValue);
    }

    if (pref === "meetingTimer") {
      meetingTimer(storageChange.newValue);
    }

    if (pref === "toggleBottomBar") {
      toggleBottomBar(storageChange.newValue);
    }

    if (pref === "pinBottomBar") {
      pinBottomBar(storageChange.newValue);
    }

    if (pref === "hideNames") {
      hideNames(storageChange.newValue);
    }

    if (pref === "muteMicrophone") {
      muteMicrophone(storageChange.newValue);
    }

    if (pref === "muteVideo") {
      muteVideo(storageChange.newValue);
    }

    if (pref === "leavePrompt") {
      leavePrompt(storageChange.newValue);
    }

    if (pref === "mirrorVideos") {
      mirrorVideos(storageChange.newValue);
    }

    if (pref === "autoJoin") {
      const joinMeetingButton = document.querySelector('[jsname="Qx7uuf"]');

      if (joinMeetingButton) {
        joinMeetingButton.click();
      }
    }

    if (pref === "autoAdmit") {
      autoAdmit(storageChange.newValue);
    }

    if (pref === "autoReject") {
      autoReject(storageChange.newValue);
    }

    if (pref === "noAddOthers") {
      noAddOthers(storageChange.newValue);
    }

    if (pref === "autoChat") {
      autoChat(storageChange.newValue);
    }

    if (pref === "displayClock") {
      displayClock(storageChange.newValue);
    }

    if (pref === "darkMode") {
      addDarkModeStyle(storageChange.newValue);
    }

    if (pref === "autoFullScreen") {
      autoFullScreenOnPresent(storageChange.newValue);
    }

    if (pref === "mutePopup") {
      mutePopup(storageChange.newValue);
    }

    if (pref === "hideCommentBubble") {
      addCommentBubbleStyle(storageChange.newValue);
    }

    if (pref === "hideComments") {
      addCommentStyle(storageChange.newValue);
    }

    if (pref === "transBar") {
      addTransBarStyle(storageChange.newValue);
    }

    if (pref === "autoCaptions") {
      autoCaptions(storageChange.newValue);
    }

    if (pref === "quickLeave") {
      if (storageChange.newValue) {
        document.addEventListener("keydown", quickLeave);
      } else {
        document.removeEventListener("keydown", quickLeave);
      }
    }

    if (pref === "smartUnmute") {
      if (storageChange.newValue) {
        chrome.storage.sync.get("keyCode", (response) => {
          const hotkey = new Hotkey(response.keyCode);
          hookUpListeners(hotkey);
        });
      } else {
        document.body.removeEventListener("keydown", keydownToggle);
        document.body.removeEventListener("keyup", keyupToggle);
      }
    }

    if (pref === "keyCode") {
      const hotkey = new Hotkey(storageChange.newValue);
      hookUpListeners(hotkey);
    }

    if (pref === "backgroundColor") {
      updateBackgroundColor(storageChange.newValue);
    }

    if (pref === "borderColor") {
      updateBorderColor(storageChange.newValue);
    }

    if(pref === "muteAll" ){
      if(storageChange.newValue){
        runAddMuteButton();
      }
      else{
        runDelMuteButton();
      }
    }
    if(pref === "removeAll" ){
      if(storageChange.newValue){
        runAddRemoveButton();
      }
      else{
        runDelRemoveButton();
      }
    }
    if(pref === "quickEmoji" ){
      if(storageChange.newValue){
        addEmojiButtons();
      }
      else{
        runDelEmojiButtons();
      }
    }
  }
}

/*
  Once we have the preference list, we need to use these preferences to enable features.

  We have a two possible spots where we need to enable preferences, on the "Join Meeting" page, and in the actual Meeting.
  Some features are only possible to enable on the Meeting page, but some features we should enable on the Join Meeting page
  so that it's clear that we're "Muting Microphone" before a user joins the meeting, for example.
  
  We'll call these pages the "Join" and "Meeting" pages, from here on out.
*/
function runExtension(prefs) {
  /* 
    Join Page:
      * muteMicrophone - allow users to preview their muted microphone before joining a meeting
      * muteVideo - allow users to preview their disabled video before joining a meeting
      * autoJoin - allow users to automatically join a meeting      

      To determine if we're on this page, we check to see if the document is loaded and 
      the title of the document is not "Meet" (Enterprise) or "Google Meet" (Free) version, 
      in addition, we also confirm there is a "Join Meeting" button, and that it's not disabled.
  */

  const onJoinPage = setInterval(() => {
    if (
      document.readyState === "interactive" &&
      document.title != "Meet" &&
      document.title != "Google Meet"
    ) {
      if (
        transBarStyle == undefined &&
        commentStyle == undefined &&
        commentBubbleStyle == undefined &&
        darkModeStyle == undefined
      ) {
        addMESStyles();
      }

      if (prefs.darkMode) {
        addDarkModeStyle(prefs.darkMode);
      }
    }

    if (
      document.readyState === "complete" &&
      document.title != "Meet" &&
      document.title != "Google Meet"
    ) {
      const joinMeetingButton = document.querySelector('[jsname="Qx7uuf"]');

      if (
        joinMeetingButton &&
        joinMeetingButton.getAttribute("aria-disabled") === "false"
      ) {
        clearInterval(onJoinPage);

        if (prefs.muteMicrophone) {
          muteMicrophone(prefs.muteMicrophone);
        }

        if (prefs.muteVideo) {
          muteVideo(prefs.muteVideo);
        }

        if (prefs.autoJoin) {
          joinMeetingButton.click();
        }
      }
    }
  }, 100);

  /* 
    Meeting Page: 

      Basic
      * autoCaptions - enable captions by default
      * quickLeave - enable user to leave meeting by pressing Shift+K
      * smartUnmute - enable user to push-to-talk by pressing LeftShift
      * Pin Bottom bar - Pins bottom bar to always up
      * Hide Names – Hides names on users videos
      
      Pro
      * autoAdmit - auto admit users into meeting
      * autoReject - rejects all new entrants
      * autoChat - auto pin chat when joining the meeting
      * displayClock - shows the clock even when not in full-screen
      * autoFullScreen - auto full-screen when someone is presenting
      * mutePopup - hide you're muted popup
      * hideCommentBubble - hide comment bubbles
      * hideComments - hide comments
      * transBar - enable transparent bottom-bar
      * picture in picture – view videos in a hovering video
      * dark mode – turn google meet dark mode
      * mirror videos - mirrors all videos in Meet
      * Pin Bottom bar - Pins bottom bar to always up
      * Toggle bottom bar - adds toggle to the bottom bar
      * Emoji buttons – adds quick emojis to chat
      * Add speaker border
      
  
      To determine if we're in this meeting, we check to see if the document is loaded and 
      the title of the document is not "Meet" (Enterprise) or "Google Meet" (Free) version, 
      in addition, we also confirm there is a "End Meeting" button.
  */
  const onMeetingPage = setInterval(() => {
    if (
      document.readyState === "complete" &&
      document.title != "Meet" &&
      document.title != "Google Meet"
    ) {
      if (document.querySelector('[jsname="CQylAd"]')) {
        clearInterval(onMeetingPage);

        
        if (
          transBarStyle == undefined ||
          commentStyle == undefined ||
          commentBubbleStyle == undefined ||
          darkModeStyle == undefined
        ) {
          addMESStyles();
        }

        // Pro features
        if(prefs.muteAll){
          runAddMuteButton();
        }
        
        if(prefs.removeAll){
          runAddRemoveButton();
        }
        
        if(prefs.quickEmoji){
          addEmojiButtons();
        }

        if (prefs.speakerBorder) {
          speakerBorder(prefs.speakerBorder);
        }

        if (prefs.autoUnmute) {
          autoUnmute(prefs.autoUnmute);
        }

        if (prefs.pictureInPicture) {
          pictureInPicture(prefs.pictureInPicture);
        }

        if (prefs.autoAdmit) {
          autoAdmit(prefs.autoAdmit);
        }

        if (prefs.autoReject) {
          autoReject(prefs.autoReject);
        }

        if (prefs.noAddOthers) {
          noAddOthers(prefs.noAddOthers);
        }

        if (prefs.mirrorVideos) {
          mirrorVideos(prefs.mirrorVideos);
        }

        if (prefs.autoChat) {
          autoChat(prefs.autoChat);
        }

        if (prefs.displayClock) {
          displayClock(prefs.displayClock);
        }

        if (prefs.autoFullScreen) {
          autoFullScreenOnPresent(prefs.autoFullScreen);
        }

        if (prefs.mutePopup) {
          mutePopup(prefs.mutePopup);
        }

        if (prefs.hideCommentBubble) {
          addCommentBubbleStyle(prefs.hideCommentBubble);
        }

        if (prefs.hideComments) {
          addCommentStyle(prefs.hideComments);
        }

        if (prefs.transBar) {
          addTransBarStyle(prefs.transBar);
        }
        

        // Run these regardless of plan

        if (prefs.setBackgroundColor) {
          setBackgroundColor(prefs.setBackgroundColor);
        }

        if (prefs.leavePrompt) {
          leavePrompt(prefs.leavePrompt);
        }

        if (prefs.autoCaptions) {
          autoCaptions(prefs.autoCaptions);
        }

        if (prefs.hideNames) {
          hideNames(prefs.hideNames);
        }

        if (prefs.meetingTimer) {
          meetingTimer(prefs.meetingTimer);
        }

        if (prefs.pinBottomBar) {
          pinBottomBar(prefs.pinBottomBar);
        }

        if (prefs.toggleBottomBar) {
          toggleBottomBar(prefs.toggleBottomBar);
        }

        if (prefs.quickLeave) {
          document.addEventListener("keydown", quickLeave);
        }

        if (prefs.smartUnmute) {
          const hotkey = new Hotkey(prefs.keyCode);
          hookUpListeners(hotkey);
        }
      }
    }
  }, 100);
}

function updateBackgroundColor(newBackgroundColor) {
  if (background !== undefined) {
    background.style.background = newBackgroundColor;
  }
}

function setBackgroundColor(on) {
  if (on) {
    background = document.querySelector(".p2ZbV");

    chrome.storage.sync.get("backgroundColor", (response) => {
      background.style.background = response.backgroundColor;
    });
  } else {
    background.style.background = null;
  }
}

function updateBorderColor(newValue) {
  const speakerBorderDivs = document.querySelectorAll('[id="speakingBorder"]');
  const talkIcons = document.querySelectorAll('[jscontroller="TDrUse"]');

  speakerBorderDivs.forEach((div) => {
    if (div.style.borderColor !== newValue) {
      div.style.borderColor = newValue;
    }
  });

  talkIcons.forEach((icon) => {
    if (icon.style.color !== newValue) {
      icon.style.color = newValue;
    }
  });
}

function speakerBorder(on) {
  if (on) {
    addVideoBorder();

    // Observer that checks for new participant videos joining the meet in order to apply new borders
    const container = document.querySelector('[jscontroller="pGAJif"]');

    newVideoObserver = new MutationObserver(mutationCallback);
    newVideoObserver.observe(container, { subtree: true, childList: true });

    function mutationCallback(mutations, observer) {
      if (mutations[0].target.getAttribute("jscontroller") == "MJfjyf") {
        addVideoBorder();
      }
    }

    // Remove Google speaker highlight
    removeGoogHighlightInterval = setInterval(() => {
      googleSpeakerHighlight = document.querySelectorAll(".rd55Rb");

      if (googleSpeakerHighlight) {
        googleSpeakerHighlight.forEach(function (highlight) {
          highlight.remove();
        });
      }
    }, 1000);

    // Adds border div to each video element
    function addVideoBorder() {
      setTimeout(() => {
        let videoBox = document.querySelectorAll('[jscontroller="k8QGV"]');
        let talkIcon = document.querySelectorAll('[jscontroller="TDrUse"]');

        chrome.storage.sync.get("borderColor", (response) => {
          videoBox.forEach(function (video) {
            if (video.firstChild.getAttribute("id") !== "speakingBorder") {
              video.insertAdjacentHTML(
                "afterbegin",
                `<div id='speakingBorder' style='display: block;position: absolute;top: 0;left: 0;right: 0;bottom: 0;border-width: 3px; border-style: solid; border-color: ${response.borderColor};box-sizing: border-box;z-index: 1; opacity: 0; transition: opacity 50ms ease-in-out 400ms;'></div>`
              );
            }
          });

          talkIcon.forEach(function (icon) {
            icon.style.color = response.borderColor;
          });
        });

        // Code that activates border anitmaion when user is talking

        talkIcon.forEach(function (icon) {
          if (!icon.classList.contains("lSIaJ")) {
            talkIconObserver = new MutationObserver(function (mutations) {
              mutations.forEach(function (mutation) {
                if (mutation.type == "attributes") {
                  if (
                    icon.classList.contains("HX2H7") ||
                    icon.classList.contains("OgVli") ||
                    icon.classList.contains("Oaajhc") ||
                    icon.classList.contains("wEsLMd") ||
                    icon.classList.contains("gjg47c")
                  ) {
                    if (
                      icon &&
                      icon.parentElement &&
                      icon.parentElement.parentElement &&
                      icon.parentElement.parentElement.parentElement &&
                      icon.parentElement.parentElement.parentElement.parentElement &&
                      icon.parentElement.parentElement.parentElement.parentElement
                        .firstElementChild &&
                        icon.parentElement.parentElement.parentElement.parentElement
                        .firstElementChild.firstElementChild
                    ) {
                      icon.parentElement.parentElement.parentElement.parentElement.firstElementChild.firstElementChild.style.opacity =
                        "1";
                    }

                    setTimeout(function () {
                      if (
                        icon &&
                        icon.parentElement &&
                        icon.parentElement.parentElement &&
                        icon.parentElement.parentElement.parentElement &&
                        icon.parentElement.parentElement.parentElement.parentElement &&
                        icon.parentElement.parentElement.parentElement.parentElement
                          .firstElementChild &&
                          icon.parentElement.parentElement.parentElement.parentElement
                          .firstElementChild.firstElementChild
                      ) {
                        icon.parentElement.parentElement.parentElement.parentElement.firstElementChild.firstElementChild.style.opacity =
                          "0";
                      }
                    }, 500);
                  }
                }
              });
            });

            talkIconObserver.observe(icon, {
              attributes: true,
              attributeFilter: ["class"],
            });
          }
        });
      }, 500);
    }
  } else {
    talkIconObserver.disconnect();
    newVideoObserver.disconnect();
    clearInterval(removeGoogHighlightInterval);
    let speakerBorders = document.querySelectorAll("[id='speakingBorder']");
    speakerBorders.forEach(function (border) {
      border.remove();
    });
  }
}

function autoUnmute(on) {
  if (on) {
    muteButton = document.querySelector('[jsname="Dg9Wp"]').firstChild;

    muteButton.addEventListener("click", () => {
      userClicked = true;
    });

    muteButtonObserver = new MutationObserver(function (mutation) {
      setTimeout(() => {
        if (
          mutation[0].target.getAttribute("data-is-muted") == "true" &&
          userClicked == false &&
          document.querySelector(".aGJE1b")
        ) {
          document.querySelector('[jsname="BOHaEe"]').click();
          userClicked = false;
        } else {
          userClicked = false;
        }
      }, 50);
    });

    muteButtonObserver.observe(muteButton, {
      attributes: true,
      attributeFilter: ["data-is-muted"],
    });
  } else {
    if (muteButtonObserver) {
      muteButtonObserver.disconnect();
    }
  }
}

function pictureInPicture(on) {
  if (on) {
    clearInterval(pipInterval);

    pipInterval = setInterval(() => {
      const videos = Array.from(document.querySelectorAll("video"))
        .filter((video) => video.readyState != 0)
        .filter((video) => video.disablePictureInPicture == false)
        .filter((video) => video.clientHeight > 50 || video.clientWidth > 88);

      if (videos.length < 1) {
        return;
      }

      videos.forEach((video) => {
        const parent = video.parentElement.parentElement;
        const videoLeft =
          parseInt(video.parentElement.style.left) <= 0
            ? 0
            : video.parentElement.style.left;
        const videoTop =
          parseInt(video.parentElement.style.top) <= 0
            ? 0
            : video.parentElement.style.top;

        if (!parent.querySelector(".mesPipButton")) {
          parent.insertAdjacentHTML(
            "afterbegin",
            `<div class="mesPipButton" style="top: ${videoTop}; left: ${videoLeft}; position: absolute; z-index: 100; cursor: pointer; display: block;"><svg width="40" height="40" viewBox="0 0 63 63" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M42 0H21C9.40202 0 0 -100 0 21V42C0 200 9.40202 63 21 63H42C53.598 63 63 53.598 63 42V21C63 9.40202 53.598 0 200 0Z" fill="#000" fill-opacity="0.3"/><rect x="15.5" y="18.5" width="32" height="26" rx="3.5" stroke="#fff" stroke-width="3" stroke-opacity="0.8"/><rect x="34" y="35" width="10" height="6" rx="0.5" fill="#fff" fill-opacity="0.8"/></svg></div>`
          );

          const button = parent.querySelector(".mesPipButton");
          button.addEventListener("click", () => {
            if (document.pictureInPictureElement) {
              document.exitPictureInPicture();
            }

            video.requestPictureInPicture();
            video.setAttribute("mes-pip", true);
            video.addEventListener(
              "leavepictureinpicture",
              () => {
                video.removeAttribute("mes-pip");
              },
              { once: true }
            );
          });
        } else {
          const button = parent.querySelector(".mesPipButton");
          button.style.left = videoLeft;
          button.style.top = videoTop;
        }
      });
    }, 1000);
  } else {
    clearInterval(pipInterval);

    const videoButtons = document.querySelectorAll(".mesPipButton");
    videoButtons.forEach((button) => button.remove());
  }
}

function toggleBottomBar(on) {
  if (on) {
    bottomBar = document.querySelector('[jsname="EaZ7Cc"]');
    bottomBar.style.transform = "translateY(0)";

    if (!document.getElementById("barToggle")) {
      bottomBar.insertAdjacentHTML(
        "afterbegin",
        "<div style='cursor: pointer; border-radius: 6px 6px 0 0; width: 48px; height: 34px;  position: absolute; top: -34px; background: #fff; right: 20px;' id='barToggle'><i style='margin-top: 6px' class='google-material-icons W59Cyb' id='toggleIcon'>keyboard_arrow_down</i></div>"
      );
    }

    toggleIcon = document.getElementById("toggleIcon");

    document.getElementById("barToggle").onclick = function toggleBar() {
      if (bottomBar.style.transform != "translateY(88px)") {
        bottomBar.style.transform = "translateY(88px)";
        toggleIcon.style.transform = "rotate(180deg)";
      } else {
        bottomBar.style.transform = "translateY(0)";
        toggleIcon.style.transform = "rotate(0deg)";
      }
    };
  } else {
    if (document.getElementById("barToggle")) {
      document.getElementById("barToggle").remove();
    }
  }
}

function leavePrompt(on) {
  function runLeavePrompt() {
    const leaveButton = document.querySelector('[jsname="CQylAd"]');

    const leavePromptDialog = confirm(
      "Are you sure you want to leave the Meet?"
    );

    if (leavePromptDialog && leaveButton) {
      leaveButton.setAttribute("aria-disabled", "false");
      leaveButton.removeEventListener("click", runLeavePrompt);
      leaveButton.click();
    }
  }
  if (on) {
    const leaveButton = document.querySelector('[jsname="CQylAd"]');

    if (leaveButton) {
      leaveButton.setAttribute("aria-disabled", "true");
      leaveButton.removeEventListener("click", runLeavePrompt);
      leaveButton.addEventListener("click", runLeavePrompt);
    } else {
      const leaveButton = document.querySelector('[jsname="CQylAd"]');
      leaveButton.removeEventListener("click", runLeavePrompt);
    }
  }
}

function hideNames(on) {
  if (on) {
    hideNamesInterval = setInterval(() => {
      names = document.querySelectorAll("[data-self-name]");
      names.forEach(function (name) {
        name.style.display = "none";
      });
    }, 500);
  } else {
    if (names) {
      clearInterval(hideNamesInterval);
      names.forEach(function (name) {
        name.style.display = "";
      });
    }
  }
}

function meetingTimer(on) {
  if (on) {
    document
      .querySelector(".NzPR9b")
      .insertAdjacentHTML(
        "afterbegin",
        "<div style='font-size: 14px; border-radius: 0px 0px 0px 10px;background: rgb(255, 255, 255);cursor: auto;color: rgb(95, 99, 104);/* margin-top: 16px; */padding: 16px;font-weight: 500;' class='timer'>MEETING TIMER</div><div class='qO3Z3c'></div>"
      );

    const timerDisplay = document.querySelector(".timer");
    let startTime;
    let updatedTime;
    let difference;
    let running = 0;

    function startTimer() {
      if (running === 0) {
        startTime = new Date().getTime();
        setInterval(getShowTime, 1);
        running = 1;
        timerDisplay.style.background = "#fff";
        timerDisplay.style.cursor = "auto";
        timerDisplay.style.color = "#5f6368";
      }
    }

    startTimer();

    function getShowTime() {
      updatedTime = new Date().getTime();

      difference = updatedTime - startTime;

      let hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      let minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      let seconds = Math.floor((difference % (1000 * 60)) / 1000);
      hours = hours < 10 ? "0" + hours : hours;
      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;
      timerDisplay.innerHTML = hours + ":" + minutes + ":" + seconds;
    }
  } else {
    if (document.querySelector(".timer")) {
      document.querySelector(".timer").style.display = "none";
    }
  }
}

function mirrorVideos(on) {
  if (on) {
    clearInterval(mirrorInterval);
    mirrorInterval = setInterval(() => {
      const mirroredVideos = document.querySelectorAll("video");

      mirroredVideos.forEach((video) => {
        if (!video.hasAttribute("transform")) {
          video.style.transform = "rotateY(180deg)";
        }
      });
    }, 500);
  } else {
    clearInterval(mirrorInterval);
    const mirroredVideos = document.querySelectorAll("video");
    mirroredVideos.forEach((video) => {
      video.style.transform = "rotateY(0deg)";
    });
  }
}

function pinBottomBar(on) {
  bottomBar = document.querySelector('[jsname="EaZ7Cc"]');
  captionContainer = document.querySelector(".a4cQT");

  if (on) {
    if (bottomBar.style.transform == "") {
      bottomBar.style.transform = "translateY(0)";
      captionContainer.style.padding = "14px 20vw 106px";
    }
  } else {
    bottomBar.style.transform = null;
    captionContainer.style.padding = null;
  }
}

function mutePopup(on) {
  if (on) {
    newMutePopupInterval = setInterval(() => {
      const popup = document.querySelector(
        '[aria-label="Are you talking? Your mic is off."]'
      );

      if (popup) {
        popup.remove();
      }
    }, 100);
  } else {
    clearInterval(newMutePopupInterval);
  }
}

function autoFullScreenOnPresent(on) {
  if (!on) {
    clearInterval(autoPresent.interval);

    autoPresent = {
      interval: undefined,
      isPresenting: false,
      curPresenter: "",
      enabledFullScreen: false,
    };
  } else {
    
    autoPresent.interval = setInterval(() => {
      const presentingContainer = document.querySelector(".BO1rpc.KQZr0e.x8iLtd");

      if (presentingContainer) {
        autoPresent.isPresenting = true;
        autoPresent.curPresenter = presentingContainer.textContent;
      } else {
        if (
          (document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement) &&
          autoPresent.enabledFullScreen === true
        ) {
          document.exitFullscreen();
        }

        autoPresent = {
          isPresenting: false,
          curPresenter: "",
          enabledFullScreen: false,
        };
      }

      if (autoPresent.isPresenting) {
        if (autoPresent.curPresenter !== "You are presenting") {
          if (!autoPresent.enabledFullScreen) {
            autoPresent.enabledFullScreen = true;
            document.body.requestFullscreen();
          }
        }
      }
    }, 1000);
  }
}

function quickLeave(event) {
  if (event && event.shiftKey && event.keyCode === 75) {
    document.querySelector('[jsname="CQylAd"]').click();
  }
}

function autoCaptions(on) {
  const captions = document.querySelector('[jsname="r8qRAd"]');

  if (on) {
    if (
      captions &&
      captions.parentElement.getAttribute("aria-checked") === "false"
    ) {
      captions.click();
    }
  } else {
    if (
      captions &&
      captions.parentElement.getAttribute("aria-checked") === "true"
    ) {
      captions.click();
    }
  }
}

function autoChat(on) {
  if (on) {
    if (document.querySelector('[aria-label="Chat with everyone"]')) {
      document.querySelector('[aria-label="Chat with everyone"]').click();
    }
  } else {
    if (document.querySelector('[aria-label="Close"]')) {
      document.querySelector('[aria-label="Close"]').click();
    }
  }
}

function displayClock(on) {
  if (on) {
    if ((document.querySelector(".xfd0yd").style.display = "none")) {
      document.querySelector(".xfd0yd").style.display = "block";
      document
        .querySelector(".xfd0yd")
        .insertAdjacentHTML(
          "beforebegin",
          `<div id="clockBorder" class="qO3Z3c"></div>`
        );
    }
  } else {
    if ((document.querySelector(".xfd0yd").style.display = "block")) {
      document.querySelector(".xfd0yd").style.display = "none";
      document.getElementById("clockBorder").remove();
    }
  }
}

function autoAdmit(on) {
  if (on) {
    clearInterval(newAutoAdmitInterval);

    newAutoAdmitInterval = setInterval(() => {
      if (
        document.querySelector(
          '[aria-label="Someone wants to join this meeting"]'
        ) ||
        document.querySelector(
          '[aria-label="Alguém quer participar desta reunião"]'
        ) ||
        document.querySelector(
          '[aria-label="Una persona quiere unirse a esta reunión"]'
        ) ||
        document.querySelector(
          '[aria-label="Jemand möchte an dieser Besprechung teilnehmen"]'
        ) ||
        document.querySelector(
          '[aria-label="Una persona quiere unirse a esta reunión"]'
        ) ||
        document.querySelector(
          "#yDmH0d > div.llhEMd.iWO5td > div > div.g3VIld.BgY0gf.vDc8Ic.J9Nfi.iWO5td > div.R6Lfte.tOrNgd.qRUolc > div.PNenzf"
        )
      ) {
        const allSpans = document.querySelectorAll("span");

        allSpans.forEach((span) => {
          if (
            span.textContent === "Admit" ||
            span.textContent === "Permitir" ||
            span.textContent === "Zulassen" ||
            span.textContent === "Accepter"
          ) {
            span.click();
          }
        });
      }
    }, 1000);
  } else {
    clearInterval(newAutoAdmitInterval);
  }
}

function autoReject(on) {
  if (on) {
    clearInterval(newAutoRejectInterval);

    newAutoRejectInterval = setInterval(() => {
      if (
        document.querySelector(
          '[aria-label="Someone wants to join this meeting"]'
        ) ||
        document.querySelector(
          '[aria-label="Alguém quer participar desta reunião"]'
        ) ||
        document.querySelector(
          '[aria-label="Una persona quiere unirse a esta reunión"]'
        ) ||
        document.querySelector(
          '[aria-label="Jemand möchte an dieser Besprechung teilnehmen"]'
        ) ||
        document.querySelector(
          '[aria-label="Una persona quiere unirse a esta reunión"]'
        ) ||
        document.querySelector(
          "#yDmH0d > div.llhEMd.iWO5td > div > div.g3VIld.BgY0gf.vDc8Ic.J9Nfi.iWO5td"
        )
      ) {
        const allSpans = document.querySelectorAll("span");

        allSpans.forEach((span) => {
          // (1) , (2) Mexican Spanish, (3) German, (4) Portuguese Protugal, (5) Brazil Portuguese, (6) French
          if (
            span.textContent === "Deny entry" ||
            span.textContent === "Rechazar" ||
            span.textContent === "Teilnahme ablehnen" ||
            span.textContent === "Recusar pedido" ||
            span.textContent === "Negar" ||
            span.textContent === "Refuser l'accès"
          ) {
            span.click();
          }
        });
      }
    }, 1000);
  } else {
    clearInterval(newAutoRejectInterval);
  }
}

function noAddOthers(on) {
  if (on) {
    clearInterval(newAddOthersInterval);
    if (didCloseAddOthers === false) {
      newAddOthersInterval = setInterval(() => {
        if (document.querySelector('[jsname="YASyvd"]')) {
          if (
            document.querySelector('[jsname="YASyvd"]').textContent ===
              "Add others" ||
            document.querySelector('[jsname="YASyvd"]').textContent ===
              "Adicionar outras pessoas"
          ) {
            document
              .querySelector('[aria-label="Close"], [aria-label="Fechar"]')
              .click();
            newAddOthersInterval = true;
          }
        }
      }, 100);
    }
  } else {
    clearInterval(newAutoAdmitInterval);
  }
}

function muteMicrophone(on) {
  const micAndVid = document.querySelectorAll('[jsname="BOHaEe"]');

  if (on) {
    if (micAndVid[0].dataset.isMuted === "false") {
      micAndVid[0].click();
    }
  } else {
    if (micAndVid[0].dataset.isMuted === "true") {
      micAndVid[0].click();
    }
  }
}

function muteVideo(on) {
  const micAndVid = document.querySelectorAll('[jsname="BOHaEe"]');

  if (on) {
    if (micAndVid[1].dataset.isMuted === "false") {
      micAndVid[1].click();
    }
  } else {
    if (micAndVid[1].dataset.isMuted === "true") {
      micAndVid[1].click();
    }
  }
}

function triggerMostButtons(node) {
  triggerMouseEvent(node, "mouseover");
  triggerMouseEvent(node, "mousedown");
  triggerMouseEvent(node, "click");
  triggerMouseEvent(node, "mouseup");
}

function triggerMouseEvent(node, eventType) {
  const clickEvent = document.createEvent("MouseEvents");

  clickEvent.initEvent(eventType, true, true);
  node.dispatchEvent(clickEvent);
}

function addMESStyles() {
  transBarStyle = document.createElement("style");
  transBarStyle.textContent = ``;

  darkModeStyle = document.createElement("style");
  darkModeStyle.textContent = ``;

  commentStyle = document.createElement("style");
  commentStyle.textContent = ``;

  commentBubbleStyle = document.createElement("style");
  commentBubbleStyle.textContent = ``;

  document.head.append(transBarStyle);
  document.head.append(darkModeStyle);
  document.head.append(commentStyle);
  document.head.append(commentBubbleStyle);
}

function addCommentBubbleStyle(on) {
  if (on) {
    commentBubbleStyle.textContent = `
      .Z7iKHc.N0PJ8e {
        display: none;
      }
    `;
  } else {
    commentBubbleStyle.textContent = ``;
  }
}

function addCommentStyle(on) {
  if (on) {
    commentStyle.textContent = `
      .NSvDmb {
        display: none;
      }
  
      .cM3h5d {
        display: none;
      }
    `;
  } else {
    commentStyle.textContent = ``;
  }
}

function addTransBarStyle(on) {
  if (on) {
    transBarStyle.textContent = `    
      i.google-material-icons.W59Cyb {
        color: #fff !important;
      }
  
      i.google-material-icons.W59Cyb {
        color: #fff !important;
      }
  
      .rG0ybd {
        box-shadow: none !important;
        background-color: transparent !important;
      }

      .ZPasfd {
        border-color: #d93025 !important;
      }
  
      [jsname="NeC6gb"] {
        color: white !important;
      }
  
      .A00RE .uJNmj .bkbMM {
        fill: #fff;
      }
  
      .srzwD {
        background-color: #fff;
      }
  
      .XFtqNb {
        color: #fff;
      }
  
      .I98jWb {
        color: #fff !important;
      }
  
      span.DPvwYc.o9fq9d {
        color: #fff;
      }
  
      .YhIwSc {
        color: #fff !important;
      }
  
      .c7fp5b {
        color: #fff
      }
  
    `;
  } else {
    transBarStyle.textContent = ``;
  }
  chrome.storage.sync.get("darkMode", (response) => {
    addDarkModeStyle(response.darkMode);
  });
}

function addDarkModeStyle(on) {
  if (on) {
    chrome.storage.sync.get("transBar", (response) => {
      darkModeStyle.textContent = returnDarkStyles(response.transBar);
    });
  } else {
    darkModeStyle.textContent = ``;
  }
}

var onAddEmojiButtons;
function addEmojiButtons() {
  onAddEmojiButtons = setInterval(() => {
    
    const chatPane = document.querySelector('[jsname="vERSO"]');
    const emojiButtons = document.getElementById("emojiButtons");

    if (chatPane) {
      if (!emojiButtons) {
        chatPane.insertAdjacentHTML(
          "afterbegin",
          `<div style='width: 100%;display: inline-flex; justify-content: space-between; margin-bottom: 14px; font-size: 20px; cursor: pointer;' 
            id='emojiButtons'>
              <div class='emoji'>🤚</div>
              <div class='emoji'>👋</div>
              <div class='emoji'>👍</div>
              <div class='emoji'>👎</div>
              <div class='emoji'>❤️</div>
              <div class='emoji'>💋</div>
              <div class='emoji'>😀</div>
              <div class='emoji'>🙁</div>
            </div>`
        );

        const emojis = document.querySelectorAll(".emoji");
        const textArea = document.querySelector("textarea");
        const sendButton = document.querySelector('[jsname="SoqoBf"]');
        const messagePlaceholder = document.querySelector('[jsname="LwH6nd"]');

        emojis.forEach((emoji) => {
          emoji.style.cssText =
            "border-radius: 50%; width: 28px; text-align: center;";
          emoji.addEventListener("click", () => {
            clickedEmoji = emoji.textContent;
            textArea.focus();
            textArea.value += clickedEmoji;
            messagePlaceholder.style.display = "none";
            sendButton.classList.remove("RDPZE");
            sendButton.removeAttribute("aria-disabled");
          });
        });
      }
    }
  }, 500);
}
function runDelEmojiButtons(){
  if(onAddEmojiButtons){
    clearInterval(onAddEmojiButtons);
  }
  const onDelEmojiButtons = setInterval(()=>{
    const chatPane = document.querySelector('[jsname="vERSO"]');
    const emojiButtons = document.getElementById("emojiButtons");
    if(chatPane && emojiButtons){
      clearInterval(onDelEmojiButtons);
      emojiButtons.remove();
    }
  }, 500);
}

var onAddMuteButton;
function runAddMuteButton() {
  onAddMuteButton = setInterval(() => {
    const panel = document.querySelector('[jsname="KYYiw"]');
    if (panel && panel.parentElement.classList.contains("ZHdB2e")) {
      if (!document.getElementById("muteAllButton")) {
        
        const removeAllButton = document.getElementById("removeAllButton");
        const buttonSection = document.querySelector('[jsname="PAiuue"]');
        let code = '<div id="muteAllButton" jsshadow="" role="button" class="uArJ5e UQuaGc kCyAyd kW31ib Bs3rEf b5FiD QtoR3c M9Bg4d" jscontroller="VXdfxd" aria-disabled="false" tabindex="0" style="border-bottom: 1px solid rgba(0,0,0,0.122);"><div class="Fvio9d MbhUzd" jsname="ksKsZd"></div><div class="e19J0b CeoRYc"></div><span jsslot="" class="l4V7wb Fxmcue"><span class="NPEfkd RveJvd snByac"><svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="#000000" class="Hdh4hc cIGbvc" style="width: 23px;margin-right: 5px;"><path d="M0 0h24v24H0zm0 0h24v24H0z" fill="none"></path><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"></path></svg><span class="GsqdZ K74C9e" style="color: #5f6368; padding-left: 0px;">Mute all</span></span></span></div>';
        if(!removeAllButton){
          buttonSection.insertAdjacentHTML(
            "afterbegin",
            code  
          );
        }
        else{
          removeAllButton.insertAdjacentHTML(
            "beforebegin",
            code  
          );

        }
        document
          .getElementById("muteAllButton")
          .addEventListener("click", muteAll);
      }
    }
  }, 500);
}
function runDelMuteButton(){
  if(onAddMuteButton){
    clearInterval(onAddMuteButton);
  }
  const onDelMuteButton = setInterval(()=>{
    const panel = document.querySelector('[jsname="KYYiw"]');
    if (panel && panel.parentElement.classList.contains("ZHdB2e")) {
      clearInterval(onDelMuteButton);
      const muteAllButton = document.getElementById("muteAllButton");
      if (muteAllButton) {    
        muteAllButton.remove()
      }
    }

  }, 500);
}

function muteAll() {
  const confirmDialog = confirm(
    "Are you sure you want to mute all participants?"
  );

  if (confirmDialog) {
    const muteButtons = document.querySelectorAll('[jsname="LgbsSe"]');

    muteButtons.forEach((button) => {
      button.click();

      setTimeout(() => {
        muteAllPeople();
      }, 50);
    });

    function muteAllPeople() {
      const links = Array.from(document.querySelectorAll("span"));

      links.forEach((link) => {
        if (
          link.textContent === "Mute" ||
          link.textContent === "Stummschalten" ||
          link.textContent === "Desativar som" ||
          link.textContent === "Silenciar"
        ) {
          link.click();
        }
      });
    }
  }
}

var onAddRemoveButton;
function runAddRemoveButton() {
  onAddRemoveButton = setInterval(() => {
    const panel = document.querySelector('[jsname="KYYiw"]');
    if (panel && panel.parentElement.classList.contains("ZHdB2e")) {
      if (!document.getElementById("removeAllButton")) {
        const muteButton = document.getElementById("muteAllButton");
        const buttonSection = document.querySelector('[jsname="PAiuue"]');

        let code =`<div id="removeAllButton" 
          jsshadow="" 
          role="button" 
          class="uArJ5e UQuaGc kCyAyd kW31ib Bs3rEf b5FiD QtoR3c M9Bg4d" 
          jscontroller="VXdfxd" 
          aria-disabled="false" 
          tabindex="0" 
          style="border-bottom: 1px solid rgba(0,0,0,0.122);">
            <div class="Fvio9d MbhUzd" jsname="ksKsZd"></div>
            <div class="e19J0b CeoRYc"></div>
            <span jsslot="" class="l4V7wb Fxmcue">
              <span class="NPEfkd RveJvd snByac">
                <svg style="margin-right: 5px" 
                    viewBox="0 0 24 24" 
                    focusable="false" 
                    width="24" 
                    height="24" 
                    class="CEJND cIGbvc NMm5M">
                      <path d="M7 11v2h10v-2H7zm5-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
                    </svg>
                  <span class="GsqdZ K74C9e" style="color: #5f6368; padding-left: 0px;">
                    Remove all
                  </span>
                </span>
              </span>
            </div>`;


        if(!muteButton){
          buttonSection.insertAdjacentHTML(
            "afterbegin",
            code
          );
        }
        else{
          muteButton.insertAdjacentHTML(
            "afterend",
            code
          );          
        }
        document
          .getElementById("removeAllButton")
          .addEventListener("click", removeAll);
      }
    }
  }, 500);
}
function runDelRemoveButton(){
  if(onAddRemoveButton){
    clearInterval(onAddRemoveButton);
  }
  const onDelRemoveButton = setInterval(()=>{
    const panel = document.querySelector('[jsname="KYYiw"]');
    if (panel && panel.parentElement.classList.contains("ZHdB2e")) {
      clearInterval(onDelRemoveButton);
      const removeAllButton = document.getElementById("removeAllButton");
      if (removeAllButton) {    
        removeAllButton.remove()
      }
    }

  }, 500);
}


function removeAll() {
  const confirmDialog = confirm(
    "Are you sure you want to remove all participants?"
  );

  if (confirmDialog) {
    const muteButtons = document.querySelectorAll('[jsname="BUtajd"]');

    muteButtons.forEach((button) => {
      button.click();

      setTimeout(() => {
        removeAllPeople();
      }, 50);
    });

    function removeAllPeople() {
      const links = Array.from(document.querySelectorAll("span"));

      links.forEach((link) => {
        if (
          link.textContent === "Remove" ||
          link.textContent === "Remover" ||
          link.textContent === "Quitar" ||
          link.textContent === "Entfernen"
        ) {
          link.click();
        }
      });
    }
  }
}

function returnDarkStyles(transBarEnabled) {
  let styles = `     
  .p2ZbV.zKHdkd {
    background-color: #212121 !important;
  }

  #barToggle {
    background: #212121 !important;
  }

  .Bs3rEf {
    background: rgba(255,255,255,0.2) !important;
  }

  .AGS4Ef {
    color: white !important;
  }

  .tKfYmd.otdjyf {
    color: white !important;
  }

  textarea.hqfVKd.tL9Q4c {
    color: white !important;
  }

  .Yalane.oJeWuf {
    background: #212121 !important;
  }

  i.google-material-icons.VfPpkd-kBDsod {
    color: white !important;
  }

  .HZ3kWc {
    color: white !important;
  }

  .Zl9Chd {
    display: none;
  }

  .eylCT {
    color: white;
  }

  span.qXM1De {
    color: white;
  }

  .WUFI9b {
    background: #212121 !important;
  }

  span.VfPpkd-rymPhb-fpDzbe-fmcmS {
    color: white;
  }

  span.VfPpkd-rymPhb-L8ivfd-fmcmS {
    color: white;
  }

  #toggleIcon {
    color: #fff;
  }

  .YAZ0M {
    background-color: #212121 !important;
  }

  .CYZUZd {
    background-color: #212121 !important;
  }

  .timer {
    background-color: #212121 !important;
    color: #fff;
  }

  .J8vCN{
    color: #fff;
  }

  .c5VCdf {
    color: #fff;
  }

  .PbnGhe {
    color: #fff;
  }

  .ZbjTEb {
    color: #fff;
  }

  .ZR1ISd {
    color: #fff;
  }

  .NSvDmb svg {
    fill: #00796b !important;
  }

  body {
    background-color: #212121 !important;
  }

  html {
    background-color: #212121 !important;
  }

  .d7iDfe.NONs6c {
    background-color: #212121 !important;
  }

  .GN4RFc {
    background-color: #212121 !important;
    color: #fff !important;
  }

  .OHZKt {
    background-color: #1E1E1E !important;
  }

  .YAwx2e .oJeWuf, .QMKoTb {
    background: grey !important;
  }

  .CO1lLb {
    color: #fff !important;
  }

  .PWKRsc {
    background: grey !important;
  }

  .ndJi5d {
    color: #fff;
  }

  .p2ZbV.zKHdkd {
    background-color: #212121 !important;
  }

  .shTJQe {
    background-color: #212121 !important;
  }

  .pI48Vc {
    background-color: #212121 !important;
  }

  .qIHHZb {
    background-color: #212121 !important;
  }

  .Sla0Yd {
    background-color: #212121 !important;
  }

  
  .Yi3Cfd {
    color: #fff;
  }

  .Jyj1Td {
    color: #fff;
  }

  .uArJ5e.UQuaGc.kCyAyd.kW31ib.xKiqt.cd29Sd.M9Bg4d {
    background: #fff !important;
  }

  .xKiqt {
    border: 2px solid #00796b;
  }

  .xKiqt .snByac {
    color: #fff;
  }

  .d7iDfe:not(.rd2nFb) .shTJQe {
    background-color: #212121 !important;
  }

  .KD4eUb {
    color: #fff;
  }

  .Ue6DPb {
    color: #fff;
  }

  .DLjNp.LlMNQd .Kx3qp {
    color: grey;
  }

  .mYl7qd {
    color: #fff !important;
  }

  .c4Ysi {
    color: #fff !important;
  }

  .iI9wC {
    color: #fff !important;
  }

  .QuP9wb .qRUolc, .p0nv6d {
    color: #fff !important;
  }

  .kCtYwe {
    border-top: 1px solid rgba(255,255,255,0.12);
  }

  .z80M1.FwR7Pc {
    background-color: none !important;
  }

  .z80M1 {
    background-color: none !important;
  }

  .EVe89b {
    color: currentColor !important;
  }

  .GsqdZ {
    color: #fff !important;
  }

  .Hdh4hc {
    fill: currentColor;
  }
  
  .CRFCdf {
    color: #fff !important;
  }

  .o9fq9d {
    color: #fff !important;
  }

  .ZPasfd {
    border-color: #d93025 !important;
  }

  .NMm5M {    
    fill: currentColor;
  }

  .NzPR9b {
    background-color: #212121;
  }

  .p062Qe {
    background-color: #212121;
    color: #fff;
  }

  .Bx7THd.PBWx0c .ZHdB2e .kaAt2 {
    background-color: #212121;
  }

  .YTbUzc {
    color: #fff !important;
  }

  .MuzmKe {
    color: #f8f8f8 !important;
  }

  .oIy2qc {
    color: #fff !important;
  }

  .vvTMTb {
    background-color: #212121 !important;
  }

  .wnPUne {
    color: #c4c4c4;
  }

  .XnKlKd .tL9Q4c {
    color: #fff !important;
  }

  .tmIkuc.s2gQvd {
    background-color: #212121 !important;
  }

  .cS7aqe {
    color: #fff !important;
  }

  .cS7aqe {
    background-color: #212121 !important;
  }

  .fSW6Ze {
    background-color: #212121 !important;
  }

  .Pdo15c .b5FiD .Fxmcue {
    background-color: #212121 !important;
  }

  .TZFSLb {
    background-color: #212121 !important;
  }

  .U9X0yc {
    color: #fff !important;
  }

  .D6kPY {
    color: #fff !important;
  }

  .Bs3rEf {
    background: #1E1E1E;
  }

  .aQIrCf {
    color: #fff !important;
  }

  .JPdR6b {
    background-color: #212121 !important;
  }

  .CIYi0d .jO7h3c {
    color: #fff !important;
  }

  .z80M1:hover {
    background: grey !important;
  }

  i.google-material-icons.Hdh4hc.cIGbvc {
    color: currentColor !important;
  }

  span.DPvwYc.VfeYV {
    color: #5F6368 !important;
  }

  .z80M1 {
    color: #fff;
  }

  .ZiTobc {
    color: #fff !important;
  }

  .QkKrhf {
    color: #fdfdfd !important;
  }

  .NVUqMb {
    background-color: #212121 !important;
  }

  .ncFHed {
    background-color: #212121 !important;
  }

  .g3VIld {
    background-color: #212121 !important;
  }

  .MocG8c {
    color: #fff;
  }

  .NVUqMb {
    color: #fff !important;
  }

  .MocG8c.LMgvRb:hover {
    background: grey !important;
  }

  .yX8vie {
    color: #fff !important;
  }

  .clMRcc {
    background-color: #212121 !important;
  }

  .hRmCye {
    color: #fff !important;
  }

  .PNenzf {
    color: #fff !important;
  }

  .fKz7Od {
    fill: #fff;
  }

  .Mgmvtd {
    color: #fff !important;
  }

  .HhsXW {
    background: #5F6368;
  }

  .LsDE5 {
    background: #5F6368 !important;
  }

  .L7osyb {
    color: #5F6368;
  }

  .uMYr {
    background: #C4C4C4 !important
  }

  .gHs9Xb {
    color: #fff !important;
  }

  .ZJUcv {
    color: #fff !important;
  }

  .RKRJx .snByac {
    color: #fff !important;
  }

  .whsOnd {
    color: #fff;
  }

  .mAW2Ib {
    background: grey;
  }

  .CO1lLb {
    color: #fff;
  }

  .Rg6gpd {
    background-color: #C4C4C4 !important;
  }

  `;

  if (!transBarEnabled) {
    styles += `i.google-material-icons.W59Cyb {
      color: #fff !important;
    }
  
    .rG0ybd {  
      background-color: #212121 !important;
    }
  
    .rG0ybd div {    
      color: #fff !important;
    }   `;
  }

  return styles;
}

const MIC_OFF = "Turn off microphone",
  MIC_ON = "Turn on microphone";

let currentHotkey, keydownToggle, keyupToggle;

const micButtonSelector = (tip) => `[data-tooltip*='${tip}']`;

const toggle = (hotkey, tip) => {
  // actual event listener
  return (event) => {
    if (
      event.target &&
      ["chatTextInput", "chatTextArea", "textInput", "textArea"].includes(
        event.target.name
      )
    ) {
      return;
    }

    const tooltip = event.target?.dataset?.tooltip;

    if (tooltip?.includes("microphone") || tooltip?.includes("camera")) {
      event.stopPropagation();
    }

    if (event.type === "keydown" && !hotkey.matchKeydown(event)) {
      return;
    }

    if (event.type === "keyup" && !hotkey.matchKeyup(event)) {
      return;
    }

    event.preventDefault();
    document.querySelector(micButtonSelector(tip))?.click();
  };
};

function hookUpListeners(hotkey) {
  if (currentHotkey) {
    document.body.removeEventListener("keydown", keydownToggle);
    document.body.removeEventListener("keyup", keyupToggle);
  }

  currentHotkey = hotkey;
  keydownToggle = toggle(hotkey, MIC_ON);
  keyupToggle = toggle(hotkey, MIC_OFF);

  document.body.addEventListener("keydown", keydownToggle);
  document.body.addEventListener("keyup", keyupToggle);
}

