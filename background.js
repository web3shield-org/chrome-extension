// background.js

let detectedWallets = {}; // Stores wallets, keyed by UUID to avoid duplicates

chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.storage.local.get('isEmblemEnabled', (data) => {
      if (data.isEmblemEnabled === undefined) {
        chrome.storage.local.set({ isEmblemEnabled: true }, () => {
          console.log('ProjectX: Initializing isEmblemEnabled to true on installation.');
        });
      } else {
        console.log('ProjectX: isEmblemEnabled already set on installation.');
      }
    });
  } catch (error) {
    console.error('ProjectX Error: Failed to set initial emblem state on installation.', error);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "toggleEmblem") {
      chrome.storage.local.set({ isEmblemEnabled: request.isEmblemEnabled }, () => {
        if (chrome.runtime.lastError) {
          console.error('ProjectX Error: Failed to save emblem state to storage.', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log(`ProjectX: Emblem state toggled to ${request.isEmblemEnabled}.`);
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              try {
                if (tab.id) {
                  chrome.tabs.sendMessage(tab.id, { action: "updateEmblem", isEmblemEnabled: request.isEmblemEnabled })
                    .catch(error => console.warn(`ProjectX Warning: Could not send updateEmblem message to tab ${tab.id}.`, error));
                }
              } catch (error) {
                console.error(`ProjectX Error: Failed to send updateEmblem message to a tab.`, error);
              }
            });
          });
          sendResponse({ success: true });
        }
      });
      return true;
    } else if (request.action === "getEmblemState") {
      chrome.storage.local.get('isEmblemEnabled', (data) => {
        if (chrome.runtime.lastError) {
          console.error('ProjectX Error: Failed to retrieve emblem state from storage.', chrome.runtime.lastError);
          sendResponse({ isEmblemEnabled: false, error: chrome.runtime.lastError.message });
        } else {
          const isEnabled = data.isEmblemEnabled !== undefined ? data.isEmblemEnabled : true;
          console.log(`ProjectX: Emblem state requested, sending ${isEnabled}.`);
          sendResponse({ isEmblemEnabled: isEnabled });
        }
      });
      return true;
    } else if (request.action === "reportWallet") {
      // Wallet data received from content script
      const { info } = request;
      if (info && info.uuid) {
        if (!detectedWallets[info.uuid]) {
          detectedWallets[info.uuid] = info;
          console.log(`ProjectX: Detected new wallet: ${info.name} (${info.uuid})`);
          // Inform any open popups about the new wallet
          chrome.runtime.sendMessage({ action: "walletDetected", wallets: Object.values(detectedWallets) })
            .catch(error => console.warn("ProjectX Warning: Could not send walletDetected message to popup.", error));
        } else {
          console.log(`ProjectX: Wallet ${info.name} (${info.uuid}) already detected.`);
        }
      }
      sendResponse({ success: true });
      return true;
    } else if (request.action === "requestWallets") {
      // Popup requests current list of wallets
      console.log('ProjectX: Popup requested wallet list. Sending current detected wallets.');
      sendResponse({ wallets: Object.values(detectedWallets) });
      return true;
    }
  } catch (error) {
    console.error('ProjectX Error: An error occurred in background script message listener.', error);
    sendResponse({ success: false, error: error.message });
  }
});

// Clear detected wallets and inject eip6963_injected.js when a new page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the tab has a valid URL (http/https) and has finished loading
  if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https:'))) {
    console.log(`ProjectX: Page completed loading in tab ${tabId}.`);

    // Reset detected wallets for the new page
    console.log(`ProjectX: Clearing detected wallets for new page: ${tab.url}`);
    detectedWallets = {};

    // Inject the EIP-6963 listener script into the main world of the page
    try {
      if (chrome.scripting) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['eip6963_injected.js'],
          world: 'MAIN' // Crucial: runs in the webpage's context
        })
        .then(() => console.log(`ProjectX: eip6963_injected.js injected into tab ${tabId}.`))
        .catch(error => console.error(`ProjectX Error: Failed to inject eip6963_injected.js into tab ${tabId}.`, error));
      } else {
        console.error('ProjectX Error: chrome.scripting API not available in background script. This should not happen in MV3.');
      }
    } catch (error) {
      console.error(`ProjectX Error: Error during eip6963_injected.js injection attempt for tab ${tabId}.`, error);
    }
  }
});