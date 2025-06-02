// ==UserScript==
// @name           BoosterSeat Functionality (Combined - Debugging Injection)
// @description    Defines a hotkey, toggles a floating div in browser chrome, and loads a frame script into the active page with enhanced injection debugging logs (Global Startup Script)
// ==/UserScript==

// This script is loaded once in the global context at startup (.sys.mjs).
// It defines the hotkey and ensures a frame script is loaded into the active tab when the hotkey command runs.

// Import necessary modules
import { Hotkeys, Utils, FileSystem, Prefs } from "chrome://userchromejs/content/uc_api.sys.mjs";
// Removed Components.utils.import("resource://gre/modules/Services.jsm"); - not available in this context.

// Attempt to import Ci, Cc, and Services for file operations
// Define the message type for toggling the attribute
const TOGGLE_ATTRIBUTE_MESSAGE = "boosterSeat:toggleAttribute";
const SET_BACKGROUND_WHITE_MESSAGE = "boosterSeat:setBackgroundWhite";
const ACTIVATE_ELEMENT_SELECTOR_MESSAGE = "boosterSeat:activateElementSelector";
const SET_GLOBAL_FONT_MESSAGE = "boosterSeat:setGlobalFont";
const SET_GLOBAL_FONT_FAMILY_MESSAGE = "boosterSeat:setGlobalFontFamily";
const SET_GLOBAL_SCALE_MESSAGE = "boosterSeat:setGlobalScale";
const REQUEST_GLOBAL_SCALE_MESSAGE = "boosterSeat:requestGlobalScale";
const REPLY_GLOBAL_SCALE_MESSAGE = "boosterSeat:replyGlobalScale";
// Define the new message type for hiding an element
const HIDE_ELEMENT_MESSAGE = "boosterSeat:hideElement";

// Add new message type for frame script ready signal
const FRAME_SCRIPT_READY_MESSAGE = "boosterSeat:frameScriptReady";
// Define the message type to deactivate the zapper from chrome
const DEACTIVATE_ZAPPER_MESSAGE = "boosterSeat:deactivateZapper";

// Declare currentZapperMode in a broader scope
let currentZapperMode = 'id'; // Initialize the zapper mode, default is 'id'

// Define the filename for userContent.css
const userContentFileName = "userContent.css";

// Set preference to allow writing outside resources directory
Prefs.set("userChromeJS.allowUnsafeWrites", true);

