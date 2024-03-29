class Hotkey {
    constructor({
      keyCode,
      ctrlKey = false,
      altKey = false,
      shiftKey = false,
      metaKey = false,
    }) {
      this.keys = { keyCode, ctrlKey, altKey, shiftKey, metaKey };
    }
  
    static keysFromEvent({ keyCode, ctrlKey, altKey, shiftKey, metaKey }) {
      const keys = { ctrlKey, altKey, shiftKey, metaKey };
  
      if (![16, 17, 18, 91].includes(keyCode)) {
        keys.keyCode = keyCode;
      }
  
      return keys;
    }
  
    fromEvent(event) {
      return new Hotkey(Hotkey.keysFromEvent(event));
    }
  
    keyCode(searchInput) {
      // Keyboard Events
      if (searchInput && "object" === typeof searchInput) {
        var hasKeyCode =
          searchInput.which || searchInput.keyCode || searchInput.charCode;
        if (hasKeyCode) searchInput = hasKeyCode;
      }
  
      // Numbers
      if ("number" === typeof searchInput) return keynames[searchInput];
  
      // Everything else (cast to string)
      var search = String(searchInput);
  
      // check codes
      var foundNamedKey = codes[search.toLowerCase()];
      if (foundNamedKey) return foundNamedKey;
  
      // check aliases
      var foundNamedKey = aliases[search.toLowerCase()];
      if (foundNamedKey) return foundNamedKey;
  
      // weird character?
      if (search.length === 1) return search.charCodeAt(0);
  
      return undefined;
    }
  
    keyStrings() {
      return [
        this.keys.ctrlKey && "Control",
        this.keys.altKey && "Alt",
        this.keys.shiftKey && "Shift",
        this.keys.metaKey && "Command",
        this.keys.keyCode && keyCode(this.keys.keyCode),
      ].filter((v) => v);
    }
  
    display() {
      return this.keyStrings()
        .map((key) => `${key}`)
        .join(" + ");
    }
  
    matchKeydown(event) {
      return (
        this.keys.ctrlKey == event.ctrlKey &&
        this.keys.altKey == event.altKey &&
        this.keys.shiftKey == event.shiftKey &&
        this.keys.metaKey == event.metaKey &&
        (this.keys.keyCode == event.keyCode ||
          ([16, 17, 18, 91].includes(event.keyCode) &&
            this.keys.keyCode === undefined))
      );
    }
  
    matchKeyup(event) {
      if (this.keys.keyCode && this.keys.keyCode == event.keyCode) {
        return true;
      }
  
      return (
        (this.keys.ctrlKey && !event.ctrlKey) ||
        (this.keys.altKey && !event.altKey) ||
        (this.keys.shiftKey && !event.shiftKey) ||
        (this.keys.metaKey && !event.metaKey)
      );
    }
  }
  
  // MIT Licensed - author: Tim Oxley
  function keyCode(searchInput) {
    // Keyboard Events
    if (searchInput && "object" === typeof searchInput) {
      var hasKeyCode =
        searchInput.which || searchInput.keyCode || searchInput.charCode;
      if (hasKeyCode) searchInput = hasKeyCode;
    }
  
    // Numbers
    if ("number" === typeof searchInput) return keynames[searchInput];
  
    // Everything else (cast to string)
    var search = String(searchInput);
  
    // check codes
    var foundNamedKey = codes[search.toLowerCase()];
    if (foundNamedKey) return foundNamedKey;
  
    // check aliases
    var foundNamedKey = aliases[search.toLowerCase()];
    if (foundNamedKey) return foundNamedKey;
  
    // weird character?
    if (search.length === 1) return search.charCodeAt(0);
  
    return undefined;
  }
  
  /**
   * Compares a keyboard event with a given keyCode or keyName.
   *
   * @param {Event} event Keyboard event that should be tested
   * @param {Mixed} keyCode {Number} or keyName {String}
   * @return {Boolean}
   * @api public
   */
  keyCode.isEventKey = function isEventKey(event, nameOrCode) {
    if (event && "object" === typeof event) {
      var keyCode = event.which || event.keyCode || event.charCode;
      if (keyCode === null || keyCode === undefined) {
        return false;
      }
      if (typeof nameOrCode === "string") {
        // check codes
        var foundNamedKey = codes[nameOrCode.toLowerCase()];
        if (foundNamedKey) {
          return foundNamedKey === keyCode;
        }
  
        // check aliases
        var foundNamedKey = aliases[nameOrCode.toLowerCase()];
        if (foundNamedKey) {
          return foundNamedKey === keyCode;
        }
      } else if (typeof nameOrCode === "number") {
        return nameOrCode === keyCode;
      }
      return false;
    }
  };
  
  /**
   * Get by name
   *
   *   exports.code['enter'] // => 13
   */
  
  var codes = {
    backspace: 8,
    tab: 9,
    enter: 13,
    shift: 16,
    ctrl: 17,
    alt: 18,
    "pause/break": 19,
    "caps lock": 20,
    esc: 27,
    space: 32,
    "page up": 33,
    "page down": 34,
    end: 35,
    home: 36,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    insert: 45,
    delete: 46,
    command: 91,
    "left command": 91,
    "right command": 93,
    "numpad *": 106,
    "numpad +": 107,
    "numpad -": 109,
    "numpad .": 110,
    "numpad /": 111,
    "num lock": 144,
    "scroll lock": 145,
    "my computer": 182,
    "my calculator": 183,
    ";": 186,
    "=": 187,
    ",": 188,
    "-": 189,
    ".": 190,
    "/": 191,
    "`": 192,
    "[": 219,
    "\\": 220,
    "]": 221,
    "'": 222,
  };
  
  // Helper aliases
  
  var aliases = {
    windows: 91,
    "⇧": 16,
    "⌥": 18,
    "⌃": 17,
    "⌘": 91,
    ctl: 17,
    control: 17,
    option: 18,
    pause: 19,
    break: 19,
    caps: 20,
    return: 13,
    escape: 27,
    spc: 32,
    spacebar: 32,
    pgup: 33,
    pgdn: 34,
    ins: 45,
    del: 46,
    cmd: 91,
  };
  
  /*!
   * Programatically add the following
   */
  
  // lower case chars
  for (i = 97; i < 123; i++) codes[String.fromCharCode(i)] = i - 32;
  
  // numbers
  for (var i = 48; i < 58; i++) codes[i - 48] = i;
  
  // function keys
  for (i = 1; i < 13; i++) codes["f" + i] = i + 111;
  
  // numpad keys
  for (i = 0; i < 10; i++) codes["numpad " + i] = i + 96;
  
  /**
   * Get by code
   *
   *   exports.name[13] // => 'Enter'
   */
  
  var keynames = {}; // title for backward compat
  
  // Create reverse mapping
  for (i in codes) keynames[codes[i]] = i;
  
  // Add aliases
  for (var alias in aliases) {
    codes[alias] = aliases[alias];
  }

  