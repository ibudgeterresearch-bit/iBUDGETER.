// ============================================================
// IBUDGETER - Main JavaScript
// ============================================================
// This file handles:
// - Barcode scanning (camera + manual input)
// - Budget management (set, track, progress bar)
// - Product lookup (SRP database + API fallback)
// - Shopping list (add, remove, update quantity)
// - LocalStorage (save/load data)
// ============================================================

(function() {
    "use strict";

    // ============================================================
    // DOM REFERENCES - Connect HTML elements to JavaScript
    // ============================================================
    const scannerElement = document.getElementById('scanner');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    const manualInput = document.getElementById('manualBarcode');
    const lookupBtn = document.getElementById('lookupBtn');
    const budgetInput = document.getElementById('budgetInput');
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    const budgetDisplay = document.getElementById('budgetDisplay');
    const budgetProgress = document.getElementById('budgetProgress');
    const totalBudgetEl = document.getElementById('totalBudget');
    const spentAmountEl = document.getElementById('spentAmount');
    const remainingAmountEl = document.getElementById('remainingAmount');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const shoppingListSection = document.getElementById('shoppingListSection');
    const shoppingList = document.getElementById('shoppingList');
    const itemCount = document.getElementById('itemCount');
    const listTotal = document.getElementById('listTotal');
    const clearListBtn = document.getElementById('clearListBtn');

    // ============================================================
    // STATE VARIABLES - Track app data
    // ============================================================
    let html5QrCode = null;      // Scanner instance
    let isProcessing = false;    // Prevent duplicate scans
    let scannerActive = false;   // Is camera on?
    
    let budget = 0;              // User's total budget
    let shoppingItems = [];      // Shopping list items
    let currentProduct = null;   // Currently scanned product
    let currentQuantity = 1;     // Quantity for adding to list

    // ============================================================
    // SRP DATABASE - Product prices (2026)
    // ============================================================
    // This is the main price database. When a product is scanned,
    // the app looks here first for the price.
    // Format: 'product name': price
    // ============================================================
    const srpDatabase = {
        // ===== CANNED GOODS =====
        'argentina corned beef': 39.00,
        'argentina corned beef 260g': 65.00,
        'purefoods corned beef': 69.00,
        'highlands corned beef': 43.00,
        'cdo karne norte': 36.00,
        'karne norte': 36.00,
        'mega sardines': 27.00,
        'ligo sardines': 28.00,
        '555 sardines': 29.00,
        'young\'s town sardines': 25.00,
        'saba sardines': 30.00,
        'mega squid': 45.00,
        'mega tuna flakes': 43.00,
        'century tuna': 46.00,
        'century tuna 155g': 45.00,
        '555 tuna afritada': 39.00,
        'san marino corned tuna': 45.00,
        'san marino corned tuna 150g': 45.00,
        'san marino tuna chunks': 46.00,
        'bluebay tuna': 35.00,
        'hunt\'s pork and beans': 39.00,
        'reno liver spread': 32.00,
        'reno liver spread 230g': 65.00,
        'argentina meat loaf': 34.00,
        'argentina meat loaf 250g': 45.00,
        'argentina meat loaf 150g': 30.00,
        'purefoods luncheon meat': 125.00,
        'spam classic': 245.00,

        // ===== SAUCES & CONDIMENTS (BOTTLE) =====
        'datu puti soy sauce': 73.00,
        'silver swan soy sauce': 74.00,
        'marca piña soy sauce': 72.00,
        'datu puti vinegar': 49.00,
        'ufc banana catsup': 38.00,
        'ufc tomato catsup': 40.00,
        'del monte tomato sauce': 33.00,
        'del monte tomato sauce 250g': 30.00,
        'del monte tomato paste': 25.00,
        'del monte spaghetti sauce': 67.00,
        'ufc spaghetti sauce': 64.00,
        'clara ole pasta sauce': 88.00,
        'lady\'s choice mayonnaise': 105.00,
        'lady\'s choice chicken spread': 105.00,
        'lady\'s choice sandwich spread': 115.00,
        'oyster sauce': 55.00,
        'oysterrific': 55.00,
        'fish sauce': 28.00,
        'sesame oil': 145.00,

        // ===== SAUCES & CONDIMENTS (SACHET) =====
        'soy sauce sachet': 10.00,
        'soy sauce twin pack': 18.00,
        'vinegar sachet': 10.00,
        'vinegar twin pack': 18.00,
        'catsup sachet': 15.00,
        'catsup twin pack': 25.00,
        'ketchup sachet': 15.00,
        'ketchup twin pack': 25.00,
        'mayonnaise sachet': 15.00,
        'mayonnaise twin pack': 25.00,
        'oyster sauce sachet': 10.00,
        'oyster sauce twin pack': 18.00,
        'oysterrific sachet': 10.00,
        'oysterrific twin pack': 18.00,
        'fish sauce sachet': 10.00,
        'fish sauce twin pack': 18.00,
        'sinigang mix sachet': 10.00,
        'sinigang mix twin pack': 18.00,
        'magic sarap sachet': 10.00,
        'magic sarap twin pack': 18.00,

        // ===== BUTTER & MARGARINE =====
        'butter': 105.00,
        'magnolia butter': 110.00,
        'butter sachet': 10.00,
        'butter twin pack': 18.00,
        'margarine': 85.00,
        'margarine sachet': 10.00,
        'margarine twin pack': 18.00,

        // ===== DAIRY & MILK =====
        'fresh milk': 98.00,
        'magnolia fresh milk': 110.00,
        'powdered milk': 20.00,
        'powdered milk sachet': 10.00,
        'powdered milk twin pack': 18.00,
        'bear brand powdered milk': 175.00,
        'bear brand sachet': 15.00,
        'bear brand twin pack': 25.00,
        'birch tree milk': 165.00,
        'birch tree sachet': 10.00,
        'birch tree twin pack': 20.00,
        'alaska evaporated milk': 42.00,
        'alaska evaporated sachet': 10.00,
        'alaska evaporated twin pack': 18.00,
        'alaska condensed milk': 39.00,
        'alaska condensed sachet': 10.00,
        'alaska condensed twin pack': 18.00,
        'alaska classic': 45.00,
        'doreen condensed milk': 55.00,
        'doreen 390g': 55.00,
        'angel evaporada': 35.00,
        'all-purpose cream': 48.00,
        'nestlé cream': 52.00,
        'eden cheese': 98.00,
        'eden cheese 430g': 185.00,
        'eden cheese 45g': 22.00,
        'eden cheese 160g': 55.00,
        'quickmelt cheese': 92.00,
        'cheese': 95.00,
        'yakult': 62.00,
        'magnolia yogurt drink': 36.00,
        'chuckie chocolate drink': 22.00,
        'milo ready-to-drink': 24.00,
        'ovaltine chocolate drink': 25.00,

        // ===== COFFEE =====
        'nescafé classic': 108.00,
        'nescafe 3-in-1 sachet': 10.00,
        'nescafe 3-in-1 twin pack': 18.00,
        'great taste coffee': 86.00,
        'great taste 20g': 30.00,
        'great taste 3-in-1 sachet': 10.00,
        'great taste 3-in-1 twin pack': 18.00,
        'kopiko brown coffee': 90.00,
        'kopiko brown sachet': 10.00,
        'kopiko brown twin pack': 18.00,

        // ===== BREAD =====
        'gardenia classic bread': 78.00,
        'pinoy tasty bread': 70.00,
        'bread loaf': 75.00,

        // ===== NOODLES =====
        'lucky me pancit canton original': 18.00,
        'lucky me pancit canton chilimansi': 18.00,
        'lucky me pancit canton kalamansi': 18.00,
        'lucky me instant mami beef': 16.00,
        'lucky me instant mami chicken': 16.00,
        'lucky me la paz batchoy': 19.00,
        'nissin ramen beef': 17.00,
        'payless xtra big pancit canton': 26.00,

        // ===== SNACKS =====
        'skyflakes crackers': 82.00,
        'fita crackers': 85.00,
        'hansel biscuits': 72.00,
        'oreo cookies': 48.00,
        'oishi prawn crackers': 32.00,
        'oishi rinbee': 30.00,
        'cheese ring': 28.00,
        'v-cut potato chips': 38.00,
        'roller coaster potato rings': 35.00,
        'mr. chips': 30.00,
        'moby chocolate': 30.00,
        'piattos 40g': 20.00,
        'nova multigrain snacks': 41.00,
        'ding dong mixed nuts': 45.00,
        'dingdong': 25.00,
        'nagaraya cracker nuts': 38.00,
        'boy bawang cornick': 35.00,
        'crispy fry': 20.00,

        // ===== SNACKS (SINGLE PACK) =====
        'skyflakes single': 8.00,
        'fita single': 8.50,
        'hansel single': 7.00,
        'oreo single': 5.00,
        'choco mucho': 16.00,
        'choco mucho single': 6.00,
        'cloud 9': 13.00,
        'cloud 9 single': 5.00,
        'hany chocolate': 48.00,
        'flat tops': 55.00,
        'white rabbit candy': 65.00,
        'potchi candy': 52.00,
        'mentos mint': 22.00,
        'maxx candy': 18.00,

        // ===== DRINKS =====
        'coca-cola': 75.00,
        'coca-cola 1l': 60.00,
        'coca-cola can': 30.00,
        'coca-cola small': 25.00,
        'pepsi': 75.00,
        'pepsi 1l': 60.00,
        'pepsi can': 30.00,
        'royal tru orange': 75.00,
        'royal tru orange 1l': 60.00,
        'royal tru orange can': 30.00,
        'sprite': 75.00,
        'sprite 1l': 60.00,
        'sprite can': 30.00,
        'wilkins drinking water': 30.00,
        'nature\'s spring water': 25.00,
        'c2 green tea': 32.00,
        'zesto juice drink': 14.00,
        'del monte pineapple juice': 92.00,
        'tang orange powder': 14.00,
        'nestea iced tea powder': 14.00,
        'tang powder sachet': 20.00,
        'tang powder twin pack': 35.00,
        'nestea powder sachet': 20.00,
        'nestea powder twin pack': 35.00
    };

    // ============================================================
    // BUDGET FUNCTIONS - Set, update, calculate
    // ============================================================
    function setBudget() {
        var value = parseFloat(budgetInput.value);
        if (isNaN(value) || value <= 0) {
            alert('Please enter a valid budget amount.');
            return;
        }
        budget = value;
        budgetInput.value = '';
        updateBudgetDisplay();
        saveState();
    }

    function updateBudgetDisplay() {
        var spent = calculateTotalSpent();
        var remaining = budget - spent;
        
        totalBudgetEl.textContent = '₱' + budget.toFixed(2);
        spentAmountEl.textContent = '₱' + spent.toFixed(2);
        remainingAmountEl.textContent = '₱' + remaining.toFixed(2);
        
        budgetDisplay.style.display = 'grid';
        budgetProgress.style.display = 'block';
        
        var percentUsed = Math.min((spent / budget) * 100, 100);
        progressFill.style.width = percentUsed + '%';
        progressText.textContent = percentUsed.toFixed(1) + '% used';
        
        progressFill.classList.remove('warning', 'danger');
        if (percentUsed > 80) {
            progressFill.classList.add('danger');
        } else if (percentUsed > 60) {
            progressFill.classList.add('warning');
        }
        
        shoppingListSection.style.display = 'block';
    }

    function calculateTotalSpent() {
        var total = 0;
        for (var i = 0; i < shoppingItems.length; i++) {
            total += shoppingItems[i].price * shoppingItems[i].quantity;
        }
        return total;
    }

    function getTotalQuantity() {
        var total = 0;
        for (var i = 0; i < shoppingItems.length; i++) {
            total += shoppingItems[i].quantity;
        }
        return total;
    }

    // ============================================================
    // SHOPPING LIST FUNCTIONS - Add, remove, update quantity
    // ============================================================
    function addToList(product, quantity) {
        if (!budget || budget <= 0) {
            alert('Please set a budget first!');
            return;
        }
        
        var totalCost = product.price * quantity;
        var totalSpent = calculateTotalSpent();
        var remaining = budget - totalSpent;
        
        if (totalCost > remaining) {
            alert('Not enough budget!\nTotal costs ₱' + totalCost.toFixed(2) + '\nRemaining budget: ₱' + remaining.toFixed(2));
            return;
        }
        
        var existingIndex = -1;
        for (var i = 0; i < shoppingItems.length; i++) {
            if (shoppingItems[i].barcode === product.barcode) {
                existingIndex = i;
                break;
            }
        }
        
        if (existingIndex !== -1) {
            shoppingItems[existingIndex].quantity += quantity;
        } else {
            shoppingItems.push({
                barcode: product.barcode,
                name: product.name,
                brand: product.brand,
                price: product.price,
                quantity: quantity,
                addedAt: new Date().toISOString()
            });
        }
        
        updateBudgetDisplay();
        renderShoppingList();
        saveState();
        
        var btn = document.querySelector('.add-to-list-btn');
        if (btn) {
            btn.textContent = 'Added ' + quantity + '!';
            btn.classList.add('added');
            setTimeout(function() {
                btn.textContent = 'Add ' + quantity + ' to List';
                btn.classList.remove('added');
            }, 2000);
        }
    }

    function removeFromList(index) {
        shoppingItems.splice(index, 1);
        updateBudgetDisplay();
        renderShoppingList();
        saveState();
    }

    function updateQuantity(index, delta) {
        var item = shoppingItems[index];
        var newQuantity = item.quantity + delta;
        if (newQuantity < 1) {
            removeFromList(index);
            return;
        }
        item.quantity = newQuantity;
        updateBudgetDisplay();
        renderShoppingList();
        saveState();
    }

    window.removeFromList = removeFromList;
    window.updateQuantity = updateQuantity;

    function clearList() {
        if (shoppingItems.length === 0) return;
        if (confirm('Are you sure you want to clear your shopping list?')) {
            shoppingItems = [];
            updateBudgetDisplay();
            renderShoppingList();
            saveState();
        }
    }

    function renderShoppingList() {
        if (shoppingItems.length === 0) {
            shoppingList.innerHTML = '<div class="empty-list"><span class="emoji">🛒</span><p>Your shopping list is empty</p><p style="font-size:12px;margin-top:4px;">Scan products to add them</p></div>';
            itemCount.textContent = '0';
            listTotal.textContent = '₱0.00';
            return;
        }
        
        var html = '';
        for (var i = 0; i < shoppingItems.length; i++) {
            var item = shoppingItems[i];
            var total = item.price * item.quantity;
            html += '<div class="list-item"><div class="list-item-info"><div class="list-item-name">' + escapeHtml(item.name) + '</div><div class="list-item-barcode">' + escapeHtml(item.barcode) + '</div></div><div class="list-item-quantity"><button class="qty-btn" onclick="window.updateQuantity(' + i + ', -1)">−</button><span class="qty-number">' + item.quantity + '</span><button class="qty-btn" onclick="window.updateQuantity(' + i + ', 1)">+</button></div><div class="list-item-price">₱' + total.toFixed(2) + '</div><button class="list-item-remove" onclick="window.removeFromList(' + i + ')" title="Remove">✕</button></div>';
        }
        
        shoppingList.innerHTML = html;
        itemCount.textContent = getTotalQuantity();
        listTotal.textContent = '₱' + calculateTotalSpent().toFixed(2);
    }

    // ============================================================
    // SAVE/LOAD - LocalStorage for data persistence
    // ============================================================
    function saveState() {
        try {
            var state = {
                budget: budget,
                shoppingItems: shoppingItems
            };
            localStorage.setItem('foodScannerState', JSON.stringify(state));
        } catch (e) {
            console.warn('Could not save state:', e);
        }
    }

    function loadState() {
        try {
            var saved = localStorage.getItem('foodScannerState');
            if (saved) {
                var state = JSON.parse(saved);
                budget = state.budget || 0;
                shoppingItems = state.shoppingItems || [];
                
                if (budget > 0) {
                    budgetDisplay.style.display = 'grid';
                    budgetProgress.style.display = 'block';
                    shoppingListSection.style.display = 'block';
                    updateBudgetDisplay();
                    renderShoppingList();
                }
            }
        } catch (e) {
            console.warn('Could not load state:', e);
        }
    }

    // ============================================================
    // SCANNER FUNCTIONS - Start, stop, handle scans
    // ============================================================
    function startScanner() {
        if (html5QrCode) {
            html5QrCode.stop().then(function() {
                html5QrCode.clear();
            }).catch(function() {});
        }

        try {
            html5QrCode = new Html5Qrcode("scanner");
        } catch (e) {
            console.error("Scanner init error:", e);
            document.getElementById('scanner-container').innerHTML = '<div style="padding:36px 16px;text-align:center;color:#4a5e5e;background:#eef3f3;min-height:240px;display:flex;flex-direction:column;justify-content:center;border-radius:24px;"><div style="font-size:40px;margin-bottom:8px;">📷</div><p style="font-weight:500;margin-bottom:4px;">Scanner not available</p><p style="font-size:14px;max-width:260px;margin:0 auto;">Enter barcode manually below.</p></div>';
            return;
        }

        var config = {
            fps: 12,
            qrbox: { width: 180, height: 180 },
            aspectRatio: 1.0,
        };

        html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
        ).then(function() {
            scannerActive = true;
        }).catch(function(err) {
            console.warn("Camera error:", err);
            scannerActive = false;
            
            var errorMsg = "Camera not available.";
            if (err.message && err.message.indexOf("Permission") !== -1) {
                errorMsg = "Camera permission denied. Please allow camera access.";
            } else if (err.message && err.message.indexOf("NotFound") !== -1) {
                errorMsg = "No camera found on this device.";
            } else if (err.message && err.message.indexOf("NotAllowed") !== -1) {
                errorMsg = "Camera access blocked. Please allow camera permissions.";
            }
            
            document.getElementById('scanner-container').innerHTML = '<div style="padding:36px 16px;text-align:center;color:#4a5e5e;background:#eef3f3;min-height:240px;display:flex;flex-direction:column;justify-content:center;border-radius:24px;"><div style="font-size:40px;margin-bottom:8px;">📷</div><p style="font-weight:500;margin-bottom:4px;">' + errorMsg + '</p><p style="font-size:14px;max-width:260px;margin:0 auto;">Enter barcode manually below.</p></div>';
        });
    }

    function stopScanner() {
        if (html5QrCode && scannerActive) {
            html5QrCode.stop().catch(function() {});
            scannerActive = false;
        }
    }

    function onScanSuccess(decodedText) {
        if (isProcessing) return;
        isProcessing = true;
        stopScanner();
        lookupProduct(decodedText);

        setTimeout(function() {
            isProcessing = false;
            if (!document.hidden) {
                startScanner();
            }
        }, 2800);
    }

    function onScanFailure(err) {}

    // ============================================================
    // PRICE LOOKUP - Check database first, then API
    // ============================================================
    function findSRPPrice(product) {
        var productName = (product.product_name || '').toLowerCase().trim();
        var brand = (product.brands || '').toLowerCase();
        var quantity = (product.quantity || '').toLowerCase().trim();
        var categories = (product.categories || '').toLowerCase();
        
        // Check if it's a sachet or twin pack
        var isSachet = productName.indexOf('sachet') !== -1 || quantity.indexOf('sachet') !== -1;
        var isTwinPack = productName.indexOf('twin') !== -1 || productName.indexOf('2 pack') !== -1;
        var isSingle = productName.indexOf('single') !== -1 || productName.indexOf('1 pack') !== -1;
        
        var key;
        
        // Priority 1: Twin pack sachet
        if (isTwinPack && isSachet) {
            for (key in srpDatabase) {
                if (srpDatabase.hasOwnProperty(key) && key.indexOf('twin pack') !== -1 && (productName.indexOf(key.replace(' twin pack', '')) !== -1 || brand.indexOf(key.replace(' twin pack', '')) !== -1)) {
                    return srpDatabase[key];
                }
            }
        }
        
        // Priority 2: Twin pack
        if (isTwinPack) {
            for (key in srpDatabase) {
                if (srpDatabase.hasOwnProperty(key) && key.indexOf('twin pack') !== -1 && (productName.indexOf(key.replace(' twin pack', '')) !== -1 || brand.indexOf(key.replace(' twin pack', '')) !== -1)) {
                    return srpDatabase[key];
                }
            }
        }
        
        // Priority 3: Sachet
        if (isSachet && !isTwinPack) {
            for (key in srpDatabase) {
                if (srpDatabase.hasOwnProperty(key) && key.indexOf('sachet') !== -1 && (productName.indexOf(key.replace(' sachet', '')) !== -1 || brand.indexOf(key.replace(' sachet', '')) !== -1)) {
                    return srpDatabase[key];
                }
            }
        }
        
        // Priority 4: Single pack
        if (isSingle) {
            for (key in srpDatabase) {
                if (srpDatabase.hasOwnProperty(key) && key.indexOf('single') !== -1 && (productName.indexOf(key.replace(' single', '')) !== -1 || brand.indexOf(key.replace(' single', '')) !== -1)) {
                    return srpDatabase[key];
                }
            }
        }
        
        // Priority 5: Exact match in database
        for (key in srpDatabase) {
            if (srpDatabase.hasOwnProperty(key) && productName.indexOf(key) !== -1 && key.length > 8 && key.indexOf('sachet') === -1 && key.indexOf('twin pack') === -1 && key.indexOf('single') === -1) {
                return srpDatabase[key];
            }
        }
        
        // Priority 6: Direct database lookup
        if (srpDatabase[productName]) {
            return srpDatabase[productName];
        }
        
        // Priority 7: Brand matching
        var brandWords = brand.split(' ');
        for (var b = 0; b < brandWords.length; b++) {
            var brandWord = brandWords[b];
            if (brandWord.length > 2) {
                for (key in srpDatabase) {
                    if (srpDatabase.hasOwnProperty(key) && key.indexOf(brandWord) !== -1 && key.length > 8 && key.indexOf('sachet') === -1 && key.indexOf('twin pack') === -1 && key.indexOf('single') === -1) {
                        return srpDatabase[key];
                    }
                }
            }
        }
        
        // Priority 8: Keyword matching
        var sortedKeywords = Object.keys(srpDatabase).sort(function(a, b) { return b.length - a.length; });
        for (var k = 0; k < sortedKeywords.length; k++) {
            var keyword = sortedKeywords[k];
            if (keyword.length > 8 && productName.indexOf(keyword) !== -1 && keyword.indexOf('sachet') === -1 && keyword.indexOf('twin pack') === -1 && keyword.indexOf('single') === -1) {
                return srpDatabase[keyword];
            }
        }
        
        // Priority 9: Brand fallback map
        var brandCategoryMap = {
            'lucky me': 18.00,
            'nissin': 17.00,
            'payless': 26.00,
            'mega': 27.00,
            'ligo': 28.00,
            '555': 29.00,
            'century': 46.00,
            'san marino': 45.00,
            'purefoods': 69.00,
            'argentina': 39.00,
            'highlands': 43.00,
            'datu puti': 73.00,
            'silver swan': 74.00,
            'ufc': 38.00,
            'del monte': 33.00,
            'lady\'s choice': 105.00,
            'nestlé': 52.00,
            'bear brand': 175.00,
            'alaska': 42.00,
            'eden': 98.00,
            'magnolia': 110.00,
            'gardenia': 78.00,
            'nescafé': 108.00,
            'great taste': 86.00,
            'kopiko': 90.00,
            'skyflakes': 82.00,
            'fita': 85.00,
            'hansel': 72.00,
            'oreo': 48.00,
            'oishi': 32.00,
            'piattos': 20.00,
            'nova': 41.00,
            'coca-cola': 75.00,
            'pepsi': 75.00,
            'sprite': 75.00,
            'royal': 75.00,
            'c2': 32.00,
            'chuckie': 22.00,
            'milo': 24.00,
            'ovaltine': 25.00,
            'yakult': 62.00,
            'knorr': 25.00,
            'magic sarap': 11.00,
            'oysterrific': 55.00,
            'reno': 32.00,
            'saba': 30.00,
            'bluebay': 35.00,
            'angel': 35.00
        };
        
        for (var brandName in brandCategoryMap) {
            if (brandCategoryMap.hasOwnProperty(brandName) && (brand.indexOf(brandName) !== -1 || productName.indexOf(brandName) !== -1)) {
                return brandCategoryMap[brandName];
            }
        }
        
        // Priority 10: Category fallback
        var categoryKeywords = {
            'sardines': 27.00,
            'tuna': 43.00,
            'corned beef': 39.00,
            'noodles': 15.00,
            'pasta': 55.00,
            'coffee': 85.00,
            'milk': 98.00,
            'bread': 75.00,
            'crackers': 82.00,
            'cookies': 48.00,
            'chips': 35.00,
            'candy': 48.00,
            'chocolate': 48.00,
            'sauce': 50.00,
            'vinegar': 48.00,
            'soy sauce': 72.00,
            'catsup': 38.00,
            'mayonnaise': 105.00,
            'cheese': 95.00,
            'butter': 105.00,
            'margarine': 85.00
        };
        
        for (var category in categoryKeywords) {
            if (categoryKeywords.hasOwnProperty(category) && (productName.indexOf(category) !== -1 || categories.indexOf(category) !== -1)) {
                return categoryKeywords[category];
            }
        }
        
        // No match found
        return null;
    }

    // ============================================================
    // PRODUCT LOOKUP - Fetch from Open Food Facts API
    // ============================================================
    async function lookupProduct(barcode) {
        var cleanBarcode = barcode.replace(/\D/g, '');
        if (!cleanBarcode) {
            showError('Please enter a valid barcode (numbers only).');
            return;
        }

        loadingDiv.style.display = 'block';
        resultsDiv.style.display = 'none';
        resultsDiv.innerHTML = '';
        currentQuantity = 1;

        try {
            var url = 'https://world.openfoodfacts.org/api/v0/product/' + cleanBarcode + '.json';
            var response = await fetch(url, {
                headers: { 'User-Agent': 'IBUDGETER-App' }
            });

            if (!response.ok) throw new Error('HTTP ' + response.status);

            var data = await response.json();

            if (data.status === 0 || !data.product) {
                showNotFound(cleanBarcode);
                return;
            }

            var p = data.product;
            var name = p.product_name || p.generic_name || 'Product name not listed';
            var brand = p.brands || 'Unknown brand';
            var ingredients = p.ingredients_text || p.ingredients_text_en || 'No ingredients information.';

            // Nutrition data
            var n = p.nutriments || {};
            var energy = n.energy_kcal ?? n.energy ?? '—';
            var fat = n.fat ?? '—';
            var carbs = n.carbohydrates ?? '—';
            var protein = n.proteins ?? n.protein ?? '—';
            var sugars = n.sugars ?? '—';
            var fiber = n.fiber ?? '—';
            
            // Salt/Sodium (show only one)
            var salt = n.salt ?? '—';
            var sodium = n.sodium ?? '—';
            if (salt === '' || salt === null || salt === undefined) salt = '—';
            if (sodium === '' || sodium === null || sodium === undefined) sodium = '—';
            
            var saltNum = null;
            var sodiumNum = null;
            if (salt !== '—') {
                var parsedSalt = parseFloat(salt);
                if (!isNaN(parsedSalt)) saltNum = parsedSalt;
            }
            if (sodium !== '—') {
                var parsedSodium = parseFloat(sodium);
                if (!isNaN(parsedSodium)) sodiumNum = parsedSodium;
            }
            
            var showSaltOnly = false;
            var showSodiumOnly = false;
            if (saltNum !== null) {
                showSaltOnly = true;
            } else if (sodiumNum !== null) {
                showSodiumOnly = true;
            }
            
            // Try to get price from database first
            var srpPrice = findSRPPrice(p);
            var priceSource = 'SRP Database';
            
            // If not found in database, try API
            if (srpPrice === null) {
                var apiPrice = p.product_price || p.price || null;
                if (apiPrice !== null && !isNaN(parseFloat(apiPrice)) && parseFloat(apiPrice) > 0) {
                    srpPrice = parseFloat(apiPrice);
                    priceSource = 'Open Food Facts API';
                } else {
                    srpPrice = 45.00;
                    priceSource = 'Default Price';
                }
            }
            
            currentProduct = {
                barcode: cleanBarcode,
                name: name,
                brand: brand,
                price: srpPrice
            };
            
            // Build results HTML
            var priceHtml = '<div class="price-section"><div><div class="price-label">SRP (2026)</div><div class="price-value">₱' + srpPrice.toFixed(2) + '</div><div class="price-details"><span class="price-tag">' + priceSource + '</span></div></div><div class="quantity-selector"><button class="qty-btn" id="qtyMinus">−</button><span class="qty-number" id="qtyDisplay">1</span><button class="qty-btn" id="qtyPlus">+</button><button class="add-to-list-btn" id="addWithQuantity">Add to List</button></div></div>';
            
            var saltSodiumHtml = '';
            if (showSaltOnly && saltNum !== null) {
                saltSodiumHtml = '<div class="salt-sodium-section"><div class="salt-sodium-item"><div class="value">' + formatNutritionValue(saltNum) + 'g</div><div class="label">Salt</div></div></div>';
            } else if (showSodiumOnly && sodiumNum !== null) {
                saltSodiumHtml = '<div class="salt-sodium-section"><div class="salt-sodium-item"><div class="value">' + formatNutritionValue(sodiumNum) + 'mg</div><div class="label">Sodium</div></div></div>';
            }
            
            var nutritionHtml = '<div class="nutrition-grid"><div class="nutrition-item"><div class="value">' + formatNutritionValue(energy) + '</div><div class="label">Energy (kcal)</div></div><div class="nutrition-item"><div class="value">' + formatNutritionValue(fat) + 'g</div><div class="label">Fat</div></div><div class="nutrition-item"><div class="value">' + formatNutritionValue(carbs) + 'g</div><div class="label">Carbs</div></div><div class="nutrition-item"><div class="value">' + formatNutritionValue(protein) + 'g</div><div class="label">Protein</div></div><div class="nutrition-item"><div class="value">' + formatNutritionValue(sugars) + 'g</div><div class="label">Sugars</div></div><div class="nutrition-item"><div class="value">' + formatNutritionValue(fiber) + 'g</div><div class="label">Fiber</div></div></div>';

            resultsDiv.innerHTML = '<div class="product-name">' + escapeHtml(name) + '</div><div class="product-brand">' + escapeHtml(brand) + '</div>' + priceHtml + nutritionHtml + saltSodiumHtml + '<div class="ingredients-section"><h3>Ingredients</h3><p>' + escapeHtml(ingredients) + '</p></div>';
            resultsDiv.style.display = 'block';

            // Quantity selector events
            document.getElementById('qtyMinus').addEventListener('click', function() {
                if (currentQuantity > 1) {
                    currentQuantity--;
                    document.getElementById('qtyDisplay').textContent = currentQuantity;
                    document.querySelector('.add-to-list-btn').textContent = 'Add ' + currentQuantity + ' to List';
                }
            });

            document.getElementById('qtyPlus').addEventListener('click', function() {
                currentQuantity++;
                document.getElementById('qtyDisplay').textContent = currentQuantity;
                document.querySelector('.add-to-list-btn').textContent = 'Add ' + currentQuantity + ' to List';
            });

            document.getElementById('addWithQuantity').addEventListener('click', function() {
                if (currentProduct) {
                    addToList(currentProduct, currentQuantity);
                }
            });

        } catch (err) {
            console.error('Lookup error:', err);
            showError('Could not fetch product: ' + err.message);
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    // ============================================================
    // HELPER FUNCTIONS - Formatting, escaping, error display
    // ============================================================
    function formatNutritionValue(value) {
        if (value === '—' || value === undefined || value === null || value === '') {
            return '—';
        }
        
        var numValue;
        if (typeof value === 'number') {
            numValue = value;
        } else if (typeof value === 'string') {
            var cleaned = value.replace(/[^0-9.]/g, '');
            if (cleaned === '') return '—';
            numValue = parseFloat(cleaned);
            if (isNaN(numValue)) return '—';
        } else {
            return '—';
        }
        
        var rounded = Math.round(numValue * 10) / 10;
        if (rounded % 1 === 0) {
            return rounded.toString();
        } else {
            return rounded.toFixed(1);
        }
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '—';
        var div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function showNotFound(barcode) {
        resultsDiv.innerHTML = '<div class="not-found"><div class="emoji">🔍</div><h3>Product not found</h3><p>Barcode <strong>' + escapeHtml(barcode) + '</strong> is not in Open Food Facts.</p><p style="margin-top:6px;font-size:13px;">You can add it to help the community!</p></div>';
        resultsDiv.style.display = 'block';
    }

    function showError(msg) {
        resultsDiv.innerHTML = '<div class="error">⚠️ ' + escapeHtml(msg) + '</div>';
        resultsDiv.style.display = 'block';
    }

    window.addToListFromCurrent = function() {
        if (currentProduct) {
            addToList(currentProduct, currentQuantity);
        } else {
            alert('No product to add.');
        }
    };

    // ============================================================
    // EVENT LISTENERS - Budget, manual lookup, scanner controls
    // ============================================================
    setBudgetBtn.addEventListener('click', setBudget);
    budgetInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            setBudget();
        }
    });
    
    clearListBtn.addEventListener('click', clearList);

    function handleManualLookup() {
        var val = manualInput.value.trim();
        if (val) {
            lookupProduct(val);
            manualInput.value = '';
        } else {
            alert('Please enter a barcode number.');
        }
    }

    lookupBtn.addEventListener('click', handleManualLookup);
    manualInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleManualLookup();
        }
    });

    // ============================================================
    // VISIBILITY - Restart scanner when tab becomes active
    // ============================================================
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopScanner();
        } else {
            if (!isProcessing) {
                startScanner();
            }
        }
    });

    // ============================================================
    // INIT - Load saved data and start scanner
    // ============================================================
    window.addEventListener('load', function() {
        loadState();
        setTimeout(startScanner, 400);
    });

    window.addEventListener('beforeunload', function() {
        stopScanner();
        if (html5QrCode) {
            html5QrCode.clear().catch(function() {});
        }
    });

})();