// Add logic to check for and create userContent.css on startup using native file system objects
(async function() {
    try {
        // Get the chrome directory entry
        const chromeDirEntry = FileSystem.chromeDir();

        // Get the native file object for the chrome directory
        const chromeDirFile = chromeDirEntry.entry();

        // Construct the file path for userContent.css within the chrome directory
        // Use append so it's relative to the chrome directory file object
        const userContentFile = chromeDirFile.clone();
        userContentFile.append(userContentFileName);

        // Log the full path we are attempting to access/create
        console.log(`BoosterSeat: Attempting to access/create file at: ${userContentFile.path}`);

        let needsWrite = false;
        let existingContent = "";

        if (userContentFile.exists() && userContentFile.isFile()) {
            console.log(`BoosterSeat: ${userContentFileName} already exists.`);
            // File exists, read its content to check if the comment is there
            try {
                existingContent = FileSystem.readFileSync(userContentFile).content();
                console.log(`BoosterSeat: Existing ${userContentFileName} content read successfully.`);
                if (!existingContent.includes("/*Booster Testing*/")) {
                    console.log(`BoosterSeat: Existing ${userContentFileName} does not contain the initial comment, marking for write.`);
                    needsWrite = true;
                } else {
                    console.log(`BoosterSeat: Existing ${userContentFileName} contains the initial comment.`);
                }
            } catch (readError) {
                console.error(`BoosterSeat: Error reading existing ${userContentFileName}:`, readError);
                // If reading fails, assume we need to write
                needsWrite = true;
            }
        } else if (!userContentFile.exists()) {
            // File does not exist, mark for creation and writing
            console.log(`BoosterSeat: ${userContentFileName} not found, marking for creation and writing.`);
            needsWrite = true;
        } else {
             // Exists but is not a file
             console.log(`BoosterSeat: ${userContentFileName} exists but is not a file (e.g., it's a directory). Skipping write.`);
        }

        if (needsWrite) {
            // File does not exist or needs the comment, create/overwrite it and write the content
            console.log(`BoosterSeat: Writing initial comment to ${userContentFileName}.`);
            const content = "/*Booster Testing*/\n";

            try {
                // Use UC_API.FileSystem.writeFile for reliable writing
                // Pass the filename directly, assuming it's relative to the chrome directory when unsafe writes are allowed.
                await FileSystem.writeFile("../" + userContentFileName, content);
                console.log(`BoosterSeat: Wrote initial comment to ${userContentFileName} using FileSystem.writeFile.`);
            } catch (writeError) {
                console.error(`BoosterSeat: Error writing to ${userContentFileName} using FileSystem.writeFile:`, writeError);
                // Depending on the error, you might want to re-throw or handle it differently
            }
        }

        // --- Logic to create boosterpages directory and booster-pages.css file ---

        // Define the directory and file names
        const boosterpagesDirName = "boosterpages";
        const boosterpagesFileName = "booster-pages.css";

        // Construct the file path for the boosterpages directory
        const boosterpagesDirFile = chromeDirFile.clone();
        boosterpagesDirFile.append(boosterpagesDirName);

        console.log(`BoosterSeat: Attempting to access/create directory at: ${boosterpagesDirFile.path}`);

        // Check if the boosterpages directory exists. If not, create it.
        if (!boosterpagesDirFile.exists()) {
            console.log(`BoosterSeat: Directory ${boosterpagesDirName} not found, creating it.`);
            // Use 0o777 permissions for directory (read, write, execute for owner, group, others)
            boosterpagesDirFile.create(Ci.nsIFile.DIRECTORY_TYPE, 0o777);
            console.log(`BoosterSeat: Directory ${boosterpagesDirName} created.`);
        } else if (!boosterpagesDirFile.isDirectory()) {
             // If a file or something else exists at this path, log a warning.
             console.warn(`BoosterSeat: Path ${boosterpagesDirFile.path} exists but is not a directory. Cannot create directory.`);
             // Depending on desired behavior, could add logic here to handle this conflict,
             // e.g., try to remove the existing item or throw an error.
             // For now, we'll just log and skip file creation inside it.
             return; // Exit the async function to prevent further operations in this block
        } else {
            console.log(`BoosterSeat: Directory ${boosterpagesDirName} already exists.`);
        }

        // If the directory exists and is a directory, proceed to create the file inside it
        if (boosterpagesDirFile.isDirectory()) {
            // Construct the file path for booster-pages.css inside the boosterpages directory
            const boosterPagesCssFile = boosterpagesDirFile.clone();
            boosterPagesCssFile.append(boosterpagesFileName);

            console.log(`BoosterSeat: Attempting to access/create file at: ${boosterPagesCssFile.path}`);

            // Check if the booster-pages.css file exists. If not, create it.
            if (!boosterPagesCssFile.exists()) {
                console.log(`BoosterSeat: File ${boosterpagesFileName} not found in ${boosterpagesDirName}, creating it.`);
                 // Use 0o666 permissions for file (read, write for owner, group, others)
                boosterPagesCssFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0o666);
                console.log(`BoosterSeat: File ${boosterpagesFileName} created in ${boosterpagesDirName}.`);
            } else if (!boosterPagesCssFile.isFile()) {
                 console.warn(`BoosterSeat: Path ${boosterPagesCssFile.path} exists but is not a file. Cannot create file.`);
            } else {
                console.log(`BoosterSeat: File ${boosterpagesFileName} already exists in ${boosterpagesDirName}.`);
            }
        }

    } catch (e) {
        console.error(`BoosterSeat: Error checking or creating file/directory:`, e);
    }
})();

