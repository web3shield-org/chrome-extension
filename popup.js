// Popup Script for Web3 Wallet Detector
document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup script loaded');
    
    const loadingEl = document.getElementById('loading');
    const walletContentEl = document.getElementById('wallet-content');
    const noWalletsEl = document.getElementById('no-wallets');
    const walletListEl = document.getElementById('wallet-list');
    const walletCountEl = document.getElementById('wallet-count');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshBtnEmpty = document.getElementById('refresh-btn-empty');
    
    // Function to display wallets
    function displayWallets(wallets) {
        console.log('Displaying wallets:', wallets);
        loadingEl.style.display = 'none';
        
        if (wallets && wallets.length > 0) {
            walletContentEl.style.display = 'block';
            noWalletsEl.style.display = 'none';
            
            // Update count
            walletCountEl.textContent = `${wallets.length} wallet${wallets.length !== 1 ? 's' : ''} detected`;
            
            // Clear previous results
            walletListEl.innerHTML = '';
            
            // Display each wallet
            wallets.forEach(wallet => {
                const walletItem = document.createElement('div');
                walletItem.className = 'wallet-item';
                
                // Create icon element with better error handling
                const iconSrc = wallet.info.icon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzMzNzNkYyIvPgo8cGF0aCBkPSJNMTYgOGw4IDhsLTggOGwtOC04eiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+';
                
                walletItem.innerHTML = `
                    <div class="wallet-header">
                        <div class="wallet-icon">
                            <img src="${iconSrc}" alt="${wallet.info.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='🔗';">
                        </div>
                        <div>
                            <div class="wallet-name">${wallet.info.name}</div>
                            <div class="wallet-uuid">UUID: ${wallet.info.uuid}</div>
                        </div>
                    </div>
                `;
                
                walletListEl.appendChild(walletItem);
            });
        } else {
            walletContentEl.style.display = 'none';
            noWalletsEl.style.display = 'block';
        }
    }
    
    // Function to scan for wallets
    function scanForWallets() {
        console.log('Starting wallet scan...');
        loadingEl.style.display = 'block';
        walletContentEl.style.display = 'none';
        noWalletsEl.style.display = 'none';
        
        // Get current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                console.log('Sending message to tab:', tabs[0].id);
                
                // Check if we can access the tab
                if (tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('chrome-extension://') || tabs[0].url.startsWith('moz-extension://')) {
                    console.log('Cannot inject into system pages');
                    displayWallets([]);
                    return;
                }
                
                // Send message to content script
                chrome.tabs.sendMessage(tabs[0].id, { action: 'getWallets' }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.error('Error communicating with content script:', chrome.runtime.lastError);
                        
                        // Try to inject content script if it's not already there
                        chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            files: ['content.js']
                        }, function() {
                            if (chrome.runtime.lastError) {
                                console.error('Failed to inject content script:', chrome.runtime.lastError);
                                displayWallets([]);
                                return;
                            }
                            
                            // Try again after injection
                            setTimeout(() => {
                                chrome.tabs.sendMessage(tabs[0].id, { action: 'getWallets' }, function(response) {
                                    if (chrome.runtime.lastError) {
                                        console.error('Still failed after injection:', chrome.runtime.lastError);
                                        displayWallets([]);
                                        return;
                                    }
                                    displayWallets(response ? response.wallets : []);
                                });
                            }, 500);
                        });
                        return;
                    }
                    
                    console.log('Received response:', response);
                    displayWallets(response ? response.wallets : []);
                });
            } else {
                console.log('No active tab found');
                displayWallets([]);
            }
        });
    }
    
    // Event listeners for refresh buttons
    refreshBtn.addEventListener('click', scanForWallets);
    refreshBtnEmpty.addEventListener('click', scanForWallets);
    
    // Initial scan
    scanForWallets();
});