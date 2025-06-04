// Content Script for Web3 Wallet Detection
(function() {
    let detectedWallets = [];
    let scriptInjected = false;
    
    // Inject the detection script
    function injectScript() {
        if (scriptInjected) return;
        
        try {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('injected.js');
            script.onload = function() {
                console.log('Injected script loaded successfully');
                this.remove();
                scriptInjected = true;
                
                // Request wallet detection after script is loaded
                setTimeout(() => {
                    window.postMessage({ type: 'REQUEST_WALLET_DETECTION' }, '*');
                }, 100);
            };
            script.onerror = function() {
                console.error('Failed to load injected script');
                this.remove();
            };
            
            (document.head || document.documentElement).appendChild(script);
            console.log('Injected script added to page');
        } catch (error) {
            console.error('Error injecting script:', error);
        }
    }
    
    // Listen for messages from injected script
    window.addEventListener('message', function(event) {
        if (event.source === window && event.data.type === 'WALLET_DETECTION_RESULT') {
            detectedWallets = event.data.wallets || [];
            console.log('Wallets detected in content script:', detectedWallets);
        }
    });
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Message received from popup:', request);
        
        if (request.action === 'getWallets') {
            // Ensure script is injected
            if (!scriptInjected) {
                injectScript();
            }
            
            // Request fresh wallet detection
            setTimeout(() => {
                window.postMessage({ type: 'REQUEST_WALLET_DETECTION' }, '*');
            }, 100);
            
            // Wait for results then respond
            setTimeout(() => {
                console.log('Sending wallets to popup:', detectedWallets);
                sendResponse({ wallets: detectedWallets });
            }, 1500);
            
            return true; // Keep message channel open for async response
        }
    });
    
    // Inject script when DOM is ready
    function initialize() {
        console.log('Content script initializing...');
        injectScript();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    console.log('Content script loaded');
})();