// Define the main frame script code as a string (excluding zapper logic)
// This script runs in the content process of each tab and listens for messages.
const frameScriptCode = `
  console.log(">>> Frame script string evaluation started <<<");
  // Add log to confirm main frame script execution start
  console.log(">>> Main Frame script injected <<<");
  console.log(">>> Frame script 'this' context:", this);
  
  // Store document reference for consistent access
  const doc = content.document;
  
  if (this._boosterSeatListenerAdded) {
    console.log(">>> Main listener already exists <<<");
  } else {
    console.log(">>> Adding main message listeners <<<");
    this.addMessageListener("${TOGGLE_ATTRIBUTE_MESSAGE}", (message) => {
      console.log(">>> RECEIVED MESSAGE:", message.name);

      // Add logs for debugging the content document context (inside listener)
      console.log("Content Document Head HTML:", doc.head?.outerHTML);
      console.log("Content Document Title:", doc.title);
      console.log("Content Location HREF:", content.location?.href);

      const htmlElement = doc.documentElement;
      if (!htmlElement) {
          console.error("Frame script: Could not access content documentElement (<html> tag).");
          return;
      }

      // Log current state before toggling
      console.log("Frame script: <html> tag has boosterSeat attribute before toggle:", htmlElement.hasAttribute("boosterSeat"));

      if (htmlElement.hasAttribute("boosterSeat")) {
        htmlElement.removeAttribute("boosterSeat");
        console.log("Removed attribute.");
      } else {
        htmlElement.setAttribute("boosterSeat", "true");
        console.log("Added attribute.");
      }

      // Log state after toggling
      const hasAttributeAfterToggle = htmlElement.hasAttribute("boosterSeat");
      console.log("Frame script: <html> tag has boosterSeat attribute after toggle:", hasAttributeAfterToggle);
    });

    // Add new listener for setting background color
    this.addMessageListener("${SET_BACKGROUND_WHITE_MESSAGE}", (message) => {
      console.log(">>> RECEIVED MESSAGE: ${SET_BACKGROUND_WHITE_MESSAGE}", message.data);
      const bodyElement = doc.body; // Target body
      const selectedColor = message.data?.color; // Get the color from the message data
      if (bodyElement && selectedColor) {
        bodyElement.style.setProperty('background-color', selectedColor, 'important'); // Set background to selected color with !important
        console.log("Frame script: Set body background-color to", selectedColor, "!important.");
      } else if (!bodyElement) {
        console.error("Frame script: Could not access body element to set background color.");
      } else {
        console.error("Frame script: Received message without color data.");
      }
    });

    // Add listener for activating element selector mode
    this.addMessageListener("${ACTIVATE_ELEMENT_SELECTOR_MESSAGE}", () => {
      console.log(">>> RECEIVED MESSAGE: ${ACTIVATE_ELEMENT_SELECTOR_MESSAGE}");
      // Simple element selector: log details of the next clicked element
      const clickHandler = (event) => {
        console.log("Element clicked:", event.target.tagName, event.target.id, event.target.className);
        // Optionally remove the listener after one click
        doc.removeEventListener('click', clickHandler);
        console.log("Element selector mode deactivated.");
      };
      doc.addEventListener('click', clickHandler);
      console.log("Frame script: Element selector mode activated. Click an element on the page.");
    });

    // Add listener for setting global font family
    this.addMessageListener("${SET_GLOBAL_FONT_FAMILY_MESSAGE}", (message) => {
      console.log(">>> RECEIVED MESSAGE: ${SET_GLOBAL_FONT_FAMILY_MESSAGE}", message.data);
      const selectedFontFamily = message.data?.fontFamily; // Get the font family from the message data

      if (selectedFontFamily !== undefined && selectedFontFamily !== '') {
        // Create a style element to apply font to *
        const styleElement = doc.createElement('style');
        styleElement.type = 'text/css';
        // Use CSS rule to target * with !important
        styleElement.textContent =
          '* {' +
          '  font-family: ' + selectedFontFamily + ' !important;' +
          '}';

        // Append the style element to the head
        doc.head.appendChild(styleElement);

        console.log("Frame script: Applied font-family to * using style tag:", selectedFontFamily);
      } else if (selectedFontFamily === '' || selectedFontFamily === undefined) {
         console.log("Received empty or undefined font family, potentially resetting or doing nothing.");
      }
    });

    // Add listener for setting global scale
    this.addMessageListener("${SET_GLOBAL_SCALE_MESSAGE}", (message) => {
      console.log(">>> RECEIVED MESSAGE: ${SET_GLOBAL_SCALE_MESSAGE}", message.data);
      const rootElement = doc.documentElement; // Target :root
      const scale = message.data?.scale; // Get the scale value from the message data

      if (rootElement && typeof scale === 'number') {
        // Apply the scale transformation to the root element
        rootElement.style.setProperty('transform', 'scale(' + scale + ')', 'important');
        // Adjust transform-origin to scale from the top center
        rootElement.style.setProperty('transform-origin', 'top center', 'important');
        console.log("Frame script: Applied scale to :root:", scale);
      } else if (!rootElement) {
        console.error("Frame script: Could not access root element to set scale.");
      } else {
        console.error("Frame script: Received message without valid scale data.");
      }
    });

    // Add listener for requesting global scale
    this.addMessageListener("${REQUEST_GLOBAL_SCALE_MESSAGE}", () => {
      console.log(">>> RECEIVED MESSAGE: ${REQUEST_GLOBAL_SCALE_MESSAGE}");
      const rootElement = doc.documentElement; // Target :root
      let currentScale = 1.0; // Default scale

      if (rootElement) {
        const transform = rootElement.style.getPropertyValue('transform');
        console.log("Frame script: Current transform on :root:", transform);

        // Attempt to parse the scale value from the transform string
        const scaleMatch = transform.match(/scale\((\d*\.?\d+)\)/);
        if (scaleMatch && scaleMatch[1]) {
          currentScale = parseFloat(scaleMatch[1]);
          console.log("Frame script: Parsed scale from transform:", currentScale);
        } else {
            console.log("Frame script: No scale transform found, using default scale.");
        }
      } else {
        console.error("Frame script: Could not access root element to get scale.");
      }

      // Send the current scale back to the main script
      this.sendAsyncMessage("${REPLY_GLOBAL_SCALE_MESSAGE}", { scale: currentScale });
      console.log("Frame script: Replied with current scale: " + currentScale + ".");
    });

    // Add listener for deactivating zapper mode
    this.addMessageListener("${DEACTIVATE_ZAPPER_MESSAGE}", () => {
        console.log(">>> RECEIVED MESSAGE: ${DEACTIVATE_ZAPPER_MESSAGE}");
        deactivateZapper();
        console.log("Frame script: Element hider mode deactivated by chrome message.");
    });

    // Variables and functions for the zapper functionality
    let currentOverlay = null; // Variable to hold the current overlay element
    let isZapperModeActive = false; // Flag to indicate if zapper mode is active, starts inactive
    let currentZapperMode = 'id'; // Default zapper mode: 'id' or 'class'

    const removeOverlay = () => {
        if (currentOverlay) {
            currentOverlay.remove();
            currentOverlay = null;
        }
    };

    const handleMouseOver = (event) => {
        if (!isZapperModeActive) { // Check if zapper is active
            return;
        }
        const hoveredElement = event.target;

        // Remove previous overlay if it exists
        removeOverlay();

        // Avoid adding overlay to html or body or the overlay itself
        if (hoveredElement && hoveredElement !== doc.documentElement && hoveredElement !== doc.body && hoveredElement !== currentOverlay) {
            const rect = hoveredElement.getBoundingClientRect();

            // Create and style the overlay
            const overlay = doc.createElement('div');
            overlay.style.position = 'fixed'; // Use fixed to position relative to viewport
            overlay.style.top = (rect.top + content.window.scrollY) + 'px'; // Account for scroll
            overlay.style.left = (rect.left + content.window.scrollX) + 'px'; // Account for scroll
            overlay.style.width = rect.width + 'px';
            overlay.style.height = rect.height + 'px';
            overlay.style.backgroundColor = 'rgba(173, 216, 230, 0.2)'; // Light blue with 50% opacity
            overlay.style.zIndex = '2147483647'; // High z-index to be on top
            overlay.style.pointerEvents = 'none'; // Allow clicks to pass through
            overlay.style.boxSizing = 'border-box'; // Include padding and border
            overlay.style.border = '2px solid #007bff'; // Blue border for visibility

            // Append the overlay to the body
            doc.body.appendChild(overlay);
            currentOverlay = overlay;
        }
    };

    const handleMouseOut = (event) => {
        if (!isZapperModeActive) { // Check if zapper is active
            return;
        }
        // Remove the overlay if the mouse moves out of the hovered element
        setTimeout(() => {
             if (currentOverlay && (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget))) {
                removeOverlay();
            }
        }, 50);
    };

    const deactivateZapper = () => {
        console.log("Frame script: Deactivating zapper mode.");
        isZapperModeActive = false;
        removeOverlay();
        doc.removeEventListener('click', hideElementClickHandler, true);
        doc.removeEventListener('mouseover', handleMouseOver, true);
        doc.removeEventListener('mouseout', handleMouseOut, true);
    };

    const hideElementClickHandler = (event) => {
      if (!isZapperModeActive) { // Check if zapper is active
          return; // If not active, do nothing
      }

      event.preventDefault(); // Prevent default click behavior
      event.stopImmediatePropagation(); // Stop other listeners

      const clickedElement = event.target;
      console.log("Element clicked to hide:", clickedElement.tagName, clickedElement.id, clickedElement.className);

      // Only remove the overlay on click, keep zapper active until Escape is pressed
      removeOverlay();

      if (clickedElement && clickedElement !== doc.documentElement && clickedElement !== doc.body) {
        let selector = null;
        let applied = false;

        if (currentZapperMode === 'id' && clickedElement.id) {
            selector = '#' + clickedElement.id;
            const style = doc.createElement('style');
            style.textContent = selector + ' { display: none !important; }';
            doc.head.appendChild(style);
            console.log('Frame script: Hidden element with selector: ' + selector);
            applied = true;
        } else if (currentZapperMode === 'class' && clickedElement.className) {
            const classes = clickedElement.className.split(/\s+/).filter(cls => cls.length > 0);
            if (classes.length > 0) {
                 selector = '.' + classes[0]; // Use the first class
                 const style = doc.createElement('style');
                 style.textContent = selector + ' { display: none !important; }';
                 doc.head.appendChild(style);
                 console.log('Frame script: Hidden element with selector: ' + selector);
                 applied = true;
            } else {
                 console.log("Frame script: Element has no classes to hide by.");
            }
        } else {
             console.log('Frame script: Cannot hide element by ' + currentZapperMode + ' (no ' + currentZapperMode + ' found).');
        }

        // Fallback to hiding the element directly if no selector was applied
        if (!applied) {
            clickedElement.style.setProperty('display', 'none', 'important');
            console.log("Frame script: Hidden element directly.", clickedElement);
        }
      } else {
        console.log("Frame script: Clicked on html or body, not hiding.");
      }
    };

    // Add listener for hiding an element on click with visual indicator
    this.addMessageListener("${HIDE_ELEMENT_MESSAGE}", (message) => {
      console.log(">>> RECEIVED MESSAGE: ${HIDE_ELEMENT_MESSAGE}");
      console.log("Frame script: HIDE_ELEMENT_MESSAGE received.");

      if (isZapperModeActive) {
          console.log("Frame script: Zapper mode already active, ignoring message.");
          return;
      }

      console.log("Frame script: Activating Element hider mode.");
      isZapperModeActive = true;

      // Get the zapper mode from the message data
      if (message.data && message.data.mode) {
          currentZapperMode = message.data.mode;
          console.log("Frame script: Zapper mode set to: ", currentZapperMode);
      } else {
          currentZapperMode = 'id'; // Default if no mode is provided
          console.log("Frame script: No zapper mode provided, defaulting to: ", currentZapperMode);
      }

      // Add the event listeners to the document (use capturing phase)
      doc.addEventListener('click', hideElementClickHandler, true);
      doc.addEventListener('mouseover', handleMouseOver, true);
      doc.addEventListener('mouseout', handleMouseOut, true);
    });

    this._boosterSeatListenerAdded = true;
    console.log("Main frame script: All listeners added.");

    // Signal to the main script that the frame script is ready
    this.sendAsyncMessage("${FRAME_SCRIPT_READY_MESSAGE}", {});
  }
`;

