// EIP-6963 Wallet Detection Script
(function() {
    console.log('EIP-6963 Wallet Detection Script loaded');
    let detectedWallets = new Map();
    
    // Function to announce wallets back to content script
    function announceWallets() {
        const walletArray = Array.from(detectedWallets.values());
        console.log('Announcing wallets:', walletArray);
        window.postMessage({
            type: 'WALLET_DETECTION_RESULT',
            wallets: walletArray
        }, '*');
    }
    
    // Listen for EIP-6963 wallet announcements
    function handleWalletAnnouncement(event) {
        console.log('EIP-6963 wallet announcement received:', event.detail);
        const { detail } = event;
        
        if (detail && detail.info) {
            detectedWallets.set(detail.info.uuid, {
                info: detail.info,
                provider: detail.provider ? 'Available' : 'Not Available'
            });
            console.log('Web3 Wallet detected via EIP-6963:', detail.info.name);
            announceWallets(); // Announce immediately when found
        }
    }
    
    // Set up event listener for wallet announcements
    window.addEventListener('eip6963:announceProvider', handleWalletAnnouncement);
    
    // Check for legacy wallets
    function checkLegacyWallets() {
        console.log('Checking for legacy wallets...');
        
        // Check window.ethereum
        if (typeof window.ethereum !== 'undefined') {
            let legacyName = 'Ethereum Wallet';
            let legacyIcon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzMzNzNkYyIvPgo8cGF0aCBkPSJNMTYgOGw4IDhsLTggOGwtOC04eiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+';
            
            if (window.ethereum.isMetaMask) {
                legacyName = 'MetaMask';
                legacyIcon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iI0Y2ODUxQiIvPgo8cGF0aCBkPSJNMTYgOGw4IDhsLTggOGwtOC04eiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+';
            } else if (window.ethereum.isRabby) {
                legacyName = 'Rabby Wallet';
            } else if (window.ethereum.isCoinbaseWallet) {
                legacyName = 'Coinbase Wallet';
            } else if (window.ethereum.isBraveWallet) {
                legacyName = 'Brave Wallet';
            }
            
            const legacyUuid = 'legacy-ethereum-' + legacyName.toLowerCase().replace(/\s+/g, '-');
            
            if (!detectedWallets.has(legacyUuid)) {
                detectedWallets.set(legacyUuid, {
                    info: {
                        uuid: legacyUuid,
                        name: legacyName + ' (Legacy)',
                        icon: legacyIcon,
                        rdns: 'legacy.ethereum.wallet'
                    },
                    provider: 'Available'
                });
                console.log('Legacy wallet detected:', legacyName);
            }
        }
        
        // Check for other common wallet objects
        const commonWallets = [
            { obj: 'solana', name: 'Solana Wallet' },
            { obj: 'phantom', name: 'Phantom' },
            { obj: 'solflare', name: 'Solflare' },
            { obj: 'tronWeb', name: 'TronLink' },
            { obj: 'aptos', name: 'Aptos Wallet' },
            { obj: 'keplr', name: 'Keplr' },
            { obj: 'leap', name: 'Leap Wallet' }
        ];
        
        commonWallets.forEach(wallet => {
            if (typeof window[wallet.obj] !== 'undefined') {
                const uuid = `legacy-${wallet.obj}-${Date.now()}`;
                if (!detectedWallets.has(uuid)) {
                    detectedWallets.set(uuid, {
                        info: {
                            uuid: uuid,
                            name: wallet.name + ' (Legacy)',
                            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzMzNzNkYyIvPgo8cGF0aCBkPSJNMTYgOGw4IDhsLTggOGwtOC04eiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
                            rdns: `legacy.${wallet.obj}.wallet`
                        },
                        provider: 'Available'
                    });
                    console.log('Legacy wallet detected:', wallet.name);
                }
            }
        });
    }
    
    // Request wallet announcements
    function requestWallets() {
        console.log('Requesting EIP-6963 wallet announcements...');
        
        // Clear previous detections
        detectedWallets.clear();
        
        // Dispatch the EIP-6963 request event
        const event = new CustomEvent('eip6963:requestProvider');
        window.dispatchEvent(event);
        console.log('EIP-6963 request dispatched');
        
        // Check for legacy wallets
        setTimeout(() => {
            checkLegacyWallets();
            announceWallets();
        }, 100);
    }
    
    // Listen for requests from content script
    window.addEventListener('message', function(event) {
        if (event.source === window && event.data.type === 'REQUEST_WALLET_DETECTION') {
            console.log('Wallet detection requested from content script');
            requestWallets();
            
            // Give some time for wallets to announce themselves
            setTimeout(() => {
                announceWallets();
            }, 500);
        }
    });
    
    // Initial wallet detection
    function initializeDetection() {
        console.log('Initializing wallet detection...');
        requestWallets();
        
        // Set up periodic announcement
        setTimeout(() => {
            announceWallets();
        }, 1000);
    }
    
    // Wait for page to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDetection);
    } else {
        // Run immediately if DOM is already loaded
        setTimeout(initializeDetection, 100);
    }
    
    // Also run when window loads
    window.addEventListener('load', () => {
        setTimeout(() => {
            requestWallets();
        }, 500);
    });
})();