console.log("BoosterSeat Combined Script: Hotkey and Chrome UI setup.");

Hotkeys.define({
  id: "toggleFloatingElement",
  modifiers: "ctrl shift alt",
  key: "B",
  command: (window, commandEvent) => {
    // Add init log
    console.log("Hotkey command triggered in browser chrome.");

    // Access Utils here (imported at the top)
    if (!Utils) {
      console.error("UC_API.Utils not available.");
      return;
    }

    // Get the browser element for the active tab
    const browser = window.gBrowser?.selectedBrowser;

    if (!browser) {
      console.error("Could not access active tab's browser element for frame script loading/message sending.");
      return;
    }

    // Load the main frame script into the active tab's content process.
    browser.messageManager.loadFrameScript(
      "data:application/javascript," + encodeURIComponent(frameScriptCode),
      false
    );

    console.log("BoosterSeat Combined Script: Main frame script load initiated for active tab.");

    // Request the current scale from the frame script for the newly active tab
    console.log(`BoosterSeat Combined Script: Requesting current scale for active tab.`);
    browser.messageManager.sendAsyncMessage(REQUEST_GLOBAL_SCALE_MESSAGE, {});

    // Add listener for scale reply from frame script (if not already added)
    if (!window._boosterSeatScaleReplyListenerAdded) {
        window.messageManager.addMessageListener(REPLY_GLOBAL_SCALE_MESSAGE, (message) => {
            console.log(">>> RECEIVED REPLY MESSAGE: ${REPLY_GLOBAL_SCALE_MESSAGE}", message.data);
            const receivedScale = message.data?.scale;
            if (typeof receivedScale === 'number') {
                 // Update the currentScale variable in the main script's scope
                currentScale = receivedScale;
                console.log("Main script: Updated currentScale to:", currentScale);

                // Find the scale button and update its text
                const boosterMain = window.document.getElementById('booster-main');
                if (boosterMain) {
                    const sizeButton = boosterMain.querySelector('#booster-size-button');
                    if (sizeButton) {
                         sizeButton.textContent = `${Math.round(currentScale * 100)}%`;
                         console.log("Main script: Updated size button text to:", sizeButton.textContent);
                    }
                }
            } else {
                 console.error("Main script: Received scale reply without valid scale data.");
            }
        });
        window._boosterSeatScaleReplyListenerAdded = true;
        console.log("Main script: Scale reply listener added to window messageManager.");
    }

    // Add listener for frame script ready signal (if not already added)
    if (!window._boosterSeatFrameScriptReadyListenerAdded) {
        window.messageManager.addMessageListener(FRAME_SCRIPT_READY_MESSAGE, (message) => {
            console.log(">>> RECEIVED READY SIGNAL FROM FRAME SCRIPT for " + message.target.currentURI?.spec);
        });
        window._boosterSeatFrameScriptReadyListenerAdded = true;
        console.log("Main script: Frame script ready listener added to window messageManager.");
    }

    // Get the browser document (browser chrome) for creating/toggling the floating div
    const browserDocument = window.document;

    const elementId = "booster-main";
    const wrapperId = "booster";

    let wrapperDiv = browserDocument.getElementById(wrapperId);
    let floatingDiv = browserDocument.getElementById(elementId);

    // Variable to store the current scale, initialized to 1.0 (100%)
    let currentScale = 1.0;

    // Helper function to create buttons
    const createButton = (text, clickHandler) => {
      const button = Utils.createElement(browserDocument, "button", {});
      button.textContent = text;
      button.addEventListener("click", clickHandler);
      return button;
    };

    // Create the wrapper div if it doesn't exist
    if (!wrapperDiv) {
      wrapperDiv = Utils.createElement(browserDocument, "div", { id: wrapperId });
      browserDocument.body.appendChild(wrapperDiv);
    }

    // Create the main content div if it doesn't exist
    if (!floatingDiv) {
        floatingDiv = Utils.createElement(browserDocument, "div", { id: elementId });

        // Add the top bar
        const topBar = Utils.createElement(browserDocument, "div", { id: "booster-top-bar" });
        topBar.style.display = 'flex';
        topBar.style.justifyContent = 'space-between';
        topBar.style.alignItems = 'center';
        topBar.style.padding = '5px 10px';
        topBar.style.borderBottom = '1px solid #ccc';

        // Close button
        const closeButton = createButton("✕", () => {
            wrapperDiv.style.display = "none";
            console.log("Close button clicked");
        });
        closeButton.id = "booster-close-button";
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '1.2em';
        closeButton.style.cursor = 'pointer';
        topBar.appendChild(closeButton);

        // Title with dropdown
        const titleDiv = Utils.createElement(browserDocument, "div", { id: "booster-title" });
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.flexGrow = '1';
        titleDiv.style.textAlign = 'center';
        titleDiv.style.cursor = 'pointer';
        titleDiv.textContent = "My Boost";
        const dropdownArrow = Utils.createElement(browserDocument, "span", {});
        dropdownArrow.textContent = " ▼";
        titleDiv.appendChild(dropdownArrow);
        topBar.appendChild(titleDiv);

        // Refresh button
        const refreshButton = createButton("⟲", () => {
            browser.reload();
            console.log("Refresh button clicked");
        });
        refreshButton.id = "booster-refresh-button";
        refreshButton.style.backgroundColor = 'transparent';
        refreshButton.style.border = 'none';
        refreshButton.style.fontSize = '1.2em';
        refreshButton.style.cursor = 'pointer';
        topBar.appendChild(refreshButton);

        floatingDiv.appendChild(topBar);

        // Add basic styling
        floatingDiv.style.border = "1px solid black";
        floatingDiv.style.backgroundColor = "white";
        floatingDiv.style.padding = "10px";
        floatingDiv.style.position = "fixed";
        floatingDiv.style.zIndex = "9999";

        // Color picker area placeholder
        const colorPickerArea = Utils.createElement(browserDocument, "div", {});
        colorPickerArea.textContent = "[Color Picker Placeholder]";
        colorPickerArea.id = "booster-color-picker-area";
        colorPickerArea.style.width = '200px';
        colorPickerArea.style.height = '150px';
        colorPickerArea.style.border = '1px solid #ccc';
        colorPickerArea.style.marginBottom = '10px';
        floatingDiv.appendChild(colorPickerArea);

        // Icon buttons row
        const iconButtonRow = Utils.createElement(browserDocument, "div", {});
        iconButtonRow.style.display = 'flex';
        iconButtonRow.style.gap = '10px';
        iconButtonRow.style.marginBottom = '10px';
        iconButtonRow.id = "booster-icon-buttons";

        const lightbulbButton = createButton("💡", () => {
            browser.messageManager.sendAsyncMessage(SET_BACKGROUND_WHITE_MESSAGE, { color: "#FFFFFF" });
            console.log("Lightbulb button clicked");
        });
        lightbulbButton.id = "booster-lightbulb-button";
        lightbulbButton.style.width = '40px';
        iconButtonRow.appendChild(lightbulbButton);

        const filtersButton = createButton("⚙️", () => {
            browser.messageManager.sendAsyncMessage(SET_BACKGROUND_WHITE_MESSAGE, { color: "#FFFFCC" });
            console.log("Filters button clicked");
        });
        filtersButton.id = "booster-advanced-color-button";
        filtersButton.style.width = '40px';
        iconButtonRow.appendChild(filtersButton);

        const blockButton = createButton("🚫", () => {
            browser.messageManager.sendAsyncMessage(SET_BACKGROUND_WHITE_MESSAGE, { color: "" });
            console.log("Block button clicked");
        });
        blockButton.id = "booster-reset-colors-button";
        blockButton.style.width = '40px';
        iconButtonRow.appendChild(blockButton);

        floatingDiv.appendChild(iconButtonRow);

        // Font style options area
        const fontStyleArea = Utils.createElement(browserDocument, "div", {});
        fontStyleArea.style.border = '1px solid #ccc';
        fontStyleArea.style.padding = '10px';
        fontStyleArea.style.marginBottom = '10px';
        fontStyleArea.style.display = 'grid';
        fontStyleArea.style.gridTemplateColumns = 'repeat(5, 1fr)';
        fontStyleArea.style.gap = '5px';
        fontStyleArea.id = "booster-font-style-area";
        fontStyleArea.style.color = 'black !important';
        fontStyleArea.style.fontSize = '15px';
        fontStyleArea.style.fontWeight = '800';

        const fontStyles = [
            { text: 'Aa', fontFamily: '' },
            { text: 'Aa', fontFamily: 'Arial, sans-serif' },
            { text: 'Aa', fontFamily: 'Verdana, sans-serif' },
            { text: 'Aa', fontFamily: 'Tahoma, sans-serif' },
            { text: 'Aa', fontFamily: 'Georgia, serif' },
            { text: 'Aa', fontFamily: 'Times New Roman, serif' },
            { text: 'Aa', fontFamily: 'Courier New, monospace' },
            { text: 'Aa', fontFamily: 'Lucida Sans Unicode, Lucida Grande, sans-serif' },
            { text: 'Aa', fontFamily: 'Impact, Charcoal, sans-serif' },
            { text: 'Aa', fontFamily: 'Palatino Linotype, Book Antiqua, Palatino, serif' },
            { text: 'Aa', fontFamily: 'Trebuchet MS, Helvetica, sans-serif' },
            { text: 'Aa', fontFamily: 'Arial Black, Gadget, sans-serif' },
            { text: 'Aa', fontFamily: 'Comic Sans MS, cursive' },
            { text: 'Aa', fontFamily: 'cursive' },
            { text: 'Aa', fontFamily: 'fantasy' },
            { text: 'Aa', fontFamily: 'system-ui' },
            { text: 'Aa', fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, \'Open Sans\', \'Helvetica Neue\', sans-serif' },
            { text: 'Aa', fontFamily: 'sans-serif' },
            { text: 'Aa', fontFamily: 'serif' },
            { text: 'Aa', fontFamily: '' },
            { text: 'Aa', fontFamily: '' },
            { text: 'Aa', fontFamily: '' },
            { text: 'Aa', fontFamily: '' },
            { text: 'Aa', fontFamily: '' },
            { text: 'Aa', fontFamily: '' },
            { text: 'Aa', fontFamily: '' },
            { text: '☮️', isIcon: true },
            { text: '♋', isIcon: true },
        ];

        fontStyles.forEach((fontInfo, index) => {
            const fontElement = Utils.createElement(browserDocument, "span", {});
            fontElement.textContent = fontInfo.text;
            if (fontInfo.style) {
                fontElement.style.cssText = fontInfo.style;
            }
            if (fontInfo.fontFamily) {
                fontElement.style.fontFamily = fontInfo.fontFamily;
            }

            fontElement.style.cursor = 'pointer';
            fontElement.style.padding = '3px';
            fontElement.style.textAlign = 'center';
            fontElement.id = `booster-font-style-${index}`;
            fontElement.classList.add('booster-font-style-option');

            if (!fontInfo.isIcon) {
                fontElement.addEventListener('click', () => {
                    console.log(`Font style clicked: ${fontInfo.text} with font family ${fontInfo.fontFamily}`);
                    const selectedFontFamily = fontInfo.fontFamily;
                    if (browser && selectedFontFamily !== undefined && selectedFontFamily !== '') {
                        browser.messageManager.sendAsyncMessage(SET_GLOBAL_FONT_FAMILY_MESSAGE, { fontFamily: selectedFontFamily });
                        console.log(`Sent message to active tab with font family: ${selectedFontFamily}.`);
                    }
                });
            } else {
                 fontElement.addEventListener('click', () => { console.log(`Icon clicked: ${fontInfo.text}`); });
            }

            fontStyleArea.appendChild(fontElement);
        });

        floatingDiv.appendChild(fontStyleArea);

        // Red buttons row
        const redButtonRow = Utils.createElement(browserDocument, "div", {});
        redButtonRow.style.display = 'flex';
        redButtonRow.style.gap = '10px';
        redButtonRow.style.marginBottom = '10px';
        redButtonRow.id = "booster-red-buttons";

        const percentButton = createButton("90%", () => { console.log("90% button clicked"); });
        percentButton.id = "booster-size-button";
        percentButton.style.backgroundColor = 'red';
        percentButton.style.color = 'white';
        percentButton.style.fontWeight = 'bold';
        percentButton.style.flex = '1';
        redButtonRow.appendChild(percentButton);

        // Add wheel event listener to the size button
        percentButton.addEventListener('wheel', (event) => {
            event.preventDefault();
            const scaleChange = event.deltaY * -0.001;
            currentScale = Math.max(0.9, Math.min(1.5, currentScale + scaleChange));
            percentButton.textContent = `${Math.round(currentScale * 100)}%`;
            console.log(`Scale changed to: ${currentScale} (${percentButton.textContent})`);

            if (browser) {
                browser.messageManager.sendAsyncMessage(SET_GLOBAL_SCALE_MESSAGE, { scale: currentScale });
            }
        });

        const aaButton = createButton("Aa", () => {
            browser.messageManager.sendAsyncMessage(TOGGLE_ATTRIBUTE_MESSAGE, {});
            console.log("Aa button clicked");
        });
        aaButton.id = "booster-case-button";
        aaButton.style.backgroundColor = 'red';
        aaButton.style.color = 'white';
        aaButton.style.fontWeight = 'bold';
        aaButton.style.flex = '1';
        redButtonRow.appendChild(aaButton);

        floatingDiv.appendChild(redButtonRow);

        // Grey buttons section
        const greyButtonSection = Utils.createElement(browserDocument, "div", {});
        greyButtonSection.style.display = 'grid';
        greyButtonSection.style.gridTemplateColumns = '1fr auto';
        greyButtonSection.style.gap = '10px';
        greyButtonSection.style.marginBottom = '10px';
        greyButtonSection.id = "booster-grey-buttons";

        const zapButton = createButton("Zap", () => { console.log("Zap button clicked"); });
        zapButton.id = "booster-zap-button";
        zapButton.style.backgroundColor = '#eee';
        zapButton.style.border = '1px solid #ccc';
        zapButton.style.textAlign = 'left';
        zapButton.style.padding = '5px 10px';
        zapButton.innerHTML += '<span style="float: right;">⚡</span>';
        greyButtonSection.appendChild(zapButton);

        // Add the Zapper Mode selector element
        const zapperModeElement = Utils.createElement(browserDocument, "span", { id: "booster-zapper-mode" });
        zapperModeElement.textContent = currentZapperMode.toUpperCase();
        zapperModeElement.style.backgroundColor = '#eee';
        zapperModeElement.style.border = '1px solid #ccc';
        zapperModeElement.style.padding = '5px 10px';
        zapperModeElement.style.textAlign = 'center';
        zapperModeElement.style.cursor = 'ns-resize';
        zapperModeElement.style.userSelect = 'none';
        greyButtonSection.appendChild(zapperModeElement);

        // Add wheel event listener to toggle mode
        zapperModeElement.addEventListener('wheel', (event) => {
            event.preventDefault();
            currentZapperMode = currentZapperMode === 'id' ? 'class' : 'id';
            zapperModeElement.textContent = currentZapperMode.toUpperCase();
            console.log("Zapper mode toggled to:", currentZapperMode);
        });

        const codeButton = createButton("Code", () => {
            browser.messageManager.sendAsyncMessage(ACTIVATE_ELEMENT_SELECTOR_MESSAGE, {});
            console.log("Code button clicked");
        });
        codeButton.id = "booster-code-button";
        codeButton.style.backgroundColor = '#eee';
        codeButton.style.border = '1px solid #ccc';
        codeButton.style.textAlign = 'left';
        codeButton.style.padding = '5px 10px';
        codeButton.innerHTML += '<span style="float: right;">{}</span>';
        greyButtonSection.appendChild(codeButton);

        floatingDiv.appendChild(greyButtonSection);

        // Append the main content div to the wrapper div
        wrapperDiv.appendChild(floatingDiv);
    }

    // Now handle visibility and positioning
    const isVisible = wrapperDiv.style.display === "block";
    wrapperDiv.style.display = isVisible ? "none" : "block";

    // If showing, update position to current cursor location
    if (!isVisible) {
       wrapperDiv.style.left = `${commandEvent.screenX}px`;
       wrapperDiv.style.top = `${commandEvent.screenY}px`;
    }

    // Add the click listener for the Zap button
    const zapButton = browserDocument.getElementById('booster-zap-button');
    if (zapButton) {
        // Remove any existing listeners to prevent duplicates
        const newZapButton = zapButton.cloneNode(true);
        zapButton.parentNode.replaceChild(newZapButton, zapButton);
        newZapButton.addEventListener('click', () => {
            console.log("Zap button clicked.");
            if (browser) {
                browser.messageManager.sendAsyncMessage(HIDE_ELEMENT_MESSAGE, { mode: currentZapperMode });
                console.log('Sent message to active tab with mode: ' + currentZapperMode + '.');
                // Add the Escape key listener to the chrome window
                window.addEventListener('keydown', handleChromeEscapeKeyDown);
            }
        });
    }

    // Define the Escape key handler for the chrome window
    const handleChromeEscapeKeyDown = (event) => {
        if (event.key === "Escape") {
            console.log("Escape key pressed in chrome, deactivating zapper.");
            const browser = window.gBrowser?.selectedBrowser;
            if (browser) {
                browser.messageManager.sendAsyncMessage(DEACTIVATE_ZAPPER_MESSAGE, {});
            }
            // Remove this listener after it has been triggered
            window.removeEventListener('keydown', handleChromeEscapeKeyDown);
        }
    };
  }
}).autoAttach();

console.log("BoosterSeat Combined Script: Hotkey and Chrome UI setup finished.");

