

/**
 * Carty - Smart Shopping Cart Enhancement for Shopify
 * Core Loader - Lightweight bootstrap for modular architecture
 * Version 5.0.0
 */
(function() {
  'use strict';

  // Global namespace - ensure it exists early
  window.Carty = window.Carty || {};

  // Version information
  var VERSION = '5.0.0';
  var BUILD_DATE = '2025-04-02';
  var API_BASE_URL = 'https://processing-fix-petition-structure.trycloudflare.com';

  // Module registry and state tracking
  var modules = {};
  var loadedModules = {};
  var moduleCallbacks = {};
  var dependencyQueue = [];

  // Feature detection
  var supports = {
    localStorage: (function() {
      try {
        var test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    })(),
    es6: (function() {
      try {
        // Test for basic ES6 features
        eval('var test = () => {}; class Test {}; new Promise(() => {});');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    fetch: typeof fetch !== 'undefined',
    intersectionObserver: typeof IntersectionObserver !== 'undefined'
  };

  // ===== CORE FUNCTIONS =====
  // Define these first, before any modules can try to use them
  
  /**
   * Wait for specified modules to be ready
   * @param {Array<string>} dependencies - Module dependencies
   * @param {Function} callback - Callback function
   */
  function ready(dependencies, callback) {
    if (!Array.isArray(dependencies)) {
      dependencies = [dependencies];
    }
    
    // Check if all dependencies are already loaded
    var allLoaded = dependencies.every(dep => loadedModules[dep]);
    
    if (allLoaded) {
      // Call immediately with the modules
      var dependencyModules = dependencies.map(dep => modules[dep]);
      callback.apply(null, dependencyModules);
    } else {
      // Add to dependency queue
      dependencyQueue.push({
        dependencies,
        callback
      });
    }
  }

  /**
   * Register a module
   * @param {string} moduleName - Module name
   * @param {Object} moduleExports - Module exports
   */
  function registerModule(moduleName, moduleExports) {
    log(`Registering module: ${moduleName}`);
    
    // Store the module
    modules[moduleName] = moduleExports;
    
    // Return the module for chaining
    return moduleExports;
  }

  /**
   * Get a loaded module
   * @param {string} moduleName - Module name
   * @returns {Object|null} Module or null if not loaded
   */
  function getModule(moduleName) {
    return modules[moduleName] || null;
  }

  /**
   * Process the dependency queue
   */
  function processDependencyQueue() {
    // Process each item in the dependency queue
    for (let i = dependencyQueue.length - 1; i >= 0; i--) {
      var item = dependencyQueue[i];
      
      // Check if all dependencies are loaded
      var allDependenciesLoaded = item.dependencies.every(dep => loadedModules[dep]);
      
      if (allDependenciesLoaded) {
        // Remove from queue
        dependencyQueue.splice(i, 1);
        
        // Collect dependencies
        var dependencyModules = item.dependencies.map(dep => modules[dep]);
        
        // Call the callback
        try {
          item.callback.apply(null, dependencyModules);
        } catch (error) {
          logError('Error in dependency callback', error);
        }
      }
    }
  }

  // Simple event system
  var eventListeners = {};

  /**
   * Add event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Event callback
   */
  function on(eventName, callback) {
    if (!eventListeners[eventName]) {
      eventListeners[eventName] = [];
    }
    
    eventListeners[eventName].push(callback);
    
    // Return unsubscribe function
    return function() {
      off(eventName, callback);
    };
  }

  /**
   * Remove event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Event callback
   */
  function off(eventName, callback) {
    if (!eventListeners[eventName]) return;
    
    eventListeners[eventName] = eventListeners[eventName].filter(cb => cb !== callback);
    
    // Cleanup empty arrays
    if (eventListeners[eventName].length === 0) {
      delete eventListeners[eventName];
    }
  }

  /**
   * Trigger an event
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   */
  function triggerEvent(eventName, data) {
    if (!eventListeners[eventName]) return;
    
    // Create event object
    var event = {
      type: eventName,
      time: Date.now(),
      data: data
    };
    
    // Call all listeners
    eventListeners[eventName].forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logError(`Error in event listener for ${eventName}`, error);
      }
    });
  }

  /**
   * Log a message
   * @param {string} message - Message to log
   */
  function log(message) {
    if (window.Carty && Carty.config && Carty.config.debug) {
      console.log(`[Carty] ${message}`);
    }
  }

  /**
   * Log an error
   * @param {string} message - Error message
   * @param {Error} [error] - Error object
   */
  function logError(message, error) {
    console.error(`[Carty] ${message}`, error);
    
    // Track error for analytics
    if (window.Carty) {
      triggerEvent('error', { message, error });
    }
  }

  // ===== SETUP PUBLIC API BEFORE ANY MODULE INITIALIZATION =====
  // Make all core functions available on the Carty object
  Carty.ready = ready;
  Carty.registerModule = registerModule;
  Carty.getModule = getModule;
  Carty.loadModule = getModule; // Alias for compatibility
  Carty.on = on;
  Carty.off = off;
  Carty.trigger = triggerEvent;
  Carty.log = log;
  Carty.logError = logError;
  Carty.supports = supports;
  Carty.version = VERSION;
  Carty._initialized = false; // Track initialization state

  /**
   * Core initialization
   * @param {Object} config - Initial configuration
   * @returns {Promise} Initialization promise
   */
  function init(config = {}) {
    // Prevent duplicate initialization
    if (Carty._initialized) {
      log('Carty already initialized');
      return Promise.resolve({ success: true, version: VERSION, alreadyInitialized: true });
    }
    
    // Store initialization start time for performance tracking
    Carty.initStartTime = Date.now();
    Carty._initialized = true;
    Carty.config = config;

    // Log initialization
    log('Core initializing, version ' + VERSION);

    // Handle legacy compatibility
    handleLegacySupport();

    // Since all modules are in the same file, we don't need to load them dynamically
    // Instead, we'll initialize them in the correct dependency order
    
    // Initialize essential modules first
    return Promise.resolve()
      .then(() => {
        // These modules should already be registered at this point
        if (!modules['utils'] || !modules['config'] || !modules['dom']) {
          return Promise.reject(new Error('Essential modules not found'));
        }
        
        // Mark them as loaded
        loadedModules['utils'] = true;
        loadedModules['config'] = true;
        loadedModules['dom'] = true;
        
        log('Essential modules loaded');
        
        // Initialize configuration with provided config and shop detection
        return modules['config'].init(config);
      })
      .then(() => {
        // Determine which features to load based on configuration
        var featuresToLoad = determineFeaturesToLoad(modules['config'].getAll());
        
        // Load core features (non-optional ones)
        if (!modules['cart'] || !modules['product']) {
          return Promise.reject(new Error('Core modules not found'));
        }
        
        // Mark them as loaded
        loadedModules['cart'] = true;
        loadedModules['product'] = true;
        
        // Initialize them sequentially
        return modules['cart'].init()
          .then(() => modules['product'].init())
          .then(() => {
            log('Core features loaded in ' + (Date.now() - Carty.initStartTime) + 'ms');
            
            // Trigger loaded event
            triggerEvent('core:loaded');
            
            // Now initialize optional features
            return initOptionalFeatures(featuresToLoad);
          });
      })
      .then(() => {
        // Return success
        return {
          success: true,
          version: VERSION,
          loadTime: Date.now() - Carty.initStartTime
        };
      })
      .catch(error => {
        logError('Core initialization failed', error);
        
        // Return failure but don't break the page
        return {
          success: false,
          error: error.message
        };
      });
  }

  /**
   * Initialize optional features sequentially
   * @param {Object} features - Features to load
   * @returns {Promise} Initialization promise
   */
  function initOptionalFeatures(features) {
    // UI module should be initialized as soon as possible
    if (!modules['ui']) {
      return Promise.reject(new Error('UI module not found'));
    }
    
    loadedModules['ui'] = true;
    
    // Chain all initializations
    return modules['ui'].init()
      .then(() => {
        // Initialize other optional modules based on configuration
        var promises = [];
        
        if (features.slideCart && modules['slidecart']) {
          loadedModules['slidecart'] = true;
          promises.push(modules['slidecart'].init());
        }
        
        if (features.upsell && modules['recommendations']) {
          loadedModules['recommendations'] = true;
          promises.push(modules['recommendations'].init());
        }
        
        // No need to initialize Analytics as we're removing it
        
        if (features.thirdParty && modules['integrations']) {
          loadedModules['integrations'] = true;
          promises.push(modules['integrations'].init());
        }
        
        // Process any dependency queue items
        processDependencyQueue();
        
        return Promise.all(promises);
      });
  }

  /**
   * Add backward compatibility for legacy code
   */
  function handleLegacySupport() {
    // Detect if the old Carty version exists
    if (typeof window.cartyApp !== 'undefined') {
      log('Legacy Carty detected, adding compatibility layer');
      
      // Store reference to old functions that we'll implement differently
      var legacyFunctions = {};
      
      // Map legacy methods to new architecture
      if (window.cartyApp.init) {
        legacyFunctions.init = window.cartyApp.init;
        
        // Override with our version but call the original if needed
        window.cartyApp.init = function(config) {
          log('Legacy init called, redirecting to new architecture');
          return Carty.init(config);
        };
      }
    }
  }

  /**
   * Determine which features to load based on configuration
   * @param {Object} config - Carty configuration
   * @returns {Object} Features to load
   */
  function determineFeaturesToLoad(config) {
    var features = {
      slideCart: config.isSlideCartEnabled === true,
      upsell: config.showUpsell === true,
      announcements: config.announcements && config.announcements.show === true,
      achievements: config.achievements && config.achievements.show === true,
      thirdParty: Object.values(config.integrations || {}).some(i => i.enable === true)
    };
    
    log('Features to load: ' + Object.entries(features)
      .filter(([_, value]) => value)
      .map(([key, _]) => key)
      .join(', '));
    
    return features;
  }

  // Add init to the public API after it's defined
  Carty.init = init;

  // Auto-initialize if configured to do so
  if (window.cartyAutoInit === true) {
    // Use a small delay to allow the page to load first
    setTimeout(() => {
      init(window.cartyConfig || {});
    }, 10);
  }
})();

/**
 * Carty - Utils Module
 * Common utility functions used throughout the application
 * Version 5.0.0
 */
(function() {
  'use strict';

  // Module object
  var Utils = {
    /**
     * Module version
     */
    version: '5.0.0',

    /**
     * Type checking functions
     */
    isObject: function(obj) {
      return obj && typeof obj === 'object' && !Array.isArray(obj);
    },

    isFunction: function(fn) {
      return typeof fn === 'function';
    },

    isString: function(str) {
      return typeof str === 'string';
    },

    isNumber: function(num) {
      return typeof num === 'number' && !isNaN(num);
    },

    isBoolean: function(bool) {
      return typeof bool === 'boolean';
    },

    isArray: function(arr) {
      return Array.isArray(arr);
    },

    isEmpty: function(val) {
      return val === null || val === undefined || 
        (typeof val === 'string' && val.trim() === '') ||
        (Array.isArray(val) && val.length === 0) ||
        (this.isObject(val) && Object.keys(val).length === 0);
    },

    isNotEmpty: function(val) {
      return !this.isEmpty(val);
    },

    /**
     * Safe JSON parsing with error handling
     * @param {string} str - JSON string to parse
     * @param {*} fallback - Fallback value if parsing fails
     * @returns {*} Parsed object or fallback
     */
    safeJSONParse: function(str, fallback = null) {
      try {
        return JSON.parse(str);
      } catch (e) {
        this.logError('JSON parse error', e);
        return fallback;
      }
    },

    /**
     * Safe JSON stringify with error handling
     * @param {*} obj - Object to stringify
     * @param {*} fallback - Fallback value if stringify fails
     * @returns {string} Stringified object or fallback
     */
    safeJSONStringify: function(obj, fallback = '{}') {
      try {
        return JSON.stringify(obj);
      } catch (e) {
        this.logError('JSON stringify error', e);
        return fallback;
      }
    },

    /**
     * Deep clone an object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    deepClone: function(obj) {
      // Handle non-objects
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      
      // Handle dates
      if (obj instanceof Date) {
        return new Date(obj.getTime());
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => this.deepClone(item));
      }
      
      // Handle objects
      var cloned = {};
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      
      return cloned;
    },

    /**
     * Deep merge objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    deepMerge: function(target, source) {
      // Create a fresh copy of the target
      var output = this.deepClone(target);
      
      // If source is not an object, return target
      if (!this.isObject(source)) {
        return output;
      }
      
      // Merge source into output
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          // If key doesn't exist in target or isn't an object, create it
          if (!output[key] || !this.isObject(output[key])) {
            output[key] = {};
          }
          // Recursively merge objects
          output[key] = this.deepMerge(output[key], source[key]);
        } else {
          // For non-objects, simply overwrite
          output[key] = source[key];
        }
      });
      
      return output;
    },

    /**
     * Get a nested property safely with a path string (e.g., 'user.profile.name')
     * @param {Object} obj - Object to get property from
     * @param {string} path - Property path
     * @param {*} defaultValue - Default value if path doesn't exist
     * @returns {*} Property value or default
     */
    getProperty: function(obj, path, defaultValue = undefined) {
      // Handle empty inputs
      if (!obj || !path) {
        return defaultValue;
      }
      
      // Split the path into parts
      var parts = path.split('.');
      let current = obj;
      
      // Traverse the object
      for (let i = 0; i < parts.length; i++) {
        // If the current level is undefined or null, return default
        if (current === undefined || current === null) {
          return defaultValue;
        }
        
        // Move to the next level
        current = current[parts[i]];
      }
      
      // Return the result or default if undefined
      return current !== undefined ? current : defaultValue;
    },

    /**
     * Set a nested property safely with a path string
     * @param {Object} obj - Object to set property on
     * @param {string} path - Property path
     * @param {*} value - Value to set
     * @returns {Object} Updated object
     */
    setProperty: function(obj, path, value) {
      // Handle empty inputs
      if (!obj || !path) {
        return obj;
      }
      
      // Clone the object to avoid mutations
      var result = this.deepClone(obj);
      
      // Split the path into parts
      var parts = path.split('.');
      let current = result;
      
      // Traverse the object, creating missing parts
      for (let i = 0; i < parts.length - 1; i++) {
        var part = parts[i];
        
        // Create missing parts as objects
        if (current[part] === undefined || current[part] === null || typeof current[part] !== 'object') {
          current[part] = {};
        }
        
        // Move to the next level
        current = current[part];
      }
      
      // Set the value at the final path
      current[parts[parts.length - 1]] = value;
      
      return result;
    },

    /**
     * Create a debounced function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Whether to call immediately
     * @returns {Function} Debounced function
     */
    debounce: function(func, wait, immediate = false) {
      let timeout;
      
      return function(...args) {
        var context = this;
        
        var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        
        var callNow = immediate && !timeout;
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(context, args);
      };
    },

    /**
     * Create a throttled function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle: function(func, limit) {
      let inThrottle;
      let lastFunc;
      let lastRan;
      
      return function(...args) {
        var context = this;
        
        if (!inThrottle) {
          func.apply(context, args);
          lastRan = Date.now();
          inThrottle = true;
        } else {
          clearTimeout(lastFunc);
          
          lastFunc = setTimeout(function() {
            if (Date.now() - lastRan >= limit) {
              func.apply(context, args);
              lastRan = Date.now();
            }
          }, limit - (Date.now() - lastRan));
        }
      };
    },

    /**
     * Format money value
     * @param {number} cents - Amount in cents
     * @param {string} [format] - Format string (falls back to Shopify's format)
     * @returns {string} Formatted money string
     */
    formatMoney: function(cents, format = undefined) {
      // Check for valid input
      if (cents === undefined || cents === null) {
        return this.getCurrencySymbol() + '0.00';
      }
      
      // Convert to number if needed
      if (typeof cents !== 'number') {
        cents = parseFloat(String(cents).replace(/[^\d.-]/g, ''));
        if (isNaN(cents)) {
          return this.getCurrencySymbol() + '0.00';
        }
      }
      
      // Try to use Shopify's native formatMoney if available
      if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
        try {
          return Shopify.formatMoney(cents, format);
        } catch (e) {
          this.logWarn('Error using Shopify.formatMoney: ' + e.message);
          // Continue to fallback methods
        }
      }
      
      // Get currency symbol
      var currencySymbol = this.getCurrencySymbol();
      
      // Determine if we should format as monetary units or cents
      var needsDivision = cents >= 100 && !String(cents).includes('.');
      var priceValue = needsDivision ? cents / 100 : cents;
      
      // Format the number
      let formattedAmount;
      try {
        // Format with locale
        var locale = document.documentElement.lang || 'en-US';
        formattedAmount = priceValue.toLocaleString(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      } catch (e) {
        // Fallback formatting
        formattedAmount = priceValue.toFixed(2);
      }
      
      // Return formatted price with currency symbol
      // European-style currencies (€, kr, zł) typically have symbol after the number
      if (['€', 'kr', 'Ft', 'zł', 'лв'].includes(currencySymbol)) {
        return formattedAmount + ' ' + currencySymbol;
      } else {
        return currencySymbol + formattedAmount;
      }
    },

    /**
     * Get currency symbol based on shop settings
     * @returns {string} Currency symbol
     */
    getCurrencySymbol: function() {
      // Comprehensive currency symbol mapping
      var currencySymbolMap = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': '$',
        'AUD': '$', 'NZD': '$', 'CHF': 'Fr', 'HKD': '$', 'SGD': '$',
        'SEK': 'kr', 'DKK': 'kr', 'PLN': 'zł', 'NOK': 'kr', 'HUF': 'Ft',
        'CZK': 'Kč', 'ILS': '₪', 'MXN': '$', 'AED': 'د.إ', 'THB': '฿',
        'BRL': 'R$', 'MYR': 'RM', 'PHP': '₱', 'IDR': 'Rp', 'INR': '₹',
        'KRW': '₩', 'RUB': '₽', 'CNY': '¥', 'TRY': '₺', 'ZAR': 'R',
        'SAR': 'ر.س', 'RON': 'lei'
      };
      
      // Method 1: Try to get from theme's currency meta tags
      var currencyMetaTag = document.querySelector('meta[property="og:price:currency"], meta[itemprop="priceCurrency"]');
      if (currencyMetaTag) {
        var currency = currencyMetaTag.getAttribute('content');
        if (currency && currencySymbolMap[currency]) {
          return currencySymbolMap[currency];
        }
      }
      
      // Method 2: Try to extract from Shopify money_format
      if (window.Shopify && window.Shopify.money_format) {
        var format = window.Shopify.money_format;
        var symbolMatch = format.match(/([^\{\}]*)(?=\{\{)/);
        if (symbolMatch && symbolMatch[1]) {
          return symbolMatch[1].trim();
        }
      }
      
      // Method 3: Try to get from Shopify.currency.active
      if (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
        var currency = window.Shopify.currency.active;
        if (currencySymbolMap[currency]) {
          return currencySymbolMap[currency];
        }
      }
      
      // Default to $ if all else fails
      return '$';
    },

    /**
     * Generate a unique ID
     * @param {string} [prefix=''] - Optional prefix
     * @returns {string} Unique ID
     */
    generateId: function(prefix = '') {
      return prefix + Math.random().toString(36).substring(2, 15) + 
        Math.random().toString(36).substring(2, 15);
    },

    /**
     * Sanitize HTML to prevent XSS
     * @param {string} html - HTML string
     * @returns {string} Sanitized HTML
     */
    sanitizeHTML: function(html) {
      if (!this.isString(html)) {
        return '';
      }
      
      // Use a template element to parse and sanitize HTML
      var template = document.createElement('template');
      template.innerHTML = html.trim();
      
      // Walk through all nodes
      var walkNodes = (node) => {
        // Remove script tags
        if (node.tagName === 'SCRIPT') {
          node.parentNode.removeChild(node);
          return;
        }
        
        // Remove event handlers and javascript: URLs
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Remove all attributes starting with 'on'
          Array.from(node.attributes).forEach(attr => {
            if (attr.name.startsWith('on') || 
                (attr.name === 'href' && attr.value.toLowerCase().startsWith('javascript:'))) {
              node.removeAttribute(attr.name);
            }
          });
        }
        
        // Process children recursively
        if (node.childNodes) {
          Array.from(node.childNodes).forEach(walkNodes);
        }
      };
      
      Array.from(template.content.childNodes).forEach(walkNodes);
      
      return template.innerHTML;
    },

    /**
     * Parse URL query parameters
     * @param {string} [url=window.location.href] - URL to parse
     * @returns {Object} Query parameters as key-value pairs
     */
    parseQueryParams: function(url = window.location.href) {
      var queryParams = {};
      
      try {
        var urlObj = new URL(url);
        var searchParams = new URLSearchParams(urlObj.search);
        
        for (var [key, value] of searchParams.entries()) {
          queryParams[key] = value;
        }
      } catch (e) {
        // Fallback for older browsers
        var search = url.split('?')[1] || '';
        if (!search) {
          return queryParams;
        }
        
        search.split('&').forEach(param => {
          var [key, value] = param.split('=');
          if (key) {
            queryParams[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
          }
        });
      }
      
      return queryParams;
    },

    /**
     * Add URL query parameters
     * @param {string} url - Base URL
     * @param {Object} params - Parameters to add
     * @returns {string} URL with added parameters
     */
    addQueryParams: function(url, params) {
      if (!url || !params || !this.isObject(params)) {
        return url;
      }
      
      try {
        var urlObj = new URL(url);
        var searchParams = new URLSearchParams(urlObj.search);
        
        Object.entries(params).forEach(([key, value]) => {
          searchParams.set(key, value);
        });
        
        urlObj.search = searchParams.toString();
        return urlObj.toString();
      } catch (e) {
        // Fallback for older browsers
        var hasParams = url.includes('?');
        let baseUrl = url;
        
        // Add query parameters
        let queryString = hasParams ? '&' : '?';
        queryString += Object.entries(params)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
        
        return baseUrl + queryString;
      }
    },

    /**
     * Format date
     * @param {Date|string|number} date - Date to format
     * @param {string} [format='YYYY-MM-DD'] - Format string
     * @returns {string} Formatted date
     */
    formatDate: function(date, format = 'YYYY-MM-DD') {
      // Handle different date inputs
      let dateObj;
      
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        return '';
      }
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return '';
      }
      
      // Get date components
      var year = dateObj.getFullYear();
      var month = dateObj.getMonth() + 1;
      var day = dateObj.getDate();
      var hours = dateObj.getHours();
      var minutes = dateObj.getMinutes();
      var seconds = dateObj.getSeconds();
      
      // Pad numbers with leading zeros
      var pad = (num) => num.toString().padStart(2, '0');
      
      // Replace format tokens
      return format
        .replace('YYYY', year)
        .replace('YY', year.toString().slice(-2))
        .replace('MM', pad(month))
        .replace('DD', pad(day))
        .replace('HH', pad(hours))
        .replace('mm', pad(minutes))
        .replace('ss', pad(seconds));
    },

    /**
     * Get device type
     * @returns {string} Device type: 'mobile', 'tablet', or 'desktop'
     */
    getDeviceType: function() {
      var ua = navigator.userAgent;
      
      // Check if mobile
      if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase())) {
        // Distinguish between tablet and phone
        if (/ipad/i.test(ua) || 
            (/android/i.test(ua) && !/mobile/i.test(ua)) ||
            window.innerWidth >= 768) {
          return 'tablet';
        }
        return 'mobile';
      }
      
      return 'desktop';
    },

    /**
     * Detect browser
     * @returns {Object} Browser info
     */
    detectBrowser: function() {
      var ua = navigator.userAgent;
      let browser = 'unknown';
      let version = 'unknown';
      
      // Detect browser
      if (ua.indexOf('Chrome') !== -1) {
        browser = 'chrome';
        var match = ua.match(/Chrome\/(\d+)/);
        if (match) version = match[1];
      } else if (ua.indexOf('Safari') !== -1) {
        browser = 'safari';
        var match = ua.match(/Version\/(\d+)/);
        if (match) version = match[1];
      } else if (ua.indexOf('Firefox') !== -1) {
        browser = 'firefox';
        var match = ua.match(/Firefox\/(\d+)/);
        if (match) version = match[1];
      } else if (ua.indexOf('MSIE') !== -1 || ua.indexOf('Trident/') !== -1) {
        browser = 'ie';
        var match = ua.match(/(?:MSIE |rv:)(\d+)/);
        if (match) version = match[1];
      } else if (ua.indexOf('Edge') !== -1) {
        browser = 'edge';
        var match = ua.match(/Edge\/(\d+)/);
        if (match) version = match[1];
      }
      
      return { browser, version: parseInt(version, 10) || 'unknown' };
    },

    /**
     * Safe localStorage wrapper with fallback
     */
    storage: {
      available: (function() {
        try {
          var test = '__carty_storage_test__';
          localStorage.setItem(test, test);
          localStorage.removeItem(test);
          return true;
        } catch (e) {
          return false;
        }
      })(),
      
      memoryStorage: {},
      
      /**
       * Get item from storage
       * @param {string} key - Storage key
       * @param {*} defaultValue - Default value if not found
       * @returns {*} Stored value or default
       */
      get: function(key, defaultValue = null) {
        var storageKey = 'carty_' + key;
        
        try {
          if (this.available) {
            var value = localStorage.getItem(storageKey);
            if (value === null) return defaultValue;
            
            try {
              return JSON.parse(value);
            } catch (e) {
              return value;
            }
          } else {
            return this.memoryStorage[storageKey] !== undefined
              ? this.memoryStorage[storageKey]
              : defaultValue;
          }
        } catch (e) {
          Utils.logError('Storage get error', e);
          return defaultValue;
        }
      },
      
      /**
       * Set item in storage
       * @param {string} key - Storage key
       * @param {*} value - Value to store
       * @returns {boolean} Success status
       */
      set: function(key, value) {
        var storageKey = 'carty_' + key;
        
        try {
          var serializedValue = typeof value === 'string' 
            ? value 
            : JSON.stringify(value);
          
          if (this.available) {
            localStorage.setItem(storageKey, serializedValue);
          } else {
            this.memoryStorage[storageKey] = value;
          }
          return true;
        } catch (e) {
          Utils.logError('Storage set error', e);
          return false;
        }
      },
      
      /**
       * Remove item from storage
       * @param {string} key - Storage key
       * @returns {boolean} Success status
       */
      remove: function(key) {
        var storageKey = 'carty_' + key;
        
        try {
          if (this.available) {
            localStorage.removeItem(storageKey);
          } else {
            delete this.memoryStorage[storageKey];
          }
          return true;
        } catch (e) {
          Utils.logError('Storage remove error', e);
          return false;
        }
      },
      
      /**
       * Clear all Carty storage items
       * @returns {boolean} Success status
       */
      clear: function() {
        try {
          if (this.available) {
            // Only clear Carty items
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('carty_')) {
                localStorage.removeItem(key);
              }
            });
          } else {
            this.memoryStorage = {};
          }
          return true;
        } catch (e) {
          Utils.logError('Storage clear error', e);
          return false;
        }
      }
    }
  };

  // Register the module
  Carty.registerModule('utils', Utils);
})();

/**
 * Carty - Config Module
 * Manages configuration loading, validation, and access
 * Version 5.0.0
 */
(function() {
  'use strict';

  // Wait for utils module to be available
  Carty.ready(['utils'], function(Utils) {
    // Module object
    var Config = {
      /**
       * Module version
       */
      version: '5.0.0',

      /**
       * Default configuration
       */
      defaults: {
        // Core settings
        debug: false,
        autoInit: true,
        appId: '',
        shopDomain: '',
        
        // Button appearance
        buttonText: "Add to Cart",
        buttonAddedText: "Added!",
        buttonFontColor: "#ffffff",
        buttonFontStyle: "BOLD",
        buttonFontSize: "15",
        buttonBorderColor: "#000000",
        buttonBorderSize: "0",
        buttonBorderRadius: "4",
        buttonFontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        buttonBackgroundColor: "#000000",
        buttonRecovery: true,
        
        // Variant selector appearance
        showVariantSelector: true,
        variantSelectorFontSize: "14",
        variantSelectorFontColor: "#333333",
        variantSelectorFontStyle: "NORMAL",
        variantSelectorFontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        showVariantSelectorLabel: true,
        variantSelectorLabelFontSize: "14",
        variantSelectorLabelFontColor: "#333333",
        variantSelectorLabelFontStyle: "BOLD",
        variantSelectorLabelFontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        
        // Quantity selector appearance
        showQuantitySelector: true,
        quantitySelectorFontSize: "14",
        quantitySelectorFontColor: "#333333",
        quantitySelectorFontStyle: "NORMAL",
        quantitySelectorBorderSize: "1",
        quantitySelectorFontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        quantitySelectorBorderColor: "#ddd",
        quantitySelectorBorderRadius: "4",
        quantitySelectorBackgroundColor: "#f8f8f8",
        quantitySelectorDefaultQuantity: "1",
        
        // Sold out button settings
        showSoldOutButton: true,
        soldOutButtonText: "Sold Out",
        soldOutButtonFontSize: "15",
        soldOutButtonFontColor: "#FFFFFF",
        soldOutButtonFontStyle: "BOLD",
        soldOutButtonBorderSize: "0",
        soldOutButtonFontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        soldOutButtonBorderColor: "#999999",
        soldOutButtonBorderRadius: "4",
        soldOutButtonBackgroundColor: "#999999",
        
        // Behavior settings
        redirectPolicy: "REMAIN_ON_PAGE",
        showDrawerCart: true,
        fastLoading: true,
        
        // Custom cart drawer
        isSlideCartEnabled: true,
        
        // Variant settings
        showAllVariants: true,
        showVariantPrice: true,
        enableMultipleVariantSelectors: false,
        updateVariantImage: true,
        
        // Targeting settings
        target: "",
        targetPlacement: "LAST_CHILD",
        
        // Page visibility settings
        showOnHomepage: true,
        showOnProductPage: true,
        showOnCollectionPage: true,
        showOnSearchResultsPage: true,
        
        // Additional settings
        alignWidgets: true,
        customCss: "",
        
        // Slide Cart settings
        slideCart: {
          primaryColor: "#000000",
          cartBgColor: "#fff",
          salePriceColor: "#D32F2F",
          comparePriceColor: "#777777",
          floatingIcon: "#fff",
          floatingIconBg: "#000000",
          showDiscountInput: true,
          showNoteInput: true,
          overlayClosable: true,
          showFloatingCartButton: true,
          enableCartCounts: true,
          cartCountSelector: "",
          stackDiscountCodes: true,
          floatingButtonPosition: "bottom-right"
        },
        
        // Slide Cart translations
        slideCartTranslations: {
          cartTitle: "Your Cart",
          clearCart: "Clear All",
          numberOfProducts: "{{PRODUCTS_COUNT}} Items",
          subTotal: "Subtotal",
          checkout: "Checkout",
          gotoCart: "View Cart",
          continueShopping: "Continue Shopping",
          cartEmptyText: "Your cart is empty",
          notePlaceholder: "Add a note about your order",
          noteLabel: "Order Notes",
          discountLabel: "Discount Code",
          discountApply: "Apply",
          discountPlaceholder: "Enter discount code",
          removeCode: "Remove"
        },
        
        // Announcements
        announcements: {
          show: false,
          data: [{
            text: "Free shipping on orders over $100",
            bgColor: "#F5F5F5",
            textColor: "#333333",
            timer: {
              show: false,
              timer: "30:00",
              expiryAction: "showExpiryText",
              expiredText: "Offer has expired",
              resetOnPageLoad: true
            }
          }]
        },
        
        // Achievements
        achievements: {
          show: true,
          data: [{
            text: "Add {{TARGET}} more to qualify for free shipping",
            targetType: "price",
            bgColor: "#F5F5F5",
            minAmount: "100",
            successText: "✓ You've qualified for FREE shipping!"
          }]
        },
        
        // Enhanced Upsell feature
        showUpsell: true,
        upsellSettings: {
          title: "You May Also Like",
          maxProducts: 3,
          showImage: true,
          showPrice: true,
          showCompareAtPrice: true,
          buttonText: "Add",
          buttonColor: "#000000",
          buttonTextColor: "#ffffff",
          showUpsellHeading: true,
          upsellAlgorithm: "smart",
          useFrequentlyBoughtTogether: true,
          bundleDiscount: 10,
          maxUpsellsInBundle: 2,
          allowAddMultiple: true,
          showBundleOption: true,
          bundleButtonText: "Add all and save {{DISCOUNT}}%",
          collectionHandle: "frontpage",
          excludeCollections: [],
          customUpsellProducts: [],
          displayMode: "list",
          sortBy: "relevance",
          updateUpsellsOnCartChange: true
        },
        
        // Compatibility with third-party apps
        compatibility: {
          pagefly: true,
          shogun: true,
          recharge: true,
          gempages: true,
          boldSubscriptions: true,
          bestCurrencyConverter: true,
          otherApps: true
        },
        
        // Third-party integrations
        integrations: {
          klaviyo: {
            enable: false,
            publicKey: ""
          },
          analytics: {
            enableEcommerce: true,
            trackCartEvents: true,
            trackUpsellEvents: true
          }
        },
        
        // Privacy and consent
        privacy: {
          requireConsentForTracking: true,
          consentCookieName: "carty_consent",
          privacyPolicyUrl: "",
          defaultConsent: false,
          retentionPeriod: 30 // days
        },
        
        // Performance settings
        performance: {
          lazyLoadThreshold: 100, // px
          prefetchLimit: 5,
          debounceDelay: 300, // ms
          throttleDelay: 100, // ms
          cacheExpiry: 1800 // 30 minutes
        }
      },

      /**
       * Current configuration
       */
      config: {},

      /**
       * Configuration source
       */
      source: 'default',

      /**
       * Initialize configuration
       * @param {Object} userConfig - User configuration
       * @returns {Promise<Object>} Configuration promise
       */
      init: function(userConfig = {}) {
        Utils.log('Initializing configuration');
        
        // Start with default config
        this.config = Utils.deepClone(this.defaults);
        
        // Chain of configuration sources from highest to lowest priority
        return Promise.resolve()
          .then(() => this.loadConfigFromElement())
          .then(() => this.loadConfigFromVariable())
          .then(() => this.loadConfigFromAPI())
          .then(() => {
            // Apply any directly provided userConfig (highest priority)
            if (Object.keys(userConfig).length > 0) {
              Utils.log('Applying directly provided configuration');
              this.config = Utils.deepMerge(this.config, userConfig);
              this.source = 'direct';
            }
            
            // Detect and set shop domain if not set
            if (!this.config.shopDomain) {
              this.config.shopDomain = this.detectShopDomain();
            }
            
            // Apply any migrations or compatibility adjustments
            this.migrateConfiguration();
            
            // Validate configuration
            this.validateConfiguration();
            
            Utils.log('Configuration initialized from ' + this.source);
            
            return this.config;
          })
          .catch(error => {
            Utils.logError('Configuration initialization error', error);
            return this.config; // Return whatever we have
          });
      },

      /**
       * Load configuration from script element data attributes
       * @returns {Promise<void>}
       */
      loadConfigFromElement: function() {
        return new Promise(resolve => {
          try {
            // Find the script tag that loaded Carty
            var scripts = document.querySelectorAll('script[src*="carty"]');
            
            for (var script of scripts) {
              var dataConfig = script.getAttribute('data-config');
              
              if (dataConfig) {
                try {
                  var parsedConfig = Utils.safeJSONParse(dataConfig);
                  
                  if (parsedConfig && typeof parsedConfig === 'object') {
                    Utils.log('Loading configuration from script data attribute');
                    this.config = Utils.deepMerge(this.config, parsedConfig);
                    this.source = 'script';
                  }
                } catch (e) {
                  Utils.logWarn('Failed to parse configuration from script attribute');
                }
              }
              
              // Check for individual data attributes
              Array.from(script.attributes)
                .filter(attr => attr.name.startsWith('data-carty-'))
                .forEach(attr => {
                  var key = attr.name.replace('data-carty-', '');
                  let value = attr.value;
                  
                  // Try to parse the value if it looks like JSON
                  if (value.startsWith('{') || value.startsWith('[') || 
                      value === 'true' || value === 'false' || !isNaN(+value)) {
                    try {
                      value = JSON.parse(value);
                    } catch (e) {
                      // Keep as string if parsing fails
                    }
                  }
                  
                  // Set the configuration
                  this.config[key] = value;
                });
            }
            
            resolve();
          } catch (e) {
            Utils.logWarn('Error loading config from element: ' + e.message);
            resolve(); // Continue anyway
          }
        });
      },

      /**
       * Load configuration from global variable
       * @returns {Promise<void>}
       */
      loadConfigFromVariable: function() {
        return new Promise(resolve => {
          try {
            if (window.cartyConfig) {
              Utils.log('Loading configuration from window.cartyConfig');
              
              let configData = window.cartyConfig;
              
              // Handle string configs (JSON)
              if (typeof configData === 'string') {
                try {
                  configData = Utils.safeJSONParse(configData);
                } catch (e) {
                  Utils.logWarn('Failed to parse window.cartyConfig as JSON');
                  resolve();
                  return;
                }
              }
              
              // Apply configuration
              if (configData && typeof configData === 'object') {
                this.config = Utils.deepMerge(this.config, configData);
                this.source = 'variable';
              }
            }
            
            resolve();
          } catch (e) {
            Utils.logWarn('Error loading config from variable: ' + e.message);
            resolve(); // Continue anyway
          }
        });
      },

      /**
       * Load configuration from API
       * @returns {Promise<void>}
       */
      loadConfigFromAPI: function() {
        return new Promise(resolve => {
          try {
            // Skip if no shop domain or already have a higher priority config
            if (!this.config.shopDomain && !this.detectShopDomain()) {
              Utils.logWarn('No shop domain detected, skipping API config load');
              resolve();
              return;
            }
            
            // Skip if we already have a config from a higher priority source
            if (this.source === 'script' || this.source === 'variable') {
              Utils.log('Using higher priority config, skipping API load');
              resolve();
              return;
            }
            
            // If we don't have a shopDomain yet, detect it
            var shopDomain = this.config.shopDomain || this.detectShopDomain();
            
            if (!shopDomain) {
              Utils.logWarn('Could not detect shop domain for API config');
              resolve();
              return;
            }
            
            // Determine API endpoint
            let apiBaseUrl;
            
            if (this.config.apiBaseUrl) {
              apiBaseUrl = this.config.apiBaseUrl;
            } else if (this.config.debug) {
              apiBaseUrl = 'https://processing-fix-petition-structure.trycloudflare.com';
            } else {
              apiBaseUrl = 'https://processing-fix-petition-structure.trycloudflare.com';
            }
            
            // Add timestamp to prevent caching
            var timestamp = new Date().getTime();
            var url = `${apiBaseUrl}/api/public-config?shop=${shopDomain}&_=${timestamp}`;
            
            Utils.log('Fetching configuration from API: ' + url);
            
            // Fetch the configuration
            fetch(url)
              .then(response => {
                if (!response.ok) {
                  throw new Error(`API responded with status ${response.status}`);
                }
                return response.json();
              })
              .then(data => {
                if (data && data.status === 'success' && data.data && data.data.length > 0) {
                  Utils.log('Configuration received from API');
                  
                  // Parse the data
                  try {
                    let parsedData;
                    
                    if (data.data[0].data && typeof data.data[0].data === 'string') {
                      // Parse JSON string
                      parsedData = Utils.safeJSONParse(data.data[0].data);
                    } else if (data.data[0].data) {
                      // Already an object
                      parsedData = data.data[0].data;
                    } else {
                      throw new Error('Invalid data format');
                    }
                    
                    // Merge with current config
                    this.config = Utils.deepMerge(this.config, parsedData);
                    this.source = 'api';
                    
                    Utils.log('Configuration successfully loaded from API');
                  } catch (e) {
                    Utils.logError('Error parsing API configuration data', e);
                  }
                } else {
                  Utils.logWarn('API response did not contain valid configuration data');
                }
                
                resolve();
              })
              .catch(error => {
                Utils.logWarn('Error loading configuration from API: ' + error.message);
                resolve(); // Continue anyway
              });
          } catch (e) {
            Utils.logWarn('Error in API config loading: ' + e.message);
            resolve(); // Continue anyway
          }
        });
      },

      /**
       * Detect shop domain from the page
       * @returns {string|null} Shop domain or null if not detected
       */
      detectShopDomain: function() {
        // Check for shop domain in various places
        
        // 1. From container data attribute
        var container = document.getElementById('carty-app-container');
        if (container && container.dataset.shop) {
          return container.dataset.shop;
        }
        
        // 2. From Shopify object
        if (window.Shopify && window.Shopify.shop) {
          return window.Shopify.shop;
        }
        
        // 3. From meta tags
        var shopMetaTag = document.querySelector('meta[property="og:url"], meta[name="twitter:domain"]');
        if (shopMetaTag) {
          var content = shopMetaTag.getAttribute('content') || '';
          try {
            var url = new URL(content);
            return url.hostname;
          } catch (e) {
            // Not a valid URL
          }
        }
        
        // 4. From canonical link
        var canonicalLink = document.querySelector('link[rel="canonical"]');
        if (canonicalLink) {
          var href = canonicalLink.getAttribute('href') || '';
          try {
            var url = new URL(href);
            return url.hostname;
          } catch (e) {
            // Not a valid URL
          }
        }
        
        // 5. From current hostname
        var hostname = window.location.hostname;
        if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
          // Skip preview domains
          if (!hostname.includes('.myshopify.com') && 
              !hostname.includes('preview.shopifypreview.com') &&
              !hostname.includes('.shopify.dev')) {
            return hostname;
          }
        }
        
        return null;
      },

      /**
       * Validate configuration
       */
      validateConfiguration: function() {
        // Ensure required fields have values
        if (!this.config.buttonText) {
          this.config.buttonText = this.defaults.buttonText;
        }
        
        // Validate numeric values
        var numericFields = [
          'buttonFontSize', 'buttonBorderSize', 'buttonBorderRadius',
          'variantSelectorFontSize', 'variantSelectorLabelFontSize',
          'quantitySelectorFontSize', 'quantitySelectorBorderSize',
          'quantitySelectorBorderRadius', 'soldOutButtonFontSize',
          'soldOutButtonBorderSize', 'soldOutButtonBorderRadius'
        ];
        
        numericFields.forEach(field => {
          if (this.config[field] && isNaN(parseFloat(this.config[field]))) {
            Utils.logWarn(`Invalid numeric value for ${field}, using default`);
            this.config[field] = this.defaults[field];
          }
        });
        
        // Validate color values
        var colorFields = [
          'buttonFontColor', 'buttonBorderColor', 'buttonBackgroundColor',
          'variantSelectorFontColor', 'variantSelectorLabelFontColor',
          'quantitySelectorFontColor', 'quantitySelectorBorderColor',
          'quantitySelectorBackgroundColor', 'soldOutButtonFontColor',
          'soldOutButtonBorderColor', 'soldOutButtonBackgroundColor'
        ];
        
        colorFields.forEach(field => {
          if (this.config[field] && !this.isValidColor(this.config[field])) {
            Utils.logWarn(`Invalid color value for ${field}, using default`);
            this.config[field] = this.defaults[field];
          }
        });
        
        // Fix boolean fields
        var booleanFields = [
          'debug', 'autoInit', 'buttonRecovery', 'showVariantSelector',
          'showVariantSelectorLabel', 'showQuantitySelector', 'showSoldOutButton',
          'fastLoading', 'isSlideCartEnabled', 'showAllVariants',
          'showVariantPrice', 'enableMultipleVariantSelectors', 'updateVariantImage',
          'showOnHomepage', 'showOnProductPage', 'showOnCollectionPage',
          'showOnSearchResultsPage', 'alignWidgets'
        ];
        
        booleanFields.forEach(field => {
          if (typeof this.config[field] !== 'boolean') {
            // Convert string 'true'/'false' to boolean
            if (this.config[field] === 'true') {
              this.config[field] = true;
            } else if (this.config[field] === 'false') {
              this.config[field] = false;
            } else {
              this.config[field] = this.defaults[field];
            }
          }
        });
      },

      /**
       * Check if a string is a valid color value
       * @param {string} color - Color to validate
       * @returns {boolean} Whether the color is valid
       */
      isValidColor: function(color) {
        // Skip validation for empty strings
        if (!color) return false;
        
        // Simple validation for common color formats
        
        // Hex colors (3, 6, or 8 digits)
        if (/^#([0-9A-F]{3}){1,2}([0-9A-F]{2})?$/i.test(color)) {
          return true;
        }
        
        // RGB / RGBA
        if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(color) ||
            /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i.test(color)) {
          return true;
        }
        
        // HSL / HSLA
        if (/^hsl\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*\)$/i.test(color) ||
            /^hsla\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*,\s*[\d.]+\s*\)$/i.test(color)) {
          return true;
        }
        
        // Named colors - simplified list of common names
        var namedColors = [
          'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
          'pink', 'brown', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'maroon',
          'navy', 'olive', 'teal', 'violet', 'transparent'
        ];
        
        return namedColors.includes(color.toLowerCase());
      },

      /**
       * Migrate older configuration formats to current format
       */
      migrateConfiguration: function() {
        // Handle version 4.x to 5.0 migrations
        
        // Rename legacy fields
        var renames = {
          'slideCartEnabled': 'isSlideCartEnabled',
          'enableSlideCart': 'isSlideCartEnabled',
          'sliderCartEnabled': 'isSlideCartEnabled',
          'showSlideCart': 'isSlideCartEnabled'
        };
        
        for (var [oldKey, newKey] of Object.entries(renames)) {
          if (this.config[oldKey] !== undefined && this.config[newKey] === undefined) {
            this.config[newKey] = this.config[oldKey];
            delete this.config[oldKey];
          }
        }
        
        // Move nested properties that were previously top-level
        if (this.config.primaryColor !== undefined && 
            (!this.config.slideCart || this.config.slideCart.primaryColor === undefined)) {
          if (!this.config.slideCart) this.config.slideCart = {};
          this.config.slideCart.primaryColor = this.config.primaryColor;
          delete this.config.primaryColor;
        }
        
        // Handle boolean strings from older configs
        for (var key in this.config) {
          if (this.config[key] === 'true') this.config[key] = true;
          if (this.config[key] === 'false') this.config[key] = false;
        }
      },

      /**
       * Get configuration value
       * @param {string} path - Configuration path (e.g. 'slideCart.primaryColor')
       * @param {*} defaultValue - Default value if path doesn't exist
       * @returns {*} Configuration value
       */
      get: function(path, defaultValue) {
        return Utils.getProperty(this.config, path, defaultValue);
      },

      /**
       * Set configuration value
       * @param {string} path - Configuration path
       * @param {*} value - Configuration value
       */
      set: function(path, value) {
        this.config = Utils.setProperty(this.config, path, value);
        Carty.trigger('config:changed', { path, value });
      },

      /**
       * Get all configuration
       * @returns {Object} Complete configuration
       */
      getAll: function() {
        return Utils.deepClone(this.config);
      },

      /**
       * Update multiple configuration values
       * @param {Object} updates - Configuration updates
       */
      update: function(updates) {
        if (!updates || typeof updates !== 'object') return;
        
        this.config = Utils.deepMerge(this.config, updates);
        Carty.trigger('config:updated', { updates });
      },

      /**
       * Reset configuration to defaults
       */
      reset: function() {
        this.config = Utils.deepClone(this.defaults);
        Carty.trigger('config:reset');
      },

      /**
       * Save configuration to localStorage (for debugging/development)
       * @returns {boolean} Success status
       */
      save: function() {
        return Utils.storage.set('debug_config', this.config);
      },

      /**
       * Load configuration from localStorage (for debugging/development)
       * @returns {boolean} Success status
       */
      load: function() {
        var saved = Utils.storage.get('debug_config');
        if (saved) {
          this.config = saved;
          Carty.trigger('config:loaded');
          return true;
        }
        return false;
      }
    };

    // Register the module
    Carty.registerModule('config', Config);
  });
})();

/**
 * Carty - DOM Module
 * Handles DOM manipulation and UI interactions
 * Version 5.0.0
 */
(function() {
  'use strict';

  // Wait for utils module to be available
  Carty.ready(['utils'], function(Utils) {
    // Module object
    var DOM = {
      /**
       * Module version
       */
      version: '5.0.0',

      /**
       * Initialize
       */
      init: function() {
        Utils.log('DOM module initialized');
        return Promise.resolve();
      },

      /**
       * Find elements by selector
       * @param {string} selector - CSS selector
       * @param {Element|Document} context - Context element
       * @returns {Array<Element>} Array of elements
       */
      find: function(selector, context = document) {
        try {
          return Array.from(context.querySelectorAll(selector));
        } catch (e) {
          Utils.logError('Error in DOM.find', e);
          return [];
        }
      },

      /**
       * Find a single element by selector
       * @param {string} selector - CSS selector
       * @param {Element|Document} context - Context element
       * @returns {Element|null} Found element or null
       */
      findOne: function(selector, context = document) {
        try {
          return context.querySelector(selector);
        } catch (e) {
          Utils.logError('Error in DOM.findOne', e);
          return null;
        }
      },

      /**
       * Create an element with attributes and children
       * @param {string} tag - Tag name
       * @param {Object} attributes - Element attributes
       * @param {Array|string} children - Child elements or text
       * @returns {Element} Created element
       */
      create: function(tag, attributes = {}, children = []) {
        try {
          var element = document.createElement(tag);
          
          // Set attributes
          for (var [key, value] of Object.entries(attributes)) {
            if (key === 'style' && typeof value === 'object') {
              Object.assign(element.style, value);
            } else if (key === 'className' || key === 'class') {
              element.className = value;
            } else if (key === 'dataset' && typeof value === 'object') {
              Object.assign(element.dataset, value);
            } else if (key === 'text') {
              element.textContent = value;
            } else if (key === 'html') {
              element.innerHTML = Utils.sanitizeHTML(value);
            } else if (key.startsWith('on') && typeof value === 'function') {
              element.addEventListener(key.substring(2).toLowerCase(), value);
            } else {
              element.setAttribute(key, value);
            }
          }
          
          // Add children
          if (typeof children === 'string') {
            element.textContent = children;
          } else if (Array.isArray(children)) {
            for (var child of children) {
              if (child instanceof Element) {
                element.appendChild(child);
              } else if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
              }
            }
          }
          
          return element;
        } catch (e) {
          Utils.logError('Error in DOM.create', e);
          return document.createElement(tag);
        }
      },

      /**
       * Add CSS styles to the document
       * @param {string} styles - CSS styles
       * @param {string} id - Style element ID
       * @returns {HTMLStyleElement} Created style element
       */
      addStyles: function(styles, id = '') {
        try {
          // Check if style element with this ID already exists
          if (id) {
            var existingStyle = document.getElementById(id);
            if (existingStyle) {
              existingStyle.textContent = styles;
              return existingStyle;
            }
          }
          
          var styleElement = document.createElement('style');
          styleElement.textContent = styles;
          if (id) styleElement.id = id;
          document.head.appendChild(styleElement);
          return styleElement;
        } catch (e) {
          Utils.logError('Error in DOM.addStyles', e);
          return null;
        }
      },

      /**
       * Add a class to an element
       * @param {Element} element - Target element
       * @param {string} className - Class to add
       */
      addClass: function(element, className) {
        if (!element) return;
        try {
          if (typeof className === 'string') {
            // Handle multiple classes separated by spaces
            className.split(' ').forEach(cls => {
              if (cls.trim()) element.classList.add(cls.trim());
            });
          }
        } catch (e) {
          Utils.logError('Error in DOM.addClass', e);
        }
      },

      /**
       * Remove a class from an element
       * @param {Element} element - Target element
       * @param {string} className - Class to remove
       */
      removeClass: function(element, className) {
        if (!element) return;
        try {
          if (typeof className === 'string') {
            // Handle multiple classes separated by spaces
            className.split(' ').forEach(cls => {
              if (cls.trim()) element.classList.remove(cls.trim());
            });
          }
        } catch (e) {
          Utils.logError('Error in DOM.removeClass', e);
        }
      },

      /**
       * Toggle a class on an element
       * @param {Element} element - Target element
       * @param {string} className - Class to toggle
       * @param {boolean} force - Force state
       */
      toggleClass: function(element, className, force) {
        if (!element) return;
        try {
          element.classList.toggle(className, force);
        } catch (e) {
          Utils.logError('Error in DOM.toggleClass', e);
        }
      },

      /**
       * Check if element has a class
       * @param {Element} element - Target element
       * @param {string} className - Class to check
       * @returns {boolean} True if element has class
       */
      hasClass: function(element, className) {
        if (!element) return false;
        try {
          return element.classList.contains(className);
        } catch (e) {
          Utils.logError('Error in DOM.hasClass', e);
          return false;
        }
      },

      /**
       * Set multiple styles on an element
       * @param {Element} element - Target element
       * @param {Object} styles - Styles object
       */
      setStyles: function(element, styles) {
        if (!element) return;
        try {
          Object.assign(element.style, styles);
        } catch (e) {
          Utils.logError('Error in DOM.setStyles', e);
        }
      },

      /**
       * Add event listener with automatic cleanup
       * @param {Element} element - Target element
       * @param {string} event - Event name
       * @param {Function} handler - Event handler
       * @param {Object} options - Event options
       * @returns {Function} Cleanup function
       */
      on: function(element, event, handler, options = {}) {
        if (!element) return () => {};
        try {
          element.addEventListener(event, handler, options);
          return () => this.off(element, event, handler, options);
        } catch (e) {
          Utils.logError('Error in DOM.on', e);
          return () => {};
        }
      },

      /**
       * Remove event listener
       * @param {Element} element - Target element
       * @param {string} event - Event name
       * @param {Function} handler - Event handler
       * @param {Object} options - Event options
       */
      off: function(element, event, handler, options = {}) {
        if (!element) return;
        try {
          element.removeEventListener(event, handler, options);
        } catch (e) {
          Utils.logError('Error in DOM.off', e);
        }
      },

      /**
       * Add a one-time event listener
       * @param {Element} element - Target element
       * @param {string} event - Event name
       * @param {Function} handler - Event handler
       * @param {Object} options - Event options
       */
      once: function(element, event, handler, options = {}) {
        if (!element) return;
        try {
          // Add options.once = true
          element.addEventListener(event, handler, { ...options, once: true });
        } catch (e) {
          Utils.logError('Error in DOM.once', e);
        }
      },

      /**
       * Set element attribute
       * @param {Element} element - Target element
       * @param {string} name - Attribute name
       * @param {string} value - Attribute value
       */
      attr: function(element, name, value) {
        if (!element) return;
        try {
          if (value === null || value === undefined) {
            element.removeAttribute(name);
          } else {
            element.setAttribute(name, value);
          }
        } catch (e) {
          Utils.logError('Error in DOM.attr', e);
        }
      },

      /**
       * Get element attribute
       * @param {Element} element - Target element
       * @param {string} name - Attribute name
       * @returns {string|null} Attribute value
       */
      getAttr: function(element, name) {
        if (!element) return null;
        try {
          return element.getAttribute(name);
        } catch (e) {
          Utils.logError('Error in DOM.getAttr', e);
          return null;
        }
      },

      /**
       * Remove element attribute
       * @param {Element} element - Target element
       * @param {string} name - Attribute name
       */
      removeAttr: function(element, name) {
        if (!element) return;
        try {
          element.removeAttribute(name);
        } catch (e) {
          Utils.logError('Error in DOM.removeAttr', e);
        }
      },

      /**
       * Empty an element (remove all children)
       * @param {Element} element - Target element
       */
      empty: function(element) {
        if (!element) return;
        try {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
        } catch (e) {
          Utils.logError('Error in DOM.empty', e);
        }
      },

      /**
       * Get element position and dimensions
       * @param {Element} element - Target element
       * @returns {Object} Element dimensions
       */
      getRect: function(element) {
        if (!element) return { top: 0, left: 0, width: 0, height: 0 };
        try {
          return element.getBoundingClientRect();
        } catch (e) {
          Utils.logError('Error in DOM.getRect', e);
          return { top: 0, left: 0, width: 0, height: 0 };
        }
      },

      /**
       * Check if element is visible
       * @param {Element} element - Target element
       * @returns {boolean} True if element is visible
       */
      isVisible: function(element) {
        if (!element) return false;
        try {
          var style = window.getComputedStyle(element);
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.opacity !== '0' &&
                 element.offsetWidth > 0 && 
                 element.offsetHeight > 0;
        } catch (e) {
          Utils.logError('Error in DOM.isVisible', e);
          return false;
        }
      },

      /**
       * Insert element after a reference element
       * @param {Element} newNode - Element to insert
       * @param {Element} referenceNode - Reference element
       */
      insertAfter: function(newNode, referenceNode) {
        if (!referenceNode || !newNode) return;
        try {
          referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        } catch (e) {
          Utils.logError('Error in DOM.insertAfter', e);
        }
      },

      /**
       * Insert element before a reference element
       * @param {Element} newNode - Element to insert
       * @param {Element} referenceNode - Reference element
       */
      insertBefore: function(newNode, referenceNode) {
        if (!referenceNode || !newNode) return;
        try {
          referenceNode.parentNode.insertBefore(newNode, referenceNode);
        } catch (e) {
          Utils.logError('Error in DOM.insertBefore', e);
        }
      },

      /**
       * Append multiple elements to a parent
       * @param {Element} parent - Parent element
       * @param {Array<Element>} children - Child elements
       */
      appendAll: function(parent, children) {
        if (!parent) return;
        try {
          children.forEach(child => {
            if (child instanceof Element) {
              parent.appendChild(child);
            }
          });
        } catch (e) {
          Utils.logError('Error in DOM.appendAll', e);
        }
      },

      /**
       * Check if an element matches a selector
       * @param {Element} element - Element to check
       * @param {string} selector - CSS selector
       * @returns {boolean} True if element matches selector
       */
      matches: function(element, selector) {
        if (!element) return false;
        try {
          return element.matches(selector);
        } catch (e) {
          Utils.logError('Error in DOM.matches', e);
          return false;
        }
      },

      /**
       * Find closest ancestor matching a selector
       * @param {Element} element - Starting element
       * @param {string} selector - CSS selector
       * @returns {Element|null} Matching ancestor or null
       */
      closest: function(element, selector) {
        if (!element) return null;
        try {
          return element.closest(selector);
        } catch (e) {
          Utils.logError('Error in DOM.closest', e);
          
          // Fallback for browsers without closest()
          let currentElement = element;
          while (currentElement) {
            if (this.matches(currentElement, selector)) {
              return currentElement;
            }
            currentElement = currentElement.parentElement;
          }
          return null;
        }
      },

      /**
       * Get or set element text content
       * @param {Element} element - Target element
       * @param {string} [text] - Text to set (if provided)
       * @returns {string|undefined} Current text if no new text provided
       */
      text: function(element, text) {
        if (!element) return '';
        try {
          if (text === undefined) {
            return element.textContent;
          } else {
            element.textContent = text;
          }
        } catch (e) {
          Utils.logError('Error in DOM.text', e);
          return '';
        }
      },

      /**
       * Get or set element HTML content
       * @param {Element} element - Target element
       * @param {string} [html] - HTML to set (if provided)
       * @returns {string|undefined} Current HTML if no new HTML provided
       */
      html: function(element, html) {
        if (!element) return '';
        try {
          if (html === undefined) {
            return element.innerHTML;
          } else {
            element.innerHTML = Utils.sanitizeHTML(html);
          }
        } catch (e) {
          Utils.logError('Error in DOM.html', e);
          return '';
        }
      },

      /**
       * Get or set element value
       * @param {Element} element - Target element
       * @param {string} [value] - Value to set (if provided)
       * @returns {string|undefined} Current value if no new value provided
       */
      val: function(element, value) {
        if (!element) return '';
        try {
          if (value === undefined) {
            return element.value;
          } else {
            element.value = value;
          }
        } catch (e) {
          Utils.logError('Error in DOM.val', e);
          return '';
        }
      },

      /**
       * Show element
       * @param {Element} element - Target element
       * @param {string} [display='block'] - Display value
       */
      show: function(element, display = 'block') {
        if (!element) return;
        try {
          element.style.display = display;
        } catch (e) {
          Utils.logError('Error in DOM.show', e);
        }
      },

      /**
       * Hide element
       * @param {Element} element - Target element
       */
      hide: function(element) {
        if (!element) return;
        try {
          element.style.display = 'none';
        } catch (e) {
          Utils.logError('Error in DOM.hide', e);
        }
      },

      /**
       * Toggle element visibility
       * @param {Element} element - Target element
       * @param {string} [display='block'] - Display value when showing
       */
      toggle: function(element, display = 'block') {
        if (!element) return;
        try {
          var isHidden = element.style.display === 'none' || 
                          !element.style.display ||
                          window.getComputedStyle(element).display === 'none';
          element.style.display = isHidden ? display : 'none';
        } catch (e) {
          Utils.logError('Error in DOM.toggle', e);
        }
      },

      /**
       * Set up IntersectionObserver for lazy loading
       * @param {Array<Element>} elements - Elements to observe
       * @param {Function} callback - Callback when element becomes visible
       * @param {Object} options - IntersectionObserver options
       * @returns {IntersectionObserver|null} Observer instance
       */
      lazyLoad: function(elements, callback, options = {}) {
        if (!elements || !elements.length || !callback) return null;
        
        // Check if IntersectionObserver is available
        if (!('IntersectionObserver' in window)) {
          // Fallback for browsers without IntersectionObserver
          elements.forEach(element => callback(element, true));
          return null;
        }
        
        try {
          // Default options
          var defaultOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
          };
          
          // Merge options
          var observerOptions = { ...defaultOptions, ...options };
          
          // Create observer
          var observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                callback(entry.target, true);
                observer.unobserve(entry.target);
              }
            });
          }, observerOptions);
          
          // Start observing elements
          elements.forEach(element => {
            observer.observe(element);
          });
          
          return observer;
        } catch (e) {
          Utils.logError('Error in DOM.lazyLoad', e);
          
          // Fallback
          elements.forEach(element => callback(element, true));
          return null;
        }
      },

      /**
       * Create a debounced scroll/resize handler
       * @param {Function} callback - Callback function
       * @param {number} delay - Debounce delay in ms
       * @returns {Function} Debounced handler
       */
      createScrollHandler: function(callback, delay = 200) {
        if (!callback) return null;
        
        var debouncedCallback = Utils.debounce(callback, delay);
        
        // Attach to window
        window.addEventListener('scroll', debouncedCallback);
        window.addEventListener('resize', debouncedCallback);
        
        // Return cleanup function
        return function cleanup() {
          window.removeEventListener('scroll', debouncedCallback);
          window.removeEventListener('resize', debouncedCallback);
        };
      },

      /**
       * Animate an element with CSS transitions
       * @param {Element} element - Target element
       * @param {Object} properties - CSS properties to animate
       * @param {Object} options - Animation options
       * @returns {Promise} Animation promise
       */
      animate: function(element, properties, options = {}) {
        if (!element) return Promise.reject(new Error('No element provided'));
        
        return new Promise((resolve, reject) => {
          try {
            // Default options
            var defaultOptions = {
              duration: 300, // ms
              easing: 'ease',
              delay: 0,
              complete: null
            };
            
            // Merge options
            var animOptions = { ...defaultOptions, ...options };
            
            // Set transition
            var transition = `all ${animOptions.duration / 1000}s ${animOptions.easing} ${animOptions.delay / 1000}s`;
            element.style.transition = transition;
            
            // Trigger reflow for transition to take effect
            void element.offsetWidth;
            
            // Apply properties
            Object.entries(properties).forEach(([prop, value]) => {
              element.style[prop] = value;
            });
            
            // Listen for transition end
            var transitionEnd = (e) => {
              if (e.target !== element) return;
              
              element.removeEventListener('transitionend', transitionEnd);
              
              // Reset transition
              element.style.transition = '';
              
              // Call complete callback if provided
              if (typeof animOptions.complete === 'function') {
                animOptions.complete(element);
              }
              
              resolve(element);
            };
            
            element.addEventListener('transitionend', transitionEnd);
            
            // Fallback if transitionend doesn't fire
            setTimeout(() => {
              if (element.style.transition) {
                element.style.transition = '';
                resolve(element);
              }
            }, animOptions.duration + animOptions.delay + 50);
          } catch (e) {
            Utils.logError('Error in DOM.animate', e);
            reject(e);
          }
        });
      },

      /**
       * Add accessibility attributes to an element
       * @param {Element} element - Target element
       * @param {Object} attributes - Accessibility attributes
       */
      setA11y: function(element, attributes = {}) {
        if (!element) return;
        
        try {
          var a11yAttributes = {
            role: attributes.role,
            tabindex: attributes.tabIndex !== undefined ? attributes.tabIndex : undefined,
            'aria-label': attributes.label,
            'aria-disabled': attributes.disabled !== undefined ? attributes.disabled.toString() : undefined,
            'aria-hidden': attributes.hidden !== undefined ? attributes.hidden.toString() : undefined,
            'aria-expanded': attributes.expanded !== undefined ? attributes.expanded.toString() : undefined,
            'aria-haspopup': attributes.hasPopup !== undefined ? attributes.hasPopup.toString() : undefined,
            'aria-controls': attributes.controls,
            'aria-live': attributes.live,
            'aria-atomic': attributes.atomic !== undefined ? attributes.atomic.toString() : undefined
          };
          
          // Set attributes
          Object.entries(a11yAttributes).forEach(([attr, value]) => {
            if (value !== undefined) {
              element.setAttribute(attr, value);
            }
          });
        } catch (e) {
          Utils.logError('Error in DOM.setA11y', e);
        }
      },

      /**
       * Create a tooltip element
       * @param {Element} target - Target element
       * @param {string} text - Tooltip text
       * @param {Object} options - Tooltip options
       * @returns {Object} Tooltip methods
       */
      tooltip: function(target, text, options = {}) {
        if (!target || !text) return null;
        
        try {
          // Default options
          var defaultOptions = {
            position: 'top', // top, right, bottom, left
            className: '',
            offset: 5, // px
            delay: 200, // ms
            duration: 2000, // ms (0 for permanent)
            interactive: false
          };
          
          // Merge options
          var tooltipOptions = { ...defaultOptions, ...options };
          
          // Create tooltip element
          var tooltip = this.create('div', {
            className: `carty-tooltip carty-tooltip--${tooltipOptions.position} ${tooltipOptions.className}`,
            text: text,
            style: {
              position: 'fixed',
              display: 'none',
              padding: '8px 12px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              borderRadius: '4px',
              fontSize: '14px',
              zIndex: 9999,
              maxWidth: '250px',
              textAlign: 'center',
              pointerEvents: tooltipOptions.interactive ? 'auto' : 'none'
            }
          });
          
          // Add tooltip to document
          document.body.appendChild(tooltip);
          
          // Set accessibility attributes
          this.setA11y(tooltip, {
            role: 'tooltip',
            live: 'polite',
            atomic: true
          });
          
          // Show tooltip
          var show = () => {
            // Position tooltip
            this.positionTooltip(tooltip, target, tooltipOptions);
            
            // Show tooltip with animation
            this.animate(tooltip, {
              opacity: 1,
              display: 'block'
            }, {
              duration: 200
            });
            
            // Hide after duration if not permanent
            if (tooltipOptions.duration > 0) {
              setTimeout(hide, tooltipOptions.duration);
            }
          };
          
          // Hide tooltip
          var hide = () => {
            this.animate(tooltip, {
              opacity: 0
            }, {
              duration: 200,
              complete: () => {
                tooltip.style.display = 'none';
              }
            });
          };
          
          // Event listeners
          let showTimer;
          
          var mouseEnter = () => {
            clearTimeout(showTimer);
            showTimer = setTimeout(show, tooltipOptions.delay);
          };
          
          var mouseLeave = () => {
            clearTimeout(showTimer);
            hide();
          };
          
          // Attach events
          this.on(target, 'mouseenter', mouseEnter);
          this.on(target, 'mouseleave', mouseLeave);
          
          // Cleanup function
          var cleanup = () => {
            this.off(target, 'mouseenter', mouseEnter);
            this.off(target, 'mouseleave', mouseLeave);
            
            if (tooltip.parentNode) {
              tooltip.parentNode.removeChild(tooltip);
            }
          };
          
          // Return tooltip methods
          return {
            show,
            hide,
            cleanup,
            element: tooltip
          };
        } catch (e) {
          Utils.logError('Error in DOM.tooltip', e);
          return null;
        }
      },

      /**
       * Position tooltip relative to target
       * @param {Element} tooltip - Tooltip element
       * @param {Element} target - Target element
       * @param {Object} options - Positioning options
       */
      positionTooltip: function(tooltip, target, options) {
        if (!tooltip || !target) return;
        
        try {
          // Get positions
          var targetRect = target.getBoundingClientRect();
          var tooltipRect = tooltip.getBoundingClientRect();
          
          // Calculate position
          let top, left;
          
          switch (options.position) {
            case 'top':
              top = targetRect.top - tooltipRect.height - options.offset;
              left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
              break;
            case 'right':
              top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
              left = targetRect.right + options.offset;
              break;
            case 'bottom':
              top = targetRect.bottom + options.offset;
              left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
              break;
            case 'left':
              top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
              left = targetRect.left - tooltipRect.width - options.offset;
              break;
            default:
              top = targetRect.top - tooltipRect.height - options.offset;
              left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          }
          
          // Ensure tooltip stays within viewport
          var viewport = {
            width: window.innerWidth,
            height: window.innerHeight
          };
          
          // Adjust horizontal position
          if (left < 0) {
            left = 0;
          } else if (left + tooltipRect.width > viewport.width) {
            left = viewport.width - tooltipRect.width;
          }
          
          // Adjust vertical position
          if (top < 0) {
            top = 0;
          } else if (top + tooltipRect.height > viewport.height) {
            top = viewport.height - tooltipRect.height;
          }
          
          // Set position
          tooltip.style.top = `${top}px`;
          tooltip.style.left = `${left}px`;
        } catch (e) {
          Utils.logError('Error in DOM.positionTooltip', e);
        }
      },

      /**
       * Create a modal dialog
       * @param {Object} options - Modal options
       * @returns {Object} Modal methods
       */
      modal: function(options = {}) {
        try {
          // Default options
          var defaultOptions = {
            title: '',
            content: '',
            buttons: [],
            closeOnEscape: true,
            closeOnOverlayClick: true,
            className: '',
            width: 'auto',
            height: 'auto',
            zIndex: 9999
          };
          
          // Merge options
          var modalOptions = { ...defaultOptions, ...options };
          
          // Create modal elements
          var overlay = this.create('div', {
            className: 'carty-modal-overlay',
            style: {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: modalOptions.zIndex,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.3s ease'
            }
          });
          
          var modal = this.create('div', {
            className: `carty-modal ${modalOptions.className}`,
            style: {
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              maxWidth: '90%',
              width: modalOptions.width,
              height: modalOptions.height,
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              opacity: 0,
              transform: 'translateY(20px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease'
            }
          });
          
          // Create header
          let header;
          if (modalOptions.title) {
            header = this.create('div', {
              className: 'carty-modal-header',
              style: {
                padding: '16px 20px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }
            });
            
            var title = this.create('h3', {
              className: 'carty-modal-title',
              text: modalOptions.title,
              style: {
                margin: 0,
                fontSize: '18px',
                fontWeight: 'bold'
              }
            });
            
            var closeButton = this.create('button', {
              className: 'carty-modal-close',
              html: '&times;',
              style: {
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0 8px',
                lineHeight: 1
              },
              'aria-label': 'Close'
            });
            
            this.on(closeButton, 'click', close);
            
            header.appendChild(title);
            header.appendChild(closeButton);
            modal.appendChild(header);
          }
          
          // Create content
          var content = this.create('div', {
            className: 'carty-modal-content',
            style: {
              padding: '20px',
              overflowY: 'auto',
              flexGrow: 1
            }
          });
          
          if (typeof modalOptions.content === 'string') {
            content.innerHTML = Utils.sanitizeHTML(modalOptions.content);
          } else if (modalOptions.content instanceof Element) {
            content.appendChild(modalOptions.content);
          }
          
          modal.appendChild(content);
          
          // Create footer with buttons
          if (modalOptions.buttons && modalOptions.buttons.length) {
            var footer = this.create('div', {
              className: 'carty-modal-footer',
              style: {
                padding: '16px 20px',
                borderTop: '1px solid #eee',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
              }
            });
            
            modalOptions.buttons.forEach(buttonOpts => {
              var button = this.create('button', {
                className: `carty-modal-button ${buttonOpts.className || ''}`,
                text: buttonOpts.text || 'Button',
                style: {
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: buttonOpts.primary ? 'bold' : 'normal',
                  backgroundColor: buttonOpts.primary ? '#007bff' : '#f8f9fa',
                  color: buttonOpts.primary ? '#fff' : '#333',
                  ...buttonOpts.style
                },
                disabled: buttonOpts.disabled
              });
              
              if (buttonOpts.onClick) {
                this.on(button, 'click', (e) => {
                  buttonOpts.onClick(e, { close });
                });
              }
              
              footer.appendChild(button);
            });
            
            modal.appendChild(footer);
          }
          
          // Add to DOM
          overlay.appendChild(modal);
          document.body.appendChild(overlay);
          
          // Set accessibility attributes
          this.setA11y(modal, {
            role: 'dialog',
            live: 'assertive',
            label: modalOptions.title
          });
          
          // Set up close on overlay click
          if (modalOptions.closeOnOverlayClick) {
            this.on(overlay, 'click', (e) => {
              if (e.target === overlay) {
                close();
              }
            });
          }
          
          // Set up close on escape
          let keydownHandler;
          if (modalOptions.closeOnEscape) {
            keydownHandler = (e) => {
              if (e.key === 'Escape') {
                close();
              }
            };
            
            document.addEventListener('keydown', keydownHandler);
          }
          
          // Open modal
          setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.opacity = '1';
            modal.style.transform = 'translateY(0)';
          }, 10);
          
          // Close function
          function close() {
            // Clean up keydown handler
            if (keydownHandler) {
              document.removeEventListener('keydown', keydownHandler);
            }
            
            // Animate out
            overlay.style.opacity = '0';
            modal.style.opacity = '0';
            modal.style.transform = 'translateY(20px)';
            
            // Remove from DOM after animation
            setTimeout(() => {
              if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
              }
            }, 300);
          }
          
          // Return modal methods
          return {
            element: modal,
            overlay,
            close
          };
        } catch (e) {
          Utils.logError('Error in DOM.modal', e);
          return null;
        }
      },

      /**
       * Create a notification toast
       * @param {string} message - Notification message
       * @param {string} type - Notification type (info, success, warning, error)
       * @param {Object} options - Notification options
       * @returns {Object} Notification methods
       */
      notify: function(message, type = 'info', options = {}) {
        try {
          // Default options
          var defaultOptions = {
            duration: 3000,
            position: 'top-right',
            animation: true,
            showProgress: true,
            className: '',
            icon: true,
            closeButton: true
          };
          
          // Merge options
          var notifyOptions = { ...defaultOptions, ...options };
          
          // Determine colors based on type
          var colors = {
            info: {
              background: '#f8f9fa',
              border: '#17a2b8',
              text: '#0c5460'
            },
            success: {
              background: '#d4edda',
              border: '#28a745',
              text: '#155724'
            },
            warning: {
              background: '#fff3cd',
              border: '#ffc107',
              text: '#856404'
            },
            error: {
              background: '#f8d7da',
              border: '#dc3545',
              text: '#721c24'
            }
          };
          
          var color = colors[type] || colors.info;
          
          // Get or create container
          let container = document.querySelector(`.carty-notification-container--${notifyOptions.position}`);
          
          if (!container) {
            container = this.create('div', {
              className: `carty-notification-container carty-notification-container--${notifyOptions.position}`,
              style: {
                position: 'fixed',
                zIndex: 9999,
                ...this.getNotificationPosition(notifyOptions.position)
              }
            });
            
            document.body.appendChild(container);
          }
          
          // Create notification
          var notification = this.create('div', {
            className: `carty-notification carty-notification--${type} ${notifyOptions.className}`,
            style: {
              backgroundColor: color.background,
              color: color.text,
              borderLeft: `4px solid ${color.border}`,
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
              padding: '12px',
              margin: '0 0 10px 0',
              maxWidth: '320px',
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              opacity: 0,
              transform: 'translateY(20px)',
              transition: notifyOptions.animation ? 'opacity 0.3s ease, transform 0.3s ease' : 'none'
            }
          });
          
          // Add icon
          if (notifyOptions.icon) {
            var iconSvg = this.getNotificationIcon(type);
            var icon = this.create('div', {
              className: 'carty-notification-icon',
              html: iconSvg,
              style: {
                marginRight: '10px',
                flexShrink: 0
              }
            });
            
            notification.appendChild(icon);
          }
          
          // Content
          var content = this.create('div', {
            className: 'carty-notification-content',
            style: {
              flexGrow: 1
            }
          });
          
          var messageElement = this.create('div', {
            className: 'carty-notification-message',
            text: message
          });
          
          content.appendChild(messageElement);
          notification.appendChild(content);
          
          // Add close button
          if (notifyOptions.closeButton) {
            var closeButton = this.create('button', {
              className: 'carty-notification-close',
              html: '&times;',
              style: {
                background: 'none',
                border: 'none',
                color: color.text,
                fontSize: '18px',
                cursor: 'pointer',
                marginLeft: '10px',
                padding: 0,
                lineHeight: 1,
                opacity: 0.7
              }
            });
            
            this.on(closeButton, 'click', close);
            notification.appendChild(closeButton);
          }
          
          // Add progress bar
          let progressBar;
          if (notifyOptions.showProgress && notifyOptions.duration > 0) {
            progressBar = this.create('div', {
              className: 'carty-notification-progress',
              style: {
                position: 'absolute',
                bottom: '0',
                left: '0',
                height: '3px',
                backgroundColor: color.border,
                width: '100%',
                transformOrigin: 'left',
                transform: 'scaleX(1)',
                transition: `transform ${notifyOptions.duration / 1000}s linear`
              }
            });
            
            notification.appendChild(progressBar);
            notification.style.position = 'relative';
            notification.style.overflow = 'hidden';
          }
          
          // Add to container
          container.appendChild(notification);
          
          // Animate in
          setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
            
            if (progressBar) {
              progressBar.style.transform = 'scaleX(0)';
            }
          }, 10);
          
          // Auto close
          let timeout;
          if (notifyOptions.duration > 0) {
            timeout = setTimeout(close, notifyOptions.duration);
          }
          
          // Close function
          function close() {
            if (timeout) {
              clearTimeout(timeout);
            }
            
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
                
                // Remove container if empty
                if (container.children.length === 0 && container.parentNode) {
                  container.parentNode.removeChild(container);
                }
              }
            }, 300);
          }
          
          // Return notification methods
          return {
            element: notification,
            close
          };
        } catch (e) {
          Utils.logError('Error in DOM.notify', e);
          return null;
        }
      },

      /**
       * Get notification container position styles
       * @param {string} position - Position string (top-right, top-left, bottom-right, bottom-left)
       * @returns {Object} Position styles
       */
      getNotificationPosition: function(position) {
        switch (position) {
          case 'top-left':
            return {
              top: '20px',
              left: '20px'
            };
          case 'top-center':
            return {
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)'
            };
          case 'bottom-right':
            return {
              bottom: '20px',
              right: '20px'
            };
          case 'bottom-left':
            return {
              bottom: '20px',
              left: '20px'
            };
          case 'bottom-center':
            return {
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)'
            };
          case 'top-right':
          default:
            return {
              top: '20px',
              right: '20px'
            };
        }
      },

      /**
       * Get notification icon SVG
       * @param {string} type - Notification type
       * @returns {string} SVG string
       */
      getNotificationIcon: function(type) {
        switch (type) {
          case 'success':
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.44 5.44l-4.5 4.5a.5.5 0 01-.7 0l-2-2a.5.5 0 11.7-.7l1.65 1.65 4.15-4.15a.5.5 0 01.7.7z"/></svg>';
          case 'warning':
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 11a1 1 0 110 2 1 1 0 010-2zm0-8a1 1 0 00-1 1v5a1 1 0 002 0V4a1 1 0 00-1-1z"/></svg>';
          case 'error':
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.53 10.53a.5.5 0 01-.7.7L8 8.4l-2.83 2.83a.5.5 0 01-.7-.7L7.29 7.7 4.47 4.87a.5.5 0 01.7-.7L8 7l2.83-2.83a.5.5 0 01.7.7L8.7 7.71l2.83 2.82z"/></svg>';
          case 'info':
          default:
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 11a1 1 0 110 2 1 1 0 010-2zm1-6.4a1 1 0 01-.2 2H7.2a1 1 0 110-2h1.6z"/></svg>';
        }
      }
    };

    // Register the module
    Carty.registerModule('dom', DOM);
  });
})();

/**
 * Carty - Cart Service Module
 * Handles all cart operations and state management
 * Version 5.0.0
 */
(function() {
  'use strict';

  // Wait for dependencies
  Carty.ready(['utils', 'config'], function(Utils, Config) {
    // Module object
    var CartService = {
      /**
       * Module version
       */
      version: '5.0.0',

      /**
       * Cart data
       */
      cart: null,

      /**
       * Cart operation queue
       */
      operationQueue: [],
      processingOperation: false,

      /**
       * Active discount codes
       */
      activeDiscountCodes: [],

      /**
       * Initialization promise
       */
      initialized: null,

      /**
       * Initialize the cart service
       * @returns {Promise} Initialization promise
       */
      init: function() {
        if (this.initialized) {
          return this.initialized;
        }

        Utils.log('Initializing cart service');

        // Initialize cart
        this.initialized = this.refreshCart()
          .then(() => {
            // Set up cart count updates
            this.setupCartCountObservers();

            // Set up automatic cache refresh timer
            this.setupCacheRefresh();

            Utils.log('Cart service initialized');
            Carty.trigger('cart:initialized');
            return this.cart;
          })
          .catch(error => {
            Utils.logError('Error initializing cart service', error);
            return null;
          });

        return this.initialized;
      },

      /**
       * Setup cache refresh timer
       */
      setupCacheRefresh: function() {
        // Refresh cart data periodically to keep it in sync with server
        var refreshInterval = Config.get('performance.cacheExpiry', 1800) * 1000;
        
        if (refreshInterval > 0) {
          setInterval(() => {
            // Only refresh if not processing operations
            if (!this.processingOperation) {
              this.refreshCart(true);
            }
          }, refreshInterval);
        }
      },

      /**
       * Setup observers for cart count elements
       */
      setupCartCountObservers: function() {
        if (!this.cart) return;

        // Update cart counts when cart is updated
        Carty.on('cart:updated', () => {
          this.updateCartCounters();
        });

        // Initial update
        this.updateCartCounters();
      },

      /**
       * Get current cart data
       * @param {boolean} [force=false] - Force refresh from server
       * @returns {Promise<Object>} Cart data
       */
      getCart: function(force = false) {
        // If we have cart data and no force refresh, return it
        if (this.cart && !force) {
          return Promise.resolve(this.cart);
        }

        // Otherwise refresh from server
        return this.refreshCart();
      },

      /**
       * Refresh cart data from server
       * @param {boolean} [silent=false] - Don't trigger events if true
       * @returns {Promise<Object>} Fresh cart data
       */
      refreshCart: function(silent = false) {
        return fetch('/cart.js', {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch cart: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then(cartData => {
          // Process and store cart data
          this.cart = this.processCartData(cartData);

          // Cache cart data in localStorage for persistence
          try {
            Utils.storage.set('cart_data', this.cart);
          } catch (e) {
            Utils.logWarn('Failed to cache cart data in localStorage');
          }

          // Trigger events if not silent
          if (!silent) {
            Carty.trigger('cart:updated', { cart: this.cart });
            this.updateCartCounters();
          }

          return this.cart;
        })
        .catch(error => {
          Utils.logError('Error refreshing cart data', error);

          // Try to recover from localStorage
          try {
            var cachedCart = Utils.storage.get('cart_data');
            if (cachedCart) {
              this.cart = cachedCart;
              return this.cart;
            }
          } catch (e) {
            // Silent fail
          }
          
          // Return empty cart as fallback
          return this.getEmptyCart();
        });
      },

      /**
       * Get empty cart structure
       * @returns {Object} Empty cart object
       */
      getEmptyCart: function() {
        return {
          items: [],
          item_count: 0,
          total_price: 0,
          original_total_price: 0,
          total_discount: 0,
          currency: 'USD'
        };
      },

      /**
       * Process raw cart data
       * @param {Object} cartData - Raw cart data from Shopify
       * @returns {Object} Processed cart data
       */
      processCartData: function(cartData) {
        if (!cartData) return this.getEmptyCart();
        
        // Clone to avoid reference issues
        var processedCart = Utils.deepClone(cartData);
        
        // Process items
        if (processedCart.items && Array.isArray(processedCart.items)) {
          processedCart.items.forEach(item => {
            // Store original variant title for display
            item._originalVariantTitle = item.variant_title;
            
            // Add display prices
            item._displayPrice = item.price / 100;
            item._displayLinePrice = item.line_price / 100;
            
            // Process discount indicators
            if (item.line_level_discount_allocations && item.line_level_discount_allocations.length > 0) {
              item._hasDiscount = true;
              item._discountAmount = item.line_level_discount_allocations.reduce((total, discount) => 
                total + (discount.amount || 0), 0);
              item._discountTitle = item.line_level_discount_allocations[0].discount_application?.title || 'Discount';
            } else if (item.original_price > item.final_price) {
              item._hasDiscount = true;
              item._discountAmount = (item.original_price - item.final_price) * item.quantity;
            }
            
            // Extract subscription and bundle info from properties
            if (item.properties) {
              // Check for subscription products (ReCharge, Bold, etc.)
              if (item.properties._subscription_id || 
                  item.properties.subscription_id || 
                  item.properties.shipping_interval_frequency) {
                item._isSubscription = true;
                
                // Extract details
                var frequency = item.properties.shipping_interval_frequency || 
                                  item.properties.frequency_num || '';
                var unit = item.properties.shipping_interval_unit_type || 
                             item.properties.frequency_type || '';
                
                item._subscriptionInfo = frequency && unit ? 
                  `${frequency} ${unit}` : 'Subscription';
              }
              
              // Check for bundle items
              if (item.properties._bundle_item || 
                  item.properties._bundle_discount) {
                item._isBundle = true;
                
                if (item.properties._bundle_discount) {
                  item._bundleInfo = `Bundle (${item.properties._bundle_discount} off)`;
                } else {
                  item._bundleInfo = 'Bundle Item';
                }
              }
            }
          });
        }
        
        // Extract active discount codes
        this.extractDiscountCodes(processedCart);
        
        return processedCart;
      },

      /**
       * Extract discount codes from cart data
       * @param {Object} cartData - Cart data
       */
      extractDiscountCodes: function(cartData) {
        this.activeDiscountCodes = [];
        
        if (!cartData) return;
        
        // Look for cart-level discount applications
        if (cartData.cart_level_discount_applications && 
            Array.isArray(cartData.cart_level_discount_applications) && 
            cartData.cart_level_discount_applications.length) {
          
          this.activeDiscountCodes = cartData.cart_level_discount_applications.map(discount => ({
            code: discount.title || 'Discount',
            type: discount.type || 'discount_code',
            value: discount.value || 0,
            valueType: discount.value_type || 'fixed_amount'
          }));
        }
        
        // Look for total_discount property as fallback
        else if (cartData.total_discount > 0) {
          // We know there's a discount but not what code
          this.activeDiscountCodes.push({
            code: 'Discount',
            type: 'discount_code',
            value: cartData.total_discount,
            valueType: 'fixed_amount'
          });
        }
      },

      /**
       * Update cart count elements in the DOM
       */
      updateCartCounters: function() {
        if (!this.cart) return;
        
        var count = this.cart.item_count || 0;
        Utils.log(`Updating cart count to ${count}`);
        
        // Try to update all possible cart count elements
        try {
          // Common cart count selectors
          var cartCountSelectors = [
            // Standard selectors
            '.cart-count', 
            '.cart-count-bubble', 
            '[data-cart-count]',
            '.cart-count-bubble span', 
            '.site-header__cart-count span',
            '.cart-link__bubble-num', 
            '.cart-drawer-count',
            '.cart-items-count', 
            '.header__cart-count',
            '[data-cart-item-count]', 
            '.js-cart-count',
            
            // Theme-specific selectors
            '#CartCount', 
            '#CartItemCount', 
            '#cart-icon-bubble', 
            '.cart-count-number', 
            '.header-cart__count', 
            '.header-bar__cart-count', 
            '.CartCount',
            '.site-nav__cart-bubble', 
            '#cart-total',
            '.header-cart-btn .CartCount', 
            '.cart-badge', 
            '.cart-counter',
            
            // Shop-provided selector
            Config.get('slideCart.cartCountSelector')
          ].filter(Boolean); // Remove empty selectors
          
          // Find and update all count elements
          cartCountSelectors.forEach(selector => {
            var elements = document.querySelectorAll(selector);
            if (elements.length) {
              elements.forEach(el => {
                // Update text content for displayed counts
                if (el.tagName !== 'INPUT') {
                  el.textContent = count;
                }
                
                // Update data attributes
                el.setAttribute('data-cart-count', count);
                
                // Show/hide based on count
                if (count > 0) {
                  el.classList.remove('hide', 'hidden', 'is-hidden');
                  el.classList.add('has-items', 'visible');
                  
                  // Find parent bubble elements and ensure they're visible
                  var bubble = el.closest('.cart-count-bubble, .cart-link__bubble, .cart-bubble, .site-header__cart-count');
                  if (bubble) {
                    bubble.classList.remove('hide', 'hidden', 'is-hidden');
                    bubble.classList.add('has-items', 'visible', 'cart-link__bubble--visible');
                    bubble.style.display = '';
                  }
                } else {
                  // Some themes hide the count when zero
                  if (el.classList.contains('hide-count-zero') || el.closest('.hide-count-zero')) {
                    el.classList.add('hide', 'hidden');
                  }
                }
              });
            }
          });
          
          // Try to find and update custom cart count elements
          var customSelector = Config.get('slideCart.cartCountSelector');
          if (customSelector) {
            var customElements = document.querySelectorAll(customSelector);
            if (customElements.length) {
              customElements.forEach(el => {
                el.textContent = count;
              });
            }
          }
          
          // Also update any elements with cart count data attributes
          document.querySelectorAll('[data-cart-count]').forEach(el => {
            el.setAttribute('data-cart-count', count);
          });
          
          // Dispatch global events for theme compatibility
          document.dispatchEvent(new CustomEvent('cart:updated', {
            bubbles: true,
            detail: { cart: this.cart }
          }));
          
          // Ensure cart count bubble is visible if count > 0
          if (count > 0) {
            document.querySelectorAll('.cart-count-bubble, .cart-bubble').forEach(el => {
              el.style.display = 'block';
            });
          }
        } catch (e) {
          Utils.logError('Error updating cart counters', e);
        }
      },

      /**
       * Universal cart drawer opener
       * Works across different themes
       * @returns {boolean} Whether the cart was successfully opened
       */
      openCart: function() {
        Utils.log('Attempting to open cart drawer');
        
        let cartOpened = false;
        
        // Get theme name for theme-specific handling
        var themeName = Shopify?.theme?.name?.toLowerCase() || 
                        document.body.getAttribute('data-theme') || '';
        
        // 1. Try theme API-based methods first
        try {
          // Common theme functions
          if (window.theme) {
            if (typeof window.theme.openCartDrawer === 'function') {
              window.theme.openCartDrawer();
              cartOpened = true;
            } else if (typeof window.theme.showCartDrawer === 'function') {
              window.theme.showCartDrawer();
              cartOpened = true;
            } else if (typeof window.theme.showCart === 'function') {
              window.theme.showCart();
              cartOpened = true;
            } else if (typeof window.theme.RightDrawer?.open === 'function') {
              window.theme.RightDrawer.open();
              cartOpened = true;
            }
          }
          
          // Shopify functions
          if (!cartOpened && window.Shopify) {
            if (typeof window.Shopify.onCartUpdate === 'function') {
              window.Shopify.onCartUpdate(this.cart);
              cartOpened = true;
            } else if (typeof window.Shopify.showCart === 'function') {
              window.Shopify.showCart();
              cartOpened = true;
            }
          }
          
          // Ajax cart functions
          if (!cartOpened && window.ajaxCart) {
            if (typeof window.ajaxCart.load === 'function') {
              window.ajaxCart.load();
              cartOpened = true;
            } else if (typeof window.ajaxCart.showDrawer === 'function') {
              window.ajaxCart.showDrawer();
              cartOpened = true;
            }
          }
        } catch (e) {
          Utils.logWarn('Error opening cart via theme APIs', e);
        }
        
        // 2. Try DOM-based methods if APIs failed
        if (!cartOpened) {
          try {
            // Dawn and similar themes (custom elements)
            if (themeName.includes('dawn') || 
                document.querySelector('cart-drawer') ||
                document.querySelector('cart-notification')) {
              
              var cartDrawer = document.querySelector('cart-drawer');
              if (cartDrawer) {
                if (typeof cartDrawer.open === 'function') {
                  cartDrawer.open();
                  cartOpened = true;
                } else {
                  cartDrawer.removeAttribute('hidden');
                  cartDrawer.setAttribute('open', '');
                  cartOpened = true;
                }
              }
              
              // Try cart notification if drawer failed
              if (!cartOpened) {
                var cartNotification = document.querySelector('cart-notification');
                if (cartNotification) {
                  if (typeof cartNotification.open === 'function') {
                    cartNotification.open();
                    cartOpened = true;
                  } else if (cartNotification.hasAttribute('hidden')) {
                    cartNotification.removeAttribute('hidden');
                    cartOpened = true;
                  }
                }
              }
            }
            
            // For other themes - try common drawer selectors
            if (!cartOpened) {
              var drawerSelectors = [
                '#CartDrawer',
                '.cart-drawer',
                '.drawer--cart',
                '.mini-cart',
                '.minicart',
                '#MiniCart',
                '.header-cart.active'
              ];
              
              for (var selector of drawerSelectors) {
                var element = document.querySelector(selector);
                if (element) {
                  if (typeof element.open === 'function') {
                    element.open();
                  }
                  element.classList.add('active', 'is-active', 'is-visible', 'is-open', 'drawer--is-open');
                  element.style.display = 'block';
                  
                  // Add classes to body
                  document.body.classList.add('js-drawer-open', 'cart-drawer-open');
                  
                  cartOpened = true;
                  break;
                }
              }
            }
          } catch (e) {
            Utils.logWarn('Error opening cart via DOM', e);
          }
        }
        
        // 3. Try click event simulation on cart icons as last resort
        if (!cartOpened) {
          try {
            var cartTriggerSelectors = [
              'a[href="/cart"]',
              '.cart-link',
              '.cart-icon',
              '.header-cart',
              '#cart-icon-bubble',
              '.site-header__cart',
              '.cart-page-link'
            ];
            
            for (var selector of cartTriggerSelectors) {
              var cartTriggers = document.querySelectorAll(selector);
              
              if (cartTriggers.length) {
                // Click the first trigger
                cartTriggers[0].click();
                cartOpened = true;
                break;
              }
            }
          } catch (e) {
            Utils.logWarn('Error opening cart via click simulation', e);
          }
        }
        
        return cartOpened;
      },

      /**
       * Add an item to the cart
       * @param {number|string} variantId - Variant ID
       * @param {number} quantity - Quantity
       * @param {Object} properties - Line item properties
       * @returns {Promise<Object>} Updated cart
       */
      addToCart: function(variantId, quantity = 1, properties = {}) {
        return new Promise((resolve, reject) => {
          // Validate inputs
          if (!variantId) {
            return reject(new Error('Variant ID is required'));
          }
          
          // Parse quantity as integer
          quantity = parseInt(quantity, 10);
          if (isNaN(quantity) || quantity < 1) {
            quantity = 1;
          }
          
          // Ensure properties is an object
          if (!properties || typeof properties !== 'object') {
            properties = {};
          }
          
          // Add to operation queue
          this.operationQueue.push({
            type: 'add',
            data: { id: variantId, quantity, properties },
            resolve,
            reject
          });
          
          // Process queue
          this.processQueue();
        });
      },

      /**
       * Add multiple items to the cart
       * @param {Array} items - Items to add
       * @returns {Promise<Object>} Updated cart
       */
      addMultipleToCart: function(items) {
        return new Promise((resolve, reject) => {
          // Validate input
          if (!Array.isArray(items) || items.length === 0) {
            return reject(new Error('Items array is required'));
          }
          
          // Normalize item data
          var normalizedItems = items.map(item => ({
            id: parseInt(item.id, 10),
            quantity: parseInt(item.quantity, 10) || 1,
            properties: item.properties || {}
          }));
          
          // Add to operation queue
          this.operationQueue.push({
            type: 'add_multiple',
            data: { items: normalizedItems },
            resolve,
            reject
          });
          
          // Process queue
          this.processQueue();
        });
      },

      /**
       * Update cart item quantity
       * @param {number} lineItem - Line item index (1-based)
       * @param {number} quantity - New quantity
       * @returns {Promise<Object>} Updated cart
       */
      updateItem: function(lineItem, quantity) {
        return new Promise((resolve, reject) => {
          // Validate inputs
          if (isNaN(lineItem)) {
            return reject(new Error('Line item must be a number'));
          }
          
          // Parse quantity as integer
          quantity = parseInt(quantity, 10);
          if (isNaN(quantity)) {
            return reject(new Error('Quantity must be a number'));
          }
          
          // Add to operation queue
          this.operationQueue.push({
            type: 'update',
            data: { line: lineItem, quantity },
            resolve,
            reject
          });
          
          // Process queue
          this.processQueue();
        });
      },

      /**
       * Remove item from cart
       * @param {number} lineItem - Line item index (1-based)
       * @returns {Promise<Object>} Updated cart
       */
      removeItem: function(lineItem) {
        return this.updateItem(lineItem, 0);
      },

      /**
       * Update cart note
       * @param {string} note - Cart note
       * @returns {Promise<Object>} Updated cart
       */
      updateNote: function(note) {
        return new Promise((resolve, reject) => {
          // Add to operation queue
          this.operationQueue.push({
            type: 'update_note',
            data: { note },
            resolve,
            reject
          });
          
          // Process queue
          this.processQueue();
        });
      },

      /**
       * Apply discount code to cart
       * @param {string} code - Discount code
       * @returns {Promise<Object>} Result object
       */
      applyDiscount: function(code) {
        return new Promise((resolve, reject) => {
          if (!code) {
            return reject(new Error('Discount code is required'));
          }
          
          // Add to operation queue
          this.operationQueue.push({
            type: 'apply_discount',
            data: { code },
            resolve,
            reject
          });
          
          // Process queue
          this.processQueue();
        });
      },

      /**
       * Remove discount code from cart
       * @param {string} code - Discount code
       * @returns {Promise<Object>} Result object
       */
      removeDiscount: function(code) {
        return new Promise((resolve, reject) => {
          // Add to operation queue
          this.operationQueue.push({
            type: 'remove_discount',
            data: { code },
            resolve,
            reject
          });
          
          // Process queue
          this.processQueue();
        });
      },

      /**
       * Process operations queue
       */
      processQueue: function() {
        // If already processing or queue is empty, return
        if (this.processingOperation || this.operationQueue.length === 0) {
          return;
        }
        
        // Set processing flag
        this.processingOperation = true;
        
        // Get next operation
        var operation = this.operationQueue.shift();
        
        // Process based on type
        switch (operation.type) {
          case 'add':
            this.processAddToCart(operation);
            break;
          case 'add_multiple':
            this.processAddMultipleToCart(operation);
            break;
          case 'update':
            this.processUpdateItem(operation);
            break;
          case 'update_note':
            this.processUpdateNote(operation);
            break;
          case 'apply_discount':
            this.processApplyDiscount(operation);
            break;
          case 'remove_discount':
            this.processRemoveDiscount(operation);
            break;
          default:
            // Unknown operation, resolve with current cart
            operation.resolve(this.cart);
            this.processingOperation = false;
            this.processQueue();
        }
      },

      /**
       * Process add to cart operation
       * @param {Object} operation - Operation object
       */
      processAddToCart: function(operation) {
        var { id, quantity, properties } = operation.data;
        
        fetch('/cart/add.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            id,
            quantity,
            properties
          })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to add item to cart: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          // Refresh cart
          return this.refreshCart().then(() => data);
        })
        .then(data => {
          // Resolve with added item data
          operation.resolve(data);
          
          // Track event
          Carty.trigger('cart:item:added', {
            item: data,
            variant_id: id, 
            quantity
          });
        })
        .catch(error => {
          Utils.logError('Error adding item to cart', error);
          operation.reject(error);
        })
        .finally(() => {
          // Reset processing flag and process next operation
          this.processingOperation = false;
          this.processQueue();
        });
      },

      /**
       * Process add multiple items to cart operation
       * @param {Object} operation - Operation object
       */
      processAddMultipleToCart: function(operation) {
        var { items } = operation.data;
        
        fetch('/cart/add.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ items })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to add items to cart: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          // Refresh cart
          return this.refreshCart().then(() => data);
        })
        .then(data => {
          // Resolve with added items data
          operation.resolve(data);
          
          // Track event
          Carty.trigger('cart:items:added', {
            items: data.items
          });
        })
        .catch(error => {
          Utils.logError('Error adding multiple items to cart', error);
          
          // Try sequential add as fallback
          this.sequentialAddFallback(items)
            .then(result => {
              operation.resolve(result);
            })
            .catch(error => {
              operation.reject(error);
            });
        })
        .finally(() => {
          // Reset processing flag and process next operation
          this.processingOperation = false;
          this.processQueue();
        });
      },

      /**
       * Sequential add fallback for multiple items
       * @param {Array} items - Items to add
       * @returns {Promise<Object>} Result
       */
      sequentialAddFallback: function(items) {
        Utils.log('Using sequential add fallback');
        
        let completed = 0;
        let hasErrors = false;
        
        // Add items one by one
        var addSequentially = (index) => {
          if (index >= items.length) {
            // All items processed
            return this.refreshCart().then(() => ({
              items_added: completed,
              has_errors: hasErrors
            }));
          }
          
          var item = items[index];
          
          // Add item
          return fetch('/cart/add.js', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
              id: item.id,
              quantity: item.quantity,
              properties: item.properties
            })
          })
          .then(response => {
            if (!response.ok) {
              hasErrors = true;
              return null;
            }
            completed++;
            return response.json();
          })
          .catch(() => {
            hasErrors = true;
            return null;
          })
          .then(() => {
            // Process next item
            return addSequentially(index + 1);
          });
        };
        
        // Start with first item
        return addSequentially(0);
      },

      /**
       * Process update item operation
       * @param {Object} operation - Operation object
       */
      processUpdateItem: function(operation) {
        var { line, quantity } = operation.data;
        
        fetch('/cart/change.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            line,
            quantity
          })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to update item: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then(cartData => {
          // Process and store cart data
          this.cart = this.processCartData(cartData);
          
          // Trigger events
          Carty.trigger('cart:updated', { cart: this.cart });
          
          if (quantity === 0) {
            Carty.trigger('cart:item:removed', { line });
          } else {
            Carty.trigger('cart:item:updated', { line, quantity });
          }
          
          // Resolve with updated cart
          operation.resolve(this.cart);
        })
        .catch(error => {
          Utils.logError('Error updating item', error);
          operation.reject(error);
        })
        .finally(() => {
          // Reset processing flag and process next operation
          this.processingOperation = false;
          this.processQueue();
        });
      },

      /**
       * Process update note operation
       * @param {Object} operation - Operation object
       */
      processUpdateNote: function(operation) {
        var { note } = operation.data;
        
        fetch('/cart/update.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ note })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to update note: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then(cartData => {
          // Process and store cart data
          this.cart = this.processCartData(cartData);
          
          // Trigger events
          Carty.trigger('cart:updated', { cart: this.cart });
          Carty.trigger('cart:note:updated', { note });
          
          // Resolve with updated cart
          operation.resolve(this.cart);
        })
        .catch(error => {
          Utils.logError('Error updating note', error);
          operation.reject(error);
        })
        .finally(() => {
          // Reset processing flag and process next operation
          this.processingOperation = false;
          this.processQueue();
        });
      },

      /**
       * Process apply discount operation
       * @param {Object} operation - Operation object
       */
      processApplyDiscount: function(operation) {
        var { code } = operation.data;
        
        // Check if already applied
        if (this.activeDiscountCodes.some(discount => discount.code.toLowerCase() === code.toLowerCase())) {
          operation.resolve({
            success: false,
            message: 'Discount code already applied'
          });
          
          this.processingOperation = false;
          this.processQueue();
          return;
        }
        
        // Prepare checkout URL with discount code
        var checkoutUrl = `/discount/${encodeURIComponent(code)}?redirect=/checkout`;
        
        // Fetch discount page to apply code
        fetch(checkoutUrl, {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(response => {
          // If redirected or success, discount is valid
          if (response.redirected || response.ok) {
            // Set cookie for discount code
            document.cookie = `discount_code=${encodeURIComponent(code)};path=/`;
            
            // Add to active codes
            this.activeDiscountCodes.push({
              code,
              type: 'discount_code',
              value: null,
              valueType: null
            });
            
            // Refresh cart to show updated discounts
            return this.refreshCart().then(cart => ({
              success: true,
              message: 'Discount code applied',
              code,
              cart
            }));
          } else {
            return {
              success: false,
              message: 'Invalid discount code'
            };
          }
        })
        .then(result => {
          // Resolve with result
          operation.resolve(result);
          
          if (result.success) {
            Carty.trigger('cart:discount:applied', { code });
          }
        })
        .catch(error => {
          Utils.logError('Error applying discount code', error);
          operation.reject(error);
        })
        .finally(() => {
          // Reset processing flag and process next operation
          this.processingOperation = false;
          this.processQueue();
        });
      },

      /**
       * Process remove discount operation
       * @param {Object} operation - Operation object
       */
      processRemoveDiscount: function(operation) {
        var { code } = operation.data;
        
        // Clear discount cookie
        document.cookie = `discount_code=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT`;
        
        // Remove from active codes
        this.activeDiscountCodes = this.activeDiscountCodes.filter(discount => 
          discount.code.toLowerCase() !== code.toLowerCase());
        
        // Create checkout URL to clear discounts
        var checkoutUrl = '/checkout';
        
        // Fetch checkout to clear discounts
        fetch(checkoutUrl, {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(() => {
          // Refresh cart
          return this.refreshCart().then(cart => ({
            success: true,
            message: 'Discount code removed',
            cart
          }));
        })
        .then(result => {
          // Resolve with result
          operation.resolve(result);
          
          if (result.success) {
            Carty.trigger('cart:discount:removed', { code });
          }
        })
        .catch(error => {
          Utils.logError('Error removing discount code', error);
          operation.reject(error);
        })
        .finally(() => {
          // Reset processing flag and process next operation
          this.processingOperation = false;
          this.processQueue();
        });
      },

      /**
       * Get active discount codes
       * @returns {Array} Active discount codes
       */
      getActiveDiscounts: function() {
        return [...this.activeDiscountCodes];
      },

      /**
       * Clear cart
       * @returns {Promise<Object>} Empty cart
       */
      clearCart: function() {
        return fetch('/cart/clear.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to clear cart: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then(cartData => {
          // Process and store cart data
          this.cart = this.processCartData(cartData);
          
          // Trigger events
          Carty.trigger('cart:updated', { cart: this.cart });
          Carty.trigger('cart:cleared');
          
          return this.cart;
        });
      }
    };

    // Register the module
    Carty.registerModule('cart', CartService);
  });
})();

/**
 * Carty - Product Module
 * Handles product data fetching, caching, and operations
 * Version 5.0.0
 */
(function() {
  'use strict';

  // Wait for dependencies
  Carty.ready(['utils', 'config', 'dom'], function(Utils, Config, DOM) {
    // Cache management
    var productCache = {};
    var fetchPromises = {};
    var recentlyViewed = [];
    var recentlyViewedMax = 20;
    var prefetchQueue = [];

    /**
     * Product module
     */
    var Product = {
      /**
       * Module version
       */
      version: '5.0.0',

      /**
       * Initialize module
       * @returns {Promise} Initialization promise
       */
      init: function() {
        Utils.log('Product module initializing');
        
        // Load session data from storage
        this.loadSessionData();
        
        // Initialize user intent tracking
        this.initIntentTracking();
        
        // Initialize search term tracking
        this.initSearchTermTracking();
        
        return Promise.resolve();
      },

      /**
       * Load session data from storage
       */
      loadSessionData: function() {
        try {
          // Load recently viewed products
          var storedRecentlyViewed = Utils.storage.get('recently_viewed', []);
          if (Array.isArray(storedRecentlyViewed)) {
            recentlyViewed.push(...storedRecentlyViewed);
            
            // Remove duplicates and limit length
            var uniqueIds = [...new Set(recentlyViewed)];
            recentlyViewed.length = 0;
            recentlyViewed.push(...uniqueIds.slice(0, recentlyViewedMax));
          }
          
          // Load user session intent
          this.sessionIntent = Utils.storage.get('session_intent', {
            currentSessionViews: [],
            categoryInterests: {},
            attributeInterests: {},
            currentIntent: {
              primaryCategory: null,
              priceRange: { min: 0, max: 0, avg: 0 },
              preferredVendors: [],
              keyAttributes: [],
              searchTerms: []
            },
            sessionStart: Date.now(),
            maxTrackedItems: 10
          });
          
          // Check if session has expired (30 minutes)
          var sessionTimeout = 30 * 60 * 1000; // 30 minutes
          if (Date.now() - this.sessionIntent.sessionStart > sessionTimeout) {
            this.resetSessionIntent();
          }
        } catch (e) {
          Utils.logError('Error loading session data', e);
          this.resetSessionIntent();
        }
      },

      /**
       * Reset session intent data
       */
      resetSessionIntent: function() {
        this.sessionIntent = {
          currentSessionViews: [],
          categoryInterests: {},
          attributeInterests: {},
          currentIntent: {
            primaryCategory: null,
            priceRange: { min: 0, max: 0, avg: 0 },
            preferredVendors: [],
            keyAttributes: [],
            searchTerms: []
          },
          sessionStart: Date.now(),
          maxTrackedItems: 10
        };
        
        Utils.storage.set('session_intent', this.sessionIntent);
      },

      /**
       * Save session data to storage
       */
      saveSessionData: function() {
        try {
          // Save recently viewed products
          Utils.storage.set('recently_viewed', recentlyViewed);
          
          // Save user session intent
          Utils.storage.set('session_intent', this.sessionIntent);
          
          // Update last activity
          Utils.storage.set('last_activity', Date.now());
        } catch (e) {
          Utils.logError('Error saving session data', e);
        }
      },

      /**
       * Initialize user intent tracking
       */
      initIntentTracking: function() {
        // Track the current page if it's a product page
        var isProductPage = window.location.pathname.includes('/products/');
        if (isProductPage) {
          // Try to get product data from page
          try {
            // Check various places where Shopify stores product JSON
            if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.product) {
              var product = window.ShopifyAnalytics.meta.product;
              this.trackCurrentIntent(product);
            } 
            // Alternative method looking for product JSON
            else if (document.querySelector('script[type="application/json"][data-product-json]')) {
              var productJson = document.querySelector('script[type="application/json"][data-product-json]').textContent;
              var product = JSON.parse(productJson);
              this.trackCurrentIntent(product);
            }
            // Try to find product JSON in other locations
            else {
              var scripts = document.querySelectorAll('script[type="application/json"]');
              for (var script of scripts) {
                try {
                  var json = JSON.parse(script.textContent);
                  if (json && json.product && json.product.id) {
                    this.trackCurrentIntent(json.product);
                    break;
                  }
                } catch (e) {
                  // Ignore parsing errors for non-product scripts
                }
              }
            }
          } catch (e) {
            Utils.logWarn('Error tracking current product page: ' + e.message);
          }
        }
        
        // Set up detection for product views via clicks
        document.addEventListener('click', event => {
          var productLink = DOM.closest(event.target, 'a[href*="/products/"]');
          if (productLink) {
            var handle = this.getHandleFromUrl(productLink.href);
            if (handle) {
              // If product exists in cache, track it
              var cachedProduct = this.getCachedProduct(handle);
              if (cachedProduct) {
                this.trackCurrentIntent(cachedProduct);
              }
            }
          }
        });
      },

      /**
       * Initialize search term tracking
       */
      initSearchTermTracking: function() {
        try {
          // Track query parameters when page loads
          var urlParams = new URLSearchParams(window.location.search);
          var searchQuery = urlParams.get('q');
          if (searchQuery) {
            this.trackSearchTerm(searchQuery);
          }
          
          // Also look for search input changes
          var searchInputs = document.querySelectorAll('input[type="search"], input[name="q"], .search-input');
          searchInputs.forEach(input => {
            DOM.on(input, 'change', () => {
              if (input.value && input.value.length > 2) {
                this.trackSearchTerm(input.value);
              }
            });
          });
          
          // Hook into search form submissions
          var searchForms = document.querySelectorAll('form[action*="/search"]');
          searchForms.forEach(form => {
            DOM.on(form, 'submit', () => {
              var input = form.querySelector('input[type="search"], input[name="q"]');
              if (input && input.value && input.value.length > 2) {
                this.trackSearchTerm(input.value);
              }
            });
          });
          
          Utils.log('Search term tracking initialized');
        } catch (e) {
          Utils.logWarn('Error initializing search tracking: ' + e.message);
        }
      },

      /**
       * Track search term for intent analysis
       * @param {string} term - Search term to track
       */
      trackSearchTerm: function(term) {
        if (!term || typeof term !== 'string') return;
        
        try {
          // Clean the term
          var cleanTerm = term.toLowerCase().trim();
          if (cleanTerm.length < 2) return;
          
          // Add to search terms if not already present
          if (!this.sessionIntent.currentIntent.searchTerms.includes(cleanTerm)) {
            this.sessionIntent.currentIntent.searchTerms.unshift(cleanTerm);
            
            // Limit number of terms
            if (this.sessionIntent.currentIntent.searchTerms.length > 5) {
              this.sessionIntent.currentIntent.searchTerms.pop();
            }
            
            // Save updated session data
            this.saveSessionData();
            
            Utils.log(`Tracked search term: ${cleanTerm}`);
          }
        } catch (e) {
          Utils.logWarn('Error tracking search term: ' + e.message);
        }
      },

      /**
       * Track product view for intent analysis
       * @param {Object} product - Product data to track
       */
      trackCurrentIntent: function(product) {
        if (!product || !product.id) return;
        
        try {
          var productId = String(product.id);
          
          // Add to recently viewed
          if (!recentlyViewed.includes(productId)) {
            recentlyViewed.unshift(productId);
            
            // Keep limited
            if (recentlyViewed.length > recentlyViewedMax) {
              recentlyViewed.pop();
            }
          }
          
          // Check if we've already tracked this product in this session
          var existingIndex = this.sessionIntent.currentSessionViews.findIndex(
            item => String(item.id) === productId
          );
          
          if (existingIndex >= 0) {
            // Product already viewed in this session - update and move to front
            var existingView = this.sessionIntent.currentSessionViews[existingIndex];
            existingView.viewCount = (existingView.viewCount || 1) + 1;
            existingView.lastViewed = Date.now();
            
            // Move to front of array
            this.sessionIntent.currentSessionViews.splice(existingIndex, 1);
            this.sessionIntent.currentSessionViews.unshift(existingView);
          } else {
            // New product view - add to front of array
            this.sessionIntent.currentSessionViews.unshift({
              id: productId,
              type: product.product_type || product.type || null,
              title: product.title || null,
              vendor: product.vendor || null,
              tags: product.tags || [],
              price: this.normalizePrice(product.price || this.getVariantPrice(product) || 0),
              viewCount: 1,
              firstViewed: Date.now(),
              lastViewed: Date.now()
            });
            
            // Trim the list if needed
            if (this.sessionIntent.currentSessionViews.length > this.sessionIntent.maxTrackedItems) {
              this.sessionIntent.currentSessionViews.pop();
            }
          }
          
          // Update category interests
          this.updateCategoryInterests(product);
          
          // Update vendor interests
          this.updateVendorInterests(product);
          
          // Update attribute interests
          this.updateAttributeInterests(product);
          
          // Update price range
          this.updatePriceRange(product);
          
          // Analyze and update current intent
          this.analyzeCurrentIntent();
          
          // Save updated session data
          this.saveSessionData();
          
          Utils.log(`Tracked product: ${product.title} (${productId})`);
        } catch (e) {
          Utils.logError('Error tracking product intent', e);
        }
      },

      /**
       * Update category interests
       * @param {Object} product - Product data
       */
      updateCategoryInterests: function(product) {
        if (product.product_type || product.type) {
          var type = (product.product_type || product.type).toLowerCase();
          this.sessionIntent.categoryInterests[type] = 
            (this.sessionIntent.categoryInterests[type] || 0) + 1;
        }
      },

      /**
       * Update vendor interests
       * @param {Object} product - Product data
       */
      updateVendorInterests: function(product) {
        if (product.vendor) {
          var vendor = product.vendor.toLowerCase();
          
          // Track in current intent
          if (!this.sessionIntent.currentIntent.preferredVendors.includes(vendor)) {
            this.sessionIntent.currentIntent.preferredVendors.push(vendor);
            
            // Keep only top 3 vendors
            if (this.sessionIntent.currentIntent.preferredVendors.length > 3) {
              this.sessionIntent.currentIntent.preferredVendors.pop();
            }
          }
        }
      },

      /**
       * Update attribute interests (from tags)
       * @param {Object} product - Product data
       */
      updateAttributeInterests: function(product) {
        if (product.tags && Array.isArray(product.tags)) {
          product.tags.forEach(tag => {
            var normalizedTag = typeof tag === 'string' ? tag.toLowerCase() : String(tag).toLowerCase();
            this.sessionIntent.attributeInterests[normalizedTag] = 
              (this.sessionIntent.attributeInterests[normalizedTag] || 0) + 1;
              
            // Capture key attributes for intent
            var importantAttributes = [
              'material', 'style', 'size', 'color', 'fabric', 
              'occasion', 'season', 'feature', 'benefit'
            ];
            
            for (var attr of importantAttributes) {
              if (normalizedTag.includes(attr) && 
                  !this.sessionIntent.currentIntent.keyAttributes.includes(normalizedTag)) {
                this.sessionIntent.currentIntent.keyAttributes.push(normalizedTag);
              }
            }
          });
        }
      },

      /**
       * Update price range interests
       * @param {Object} product - Product data
       */
      updatePriceRange: function(product) {
        var price = this.normalizePrice(product.price || this.getVariantPrice(product) || 0);
        
        if (price > 0) {
          var currentRange = this.sessionIntent.currentIntent.priceRange;
          
          // Initialize price range if this is the first product
          if (currentRange.min === 0 || price < currentRange.min) {
            currentRange.min = price;
          }
          
          if (currentRange.max === 0 || price > currentRange.max) {
            currentRange.max = price;
          }
          
          // Update average price
          var prices = this.sessionIntent.currentSessionViews
            .map(item => item.price)
            .filter(price => price > 0);
            
          if (prices.length > 0) {
            currentRange.avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
          }
        }
      },

      /**
       * Analyze current shopping intent
       */
      analyzeCurrentIntent: function() {
        try {
          // Determine primary category of interest
          var categories = this.sessionIntent.categoryInterests;
          let primaryCategory = null;
          let maxCount = 0;
          
          Object.entries(categories).forEach(([category, count]) => {
            if (count > maxCount) {
              maxCount = count;
              primaryCategory = category;
            }
          });
          
          this.sessionIntent.currentIntent.primaryCategory = primaryCategory;
          
          // Prune key attributes to most relevant
          if (this.sessionIntent.currentIntent.keyAttributes.length > 5) {
            // Sort by how frequently they appear
            var sortedAttributes = this.sessionIntent.currentIntent.keyAttributes
              .map(attr => ({
                attr,
                count: this.sessionIntent.attributeInterests[attr] || 0
              }))
              .sort((a, b) => b.count - a.count);
              
            // Keep only top 5
            this.sessionIntent.currentIntent.keyAttributes = 
              sortedAttributes.slice(0, 5).map(item => item.attr);
          }
          
          Utils.log('Current intent analyzed');
        } catch (e) {
          Utils.logWarn('Error analyzing intent: ' + e.message);
        }
      },

      /**
       * Get current shopping intent
       * @returns {Object} Current intent data
       */
      getCurrentIntent: function() {
        return Utils.deepClone(this.sessionIntent.currentIntent);
      },

      /**
       * Score a product based on current intent
       * @param {Object} product - Product to score
       * @returns {number} Relevance score
       */
      scoreProductByIntent: function(product) {
        if (!product) return 0;
        
        let score = 0;
        var intent = this.sessionIntent.currentIntent;
        
        // 1. Category match (highest priority)
        if (intent.primaryCategory && 
            (product.product_type || product.type) && 
            (product.product_type || product.type).toLowerCase() === intent.primaryCategory) {
          score += 20;
        }
        
        // 2. Vendor match
        if (product.vendor && 
            intent.preferredVendors.includes(product.vendor.toLowerCase())) {
          score += 15;
        }
        
        // 3. Price range compatibility
        var productPrice = this.normalizePrice(product.price || this.getVariantPrice(product) || 0);
        if (productPrice > 0 && intent.priceRange.avg > 0) {
          var ratio = productPrice / intent.priceRange.avg;
          
          // Prefer products in a similar price range
          if (ratio >= 0.7 && ratio <= 1.3) {
            score += 15; // Within 30% of average viewed price
          } else if (ratio >= 0.5 && ratio <= 1.5) {
            score += 10; // Within 50% of average viewed price
          } else if (ratio >= 0.3 && ratio <= 1.7) {
            score += 5;  // Within 70% of average viewed price
          }
        }
        
        // 4. Attribute matches (tags)
        var productTags = (product.tags || []).map(tag => 
          typeof tag === 'string' ? tag.toLowerCase() : String(tag).toLowerCase()
        );
        let attributeMatches = 0;
        
        intent.keyAttributes.forEach(attr => {
          if (productTags.some(tag => tag.includes(attr) || attr.includes(tag))) {
            attributeMatches++;
          }
        });
        
        score += attributeMatches * 8;
        
        // 5. Search term relevance
        if (intent.searchTerms.length > 0 && product.title) {
          var productTitle = product.title.toLowerCase();
          let searchTermMatches = 0;
          
          intent.searchTerms.forEach((term, index) => {
            if (productTitle.includes(term)) {
              // More recent searches get higher weight
              var recencyWeight = 1 - (index * 0.15); // 1.0, 0.85, 0.7, 0.55, 0.4
              searchTermMatches += 10 * recencyWeight;
            }
          });
          
          score += searchTermMatches;
        }
        
        return score;
      },

      /**
       * Sort products by relevance to current intent
       * @param {Array} products - Products to sort
       * @returns {Array} Sorted products
       */
      sortProductsByRelevance: function(products) {
        if (!products || !Array.isArray(products)) return [];
        
        // Score each product
        var scoredProducts = products.map(product => {
          return {
            ...product,
            relevanceScore: this.scoreProductByIntent(product)
          };
        });
        
        // Sort by score (highest first)
        return scoredProducts.sort((a, b) => b.relevanceScore - a.relevanceScore);
      },

      /**
       * Get variant price (helper)
       * @param {Object} product - Product data
       * @returns {number|null} Price or null
       */
      getVariantPrice: function(product) {
        // Try to get price from first variant
        if (product.variants && product.variants.length > 0 && product.variants[0].price) {
          return product.variants[0].price;
        }
        
        // Try to get price from selected variant
        if (product.selected_variant && product.selected_variant.price) {
          return product.selected_variant.price;
        }
        
        return null;
      },

      /**
       * Normalize price value, handling different Shopify formats
       * @param {number|string} price - Price to normalize
       * @returns {number} Normalized price
       */
      normalizePrice: function(price) {
        if (typeof price === 'undefined' || price === null) return 0;
        
        // Convert to number if it's a string
        if (typeof price === 'string') {
          price = parseFloat(price.replace(/[^\d.-]/g, ''));
        }
        
        // Handle Shopify's cents format (price / 100)
        if (price > 0) {
          var needsDivision = price > 1000 && !String(price).includes('.');
          return needsDivision ? price / 100 : price;
        }
        
        return 0;
      },

      /**
       * Fetch product by handle
       * @param {string} handle - Product handle
       * @returns {Promise<Object>} Product data
       */
      fetchProduct: function(handle) {
        // Skip if no handle
        if (!handle) {
          return Promise.reject(new Error('No product handle provided'));
        }
        
        // Check cache first
        var cachedProduct = this.getCachedProduct(handle);
        if (cachedProduct) {
          // Track the view even for cached products
          this.trackCurrentIntent(cachedProduct);
          return Promise.resolve(cachedProduct);
        }
        
        // Check if already fetching this product
        if (fetchPromises[handle]) {
          return fetchPromises[handle];
        }
        
        // Create promise for this fetch
        var fetchPromise = fetch('/products/' + handle + '.js')
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch product: ${response.status}`);
            }
            return response.json();
          })
          .then(productData => {
            // Fix any issues with the product data
            var normalizedProduct = this.normalizeProductData(productData);
            
            // Cache the product data
            this.cacheProduct(handle, normalizedProduct);
            
            // Track this product view
            this.trackCurrentIntent(normalizedProduct);
            
            // Remove from fetch promises
            delete fetchPromises[handle];
            
            return normalizedProduct;
          })
          .catch(error => {
            // Clean up fetch promise on error
            delete fetchPromises[handle];
            Utils.logError(`Error fetching product ${handle}`, error);
            throw error;
          });
        
        // Store promise to prevent duplicate requests
        fetchPromises[handle] = fetchPromise;
        
        return fetchPromise;
      },

      /**
       * Fetch products by collection handle
       * @param {string} handle - Collection handle
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Collection products
       */
      fetchCollection: function(handle, limit = 8) {
        // Skip if no handle
        if (!handle) {
          return Promise.reject(new Error('No collection handle provided'));
        }
        
        return fetch(`/collections/${handle}/products.json?limit=${limit}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch collection: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            if (!data || !data.products || !Array.isArray(data.products)) {
              return [];
            }
            
            // Fix any issues with the product data
            var normalizedProducts = data.products.map(product => 
              this.normalizeProductData(product)
            );
            
            // Cache the products
            normalizedProducts.forEach(product => {
              if (product.handle) {
                this.cacheProduct(product.handle, product);
              }
            });
            
            return normalizedProducts;
          })
          .catch(error => {
            Utils.logError(`Error fetching collection ${handle}`, error);
            throw error;
          });
      },

      /**
       * Fetch random products
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Random products
       */
      fetchRandomProducts: function(limit = 4) {
        Utils.log('Fetching random products');
        
        // Try multiple collection endpoints to find products
        var collectionsToTry = ['featured', 'frontpage', 'all'];
        
        // Function to try each collection in sequence
        var tryNextCollection = (index = 0) => {
          if (index >= collectionsToTry.length) {
            return Promise.resolve([]);
          }
          
          var collection = collectionsToTry[index];
          
          return this.fetchCollection(collection, limit * 2)
            .then(products => {
              if (products.length > 0) {
                return products.slice(0, limit);
              }
              
              // Try next collection
              return tryNextCollection(index + 1);
            })
            .catch(() => {
              // Try next collection on error
              return tryNextCollection(index + 1);
            });
        };
        
        // Start with the first collection
        return tryNextCollection();
      },

      /**
       * Fetch recommended products
       * @param {string|number} productId - Source product ID
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Recommended products
       */
      fetchRecommendedProducts: function(productId, limit = 4) {
        // Skip if no product ID
        if (!productId) {
          return Promise.reject(new Error('No product ID provided'));
        }
        
        return fetch(`/recommendations/products.json?product_id=${productId}&limit=${limit}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch recommendations: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            if (!data || !data.products || !Array.isArray(data.products)) {
              return [];
            }
            
            // Normalize and cache products
            var normalizedProducts = data.products.map(product => 
              this.normalizeProductData(product)
            );
            
            // Cache the products
            normalizedProducts.forEach(product => {
              if (product.handle) {
                this.cacheProduct(product.handle, product);
              }
            });
            
            return normalizedProducts;
          })
          .catch(error => {
            Utils.logError(`Error fetching recommendations for product ${productId}`, error);
            
            // Fall back to random products
            return this.fetchRandomProducts(limit);
          });
      },

      /**
       * Prefetch products for performance optimization
       * @param {Array<string>} handles - Product handles
       */
      prefetchProducts: function(handles) {
        if (!handles || !Array.isArray(handles) || handles.length === 0) return;
        
        // Skip if fast loading is disabled
        if (!Config.get('fastLoading')) return;
        
        // Limit number of prefetches
        var prefetchLimit = Config.get('performance.prefetchLimit', 5);
        var handlesToPrefetch = handles.slice(0, prefetchLimit);
        
        // Queue prefetch requests to prioritize visible content
        handlesToPrefetch.forEach(handle => {
          if (!this.getCachedProduct(handle) && !fetchPromises[handle]) {
            prefetchQueue.push(handle);
          }
        });
        
        // Process prefetch queue with a small delay
        setTimeout(() => this.processPrefetchQueue(), 500);
      },

      /**
       * Process the prefetch queue
       */
      processPrefetchQueue: function() {
        if (prefetchQueue.length === 0) return;
        
        // Take one handle from the queue
        var handle = prefetchQueue.shift();
        
        // Skip if already cached or fetching
        if (this.getCachedProduct(handle) || fetchPromises[handle]) {
          // Continue with next item
          this.processPrefetchQueue();
          return;
        }
        
        // Fetch the product
        fetch('/products/' + handle + '.js')
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to prefetch product: ${response.status}`);
            }
            return response.json();
          })
          .then(productData => {
            // Normalize and cache the product
            var normalizedProduct = this.normalizeProductData(productData);
            this.cacheProduct(handle, normalizedProduct);
            Utils.log(`Prefetched product: ${handle}`);
          })
          .catch(error => {
            Utils.logWarn(`Error prefetching product ${handle}: ${error.message}`);
          })
          .finally(() => {
            // Continue with next item with a small delay
            setTimeout(() => this.processPrefetchQueue(), 100);
          });
      },

      /**
       * Get a product from cache
       * @param {string} handle - Product handle
       * @returns {Object|null} Cached product or null
       */
      getCachedProduct: function(handle) {
        if (!handle) return null;
        
        // Check expiry
        var cacheItem = productCache[handle];
        if (!cacheItem) return null;
        
        var cacheExpiry = Config.get('performance.cacheExpiry', 1800) * 1000; // Convert to ms
        
        if (Date.now() - cacheItem.timestamp > cacheExpiry) {
          // Cache expired
          delete productCache[handle];
          return null;
        }
        
        return cacheItem.data;
      },

      /**
       * Cache a product
       * @param {string} handle - Product handle
       * @param {Object} data - Product data
       */
      cacheProduct: function(handle, data) {
        if (!handle || !data) return;
        
        productCache[handle] = {
          timestamp: Date.now(),
          data: data
        };
      },

      /**
       * Clear product cache
       */
      clearCache: function() {
        // Reset cache
        Object.keys(productCache).forEach(key => {
          delete productCache[key];
        });
      },

      /**
       * Get product handle from URL
       * @param {string} url - Product URL
       * @returns {string|null} Product handle or null
       */
      getHandleFromUrl: function(url) {
        if (!url) return null;
        
        try {
          // Parse URL to get pathname
          let pathname;
          
          if (url.includes('/products/')) {
            // Extract pathname part
            var urlParts = url.split('/products/');
            pathname = '/products/' + urlParts[1];
          } else {
            // Not a product URL
            return null;
          }
          
          // Remove query string and hash
          pathname = pathname.split(/[?#]/)[0];
          
          // Extract handle from pathname
          var match = pathname.match(/\/products\/([a-zA-Z0-9-_.%]+)/);
          
          if (match && match[1]) {
            return decodeURIComponent(match[1]);
          }
        } catch (e) {
          Utils.logWarn('Error extracting handle from URL: ' + e.message);
        }
        
        return null;
      },

      /**
       * Normalize product data to ensure consistent structure
       * @param {Object} product - Product data to normalize
       * @returns {Object} Normalized product data
       */
      normalizeProductData: function(product) {
        if (!product) return {};
        
        try {
          // Clone the product to avoid modifying the original
          var normalizedProduct = Utils.deepClone(product);
          
          // Ensure ID is a string
          if (normalizedProduct.id) {
            normalizedProduct.id = String(normalizedProduct.id);
          }
          
          // Fix price fields
          if (normalizedProduct.price) {
            normalizedProduct.price = this.normalizePrice(normalizedProduct.price);
          }
          
          if (normalizedProduct.compare_at_price) {
            normalizedProduct.compare_at_price = this.normalizePrice(normalizedProduct.compare_at_price);
          }
          
          // Ensure variants are properly formatted
          if (normalizedProduct.variants && Array.isArray(normalizedProduct.variants)) {
            normalizedProduct.variants = normalizedProduct.variants.map(variant => {
              var normalizedVariant = Utils.deepClone(variant);
              
              // Ensure ID is a string
              if (normalizedVariant.id) {
                normalizedVariant.id = String(normalizedVariant.id);
              }
              
              // Fix price fields
              if (normalizedVariant.price) {
                normalizedVariant.price = this.normalizePrice(normalizedVariant.price);
              }
              
              if (normalizedVariant.compare_at_price) {
                normalizedVariant.compare_at_price = this.normalizePrice(normalizedVariant.compare_at_price);
              }
              
              return normalizedVariant;
            });
          }
          
          // Ensure tags is an array
          if (!normalizedProduct.tags) {
            normalizedProduct.tags = [];
          } else if (!Array.isArray(normalizedProduct.tags)) {
            normalizedProduct.tags = String(normalizedProduct.tags).split(',');
          }
          
          // Make sure images are properly formatted
          if (normalizedProduct.featured_image && typeof normalizedProduct.featured_image === 'string') {
            normalizedProduct.featured_image = {
              src: normalizedProduct.featured_image
            };
          }
          
          // Make sure product_type is set
          if (!normalizedProduct.product_type && normalizedProduct.type) {
            normalizedProduct.product_type = normalizedProduct.type;
          }
          
          return normalizedProduct;
        } catch (e) {
          Utils.logError('Error normalizing product data', e);
          return product; // Return original if normalization fails
        }
      },

      /**
       * Get default variant for a product
       * @param {Object} product - Product data
       * @returns {Object|null} Default variant or null
       */
      getDefaultVariant: function(product) {
        if (!product || !product.variants || product.variants.length === 0) {
          return null;
        }
        
        // First try to find a variant marked as selected
        if (product.selected_variant_id) {
          var selectedVariant = product.variants.find(v => 
            String(v.id) === String(product.selected_variant_id)
          );
          if (selectedVariant) return selectedVariant;
        }
        
        // Next, try to find the "Default Title" variant
        var defaultVariant = product.variants.find(v =>
          v.title === 'Default Title' || v.title === 'Default' || v.title === product.title
        );
        
        if (defaultVariant) return defaultVariant;
        
        // Finally, just return the first variant
        return product.variants[0];
      },

      /**
       * Get first available variant for a product
       * @param {Object} product - Product data
       * @returns {Object|null} First available variant or null
       */
      getFirstAvailableVariant: function(product) {
        if (!product || !product.variants) {
          return null;
        }
        
        // Find first available variant
        return product.variants.find(variant => variant.available) || null;
      },

      /**
       * Find variant by ID
       * @param {Object} product - Product data
       * @param {string|number} variantId - Variant ID
       * @returns {Object|null} Found variant or null
       */
      findVariantById: function(product, variantId) {
        if (!product || !product.variants || !variantId) {
          return null;
        }
        
        // Convert IDs to strings for comparison
        var id = String(variantId);
        
        return product.variants.find(variant => String(variant.id) === id) || null;
      },

      /**
       * Find variant by selected options
       * @param {Object} product - Product data
       * @param {Object} selectedOptions - Selected options
       * @returns {Object|null} Found variant or null
       */
      findVariantByOptions: function(product, selectedOptions) {
        if (!product || !product.variants || !selectedOptions) {
          return null;
        }
        
        return product.variants.find(variant => {
          // Check if all selected options match this variant
          return Object.entries(selectedOptions).every(([optionName, optionValue]) => {
            var optionIndex = product.options.findIndex(opt => 
              opt.name === optionName || opt === optionName
            );
            
            if (optionIndex === -1) return false;
            
            var variantOptionValue = variant[`option${optionIndex + 1}`];
            return variantOptionValue === optionValue;
          });
        }) || null;
      },

      /**
       * Check if product has variants with different prices
       * @param {Object} product - Product data
       * @returns {boolean} True if variants have different prices
       */
      hasDifferentPrices: function(product) {
        if (!product || !product.variants || product.variants.length <= 1) {
          return false;
        }
        
        // Get unique prices
        var prices = new Set(product.variants.map(v => v.price));
        
        return prices.size > 1;
      },

      /**
       * Find complementary products based on tags
       * @param {Object} product - Source product
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Complementary products
       */
      findComplementaryProducts: function(product, limit = 4) {
        if (!product || !product.tags || !Array.isArray(product.tags)) {
          return Promise.resolve([]);
        }
        
        // Get complementary tags based on product type
        var complementaryTags = this.getComplementaryTags(product);
        
        if (complementaryTags.length === 0) {
          // Fall back to recommendations
          return this.fetchRecommendedProducts(product.id, limit);
        }
        
        // Try to fetch products from 'all' collection and filter by tags
        return this.fetchCollection('all', limit * 3)
          .then(products => {
            // Filter products that match complementary tags
            var filtered = products.filter(p => {
              if (!p.tags || !Array.isArray(p.tags)) return false;
              
              // Skip the source product
              if (String(p.id) === String(product.id)) return false;
              
              // Check if any product tag matches complementary tags
              return p.tags.some(tag => {
                var normalizedTag = tag.toLowerCase();
                return complementaryTags.some(compTag => 
                  normalizedTag.includes(compTag) || compTag.includes(normalizedTag)
                );
              });
            });
            
            // Sort by relevance to current intent
            var sorted = this.sortProductsByRelevance(filtered);
            
            // Limit to requested number
            return sorted.slice(0, limit);
          })
          .catch(error => {
            Utils.logError('Error finding complementary products', error);
            
            // Fall back to recommendations
            return this.fetchRecommendedProducts(product.id, limit);
          });
      },

      /**
       * Get complementary tags based on product type
       * @param {Object} product - Source product
       * @returns {Array<string>} Complementary tags
       */
      getComplementaryTags: function(product) {
        // Mapping of product types to complementary tags
        var complementaryMap = {
          // Apparel complements
          'shirt': ['tie', 'belt', 'pants', 'jacket', 'cufflinks', 'accessories'],
          'pants': ['shirt', 'belt', 'shoes', 'socks', 'top'],
          'dress': ['earrings', 'necklace', 'purse', 'clutch', 'shoes', 'jewelry'],
          'shoes': ['socks', 'polish', 'insoles', 'laces'],
          
          // Electronics complements
          'phone': ['case', 'screen protector', 'charger', 'cable', 'headphones'],
          'laptop': ['mouse', 'bag', 'sleeve', 'charger', 'adapter', 'stand'],
          'camera': ['lens', 'tripod', 'memory card', 'bag', 'battery'],
          
          // Home complements
          'sofa': ['cushion', 'throw', 'rug', 'coffee table', 'side table'],
          'bed': ['sheets', 'pillows', 'duvet', 'comforter', 'bedding'],
          'dining table': ['chairs', 'placemats', 'dinnerware', 'centerpiece'],
          
          // Beauty complements
          'foundation': ['brush', 'primer', 'powder', 'concealer'],
          'lipstick': ['lip liner', 'lip gloss', 'makeup remover'],
          'shampoo': ['conditioner', 'hair mask', 'hair brush', 'styling product']
        };
        
        // Get product type and title keywords
        var productType = (product.product_type || product.type || '').toLowerCase();
        var titleWords = product.title ? product.title.toLowerCase().split(/\s+/) : [];
        
        // Collect potential complementary tags
        var complementaryTags = [];
        
        // Check product type
        if (complementaryMap[productType]) {
          complementaryTags.push(...complementaryMap[productType]);
        }
        
        // Check title words
        titleWords.forEach(word => {
          if (complementaryMap[word]) {
            complementaryTags.push(...complementaryMap[word]);
          }
        });
        
        // Add product tags that might indicate complementary items
        if (product.tags && Array.isArray(product.tags)) {
          product.tags.forEach(tag => {
            // Look for tags that indicate part of a set or collection
            var tagLower = tag.toLowerCase();
            if (tagLower.includes('set') || tagLower.includes('collection') || 
                tagLower.includes('bundle') || tagLower.includes('kit')) {
              // Extract potential complementary parts
              var parts = tagLower.split(/[\s-_]+/);
              complementaryTags.push(...parts);
            }
          });
        }
        
        // Remove duplicates
        return [...new Set(complementaryTags)];
      },

      /**
       * Get recently viewed products
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Recently viewed products
       */
      getRecentlyViewed: function(limit = 4) {
        if (recentlyViewed.length === 0) {
          return Promise.resolve([]);
        }
        
        // Limit number of products
        var productIds = recentlyViewed.slice(0, limit);
        
        // Get products from cache or fetch them
        var productPromises = productIds.map(id => {
          // Try to find product in cache by ID
          var cachedProduct = Object.values(productCache).find(
            item => item.data && String(item.data.id) === String(id)
          );
          
          if (cachedProduct) {
            return Promise.resolve(cachedProduct.data);
          }
          
          // Not in cache, fetch by ID is unavailable, so return null
          return Promise.resolve(null);
        });
        
        return Promise.all(productPromises)
          .then(products => products.filter(p => p !== null));
      },

      /**
       * Get enhanced upsell products based on cart and intent
       * @param {Array} cartItems - Current cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Upsell products
       */
      getUpsellProducts: function(cartItems = [], excludeIds = [], limit = 4) {
        // Ensure arrays
        var safeCartItems = Array.isArray(cartItems) ? cartItems : [];
        var safeExcludeIds = Array.isArray(excludeIds) ? excludeIds.map(String) : [];
        
        // Get upsell algorithm from config
        var algorithm = Config.get('upsellSettings.upsellAlgorithm', 'smart');
        
        Utils.log(`Fetching upsell products with algorithm: ${algorithm}, limit: ${limit}`);
        
        // Try custom upsell products first if configured
        var customProductHandles = Config.get('upsellSettings.customUpsellProducts', []);
        
        if (customProductHandles && customProductHandles.length > 0) {
          return this.fetchCustomUpsellProducts(customProductHandles, safeExcludeIds, limit)
            .then(customProducts => {
              // If we have enough custom products, use them exclusively
              if (customProducts.length >= limit) {
                return customProducts.slice(0, limit);
              }
              
              // Otherwise, fill remaining slots with other products
              var remainingSlots = limit - customProducts.length;
              
              return this.fetchAlgorithmUpsellProducts(
                algorithm, safeCartItems, safeExcludeIds, remainingSlots
              )
                .then(algorithmProducts => {
                  return [...customProducts, ...algorithmProducts];
                });
            });
        }
        
        // No custom products, use algorithm-based products
        return this.fetchAlgorithmUpsellProducts(
          algorithm, safeCartItems, safeExcludeIds, limit
        );
      },

      /**
       * Fetch custom upsell products
       * @param {Array} productHandles - Product handles
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Custom upsell products
       */
      fetchCustomUpsellProducts: function(productHandles, excludeIds, limit) {
        // Return empty array if no handles
        if (!productHandles || !productHandles.length) {
          return Promise.resolve([]);
        }
        
        Utils.log(`Fetching ${productHandles.length} custom upsell products`);
        
        // Convert any object handles to strings
        var handles = productHandles.map(handle => 
          typeof handle === 'string' ? handle : (handle.handle || '')
        ).filter(Boolean);
        
        // Fetch all products in parallel
        var productPromises = handles.map(handle => 
          this.fetchProduct(handle).catch(() => null)
        );
        
        return Promise.all(productPromises)
          .then(products => {
            // Filter out nulls and excluded products
            var validProducts = products.filter(product => 
              product && !excludeIds.includes(String(product.id))
            );
            
            // Mark these as custom upsells
            validProducts.forEach(product => {
              product._isCustomUpsell = true;
            });
            
            return validProducts.slice(0, limit);
          });
      },

      /**
       * Fetch algorithm-based upsell products
       * @param {string} algorithm - Algorithm to use
       * @param {Array} cartItems - Current cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Algorithm-based upsell products
       */
      fetchAlgorithmUpsellProducts: function(algorithm, cartItems, excludeIds, limit) {
        // Handle different algorithms
        switch (algorithm) {
          case 'intent':
            return this.fetchIntentBasedUpsells(cartItems, excludeIds, limit);
          case 'complementary':
            return this.fetchComplementaryUpsells(cartItems, excludeIds, limit);
          case 'collection':
            return this.fetchCollectionUpsells(cartItems, excludeIds, limit);
          case 'random':
            return this.fetchRandomUpsells(excludeIds, limit);
          case 'smart':
          default:
            return this.fetchSmartUpsells(cartItems, excludeIds, limit);
        }
      },

      /**
       * Fetch intent-based upsell products
       * @param {Array} cartItems - Current cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Intent-based upsell products
       */
      fetchIntentBasedUpsells: function(cartItems, excludeIds, limit) {
        // Get current shopping intent
        var intent = this.getCurrentIntent();
        
        // If no meaningful intent, fall back to smart upsells
        if (!intent.primaryCategory && intent.keyAttributes.length === 0 && 
            intent.preferredVendors.length === 0 && intent.searchTerms.length === 0) {
          return this.fetchSmartUpsells(cartItems, excludeIds, limit);
        }
        
        // Try to fetch products from 'all' collection
        return this.fetchCollection('all', limit * 3)
          .then(products => {
            // Filter out excluded products
            var filtered = products.filter(product => 
              !excludeIds.includes(String(product.id))
            );
            
            // Score and sort by intent relevance
            var scored = filtered.map(product => ({
              ...product,
              relevanceScore: this.scoreProductByIntent(product)
            }));
            
            var sorted = scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
            
            return sorted.slice(0, limit);
          })
          .catch(error => {
            Utils.logError('Error fetching intent-based upsells', error);
            
            // Fall back to smart upsells
            return this.fetchSmartUpsells(cartItems, excludeIds, limit);
          });
      },

      /**
       * Fetch complementary upsell products
       * @param {Array} cartItems - Current cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Complementary upsell products
       */
      fetchComplementaryUpsells: function(cartItems, excludeIds, limit) {
        // Need at least one cart item
        if (!cartItems || cartItems.length === 0) {
          return this.fetchRandomUpsells(excludeIds, limit);
        }
        
        // Get first cart item for complementary products
        var firstItem = cartItems[0];
        
        // Create a minimal product object for complementary search
        var sourceProduct = {
          id: firstItem.product_id || firstItem.id,
          product_type: firstItem.product_type || firstItem.type,
          title: firstItem.product_title || firstItem.title,
          tags: firstItem.tags || []
        };
        
        // Find complementary products
        return this.findComplementaryProducts(sourceProduct, limit * 2)
          .then(products => {
            // Filter out excluded products
            var filtered = products.filter(product => 
              !excludeIds.includes(String(product.id))
            );
            
            return filtered.slice(0, limit);
          })
          .catch(error => {
            Utils.logError('Error fetching complementary upsells', error);
            
            // Fall back to recommendations
            return this.fetchRecommendedProducts(sourceProduct.id, limit);
          });
      },

      /**
       * Fetch collection-based upsell products
       * @param {Array} cartItems - Current cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Collection-based upsell products
       */
      fetchCollectionUpsells: function(cartItems, excludeIds, limit) {
        // Get collection handle from config
        var collectionHandle = Config.get('upsellSettings.collectionHandle', 'frontpage');
        
        // Skip if no collection handle
        if (!collectionHandle) {
          return this.fetchRandomUpsells(excludeIds, limit);
        }
        
        // Fetch the collection
        return this.fetchCollection(collectionHandle, limit * 2)
          .then(products => {
            // Filter out excluded products
            var filtered = products.filter(product => 
              !excludeIds.includes(String(product.id))
            );
            
            // Inject relevance scores if there are cart items
            if (cartItems && cartItems.length > 0) {
              filtered.forEach(product => {
                product.relevanceScore = this.scoreProductByIntent(product);
              });
              
              // Sort by relevance
              filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
            }
            
            return filtered.slice(0, limit);
          })
          .catch(error => {
            Utils.logError(`Error fetching collection ${collectionHandle}`, error);
            
            // Fall back to random products
            return this.fetchRandomUpsells(excludeIds, limit);
          });
      },

      /**
       * Fetch random upsell products
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Random upsell products
       */
      fetchRandomUpsells: function(excludeIds, limit) {
        return this.fetchRandomProducts(limit * 2)
          .then(products => {
            // Filter out excluded products
            var filtered = products.filter(product => 
              !excludeIds.includes(String(product.id))
            );
            
            return filtered.slice(0, limit);
          });
      },

      /**
       * Fetch smart upsell products using multiple strategies
       * @param {Array} cartItems - Current cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products
       * @returns {Promise<Array>} Smart upsell products
       */
      fetchSmartUpsells: function(cartItems, excludeIds, limit) {
        // Need at least one cart item
        if (!cartItems || cartItems.length === 0) {
          // Use intent-based upsells if we have intent data
          var intent = this.getCurrentIntent();
          
          if (intent.primaryCategory || intent.keyAttributes.length > 0 || 
              intent.preferredVendors.length > 0 || intent.searchTerms.length > 0) {
            return this.fetchIntentBasedUpsells([], excludeIds, limit);
          }
          
          // Otherwise use random products
          return this.fetchRandomUpsells(excludeIds, limit);
        }
        
        // Multi-strategy approach for best results
        var minProductsNeeded = Math.min(limit * 3, 12);
        
        // Try multiple strategies and combine results
        var recommendationsPromise = this.fetchRecommendedProducts(
          cartItems[0].product_id || cartItems[0].id, 
          minProductsNeeded / 2
        ).catch(() => []);
        
        var complementaryPromise = this.fetchComplementaryUpsells(
          cartItems, 
          excludeIds, 
          minProductsNeeded / 2
        ).catch(() => []);
        
        var intentPromise = this.fetchIntentBasedUpsells(
          cartItems, 
          excludeIds, 
          minProductsNeeded / 2
        ).catch(() => []);
        
        var collectionPromise = this.fetchCollectionUpsells(
          cartItems, 
          excludeIds, 
          minProductsNeeded / 2
        ).catch(() => []);
        
        return Promise.all([
          recommendationsPromise, 
          complementaryPromise,
          intentPromise,
          collectionPromise
        ])
          .then(([recommendations, complementary, intent, collection]) => {
            // Combine all products
            let allProducts = [
              ...recommendations, 
              ...complementary,
              ...intent,
              ...collection
            ];
            
            // Filter out duplicates and excluded products
            var uniqueProducts = [];
            var seenIds = new Set();
            
            allProducts.forEach(product => {
              if (product && product.id && !seenIds.has(String(product.id)) && 
                  !excludeIds.includes(String(product.id))) {
                seenIds.add(String(product.id));
                uniqueProducts.push(product);
              }
            });
            
            // Score each product
            uniqueProducts.forEach(product => {
              if (!product.relevanceScore) {
                product.relevanceScore = this.scoreProductByIntent(product);
              }
            });
            
            // Sort by relevance score
            uniqueProducts.sort((a, b) => b.relevanceScore - a.relevanceScore);
            
            return uniqueProducts.slice(0, limit);
          });
      }
    };

    // Register the module
    Carty.registerModule('product', Product);
  });
})();

/**
 * Carty - UI Module
 * Handles UI components and rendering
 * Version 5.0.0
 */
(function() {
  'use strict';

  // Wait for dependencies
  Carty.ready(['utils', 'config', 'dom', 'cart', 'product'], function(Utils, Config, DOM, CartService, ProductService) {
    // Module object
    var UI = {
      /**
       * Module version
       */
      version: '5.0.0',
      
      /**
       * Tracked buttons and widgets
       */
      activeComponents: [],
      
      /**
       * Initialization flag
       */
      initialized: false,
      
      /**
       * Observer for dynamic content
       */
      contentObserver: null,

      /**
       * Initialize UI components
       * @returns {Promise} Initialization promise
       */
      init: function() {
        if (this.initialized) {
          return Promise.resolve();
        }
        
        Utils.log('Initializing UI module');
        
        // Create global styles first
        this.createGlobalStyles();
        
        // Setup MutationObserver to watch for dynamic content changes
        this.setupContentObserver();
        
        // Find and initialize add-to-cart buttons
        this.findAndInitializeButtons();
        
        // Setup alignment system
        this.initializeAlignmentSystem();
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.initialized = true;
        Carty.trigger('ui:initialized');
        
        return Promise.resolve();
      },
      
      /**
       * Create global styles
       */
      createGlobalStyles: function() {
        var styles = `
          /* Carty Core Styles */
          .carty-widget {
            padding: 10px 5px;
            width: 100%;
            box-sizing: border-box;
            position: relative;
            z-index: 2;
            clear: both;
          }
          
          .carty-variant-selector-container {
            margin: 5px 0;
          }
          
          .carty-variant-selector {
            width: 100%;
            height: 40px;
            box-sizing: border-box;
          }
          
          .carty-quantity-selector {
            display: flex;
            align-items: center;
            height: 40px;
            margin-right: 10px;
            flex-shrink: 0;
          }
          
          .carty-quantity-input {
            width: 40px;
            text-align: center;
            border: none;
            background: transparent;
          }
          
          .carty-quantity-input::-webkit-outer-spin-button,
          .carty-quantity-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          
          .carty-quantity-input[type=number] {
            -moz-appearance: textfield;
          }
          
          .carty-quantity-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0 10px;
          }
          
          .carty-button-container {
            display: flex;
            flex-direction: row;
            margin-top: 10px;
          }
          
          .carty-add-to-cart,
          .carty-sold-out {
            width: 100%;
            height: 40px;
            border-radius: 4px;
            text-align: center;
          }
          
          .carty-error {
            color: #cc0000;
            background-color: #ffeded;
            padding: 8px;
            margin-top: 10px;
            border-radius: 4px;
            font-size: 14px;
            text-align: center;
            display: none;
          }
          
          .carty-inline-container {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            width: 100%;
          }
          
          /* Mobile responsive styles */
          @media screen and (max-width: 480px) {
            .carty-button-container {
              flex-direction: column !important;
            }
            
            .carty-quantity-selector {
              width: 100% !important;
              margin-right: 0 !important;
              margin-bottom: 8px !important;
              justify-content: space-between !important;
              padding: 0 10px !important;
            }
            
            .carty-add-to-cart, 
            .carty-sold-out {
              width: 100% !important;
              height: 44px !important;
            }
          }
        `;
        
        // Add custom CSS if provided in config
        if (Config.get('customCss')) {
          styles += Config.get('customCss');
        }
        
        DOM.addStyles(styles, 'carty-global-styles');
      },
      
      /**
       * Set up content observer
       */
      setupContentObserver: function() {
        if (!window.MutationObserver) return;
        
        var debounceDelay = Config.get('performance.debounceDelay', 300);
        
        // Create a throttled handler for efficiency
        var handleMutations = Utils.debounce(() => {
          this.findAndInitializeButtons();
        }, debounceDelay);
        
        // Create observer
        this.contentObserver = new MutationObserver(mutations => {
          let shouldProcess = false;
          
          // Check if mutations are relevant
          for (var mutation of mutations) {
            // Only care about added nodes
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
              for (var node of mutation.addedNodes) {
                // Only process element nodes
                if (node.nodeType === Node.ELEMENT_NODE) {
                  // Skip Carty elements to prevent recursion
                  if (node.className && typeof node.className === 'string' && 
                      node.className.includes('carty-')) {
                    continue;
                  }
                  
                  // Check for product links or forms
                  if (node.querySelector('a[href*="/products/"], form[action*="/cart/add"]')) {
                    shouldProcess = true;
                    break;
                  }
                }
              }
            }
            
            if (shouldProcess) break;
          }
          
          if (shouldProcess) {
            handleMutations();
          }
        });
        
        // Start observing
        this.contentObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false
        });
      },
      
      /**
       * Set up event listeners
       */
      setupEventListeners: function() {
        // Handle SPA navigation
        let lastUrl = location.href;
        
        // Listen for popstate events
        window.addEventListener('popstate', () => {
          if (lastUrl !== location.href) {
            lastUrl = location.href;
            setTimeout(() => this.findAndInitializeButtons(), 300);
          }
        });
        
        // Monitor pushState/replaceState
        var originalPushState = history.pushState;
        history.pushState = function() {
          originalPushState.apply(history, arguments);
          
          if (lastUrl !== location.href) {
            lastUrl = location.href;
            setTimeout(() => UI.findAndInitializeButtons(), 300);
          }
        };
        
        // Listen for cart updates
        Carty.on('cart:updated', () => {
          this.refreshButtonStates();
        });
        
        // Listen for config changes
        Carty.on('config:updated', () => {
          this.reinitializeComponents();
        });
      },
      
      /**
       * Initialize alignment system
       */
      initializeAlignmentSystem: function() {
        // Only initialize if alignment is enabled
        if (!Config.get('alignWidgets', true)) return;
        
        Utils.log('Initializing button alignment system');
        
        // Add alignment styles
        var alignmentStyles = `
          [data-carty-container="true"] {
            position: relative !important;
          }
          
          .carty-widget {
            width: 100% !important;
            box-sizing: border-box !important;
            transition: padding-top 0.1s ease-out !important;
          }
        `;
        
        DOM.addStyles(alignmentStyles, 'carty-alignment-styles');
        
        // Set up timing for alignment passes
        
        // Initial alignment pass
        setTimeout(() => this.applyButtonAlignment(), 500);
        
        // After images have loaded
        window.addEventListener('load', () => {
          setTimeout(() => this.applyButtonAlignment(), 200);
        });
        
        // On resize
        window.addEventListener('resize', Utils.throttle(() => {
          this.applyButtonAlignment();
        }, 250));
      },
      
      /**
       * Find and initialize add-to-cart buttons
       */
      findAndInitializeButtons: function() {
        // Skip if not enabled for current page
        if (!this.shouldShowOnCurrentPage()) {
          Utils.log('Carty disabled for current page type');
          return;
        }
        
        // Find all product links
        var productLinks = this.findProductLinks();
        
        if (productLinks.length === 0) {
          Utils.log('No product links found on page');
          return;
        }
        
        Utils.log(`Found ${productLinks.length} product links`);
        
        // Handle prefetching if enabled
        if (Config.get('fastLoading')) {
          this.prefetchProductData(productLinks);
        }
        
        // Track processed products to avoid duplicates
        var processedProducts = {};
        
        // Process each product link
        productLinks.forEach(link => {
          try {
            var handle = this.getProductHandleFromLink(link);
            
            if (!handle) return;
            
            // Find the product container
            var container = this.findProductContainer(link);
            
            if (!container) return;
            
            // Mark this container for future reference
            DOM.attr(container, 'data-carty-container', 'true');
            
            // Create a unique key for this product+container combination
            var containerId = container.id || 
                               DOM.getAttr(container, 'data-carty-container') || 
                               Array.from(container.parentNode.children).indexOf(container);
            var productKey = handle + '-' + containerId;
            
            if (processedProducts[productKey]) {
              // Mark this link as processed, but don't add another widget
              DOM.addClass(link, 'carty-processed');
              return;
            }
            
            // Mark this product as processed
            processedProducts[productKey] = true;
            
            // Fetch and initialize product
            ProductService.getProduct(handle)
              .then(product => {
                if (!product) return;
                
                // Create the widget
                var widget = this.createWidget(product, link);
                
                // Find the best placement target
                var placementTarget = this.findBestPlacement(container);
                
                // Add the widget to the container based on placement strategy
                var placement = Config.get('targetPlacement', 'LAST_CHILD');
                
                if (placement === 'AFTER') {
                  DOM.insertAfter(widget, placementTarget);
                } else if (placement === 'INLINE') {
                  // Use special inline layout function
                  this.applyInlineButtonLayout(widget, container);
                } else {
                  // Default is LAST_CHILD
                  placementTarget.appendChild(widget);
                }
                
                // Track this component
                this.activeComponents.push({
                  product,
                  widget,
                  container,
                  handle
                });
                
                // Mark link as processed
                DOM.addClass(link, 'carty-processed');
                
                // Try to hide any existing add to cart buttons to prevent duplicates
                this.hideExistingButtons(container);
              })
              .catch(error => {
                Utils.logError(`Error processing product ${handle}:`, error);
              });
          } catch (error) {
            Utils.logError('Error processing product link:', error);
          }
        });
        
        // Apply alignment after a delay
        setTimeout(() => this.applyButtonAlignment(), 500);
      },
      
      /**
       * Refresh button states
       */
      refreshButtonStates: function() {
        this.activeComponents.forEach(component => {
          var widget = component.widget;
          if (!widget) return;
          
          var addToCartBtn = widget.querySelector('.carty-add-to-cart');
          if (!addToCartBtn) return;
          
          // Reset button state
          addToCartBtn.disabled = false;
          addToCartBtn.textContent = Config.get('buttonText', 'Add to Cart');
          
          // Reset error message
          var errorMsg = widget.querySelector('.carty-error');
          if (errorMsg) {
            errorMsg.style.display = 'none';
          }
        });
      },
      
      /**
       * Reinitialize all components
       */
      reinitializeComponents: function() {
        // Clear existing components
        this.activeComponents = [];
        
        // Remove existing buttons
        document.querySelectorAll('.carty-widget').forEach(widget => {
          widget.remove();
        });
        
        // Reset processed state
        document.querySelectorAll('.carty-processed').forEach(el => {
          DOM.removeClass(el, 'carty-processed');
        });
        
        // Find and initialize buttons again
        this.findAndInitializeButtons();
      },
      
      /**
       * Find product links on the page
       * @returns {Array<Element>} Product links
       */
      findProductLinks: function() {
        var productLinkSelectors = [
          // Base product link selector with exclusions for navigation/utility areas
          'a[href*="/products/"]:not(.header a, .footer a, .cart a, .site-nav a, ' +
          '.mobile-nav a, .drawer a, .announcement-bar a, .navigation a, .menu a, ' +
          '.sidebar a, .mega-menu a, .dropdown-menu a)',
          
          // Common product card selectors
          '.product-card a[href*="/products/"]',
          '.product-item a[href*="/products/"]',
          '.product a[href*="/products/"]',
          '.product__link[href*="/products/"]',
          '.product-link[href*="/products/"]',
          '.card__inner a[href*="/products/"]',
          '.card-information a[href*="/products/"]',
          '.card-wrapper a[href*="/products/"]',
          '.card--product a[href*="/products/"]',
          '.card__content a[href*="/products/"]',
          
          // Grid-based layouts
          '.grid-item a[href*="/products/"]',
          '.grid__item a[href*="/products/"]',
          '.grid-product a[href*="/products/"]',
          '.grid-view-item a[href*="/products/"]',
          
          // Dawn theme selectors
          'a.full-unstyled-link[href*="/products/"]',
          '.card-information a[href*="/products/"]',
          
          // Page builder specific selectors
          '[data-pf-type="ProductBox"] a[href*="/products/"]',
          '[data-pf-type="ProductTitle"] a[href*="/products/"]',
          '[data-gf-type="product-card"] a[href*="/products/"]',
          '[data-shogun-product-element] a[href*="/products/"]'
        ];
        
        // Find all product links that haven't been processed yet
        return DOM.find(productLinkSelectors.join(', '))
          .filter(element => {
            // Skip links that are in header, footer, cart, etc.
            var isInExcludedArea = DOM.closest(element, 
              'header, .header, .site-header, footer, .footer, .site-footer, ' +
              '.cart, #cart, .drawer, .mega-menu, .dropdown-menu'
            );
            var isProcessed = DOM.hasClass(element, 'carty-processed');
            return !isInExcludedArea && !isProcessed;
          });
      },
      
      /**
       * Extract product handle from URL
       * @param {Element} linkElement - Link element
       * @returns {string|null} Product handle
       */
      getProductHandleFromLink: function(linkElement) {
        var href = DOM.getAttr(linkElement, 'href');
        if (!href) return null;
        
        // Use a robust regex that captures the entire product handle
        var match = href.match(/\/products\/([a-zA-Z0-9-_.%]+)(?:\?|#|$)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]);
        }
        
        return null;
      },
      
      /**
       * Prefetch product data for links
       * @param {Array<Element>} productLinks - Product links
       */
      prefetchProductData: function(productLinks) {
        var prefetchLimit = Config.get('performance.prefetchLimit', 5);
        
        if (prefetchLimit <= 0) return;
        
        // Extract handles
        var handles = productLinks
          .map(link => this.getProductHandleFromLink(link))
          .filter(Boolean);
        
        // Limit to configured number
        var handlesToFetch = handles.slice(0, prefetchLimit);
        
        // Prefetch data
        if (handlesToFetch.length > 0) {
          Utils.log(`Prefetching ${handlesToFetch.length} products`);
          ProductService.prefetchProducts(handlesToFetch);
        }
      },
      
      /**
       * Find product container
       * @param {Element} link - Product link
       * @returns {Element|null} Product container
       */
      findProductContainer: function(link) {
        var unwantedSelectors = [
          'header', '#shopify-section-header', '.site-footer__linklist > li',
          '.be-list-item', '.predictive-search__list-item', 'product-info',
          '.product-section', 'nav', '.featured-product', '.feature-row',
          '.viewed-products-container', '#shopify-section-footer',
          '.collections-ignore', '.ajaxcart__product', '.ajax-cart__cart-items',
          '#CartDrawer', '#rebuy-cart', '.mega-menu', '.dropdown-menu',
          '.site-nav__dropdown', '.announcement-bar', '.header', '.footer'
        ];
        
        // Create selector for containers that could match, excluding unwanted ones
        var validContainerSelectors = [
          // Common product card containers
          '.card-wrapper', '.card--product', '.product-card', '.grid-product',
          '.grid__item', '.product-card', '.grid-view-item',
          
          // Page builder containers
          '[data-pf-type="ProductBox"]', '[data-gf-type="product-card"]',
          '[data-shogun-product-element]', '[data-shogun-product-card]',
          '[data-pagefly-product]'
        ];
        
        try {
          // Check for manually marked container
          var manualContainer = DOM.closest(link, '[data-carty-container]');
          if (manualContainer) return manualContainer;
          
          // Check for product-specific data attributes
          var dataAttrContainer = DOM.closest(link,
            '[data-product-card], [data-product], [data-product-container], ' +
            '[data-product-id], [data-product-handle], [data-item]'
          );
          
          if (dataAttrContainer) return dataAttrContainer;
          
          // Check for page builder containers
          var pageBuilderContainer = DOM.closest(link,
            '[data-pf-type="ProductBox"], [data-gf-type="product-card"], ' +
            '[data-shogun-product-element], [data-shogun-product-card], ' +
            '[data-pagefly-product]'
          );
          
          if (pageBuilderContainer) return pageBuilderContainer;
          
          // Try common containers
          for (var selector of validContainerSelectors) {
            var container = DOM.closest(link, selector);
            if (container) {
              // Verify it's not an unwanted container
              var isUnwanted = unwantedSelectors.some(unwantedSelector => 
                DOM.closest(container, unwantedSelector)
              );
              
              if (!isUnwanted) return container;
            }
          }
          
          // Try article container
          var article = DOM.closest(link, 'article');
          if (article) return article;
          
          // Smart fallback - look for product characteristics
          let parent = link.parentElement;
          let depth = 0;
          
          while (parent && depth < 4) {
            var hasPriceElement = parent.querySelector('.price, .product-price, [data-price]');
            var hasImage = parent.querySelector('img, picture');
            var hasTitle = parent.querySelector('h2, h3, h4, .title, .product-title');
            
            if ((hasPriceElement) || (hasImage && hasTitle) || 
                (parent.className && parent.className.toLowerCase().includes('product'))) {
              return parent;
            }
            
            parent = parent.parentElement;
            depth++;
          }
          
          // Last resort fallbacks
          return link.closest('div') || link.parentElement;
        } catch (error) {
          Utils.logError('Error finding product container:', error);
          return link.parentElement;
        }
      },
      
      /**
       * Find the best placement target in container
       * @param {Element} container - Product container
       * @returns {Element} Target element
       */
      findBestPlacement: function(container) {
        try {
          // Try to use configuration target if specified
          var configTarget = Config.get('target');
          if (configTarget && configTarget.trim() !== '') {
            // First try within the container
            let customTarget = container.querySelector(configTarget);
            // If not found, try globally
            if (!customTarget) {
              customTarget = document.querySelector(configTarget);
            }
            if (customTarget) {
              return customTarget;
            }
          }
          
          // Try common selectors in priority order
          
          // Group 1: Form elements (most reliable for placement at action point)
          var formSelectors = [
            'form[action="/cart/add"]',
            'form[action*="cart/add"]',
            '[data-product-form]'
          ];
          
          for (var selector of formSelectors) {
            var element = container.querySelector(selector);
            if (element) return element;
          }
          
          // Group 2: Price elements (very reliable placement)
          var priceSelectors = [
            '.price',
            '.product-price',
            '.product__price',
            '.product-item__price',
            '.product-item__price-wrapper',
            '.product__prices',
            '.card__price',
            '.price__container',
            '.price-wrapper',
            '.product-single__prices',
            'product-price',
            '[data-price]'
          ];
          
          for (var selector of priceSelectors) {
            var element = container.querySelector(selector);
            if (element) return element;
          }
          
          // Group 3: Info sections (good placement)
          var infoSelectors = [
            '.card-information',
            '.product-information',
            '.product-meta',
            '.product-item__info',
            '.product__info',
            '.product-details',
            '.card__content',
            '.card__info',
            '.product-card__info',
            '.product-content',
            '.product-card__content'
          ];
          
          for (var selector of infoSelectors) {
            var element = container.querySelector(selector);
            if (element) return element;
          }
          
          // Group 4: Title elements (less ideal but workable)
          var titleSelectors = [
            '.product-title',
            '.product-item__title',
            '.product__title',
            '.card__name',
            'h2.card__heading',
            'h3.card__heading',
            '.card-title',
            '.product-name',
            '.product-card__title',
            '.grid-product__title'
          ];
          
          for (var selector of titleSelectors) {
            var element = container.querySelector(selector);
            if (element) return element;
          }
          
          // Try to find the bottom of the product card
          var childElements = Array.from(container.children);
          if (childElements.length > 1) {
            // Get the last child that's visible and not our widget
            for (let i = childElements.length - 1; i >= 0; i--) {
              var child = childElements[i];
              if (DOM.isVisible(child) && 
                  !DOM.hasClass(child, 'carty-widget') && 
                  !DOM.hasClass(child, 'carty-processed')) {
                return child;
              }
            }
          }
          
          // Last resort - if all else fails, return the container itself
          return container;
        } catch (error) {
          Utils.logError('Error finding best placement:', error);
          return container;
        }
      },
      
      /**
       * Hide existing add-to-cart buttons to prevent duplicates
       * @param {Element} container - Product container
       */
      hideExistingButtons: function(container) {
        var buttonSelectors = [
          '.add-to-cart-btn',
          '.add-to-cart',
          '.add_to_cart',
          '.product-form__cart-submit',
          '.add-to-cart-button',
          '.product-add',
          '.product-add-to-cart',
          '.btn--add-to-cart',
          '.cart-btn',
          '.add_to_cart_button',
          '.product-buy-buttons',
          '.product-submit',
          '.product-form--add-to-cart',
          // Page builder specific
          '[data-pf-type="ProductATC"]',
          '[data-gf-type="add-to-cart"]',
          '[data-shogun-product-add-to-cart]'
        ];
        
        var existingButtons = DOM.find(buttonSelectors.join(', '), container);
        
        existingButtons.forEach(btn => {
          // Only hide if it's not part of the product page form
          if (!DOM.closest(btn, 'form[action="/cart/add"]')) {
            btn.style.display = 'none';
          }
        });
      },
      
      /**
       * Apply inline button layout
       * @param {Element} widget - Widget element
       * @param {Element} container - Container element
       */
      applyInlineButtonLayout: function(widget, container) {
        // Only apply if we're using INLINE placement mode
        if (Config.get('targetPlacement') !== 'INLINE') {
          container.appendChild(widget);
          return;
        }
        
        // Create a flex container
        var flexContainer = DOM.create('div', {
          className: 'carty-inline-container',
          style: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            width: '100%'
          }
        });
        
        // First try to find price element to place beside
        var priceElement = container.querySelector('.price, .product-price, .product__price');
        
        if (priceElement) {
          // Clone the price element
          var priceClone = priceElement.cloneNode(true);
          
          // Remove any interactive elements from the clone
          priceClone.querySelectorAll('button, select, input').forEach(el => el.remove());
          
          // Add price to left side, widget to right side
          flexContainer.appendChild(priceClone);
          
          // If original has a parent with display:flex, try to match that parent's styling
          var priceParent = priceElement.parentElement;
          var priceParentStyle = window.getComputedStyle(priceParent);
          
          if (priceParentStyle.display === 'flex') {
            DOM.setStyles(flexContainer, {
              display: 'flex',
              justifyContent: priceParentStyle.justifyContent,
              alignItems: priceParentStyle.alignItems
            });
          }
          
          // Hide the original price element
          priceElement.style.display = 'none';
          
          // Add widget to container
          flexContainer.appendChild(widget);
          
          // Add the flex container after the hidden price
          DOM.insertAfter(flexContainer, priceElement);
        } else {
          // If no price element, just add the widget to the container
          container.appendChild(widget);
        }
      },
      
      /**
       * Create widget for product
       * @param {Object} product - Product data
       * @param {Element} productLink - Product link
       * @returns {Element} Widget element
       */
      createWidget: function(product, productLink) {
        try {
          Utils.log(`Creating widget for product ${product.title} (${product.id})`);
          
          var widgetContainer = DOM.create('div', {
            className: 'carty-widget',
            style: {
              padding: '10px 5px',
              width: '100%',
              boxSizing: 'border-box',
              position: 'relative',
              zIndex: '2'
            }
          });
          
          // Create error message component
          var errorMessage = this.createErrorMessage();
          
          // Create components based on product status
          let hasAvailableVariants = false;
          try {
            var availableVariants = ProductService.getAvailableVariants(product);
            hasAvailableVariants = availableVariants && availableVariants.length > 0;
          } catch (e) {
            Utils.logError('Error checking available variants:', e);
            // Assume product is available if we can't check
            hasAvailableVariants = true;
          }
          
          if (hasAvailableVariants || Config.get('showSoldOutButton')) {
            // For available products or when we show sold out button
            let selectedVariantId = null;
            let variantSelector = null;
            let quantitySelector = null;
            let addToCartButton = null;
            
            // Create variant selector if needed
            if (ProductService.hasMultipleVariants(product) && Config.get('showVariantSelector')) {
              try {
                // Get default variant
                var defaultVariant = ProductService.getDefaultVariant(product);
                selectedVariantId = defaultVariant ? defaultVariant.id : null;
                
                // Create variant selector
                variantSelector = this.createVariantSelector(product, selectedVariantId, variantId => {
                  Utils.log(`Variant changed to ${variantId}`);
                  selectedVariantId = variantId;
                  
                  // Update button state
                  if (addToCartButton) {
                    addToCartButton.setAttribute('data-variant-id', variantId);
                  }
                  
                  // Check if the new variant is available
                  var variant = ProductService.getVariantById(product, variantId);
                  
                  if (variant) {
                    // Update button state based on variant availability
                    if (variant.available) {
                      if (addToCartButton) {
                        addToCartButton.disabled = false;
                        addToCartButton.textContent = Config.get('buttonText');
                        DOM.setStyles(addToCartButton, {
                          backgroundColor: Config.get('buttonBackgroundColor'),
                          cursor: 'pointer',
                          opacity: '1',
                          color: Config.get('buttonFontColor'),
                          border: `${Config.get('buttonBorderSize')}px solid ${Config.get('buttonBorderColor')}`
                        });
                      }
                    } else if (Config.get('showSoldOutButton')) {
                      // Change to sold out state
                      if (addToCartButton) {
                        var soldOutText = Config.get('soldOutButtonText') || Config.get('showSoldOutButtonText') || "Sold Out";
                        addToCartButton.disabled = true;
                        addToCartButton.textContent = soldOutText;
                        DOM.setStyles(addToCartButton, {
                          backgroundColor: Config.get('soldOutButtonBackgroundColor', '#999'),
                          color: Config.get('soldOutButtonFontColor', '#fff'),
                          border: `${Config.get('soldOutButtonBorderSize', 1)}px solid ${Config.get('soldOutButtonBorderColor', '#666')}`,
                          cursor: 'not-allowed',
                          opacity: '0.7'
                        });
                      }
                    }
                    
                    // Update product image if configured
                    if (Config.get('updateVariantImage') && variant.featured_image) {
                      this.updateProductImage(productLink, variant.featured_image.src);
                    }
                  }
                });
                
                if (variantSelector) {
                  widgetContainer.appendChild(variantSelector);
                }
              } catch (e) {
                Utils.logError('Error creating variant selector:', e);
                widgetContainer.appendChild(DOM.create('div', {
                  style: {
                    color: '#cc0000',
                    fontSize: '12px',
                    margin: '5px 0'
                  },
                  text: 'Error loading variants'
                }));
              }
            } else {
              // For products with a single variant
              try {
                var defaultVariant = ProductService.getDefaultVariant(product);
                selectedVariantId = defaultVariant ? defaultVariant.id : (product.variants[0]?.id || null);
              } catch (e) {
                Utils.logError('Error getting default variant:', e);
                // Try to get any variant ID we can
                selectedVariantId = product.variants && product.variants.length > 0 ?
                  product.variants[0].id : null;
              }
            }
            
            // Create quantity selector if needed
            if (Config.get('showQuantitySelector')) {
              try {
                quantitySelector = this.createQuantitySelector(Config.get('quantitySelectorDefaultQuantity'));
              } catch (e) {
                Utils.logError('Error creating quantity selector:', e);
                quantitySelector = null;
              }
            }
            
            // Create button container
            var buttonContainer = DOM.create('div', {
              className: 'carty-button-container',
              style: {
                display: 'flex',
                flexDirection: 'row',
                marginTop: '10px',
                marginBottom: '2px',
                width: '100%',
                gap: '8px'
              }
            });
            
            // Add quantity selector to button container if it exists
            if (quantitySelector) {
              buttonContainer.appendChild(quantitySelector);
            }
            
            // Check if we should show add to cart or sold out button
            if (selectedVariantId) {
              let selectedVariant = null;
              try {
                selectedVariant = ProductService.getVariantById(product, selectedVariantId);
              } catch (e) {
                Utils.logError('Error getting variant by ID:', e);
              }
              
              try {
                if (selectedVariant && selectedVariant.available) {
                  // Create add to cart button
                  addToCartButton = this.createAddToCartButton(
                    selectedVariantId,
                    product,
                    quantitySelector
                  );
                } else if (Config.get('showSoldOutButton')) {
                  // Create sold out button
                  addToCartButton = this.createSoldOutButton();
                }
              } catch (e) {
                Utils.logError('Error creating button:', e);
                // Create a simple fallback button
                addToCartButton = DOM.create('button', {
                  type: 'button',
                  className: 'carty-add-to-cart',
                  disabled: true,
                  text: 'Error'
                });
              }
            } else if (Config.get('showSoldOutButton')) {
              // Create sold out button for products without variants
              addToCartButton = this.createSoldOutButton();
            }
            
            // Add button to container
            if (addToCartButton) {
              // Add flex-grow property to make it fill available space
              addToCartButton.style.flexGrow = '1';
              buttonContainer.appendChild(addToCartButton);
            }
            
            // Add button container to widget
            widgetContainer.appendChild(buttonContainer);
          }
          
          // Add error message element
          widgetContainer.appendChild(errorMessage);
          
          return widgetContainer;
        } catch (error) {
          Utils.logError('Critical error in createWidget:', error);
          // Return a minimal widget that won't break the page
          return DOM.create('div', {
            className: 'carty-widget carty-widget-error',
            text: 'Error loading widget'
          });
        }
      },
      
      /**
       * Create quantity selector
       * @param {string|number} defaultQuantity - Default quantity
       * @returns {Element} Quantity selector element
       */
      createQuantitySelector: function(defaultQuantity = 1) {
        try {
          if (typeof defaultQuantity === 'string') {
            defaultQuantity = parseInt(defaultQuantity) || 1;
          }
          
          // Create container
          var container = DOM.create('div', {
            className: 'carty-quantity-selector',
            style: {
              display: 'flex',
              alignItems: 'center',
              height: '40px',
              marginRight: '10px',
              backgroundColor: Config.get('quantitySelectorBackgroundColor'),
              color: Config.get('quantitySelectorFontColor'),
              border: `${Config.get('quantitySelectorBorderSize')}px solid ${Config.get('quantitySelectorBorderColor')}`,
              borderRadius: `${Config.get('quantitySelectorBorderRadius')}px`,
              fontSize: `${Config.get('quantitySelectorFontSize')}px`,
              fontFamily: Config.get('quantitySelectorFontFamily', 'inherit'),
              flexShrink: '0',
              maxWidth: '120px'
            }
          });
          
          // Create minus button
          var minusBtn = DOM.create('button', {
            type: 'button',
            className: 'carty-quantity-btn carty-minus-btn',
            text: '-',
            style: {
              padding: '0 10px',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              color: Config.get('quantitySelectorFontColor'),
              fontSize: `${Config.get('quantitySelectorFontSize')}px`,
              lineHeight: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            },
            onclick: function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              var input = this.parentNode.querySelector('input');
              let value = parseInt(input.value) - 1;
              if (value < 1) value = 1;
              input.value = value;
              
              // Create and dispatch change event
              var event = new Event('change', { bubbles: true });
              input.dispatchEvent(event);
            }
          });
          
          // Create quantity input
          var input = DOM.create('input', {
            type: 'number',
            className: 'carty-quantity-input',
            min: '1',
            value: defaultQuantity,
            style: {
              width: '40px',
              textAlign: 'center',
              border: 'none',
              background: 'transparent',
              color: Config.get('quantitySelectorFontColor'),
              fontSize: `${Config.get('quantitySelectorFontSize')}px`,
              padding: '0',
              '-moz-appearance': 'textfield',
              margin: '0',
              '-webkit-appearance': 'none'
            },
            onkeydown: function(e) {
              if (e.key === 'Enter') {
                e.preventDefault();
                return false;
              }
            },
            onchange: function() {
              let value = parseInt(this.value);
              if (isNaN(value) || value < 1) {
                this.value = 1;
              }
            },
            onfocus: function() {
              this.select();
            }
          });
          
          // Create plus button
          var plusBtn = DOM.create('button', {
            type: 'button',
            className: 'carty-quantity-btn carty-plus-btn',
            text: '+',
            style: {
              padding: '0 10px',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              color: Config.get('quantitySelectorFontColor'),
              fontSize: `${Config.get('quantitySelectorFontSize')}px`,
              lineHeight: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            },
            onclick: function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              var input = this.parentNode.querySelector('input');
              let value = parseInt(input.value) + 1;
              input.value = value;
              
              // Create and dispatch change event
              var event = new Event('change', { bubbles: true });
              input.dispatchEvent(event);
            }
          });
          
          // Assemble the component
          container.appendChild(minusBtn);
          container.appendChild(input);
          container.appendChild(plusBtn);
          
          // Add a way to get the value
          container.getValue = function() {
            return parseInt(input.value) || 1;
          };
          
          return container;
        } catch (error) {
          Utils.logError('Error creating quantity selector:', error);
          
          // Return a minimal fallback
          var fallbackContainer = DOM.create('div', {
            className: 'carty-quantity-selector-fallback',
            text: '1'
          });
          
          fallbackContainer.getValue = function() {
            return 1;
          };
          
          return fallbackContainer;
        }
      },
      
      /**
       * Create variant selector
       * @param {Object} product - Product data
       * @param {string|number} selectedVariantId - Selected variant ID
       * @param {Function} onVariantChange - Variant change callback
       * @returns {Element} Variant selector element
       */
      createVariantSelector: function(product, selectedVariantId, onVariantChange) {
        try {
          // If no variants or just one, return null
          if (!product || !product.variants || product.variants.length <= 1) {
            return null;
          }
          
          // Default to first variant if none selected
          if (!selectedVariantId) {
            var defaultVariant = ProductService.getDefaultVariant(product);
            selectedVariantId = defaultVariant ? defaultVariant.id : product.variants[0].id;
          }
          
          // Determine if we're creating a single dropdown or multiple option selectors
          if (Config.get('enableMultipleVariantSelectors') && product.options.length > 1) {
            return this.createMultipleVariantSelectors(product, selectedVariantId, onVariantChange);
          } else {
            return this.createSingleVariantSelector(product, selectedVariantId, onVariantChange);
          }
        } catch (error) {
          Utils.logError('Error creating variant selector:', error);
          
          // Return a minimal fallback
          var fallback = DOM.create('div', {
            className: 'carty-variant-selector-error',
            text: 'Error loading variants'
          });
          
          return fallback;
        }
      },
      
      /**
       * Create single variant selector
       * @param {Object} product - Product data
       * @param {string|number} selectedVariantId - Selected variant ID
       * @param {Function} onVariantChange - Variant change callback
       * @returns {Element} Variant selector element
       */
      createSingleVariantSelector: function(product, selectedVariantId, onVariantChange) {
        try {
          var container = DOM.create('div', {
            className: 'carty-variant-selector-container'
          });
          
          // Get proper variant label
          let variantLabelText = "Options";
          
          // If product has exactly one option, use that option's name
          if (product.options && product.options.length === 1) {
            variantLabelText = product.options[0].name;
          }
          
          if (Config.get('showVariantSelectorLabel')) {
            var label = DOM.create('label', {
              className: 'carty-variant-label',
              text: variantLabelText,
              style: {
                display: 'block',
                marginBottom: '5px',
                fontSize: Config.get('variantSelectorLabelFontSize') + 'px',
                color: Config.get('variantSelectorLabelFontColor'),
                fontWeight: Config.get('variantSelectorLabelFontStyle') === 'BOLD' ? 'bold' : 'normal',
                fontStyle: Config.get('variantSelectorLabelFontStyle') === 'ITALIC' ? 'italic' : 'normal',
                fontFamily: Config.get('variantSelectorLabelFontFamily', 'inherit')
              }
            });
            container.appendChild(label);
          }
          
          // Create the selector
          var selector = DOM.create('select', {
            className: 'carty-variant-selector',
            style: {
              width: '100%',
              height: '40px',
              margin: '5px 0',
              padding: '5px 10px',
              backgroundColor: Config.get('advancedBackgroundColor', 
                Config.get('variantSelectorBackgroundColor', '#fff')),
              color: Config.get('advancedFontColor', 
                Config.get('variantSelectorFontColor', '#333')),
              border: `${Config.get('advancedBorderSize', 1)}px solid ${
                Config.get('advancedBorderColor', 
                Config.get('variantSelectorBorderColor', '#ddd'))}`,
              borderRadius: `${Config.get('advancedBorderRadius', 
                Config.get('variantSelectorBorderRadius', 4))}px`,
              fontSize: `${Config.get('advancedFontSize', 
                Config.get('variantSelectorFontSize', 14))}px`,
              fontWeight: (Config.get('advancedFontStyle', 
                Config.get('variantSelectorFontStyle'))) === 'BOLD' ? 'bold' : 'normal',
              fontStyle: (Config.get('advancedFontStyle', 
                Config.get('variantSelectorFontStyle'))) === 'ITALIC' ? 'italic' : 'normal',
              cursor: 'pointer',
              appearance: 'none',
              '-webkit-appearance': 'none',
              '-moz-appearance': 'none',
              backgroundImage: 'linear-gradient(45deg, transparent 50%, #333 50%), linear-gradient(135deg, #333 50%, transparent 50%)',
              backgroundPosition: 'calc(100% - 14px) calc(1em + 2px), calc(100% - 10px) calc(1em + 2px)',
              backgroundSize: '4px 4px',
              backgroundRepeat: 'no-repeat',
              fontFamily: Config.get('advancedFontFamily', 
                Config.get('variantSelectorFontFamily', 'inherit'))
            },
            onchange: function() {
              var variantId = this.value;
              if (onVariantChange && typeof onVariantChange === 'function') {
                onVariantChange(variantId);
              }
            }
          });
          
          // Get variants to show in the dropdown
          let variants = [];
          try {
            variants = Config.get('showAllVariants') ?
              product.variants :
              ProductService.getAvailableVariants(product);
          } catch (e) {
            Utils.logError('Error getting variants:', e);
            variants = product.variants || [];
          }
          
          // Check if we should show prices
          let showPrices = false;
          try {
            showPrices = Config.get('showVariantPrice') && 
              ProductService.hasVariantWithDifferentPrices(product);
          } catch (e) {
            Utils.logError('Error checking variant prices:', e);
          }
          
          // Add options for each variant
          variants.forEach(variant => {
            var option = document.createElement('option');
            option.value = variant.id;
            
            // Construct the option text
            let optionText = variant.title;
            
            // Add price if needed
            if (showPrices) {
              let formattedPrice = '';
              try {
                formattedPrice = Utils.formatMoney(variant.price);
              } catch (e) {
                formattedPrice = Utils.getCurrencySymbol() + (variant.price / 100).toFixed(2);
              }
              optionText += ` - ${formattedPrice}`;
            }
            
            option.textContent = optionText;
            
            // Set selected if this is the current variant
            if (variant.id == selectedVariantId) {
              option.selected = true;
            }
            
            // Disable if not available
            if (!variant.available && !Config.get('showSoldOutButton')) {
              option.disabled = true;
              option.style.color = '#999';
            }
            
            selector.appendChild(option);
          });
          
          container.appendChild(selector);
          
          return container;
        } catch (error) {
          Utils.logError('Error in createSingleVariantSelector:', error);
          return DOM.create('div', {
            className: 'carty-variant-selector-error',
            text: 'Error loading variants'
          });
        }
      },
      
      /**
       * Create multiple variant selectors
       * @param {Object} product - Product data
       * @param {string|number} selectedVariantId - Selected variant ID
       * @param {Function} onVariantChange - Variant change callback
       * @returns {Element} Variant selectors container
       */
      createMultipleVariantSelectors: function(product, selectedVariantId, onVariantChange) {
        // This is a more complex implementation that we'll handle later
        // For now, just use the single variant selector
        return this.createSingleVariantSelector(product, selectedVariantId, onVariantChange);
      },
      
      /**
       * Create add to cart button
       * @param {string|number} variantId - Variant ID
       * @param {Object} product - Product data
       * @param {Element} quantitySelector - Quantity selector
       * @returns {Element} Button element
       */
      createAddToCartButton: function(variantId, product, quantitySelector) {
        try {
          // Store the initial variantId
          let currentVariantId = variantId;
          let isProcessing = false;
          
          // Get button styles from config
          var buttonText = Config.get('buttonText', 'Add to Cart');
          var buttonAddedText = Config.get('buttonAddedText', 'Added!');
          var buttonBackgroundColor = Config.get('buttonBackgroundColor', '#000000');
          var buttonFontColor = Config.get('buttonFontColor', '#ffffff');
          var buttonBorderSize = Config.get('buttonBorderSize', '0');
          var buttonBorderColor = Config.get('buttonBorderColor', '#000000');
          var buttonBorderRadius = Config.get('buttonBorderRadius', '4');
          var buttonFontSize = Config.get('buttonFontSize', '15');
          var buttonFontStyle = Config.get('buttonFontStyle', 'NORMAL');
          var buttonFontFamily = Config.get('buttonFontFamily', 'inherit');
          
          var button = DOM.create('button', {
            type: 'button',
            className: 'carty-add-to-cart',
            text: buttonText,
            'data-variant-id': currentVariantId,
            'data-product-id': product.id,
            style: {
              width: '100%',
              height: '40px',
              backgroundColor: buttonBackgroundColor,
              color: buttonFontColor,
              border: `${buttonBorderSize}px solid ${buttonBorderColor}`,
              borderRadius: `${buttonBorderRadius}px`,
              fontSize: `${buttonFontSize}px`,
              fontWeight: buttonFontStyle.includes('BOLD') ? 'bold' : 'normal',
              fontStyle: buttonFontStyle.includes('ITALIC') ? 'italic' : 'normal',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
              textAlign: 'center',
              fontFamily: buttonFontFamily,
              textTransform: 'none',
              outline: 'none',
              padding: '0 10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              position: 'relative',
              display: 'block'
            },
            onmouseover: function() {
              if (!isProcessing) {
                this.style.opacity = '0.8';
              }
            },
            onmouseout: function() {
              this.style.opacity = '1';
            },
            onclick: function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              // Prevent multiple clicks
              if (isProcessing) return;
              isProcessing = true;
              
              // Get the latest variant ID
              var finalVariantId = this.getAttribute('data-variant-id') || currentVariantId;
              Utils.log(`Add to cart button clicked - variant ID: ${finalVariantId}`);
              
              var quantity = quantitySelector ? quantitySelector.getValue() : 1;
              
              // Disable button and show loading state
              this.disabled = true;
              this.textContent = '...';
              
              // Add to cart
              CartService.addToCart(finalVariantId, quantity)
                .then(data => {
                  button.textContent = buttonAddedText;
                  
                  // Check if we should use custom drawer
                  if (Config.get('isSlideCartEnabled') && Carty.getModule('slideCart')) {
                    Carty.getModule('slideCart').openCartDrawer();
                  } else {
                    // Use the standard cart behavior
                    CartService.openCart();
                  }
                  
                  setTimeout(function() {
                    button.disabled = false;
                    button.textContent = buttonText;
                    isProcessing = false;
                  }, 2000);
                })
                .catch(error => {
                  button.disabled = false;
                  button.textContent = buttonText;
                  isProcessing = false;
                  
                  // Show error message
                  var errorContainer = button.closest('.carty-widget')
                    .querySelector('.carty-error');
                  
                  if (errorContainer) {
                    errorContainer.textContent = error.message || 'Error adding item to cart';
                    errorContainer.style.display = 'block';
                    
                    // Hide after 5 seconds
                    setTimeout(() => {
                      errorContainer.style.display = 'none';
                    }, 5000);
                  }
                });
            }
          });
          
          return button;
        } catch (error) {
          Utils.logError('Error creating add to cart button:', error);
          return DOM.create('button', {
            type: 'button',
            disabled: true,
            text: 'Error'
          });
        }
      },
      
      /**
       * Create sold out button
       * @returns {Element} Sold out button
       */
      createSoldOutButton: function() {
        try {
          // Use the appropriate text from config
          var soldOutText = Config.get('soldOutButtonText') || 
                             Config.get('showSoldOutButtonText') || 
                             "Sold Out";
          
          var button = DOM.create('button', {
            type: 'button',
            className: 'carty-sold-out',
            disabled: true,
            text: soldOutText,
            style: {
              width: '100%',
              height: '40px',
              backgroundColor: Config.get('soldOutButtonBackgroundColor', '#999'),
              color: Config.get('soldOutButtonFontColor', '#fff'),
              border: `${Config.get('soldOutButtonBorderSize', 1)}px solid ${Config.get('soldOutButtonBorderColor', '#666')}`,
              borderRadius: `${Config.get('soldOutButtonBorderRadius', 4)}px`,
              fontSize: `${Config.get('soldOutButtonFontSize', 15)}px`,
              fontWeight: Config.get('soldOutButtonFontStyle') === 'BOLD' ? 'bold' : 'normal',
              fontStyle: Config.get('soldOutButtonFontStyle') === 'ITALIC' ? 'italic' : 'normal',
              cursor: 'not-allowed',
              opacity: '0.7',
              textAlign: 'center',
              fontFamily: Config.get('soldOutButtonFontFamily', Config.get('buttonFontFamily', 'inherit')),
              padding: '0 10px'
            }
          });
          
          return button;
        } catch (error) {
          Utils.logError('Error creating sold out button:', error);
          return DOM.create('button', {
            type: 'button',
            disabled: true,
            text: 'Sold Out'
          });
        }
      },
      
      /**
       * Create error message element
       * @returns {Element} Error message element
       */
      createErrorMessage: function() {
        try {
          var errorElement = DOM.create('div', {
            className: 'carty-error',
            style: {
              color: '#cc0000',
              backgroundColor: '#ffeded',
              padding: '8px',
              marginTop: '10px',
              borderRadius: '4px',
              fontSize: '14px',
              textAlign: 'center',
              display: 'none'
            }
          });
          
          return errorElement;
        } catch (error) {
          Utils.logError('Error creating error message:', error);
          return DOM.create('div');
        }
      },
      
      /**
       * Update product image when variant changes
       * @param {Element} productLink - Product link element
       * @param {string} imageUrl - New image URL
       */
      updateProductImage: function(productLink, imageUrl) {
        if (!imageUrl) return;
        
        try {
          // Find the product container
          var container = this.findProductContainer(productLink);
          if (!container) return;
          
          // Find product images
          var productImages = container.querySelectorAll(
            '[id^="ProductCardImage-"], .grid-view-item__image, .lazyloaded, ' +
            '.card__image img, .product-card__image, .product-item__image'
          );
          
          if (productImages.length > 0) {
            // Process images
            for (var img of productImages) {
              // Check if this is a main product image (not a tiny icon)
              if (img.offsetWidth > 50 || img.width > 50) {
                // Store the original image data for recovery
                if (Config.get('buttonRecovery', true)) {
                  if (img.src) DOM.attr(img, 'data-original-src', img.src);
                  if (DOM.getAttr(img, 'srcset')) DOM.attr(img, 'data-original-srcset', DOM.getAttr(img, 'srcset'));
                  if (DOM.getAttr(img, 'data-srcset')) DOM.attr(img, 'data-original-data-srcset', DOM.getAttr(img, 'data-srcset'));
                }
                
                // Update the image
                img.src = imageUrl;
                DOM.removeAttr(img, 'srcset'); // Remove responsive srcset
                
                // Handle data attributes used by lazy loading
                if (DOM.getAttr(img, 'data-src')) DOM.attr(img, 'data-src', imageUrl);
                if (DOM.getAttr(img, 'data-srcset')) DOM.attr(img, 'data-srcset', '');
                if (DOM.getAttr(img, 'data-widths')) DOM.attr(img, 'data-widths', '');
                
                // Force the browser to acknowledge the image change
                DOM.addClass(img, 'variant-image-updated');
                
                return; // Exit after successfully updating
              }
            }
          }
          
          // Fallback to background images
          var imageWrappers = container.querySelectorAll(
            '.image-wrapper, .card__media, .grid-view-item, [class*="image"]'
          );
          
          for (var wrapper of imageWrappers) {
            var computedStyle = getComputedStyle(wrapper);
            if (computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none') {
              if (Config.get('buttonRecovery', true)) {
                DOM.attr(wrapper, 'data-original-bg', computedStyle.backgroundImage);
              }
              wrapper.style.backgroundImage = `url('${imageUrl}')`;
              return;
            }
          }
        } catch (error) {
          Utils.logError('Error updating product image:', error);
        }
      },
      
      /**
       * Restore original product image
       * @param {Element} productLink - Product link element
       */
      restoreProductImage: function(productLink) {
        // Only restore if recovery is enabled
        if (!Config.get('buttonRecovery')) return;
        
        try {
          var container = this.findProductContainer(productLink);
          var imageElements = Array.from(container.querySelectorAll('img'));
          
          if (imageElements.length === 0) return;
          
          // Try to find the main product image
          let mainImage = container.querySelector(
            '.product-image, .product__image, .product-img, ' +
            '.card__media img, .grid-product__image, .grid-view-item__image'
          );
          
          if (!mainImage) {
            mainImage = imageElements[0];
          }
          
          // Restore original src if it exists
          if (DOM.getAttr(mainImage, 'data-original-src')) {
            DOM.attr(mainImage, 'src', DOM.getAttr(mainImage, 'data-original-src'));
          }
          
          // Restore original srcset if it exists
          if (DOM.getAttr(mainImage, 'data-original-srcset')) {
            DOM.attr(mainImage, 'srcset', DOM.getAttr(mainImage, 'data-original-srcset'));
          }
          
          // Restore original data-srcset if it exists
          if (DOM.getAttr(mainImage, 'data-original-data-srcset')) {
            DOM.attr(mainImage, 'data-srcset', DOM.getAttr(mainImage, 'data-original-data-srcset'));
          }
          
          // Restore background images
          container.querySelectorAll('[data-original-bg]').forEach(el => {
            el.style.backgroundImage = DOM.getAttr(el, 'data-original-bg');
          });
        } catch (error) {
          Utils.logError('Error restoring product image:', error);
        }
      },
      
      /**
       * Apply button alignment
       */
      applyButtonAlignment: function() {
        // Only apply alignment if it's enabled in config
        if (!Config.get('alignWidgets', true)) return;
        
        // Group containers by visible rows
        var rows = this.groupContainersByRow();
        
        // Skip if no rows found
        if (Object.keys(rows).length === 0) return;
        
        Utils.log(`Aligning buttons across ${Object.keys(rows).length} rows`);
        
        // Process each row separately
        for (var rowKey in rows) {
          var rowContainers = rows[rowKey];
          
          // Skip single-item rows
          if (rowContainers.length <= 1) continue;
          
          // Apply padding strategy
          this.applyPaddingStrategy(rowContainers);
        }
      },
      
      /**
       * Group containers by visible rows
       * @returns {Object} Containers grouped by row
       */
      groupContainersByRow: function() {
        var containers = document.querySelectorAll('[data-carty-container="true"]');
        var rows = {};
        
        Array.from(containers).forEach(container => {
          var rect = container.getBoundingClientRect();
          // Group by approximate row (round to nearest 5px)
          var rowKey = Math.round(rect.top / 5) * 5;
          
          if (!rows[rowKey]) {
            rows[rowKey] = [];
          }
          
          rows[rowKey].push(container);
        });
        
        return rows;
      },
      
      /**
       * Apply padding strategy for alignment
       * @param {Array<Element>} containers - Containers to align
       */
      applyPaddingStrategy: function(containers) {
        try {
          // Reset any existing padding
          containers.forEach(container => {
            var widget = container.querySelector('.carty-widget');
            if (widget) widget.style.paddingTop = '0';
          });
          
          // Calculate heights after reset
          var heights = containers.map(container => {
            var rect = container.getBoundingClientRect();
            var widget = container.querySelector('.carty-widget');
            
            if (!widget) return 0;
            
            var widgetRect = widget.getBoundingClientRect();
            var contentHeight = widgetRect.top - rect.top;
            
            return contentHeight;
          });
          
          // Find maximum content height
          var maxHeight = Math.max(...heights.filter(h => h > 0));
          
          // Apply padding to align all buttons
          containers.forEach((container, index) => {
            var widget = container.querySelector('.carty-widget');
            if (!widget) return;
            
            var currentHeight = heights[index];
            var paddingNeeded = maxHeight - currentHeight;
            
            // Only apply significant padding values (>1px)
            if (paddingNeeded > 1) {
              // Safety check - don't apply extreme values
              var safePadding = Math.min(paddingNeeded, 150);
              widget.style.paddingTop = safePadding + 'px';
            }
          });
        } catch (e) {
          Utils.logError('Alignment error:', e);
        }
      },
      
      /**
       * Check if Carty should be shown on current page
       * @returns {boolean} Whether Carty should be shown
       */
      shouldShowOnCurrentPage: function() {
        var pathname = window.location.pathname;
        
        // Home page detection
        var isHomePage = pathname === '/' || pathname === '/index' || pathname === '';
        
        // Collection page detection
        var isCollectionPage = pathname.includes('/collections/') && 
                                !pathname.includes('/products/');
        
        // Product page detection
        var isProductPage = pathname.includes('/products/') ||
          document.querySelector('.product-single') !== null ||
          document.querySelector('form[action^="/cart/add"]') !== null ||
          document.querySelector('product-form') !== null;
        
        // Search results page detection
        var isSearchResultsPage = pathname.includes('/search') ||
          document.querySelector('.search-results') !== null ||
          document.querySelector('body.search') !== null;
        
        return (isHomePage && Config.get('showOnHomepage')) ||
          (isCollectionPage && Config.get('showOnCollectionPage')) ||
          (isProductPage && Config.get('showOnProductPage')) ||
          (isSearchResultsPage && Config.get('showOnSearchResultsPage'));
      }
    };
    
    // Register the module
    Carty.registerModule('ui', UI);
  });
})();

/**
 * Carty - SlideCart Module
 * Handles custom cart drawer functionality
 * Version 5.0.0
 */
(function() {
  'use strict';

  // Wait for dependencies
  Carty.ready(['utils', 'config', 'dom', 'cart', 'product', 'ui'], function(Utils, Config, DOM, CartService, ProductService, UI) {
    // Module object
    var SlideCart = {
      /**
       * Module version
       */
      version: '5.0.0',

      /**
       * Cart state
       */
      isCartOpen: false,
      activeTimer: null,
      upsellProducts: [],
      upsellComponentMounted: false,

      /**
       * Initialize the slide cart
       * @returns {Promise} Initialization promise
       */
      init: function() {
        Utils.log('Initializing SlideCart module');

        // Only create cart if enabled
        if (!Config.get('isSlideCartEnabled')) {
          Utils.log('SlideCart is disabled, skipping initialization');
          return Promise.resolve();
        }

        try {
          // Create cart elements
          this.createCartElements();

          // Attach event listeners
          this.attachEventListeners();

          // Apply configuration options
          this.applyConfigOptions();

          // Set up intersection observer
          this.setupIntersectionObserver();

          // Initial cart data load
          this.refreshCart();

          Utils.log('SlideCart module initialized');
          return Promise.resolve();
        } catch (error) {
          Utils.logError('Error initializing SlideCart', error);
          return Promise.reject(error);
        }
      },

      /**
       * Create cart elements
       */
      createCartElements: function() {
        // Check if cart elements already exist
        if (document.getElementById('carty-slide-cart')) {
          return;
        }

        // Create the sliding cart drawer and add to the page
        var cartHTML = this.generateCartHTML();
        var cartContainer = DOM.create('div');
        DOM.html(cartContainer, cartHTML);
        document.body.appendChild(cartContainer);

        // Add cart styles
        this.addCartStyles();

        // Add discount functionality if enabled
        if (Config.get('slideCart.showDiscountInput')) {
          this.setupDiscountFunctionality();
        }
      },

      /**
       * Generate cart HTML structure
       * @returns {string} Cart HTML
       */
      generateCartHTML: function() {
        var translations = Config.get('slideCartTranslations') || {};
        
        return `
<div id="carty-slide-cart" class="carty-slide-cart">
  <div class="carty-slide-cart__overlay"></div>
  <div class="carty-slide-cart__container">
    <!-- Fixed header -->
    <div class="carty-slide-cart__header">
      <h2>${Utils.sanitizeHTML(translations.cartTitle || 'Your Shopping Bag')}</h2>
      <button class="carty-slide-cart__close" aria-label="Close cart">&times;</button>
    </div>
    
    <!-- Single scrollable content area -->
    <div class="carty-slide-cart__scrollable-content">
      <!-- Announcements section -->
      ${Config.get('announcements.show', false) ? 
        `<div class="carty-slide-cart__announcements"></div>` : ''}
      
      <!-- Achievements section -->
      ${Config.get('achievements.show', false) ? 
        `<div class="carty-slide-cart__achievements"></div>` : ''}
      
      <!-- Cart items -->
      <div class="carty-slide-cart__items-container">
        <div class="carty-slide-cart__empty-message" style="display: none;">
          ${Utils.sanitizeHTML(translations.cartEmptyText || 'Your shopping bag is empty')}
        </div>
        <div class="carty-slide-cart__items"></div>
      </div>
      
      <!-- Recommended products section -->
      ${Config.get('showUpsell', false) ? `
      <div class="carty-slide-cart__upsell">
        <div class="carty-slide-cart__divider"></div>
        <div class="carty-slide-cart__upsell-header">
          <h3 class="carty-slide-cart__upsell-title">${Utils.sanitizeHTML(Config.get('upsellSettings.title', 'Recommended Products'))}</h3>
          <button class="carty-slide-cart__upsell-toggle" aria-label="Toggle recommendations">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
        <div class="carty-slide-cart__upsell-products"></div>
        ${Config.get('upsellSettings.showBundleOption', true) ? 
          `<div class="carty-slide-cart__upsell-bundle"></div>` : ''}
      </div>
      ` : ''}
      
      <!-- Cart footer with subtotal and checkout options -->
      <div class="carty-slide-cart__footer">
        <div class="carty-slide-cart__divider"></div>
        
        <div class="carty-slide-cart__subtotal">
          <span>${Utils.sanitizeHTML(translations.subTotal || 'Subtotal')}</span>
          <span class="carty-slide-cart__subtotal-price">$0.00</span>
        </div>
        
        <!-- Note input -->
        ${Config.get('slideCart.showNoteInput', true) ? `
        <div class="carty-slide-cart__note">
          <label>${Utils.sanitizeHTML(translations.noteLabel || 'Order Notes')}</label>
          <textarea placeholder="${Utils.sanitizeHTML(translations.notePlaceholder || 'Add a note about your order')}"></textarea>
        </div>
        ` : ''}
        
        <!-- Discount input -->
        ${Config.get('slideCart.showDiscountInput', true) ? `
        <div class="carty-slide-cart__discount"></div>
        ` : ''}
        
        <div class="carty-slide-cart__buttons">
          <a href="/cart" class="carty-slide-cart__goto-cart-button">
            ${Utils.sanitizeHTML(translations.gotoCart || 'View Cart Page')}
          </a>
          <a href="/checkout" class="carty-slide-cart__checkout-button">
            ${Utils.sanitizeHTML(translations.checkout || 'Proceed to Checkout')}
          </a>
        </div>
        
        <div class="carty-slide-cart__continue">
          <a href="#" class="carty-slide-cart__continue-button">
            ${Utils.sanitizeHTML(translations.continueShopping || 'Continue Shopping')}
          </a>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Floating cart button -->
${Config.get('slideCart.showFloatingCartButton', true) ? `
<div id="carty-floating-cart-button" class="carty-floating-cart-button">
  <span class="carty-floating-cart-button__count">0</span>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
</div>
` : ''}`;
      },

      /**
       * Apply configuration options to the cart
       */
      applyConfigOptions: function() {
        try {
          // Handle discount input visibility
          var discountSection = DOM.findOne('.carty-slide-cart__discount');
          if (discountSection) {
            discountSection.style.display = Config.get('slideCart.showDiscountInput') ? 'block' : 'none';
          }

          // Handle note input visibility
          var noteSection = DOM.findOne('.carty-slide-cart__note');
          if (noteSection) {
            noteSection.style.display = Config.get('slideCart.showNoteInput') ? 'block' : 'none';
          }

          // Handle floating button visibility
          var floatingBtn = DOM.findOne('#carty-floating-cart-button');
          if (floatingBtn) {
            floatingBtn.style.display = Config.get('slideCart.showFloatingCartButton') ? 'flex' : 'none';
            this.applyFloatingButtonPosition();
          }

          // Handle announcements visibility
          var announcementsSection = DOM.findOne('.carty-slide-cart__announcements');
          if (announcementsSection) {
            announcementsSection.style.display = Config.get('announcements.show') ? 'block' : 'none';
          }

          // Handle achievements visibility
          var achievementsSection = DOM.findOne('.carty-slide-cart__achievements');
          if (achievementsSection) {
            achievementsSection.style.display = Config.get('achievements.show') ? 'block' : 'none';
          }

          // Handle upsell visibility
          var upsellSection = DOM.findOne('.carty-slide-cart__upsell');
          if (upsellSection) {
            upsellSection.style.display = Config.get('showUpsell') ? 'block' : 'none';
            
            // Apply displayMode styling to upsell container
            var productsContainer = DOM.findOne('.carty-slide-cart__upsell-products');
            if (productsContainer) {
              var displayMode = Config.get('upsellSettings.displayMode', 'list');
              
              if (displayMode === 'grid') {
                productsContainer.style.display = 'grid';
                productsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
                productsContainer.style.gap = '10px';
              } else if (displayMode === 'carousel') {
                productsContainer.style.display = 'flex';
                productsContainer.style.overflowX = 'auto';
                productsContainer.style.scrollSnapType = 'x mandatory';
                productsContainer.style.gap = '10px';
                productsContainer.style.padding = '5px 0';
              }
            }
            
            // Handle upsell heading visibility
            var upsellHeading = DOM.findOne('.carty-slide-cart__upsell-header');
            if (upsellHeading) {
              upsellHeading.style.display = Config.get('upsellSettings.showUpsellHeading') ? 'flex' : 'none';
            }
          }
        } catch (error) {
          Utils.logError('Error applying config options', error);
        }
      },

      /**
       * Apply floating button position based on settings
       */
      applyFloatingButtonPosition: function() {
        var floatingBtn = DOM.findOne('#carty-floating-cart-button');
        if (!floatingBtn) return;

        // Get position setting or use default
        var position = Config.get('slideCart.floatingButtonPosition', 'bottom-right');
        
        // Reset all positioning properties
        floatingBtn.style.top = '';
        floatingBtn.style.right = '';
        floatingBtn.style.bottom = '';
        floatingBtn.style.left = '';
        floatingBtn.style.transform = '';
        
        // Apply position based on setting
        switch (position) {
          case 'top-left':
            floatingBtn.style.top = '20px';
            floatingBtn.style.left = '20px';
            break;
          case 'top-right':
            floatingBtn.style.top = '20px';
            floatingBtn.style.right = '20px';
            break;
          case 'middle-left':
            floatingBtn.style.top = '50%';
            floatingBtn.style.left = '20px';
            floatingBtn.style.transform = 'translateY(-50%)';
            break;
          case 'middle-right':
            floatingBtn.style.top = '50%';
            floatingBtn.style.right = '20px';
            floatingBtn.style.transform = 'translateY(-50%)';
            break;
          case 'bottom-left':
            floatingBtn.style.bottom = '20px';
            floatingBtn.style.left = '20px';
            break;
          case 'bottom-right':
          default:
            floatingBtn.style.bottom = '20px';
            floatingBtn.style.right = '20px';
            break;
        }
      },

      /**
       * Set up discount functionality
       */
      setupDiscountFunctionality: function() {
        // Get container
        var discountContainer = DOM.findOne('.carty-slide-cart__discount');
        if (!discountContainer) return;
        
        // Get active discount codes
        var activeCodes = CartService.getActiveDiscountCodes ? 
                           CartService.getActiveDiscountCodes() : [];
        var firstActiveCode = activeCodes.length > 0 ? activeCodes[0].code : null;
        
        try {
          // Create discount input component
          var discountUI = UI.createDiscountInput(
            // Apply discount callback
            (code, callback) => {
              if (!code) {
                // Remove discount code
                CartService.removeDiscountCode(this.activeDiscountCode)
                  .then(result => {
                    if (result && result.success) {
                      this.activeDiscountCode = null;
                      
                      // Re-render discount UI
                      this.setupDiscountFunctionality();
                      
                      // Refresh cart
                      this.refreshCart();
                    }
                    
                    if (callback) callback(result && result.success, result && result.message);
                  });
              } else {
                // Apply discount code
                CartService.applyDiscountCode(code)
                  .then(result => {
                    if (result && result.success) {
                      this.activeDiscountCode = code;
                      
                      // Re-render discount UI
                      this.setupDiscountFunctionality();
                      
                      // Refresh cart
                      this.refreshCart();
                    }
                    
                    if (callback) callback(result && result.success, result && result.message);
                  });
              }
            },
            // Pass active code
            firstActiveCode || this.activeDiscountCode
          );
          
          // Clear and append to container
          if (discountUI && discountUI.element) {
            DOM.empty(discountContainer);
            discountContainer.appendChild(discountUI.element);
          } else {
            // Fallback if no valid element
            discountContainer.innerHTML = '<div class="carty-slide-cart__discount-fallback">Discount codes available at checkout</div>';
          }
        } catch (error) {
          Utils.logError('Error setting up discount functionality', error);
          discountContainer.innerHTML = '<div class="carty-slide-cart__discount-fallback">Discount codes available at checkout</div>';
        }
      },

      /**
       * Add CSS styles for the cart
       */
      addCartStyles: function() {
        var {
          primaryColor = '#007bff',
          cartBgColor = '#ffffff',
          floatingIcon = '#ffffff',
          floatingIconBg = '#000000',
          salePriceColor = '#D32F2F',
          comparePriceColor = '#777777'
        } = Config.get('slideCart') || {};

        var cartStyles = `
/* Reset styles to prevent theme conflicts */
.carty-slide-cart *,
.carty-slide-cart *::before,
.carty-slide-cart *::after {
  box-sizing: border-box !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
}

/* Base slide cart styles with enhanced animations */
.carty-slide-cart {
  display: none !important;
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  z-index: 2147483647 !important; /* Highest possible z-index */
  height: 100vh !important;
  width: 100vw !important;
  pointer-events: none !important; /* Allow clicks to pass through except on the drawer */
}

.carty-slide-cart--open {
  display: block !important;
  animation: cartyFadeIn 0.25s ease forwards !important;
}

@keyframes cartyFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.carty-slide-cart__overlay {
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  background-color: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(2px) !important;
  z-index: 1 !important;
  pointer-events: all !important; /* Capture clicks on the overlay */
  transition: opacity 0.3s ease-out !important;
}

.carty-slide-cart--open .carty-slide-cart__overlay {
  animation: cartyOverlayFadeIn 0.3s ease-out forwards !important;
}

@keyframes cartyOverlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Main container with enhanced animation */
.carty-slide-cart__container {
  position: fixed !important; /* Changed from absolute to fixed */
  top: 0 !important;
  right: 0 !important; 
  bottom: 0 !important;
  width: 100% !important;
  max-width: 500px !important;
  background-color: ${cartBgColor} !important;
  box-shadow: -5px 0 25px rgba(0, 0, 0, 0.15) !important;
  display: flex !important;
  flex-direction: column !important;
  transform: translateX(100%) !important;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
  overflow: hidden !important;
  z-index: 2 !important;
  pointer-events: all !important; /* Capture clicks on the container */
  height: 100% !important;
  border-radius: 0 !important;
}

/* Mobile styling - 80% width instead of full width */
@media (max-width: 768px) {
  .carty-slide-cart__container {
    width: 80% !important;
    right: 0 !important;
    left: auto !important;
    border-top-left-radius: 15px !important;
    border-bottom-left-radius: 15px !important;
    box-shadow: -5px 0 25px rgba(0, 0, 0, 0.2) !important;
  }
}

.carty-slide-cart--open .carty-slide-cart__container {
  transform: translateX(0) !important;
  animation: cartySlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

@keyframes cartySlideIn {
  0% { transform: translateX(100%); }
  100% { transform: translateX(0); }
}

body.carty-cart-open {
  overflow: hidden !important;
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
}

/* Fixed header with subtle shadow */
.carty-slide-cart__header {
  padding: 18px 20px !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  background-color: ${cartBgColor} !important;
  z-index: 3 !important;
  flex-shrink: 0 !important;
  position: sticky !important;
  top: 0 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03) !important;
  border-radius: 0 !important;
}

.carty-slide-cart__header h2 {
  margin: 0 !important;
  font-size: 20px !important;
  font-weight: 600 !important;
  color: #333333 !important;
  line-height: 1.2 !important;
  transform: translateY(0) !important;
  opacity: 1 !important;
  animation: cartyHeaderIn 0.4s ease-out !important;
}

@keyframes cartyHeaderIn {
  from {
    transform: translateY(-10px) !important;
    opacity: 0 !important;
  }
  to {
    transform: translateY(0) !important;
    opacity: 1 !important;
  }
}

.carty-slide-cart__close {
  background: none !important;
  border: none !important;
  font-size: 24px !important;
  cursor: pointer !important;
  padding: 0 !important;
  line-height: 1 !important;
  color: #333333 !important;
  width: 32px !important;
  height: 32px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  transition: background-color 0.2s ease, transform 0.2s ease !important;
}

.carty-slide-cart__close:hover {
  background-color: rgba(0, 0, 0, 0.05) !important;
  transform: rotate(90deg) !important;
}

/* Scrollable content */
.carty-slide-cart__scrollable-content {
  flex: 1 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  height: auto !important;
  max-height: calc(100vh - 50px) !important; /* Account for header */
  transform: translateY(10px) !important;
  animation: cartyContentFadeIn 0.4s 0.1s ease-out forwards !important;
}

@keyframes cartyContentFadeIn {
  from {
    opacity: 0 !important;
    transform: translateY(10px) !important;
  }
  to {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
}

.carty-slide-cart__scrollable-content::-webkit-scrollbar {
  width: 6px !important;
}

.carty-slide-cart__scrollable-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05) !important;
}

.carty-slide-cart__scrollable-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2) !important;
  border-radius: 3px !important;
}

/* Section dividers */
.carty-slide-cart__divider {
  height: 8px !important;
  background-color: #f5f5f5 !important;
  margin: 10px -16px !important;
  border-top: 1px solid rgba(0, 0, 0, 0.05) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
}

/* Enhanced Announcements and achievements */
.carty-slide-cart__announcements,
.carty-slide-cart__achievements {
  padding: 8px 16px !important;
}

.carty-slide-cart__announcement,
.carty-slide-cart__achievement {
  padding: 14px 16px !important;
  margin-bottom: 12px !important;
  border-radius: 10px !important;
  text-align: center !important;
  font-size: 14px !important;
  color: #333333 !important;
  line-height: 1.4 !important;
  background-color: #f7f7f7;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
  transform: translateY(0) !important;
  opacity: 1 !important;
  transition: all 0.3s ease !important;
  animation: cartyItemFadeIn 0.5s ease-out forwards !important;
}

/* Improved achievement progress bar */
.carty-achievement-progress-container {
  margin-top: 12px !important;
}

.carty-achievement-progress-bar {
  height: 12px !important;
  background-color: rgba(0, 0, 0, 0.05) !important;
  border-radius: 6px !important;
  position: relative !important;
  overflow: hidden !important;
  margin-bottom: 8px !important;
}

.carty-achievement-progress-fill {
  height: 100% !important;
  background: linear-gradient(90deg, ${primaryColor} 0%, ${primaryColor}CC 100%) !important;
  border-radius: 6px !important;
  width: 0;
  box-shadow: 0 0 10px ${primaryColor}66 !important;
  position: relative !important;
}

.carty-achievement-progress-fill::after {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  ) !important;
  transform: translateX(-100%) !important;
  animation: cartyProgressShine 2s infinite !important;
}

@keyframes cartyProgressShine {
  to { transform: translateX(200%) !important; }
}

.carty-achievement-progress-labels {
  display: flex !important;
  justify-content: space-between !important;
  font-size: 12px !important;
  color: #666 !important;
}

/* Enhanced timer styles */
.carty-timer {
  display: inline-flex !important;
  align-items: center !important;
  font-weight: bold !important;
  color: #e63946 !important;
  background-color: rgba(230, 57, 70, 0.1) !important;
  padding: 4px 8px !important;
  border-radius: 4px !important;
  margin: 0 4px !important;
}

.carty-timer-icon {
  margin-right: 5px !important;
  animation: cartyTimerPulse 1s infinite !important;
}

@keyframes cartyTimerPulse {
  0% { transform: scale(1) !important; }
  50% { transform: scale(1.2) !important; }
  100% { transform: scale(1) !important; }
}

.carty-timer-display {
  letter-spacing: 0.5px !important;
}

.carty-timer-expired {
  color: #e63946 !important;
  font-weight: 600 !important;
  background-color: rgba(230, 57, 70, 0.1) !important;
  padding: 4px 8px !important;
  border-radius: 4px !important;
  animation: cartyExpiredPulse 2s ease-in-out !important;
}

@keyframes cartyExpiredPulse {
  0% { background-color: rgba(230, 57, 70, 0.1) !important; }
  50% { background-color: rgba(230, 57, 70, 0.3) !important; }
  100% { background-color: rgba(230, 57, 70, 0.1) !important; }
}

/* Cart items container */
.carty-slide-cart__items-container {
  padding: 8px 16px !important;
}

.carty-slide-cart__empty-message {
  text-align: center !important;
  padding: 40px 0 !important;
  color: #777 !important;
  font-size: 15px !important;
  animation: cartyFadeIn 0.4s ease !important;
}

/* Animated cart items */
.carty-slide-cart__item {
  display: flex !important;
  margin-bottom: 16px !important;
  padding-bottom: 16px !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
  position: relative !important;
  transform: translateY(10px) !important;
  animation: cartyItemFadeIn 0.4s ease-out forwards !important;
}

.carty-slide-cart__item:nth-child(1) { animation-delay: 0.05s !important; }
.carty-slide-cart__item:nth-child(2) { animation-delay: 0.1s !important; }
.carty-slide-cart__item:nth-child(3) { animation-delay: 0.15s !important; }
.carty-slide-cart__item:nth-child(4) { animation-delay: 0.2s !important; }
.carty-slide-cart__item:nth-child(5) { animation-delay: 0.25s !important; }

@keyframes cartyItemFadeIn {
  from {
    opacity: 0 !important;
    transform: translateY(10px) !important;
  }
  to {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
}

.carty-slide-cart__item-image {
  width: 75px !important;
  height: 75px !important;
  min-width: 75px !important;
  background-size: cover !important;
  background-position: center !important;
  border-radius: 8px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  margin-right: 14px !important;
  cursor: pointer !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease !important;
  overflow: hidden !important;
}

.carty-slide-cart__item-image:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.carty-slide-cart__item-content {
  flex: 1 !important;
  min-width: 0 !important;
}

.carty-slide-cart__item-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: flex-start !important;
  margin-bottom: 4px !important;
}

.carty-slide-cart__item-title {
  margin: 0 !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #333 !important;
  line-height: 1.3 !important;
  cursor: pointer !important;
  padding-right: 24px !important;
  width: 100% !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  transition: color 0.2s ease !important;
}

.carty-slide-cart__item-title:hover {
  color: ${primaryColor} !important;
}

.carty-slide-cart__item-variant {
  font-size: 12px !important;
  color: #777 !important;
  margin-bottom: 6px !important;
}

.carty-slide-cart__item-subscription {
  font-size: 12px !important;
  color: #017a01 !important;
  margin-top: 4px !important;
}

.carty-slide-cart__item-bundle {
  font-size: 12px !important;
  color: ${primaryColor} !important;
  margin-top: 4px !important;
  font-weight: 600 !important;
}

.carty-slide-cart__item-price-row {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-top: 8px !important;
}

.carty-slide-cart__item-price {
  font-weight: 600 !important;
  color: #333 !important;
  font-size: 14px !important;
}

/* Enhanced quantity selector */
.carty-slide-cart__item-quantity {
  display: flex !important;
  align-items: center !important;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  border-radius: 6px !important;
  overflow: hidden !important;
  background-color: #fff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}

.carty-slide-cart__quantity-button {
  background: none !important;
  border: none !important;
  width: 32px !important;
  height: 32px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 18px !important;
  cursor: pointer !important;
  color: #333 !important;
  padding: 0 !important;
  transition: background-color 0.2s !important;
  font-weight: bold !important;
  background-color: #f9f9f9 !important;
}

.carty-slide-cart__quantity-button:hover {
  background-color: #f0f0f0 !important;
}

.carty-slide-cart__quantity-button:active {
  transform: scale(0.95) !important;
}

.carty-slide-cart__quantity-input {
  width: 32px !important;
  text-align: center !important;
  border: none !important;
  font-size: 14px !important;
  background: transparent !important;
  color: #333 !important;
  padding: 0 !important;
  -moz-appearance: textfield !important;
  font-weight: 500 !important;
}

.carty-slide-cart__quantity-input::-webkit-outer-spin-button,
.carty-slide-cart__quantity-input::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}

.carty-slide-cart__item-remove {
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  background: none !important;
  border: none !important;
  color: #999 !important;
  width: 28px !important;
  height: 28px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  padding: 0 !important;
  font-size: 18px !important;
  border-radius: 50% !important;
  transition: all 0.2s !important;
}

.carty-slide-cart__item-remove:hover {
  color: #e63946 !important;
  background-color: rgba(230, 57, 70, 0.1) !important;
  transform: rotate(90deg) !important;
}

/* Upsell section */
.carty-slide-cart__upsell {
  padding: 8px 16px 12px !important;
  animation: cartyFadeIn 0.4s 0.3s ease both !important;
}

.carty-slide-cart__upsell-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin: 12px 0 10px !important;
  cursor: pointer !important;
}

.carty-slide-cart__upsell-title {
  font-size: 16px !important;
  font-weight: 600 !important;
  margin: 0 !important;
  color: #333 !important;
  text-align: left !important;
}

.carty-slide-cart__upsell-toggle {
  background: none !important;
  border: none !important;
  padding: 5px !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #666 !important;
  transition: transform 0.3s ease !important;
}

.carty-slide-cart__upsell--collapsed .carty-slide-cart__upsell-toggle {
  transform: rotate(-90deg) !important;
}

.carty-slide-cart__upsell--collapsed .carty-slide-cart__upsell-products,
.carty-slide-cart__upsell--collapsed .carty-slide-cart__upsell-bundle {
  display: none !important;
}

/* Enhanced upsell products */
.carty-upsell-product {
  display: flex !important;
  margin-bottom: 16px !important;
  padding-bottom: 16px !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
  position: relative !important;
  transform: translateY(10px) !important;
  animation: cartyItemFadeIn 0.4s ease-out forwards !important;
}

.carty-upsell-product:nth-child(1) { animation-delay: 0.1s !important; }
.carty-upsell-product:nth-child(2) { animation-delay: 0.15s !important; }
.carty-upsell-product:nth-child(3) { animation-delay: 0.2s !important; }

.carty-upsell-product:last-child {
  margin-bottom: 0 !important;
  border-bottom: none !important;
}

.carty-upsell-product__image {
  width: 60px !important;
  height: 60px !important;
  min-width: 60px !important;
  background-size: cover !important;
  background-position: center !important;
  border-radius: 8px !important;
  margin-right: 12px !important;
  flex-shrink: 0 !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  cursor: pointer !important;
  transition: transform 0.3s ease !important;
}

.carty-upsell-product__image:hover {
  transform: scale(1.05) !important;
}

.carty-upsell-product__content {
  flex: 1 !important;
  min-width: 0 !important;
}

.carty-upsell-product__title {
  font-size: 14px !important;
  font-weight: 500 !important;
  margin-bottom: 6px !important;
  color: #333 !important;
  cursor: pointer !important;
  line-height: 1.3 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  transition: color 0.2s ease !important;
}

.carty-upsell-product__title:hover {
  color: ${primaryColor} !important;
}

.carty-upsell-product__price-row {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
}

.carty-upsell-product__price {
  font-size: 13px !important;
  font-weight: 600 !important;
  color: #333 !important;
}

.carty-upsell-product__compare-price {
  text-decoration: line-through !important;
  color: ${comparePriceColor} !important;
  font-size: 12px !important;
  margin-right: 4px !important;
  font-weight: 400 !important;
}

.carty-upsell-product__current-price {
  color: ${salePriceColor} !important;
}

.carty-upsell-product__add-button {
  background-color: ${primaryColor} !important;
  color: #fff !important;
  border: none !important;
  border-radius: 6px !important;
  padding: 6px 14px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.2s !important;
  letter-spacing: 0.5px !important;
  text-transform: uppercase !important;
  box-shadow: 0 2px 5px ${primaryColor}44 !important;
}

.carty-upsell-product__add-button:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 8px ${primaryColor}66 !important;
}

.carty-upsell-product__add-button:active {
  transform: translateY(0) !important;
}

/* Bundle button */
.carty-upsell-bundle {
  margin-top: 12px !important;
  padding-top: 12px !important;
  border-top: 1px solid rgba(0, 0, 0, 0.08) !important;
  animation: cartyFadeIn 0.4s 0.3s ease both !important;
}

.carty-upsell-bundle-button {
  width: 100% !important;
  background-color: ${primaryColor} !important;
  color: #fff !important;
  border: none !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  padding: 12px 15px !important;
  cursor: pointer !important;
  text-align: center !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 2px 8px ${primaryColor}44 !important;
  position: relative !important;
  overflow: hidden !important;
}

.carty-upsell-bundle-button:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px ${primaryColor}66 !important;
}

.carty-upsell-bundle-button:active {
  transform: translateY(0) !important;
}

.carty-upsell-bundle-button::after {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  ) !important;
  transform: translateX(-100%) !important;
}

.carty-upsell-bundle-button:hover::after {
  animation: cartyButtonShine 1.5s infinite !important;
}

@keyframes cartyButtonShine {
  to { transform: translateX(100%) !important; }
}

/* Footer section */
.carty-slide-cart__footer {
  padding: 0 16px 16px !important;
  transform: translateY(10px) !important;
  animation: cartyContentFadeIn 0.5s 0.2s ease-out forwards !important;
}

.carty-slide-cart__subtotal {
  display: flex !important;
  justify-content: space-between !important;
  margin: 16px 0 !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #333 !important;
}

/* Discount section */
.carty-slide-cart__discount {
  margin-bottom: 16px !important;
  transition: all 0.3s ease !important;
}

.carty-slide-cart__discount label {
  display: block !important;
  margin-bottom: 6px !important;
  font-size: 13px !important;
  color: #555 !important;
  font-weight: 500 !important;
}

.carty-slide-cart__discount-input-group {
  display: flex !important;
  margin-bottom: 8px !important;
}

.carty-slide-cart__discount-input {
  flex: 1 !important;
  height: 42px !important;
  padding: 0 12px !important;
  border: 1px solid rgba(0, 0, 0, 0.15) !important;
  border-radius: 8px 0 0 8px !important;
  font-size: 14px !important;
  color: #333 !important;
  transition: border-color 0.3s ease !important;
}

.carty-slide-cart__discount-input:focus {
  border-color: ${primaryColor} !important;
  outline: none !important;
}

.carty-slide-cart__discount-button {
  height: 42px !important;
  padding: 0 16px !important;
  background-color: ${primaryColor} !important;
  color: #fff !important;
  border: none !important;
  border-radius: 0 8px 8px 0 !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.carty-slide-cart__discount-button:hover {
  background-color: ${primaryColor}DD !important;
}

/* Active discount tags */
.carty-active-discount-tag {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background: #f8f9fa !important;
  padding: 12px 16px !important;
  border-radius: 8px !important;
  margin-top: 8px !important;
  border-left: 3px solid ${primaryColor} !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
  animation: cartySlideInFromLeft 0.4s ease !important;
}

@keyframes cartySlideInFromLeft {
  from {
    opacity: 0 !important;
    transform: translateX(-10px) !important;
  }
  to {
    opacity: 1 !important;
    transform: translateX(0) !important;
  }
}

/* Note section */
.carty-slide-cart__note {
  margin-bottom: 16px !important;
  transition: all 0.3s ease !important;
}

.carty-slide-cart__note label {
  display: block !important;
  margin-bottom: 6px !important;
  font-size: 13px !important;
  color: #555 !important;
  font-weight: 500 !important;
}

.carty-slide-cart__note textarea {
  width: 100% !important;
  height: 80px !important;
  padding: 12px !important;
  border: 1px solid rgba(0, 0, 0, 0.15) !important;
  border-radius: 8px !important;
  resize: none !important;
  font-size: 14px !important;
  color: #333 !important;
  transition: border-color 0.3s ease !important;
}

.carty-slide-cart__note textarea:focus {
  border-color: ${primaryColor} !important;
  outline: none !important;
  box-shadow: 0 0 0 1px ${primaryColor}33 !important;
}

/* Enhanced buttons */
.carty-slide-cart__buttons {
  display: flex !important;
  gap: 10px !important;
  margin-bottom: 12px !important;
}

.carty-slide-cart__checkout-button,
.carty-slide-cart__goto-cart-button {
  flex: 1 !important;
  height: 46px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-decoration: none !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  overflow: hidden !important;
}

.carty-slide-cart__checkout-button {
  background-color: ${primaryColor} !important;
  color: #fff !important;
  box-shadow: 0 4px 12px ${primaryColor}44 !important;
}

.carty-slide-cart__checkout-button:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px ${primaryColor}66 !important;
}

.carty-slide-cart__checkout-button:active {
  transform: translateY(0) !important;
}

.carty-slide-cart__checkout-button::after {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  ) !important;
  transform: translateX(-100%) !important;
}

.carty-slide-cart__checkout-button:hover::after {
  animation: cartyButtonShine 1.5s infinite !important;
}

.carty-slide-cart__goto-cart-button {
  background-color: #f1f1f1 !important;
  color: #333 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
}

.carty-slide-cart__goto-cart-button:hover {
  background-color: #e5e5e5 !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
}

.carty-slide-cart__continue {
  text-align: center !important;
  margin-top: 8px !important;
}

.carty-slide-cart__continue-button {
  display: inline-block !important;
  padding: 8px 12px !important;
  font-size: 14px !important;
  color: #777 !important;
  text-decoration: none !important;
  border-radius: 4px !important;
  transition: all 0.2s ease !important;
}

.carty-slide-cart__continue-button:hover {
  color: #333 !important;
  background-color: rgba(0, 0, 0, 0.05) !important;
}

/* Floating cart button */
.carty-floating-cart-button {
  position: fixed !important;
  width: 55px !important;
  height: 55px !important;
  border-radius: 50% !important;
  background-color: ${floatingIconBg} !important;
  color: ${floatingIcon} !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
  z-index: 9990 !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
}

.carty-floating-cart-button svg {
  width: 24px !important;
  height: 24px !important;
}

.carty-floating-cart-button__count {
  position: absolute !important;
  top: -5px !important;
  right: -5px !important;
  background-color: ${salePriceColor} !important;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  min-width: 20px !important;
  height: 20px !important;
  border-radius: 10px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 6px !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2) !important;
  animation: cartyBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
}

@keyframes cartyBounce {
  0%, 20% {
    transform: scale(0) !important;
  }
  50% {
    transform: scale(1.2) !important;
  }
  100% {
    transform: scale(1) !important;
  }
}

/* Loading state */
.carty-slide-cart__loading:after {
  content: '';
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background-color: rgba(255, 255, 255, 0.7) !important;
  z-index: 10 !important;
}

/* Very small screens */
@media (max-height: 600px) {
  .carty-slide-cart__header {
    padding: 10px 16px !important;
  }
  
  .carty-slide-cart__item {
    margin-bottom: 8px !important;
    padding-bottom: 8px !important;
  }
  
  .carty-slide-cart__item-image {
    width: 50px !important;
    height: 50px !important;
    min-width: 50px !important;
  }
  
  .carty-upsell-product {
    margin-bottom: 8px !important;
    padding-bottom: 8px !important;
  }
  
  .carty-upsell-product__image {
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
  }
  
  .carty-slide-cart__buttons {
    margin-bottom: 8px !important;
  }
  
  .carty-slide-cart__checkout-button, 
  .carty-slide-cart__goto-cart-button {
    height: 38px !important;
  }
}`;
      },

      /**
       * Render upsell products
       */
      renderUpsellProducts: function() {
        try {
          // Get required DOM elements
          var productsContainer = DOM.findOne('.carty-slide-cart__upsell-products');
          var bundleContainer = DOM.findOne('.carty-slide-cart__upsell-bundle');
          
          if (!productsContainer) return;
          
          // Clear existing content
          DOM.empty(productsContainer);
          if (bundleContainer) DOM.empty(bundleContainer);
          
          // Get display mode from config
          var displayMode = Config.get('upsellSettings.displayMode', 'list');
          
          // Determine max products to show
          var maxProducts = Math.min(
            Config.get('upsellSettings.maxProducts', 4),
            this.adjustUpsellCount()
          );
          
          // Limit products to display
          var productsToDisplay = this.upsellProducts.slice(0, maxProducts);
          
          // No products to show
          if (productsToDisplay.length === 0) return;
          
          // Apply display mode specific styles to container
          if (displayMode === 'grid') {
            DOM.setStyles(productsContainer, {
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              width: '100%'
            });
          } else if (displayMode === 'carousel') {
            DOM.setStyles(productsContainer, {
              display: 'flex',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              gap: '15px',
              width: '100%',
              padding: '5px 0 15px 0',
              scrollBehavior: 'smooth'
            });
          } else {
            // Default list view
            DOM.setStyles(productsContainer, {
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%'
            });
          }
          
          // Render each product
          productsToDisplay.forEach(product => {
            var productCard = UI.createUpsellProductCard(product, () => {
              // Refresh cart after adding product
              this.refreshCart();
            });
            
            if (productCard) {
              productsContainer.appendChild(productCard);
            }
          });
          
          // Create bundle option if enabled and we have enough products
          if (Config.get('upsellSettings.showBundleOption') && 
              bundleContainer && 
              productsToDisplay.length >= 2) {
            
            var bundleDiscount = Config.get('upsellSettings.bundleDiscount', 10);
            var bundleButton = UI.createBundleButton(
              productsToDisplay, 
              bundleDiscount,
              () => {
                // Refresh cart after adding bundle
                this.refreshCart();
              },
              // Pass cart items
              CartService.cart ? CartService.cart.items : []
            );
            
            if (bundleButton) {
              bundleContainer.appendChild(bundleButton);
            }
          }
        } catch (error) {
          Utils.logError('Error rendering upsell products', error);
        }
      },

      /**
       * Adjust upsell product count based on screen size
       * @returns {number} Adjusted count
       */
      adjustUpsellCount: function() {
        var windowHeight = window.innerHeight;
        var displayMode = Config.get('upsellSettings.displayMode', 'list');
        
        // For grid and carousel layouts, we can show more products
        if (displayMode === 'grid' || displayMode === 'carousel') {
          // For smaller screens, adjust grid/carousel items
          if (windowHeight < 600) {
            return 4; // Still show 4 products in grid/carousel on small screens
          } else {
            return Config.get('upsellSettings.maxProducts', 6); // Can show more in grid/carousel layouts
          }
        } else {
          // For standard list view, use stricter limits
          if (windowHeight < 600) {
            return 2; // Only 2 products on very small screens
          } else if (windowHeight < 750) {
            return 3; // 3 products on medium screens
          } else {
            return Config.get('upsellSettings.maxProducts', 4); // Full count on larger screens
          }
        }
      },

      /**
       * Render announcements in the cart
       */
      renderAnnouncements: function() {
        var container = DOM.findOne('.carty-slide-cart__announcements');
        if (!container) return;
        
        // Clear existing announcements but preserve timers
        var existingTimers = [];
        container.querySelectorAll('.carty-timer').forEach(timer => {
          var timerId = DOM.getAttr(timer, 'data-timer-id');
          if (timerId) existingTimers.push(timerId);
        });
        
        DOM.empty(container);
        
        // If announcements are disabled, hide the container
        if (!Config.get('announcements.show')) {
          DOM.hide(container);
          return;
        }
        
        DOM.show(container);
        
        // Render each announcement
        var announcements = Config.get('announcements.data', []);
        announcements.forEach((announcement, index) => {
          var announcementEl = this.createAnnouncementElement(announcement, index);
          if (announcementEl) {
            container.appendChild(announcementEl);
          }
        });
      },

      /**
       * Create announcement element
       * @param {Object} announcement - Announcement data
       * @param {number} index - Announcement index
       * @returns {Element} Announcement element
       */
      createAnnouncementElement: function(announcement, index) {
        var announcementEl = DOM.create('div', {
          className: 'carty-slide-cart__announcement',
          style: {
            animationDelay: `${0.1 + (index * 0.05)}s`
          }
        });
        
        // Apply custom background color
        if (announcement.bgColor) {
          announcementEl.style.backgroundColor = announcement.bgColor;
        }
        
        // Apply custom text color
        if (announcement.textColor) {
          announcementEl.style.color = announcement.textColor;
        }
        
        // Generate a consistent ID for this announcement
        var announcementId = announcement._id || 
                              `announcement_${index}_${announcement.text.slice(0, 10).replace(/\s+/g, '')}`;
        DOM.attr(announcementEl, 'data-announcement-id', announcementId);
        
        // Handle timer announcements
        if (announcement.timer && announcement.timer.show) {
          var timerContent = this.processAnnouncementTimer(announcement, announcementId);
          DOM.html(announcementEl, timerContent);
        } else {
          // Regular announcement without timer
          DOM.text(announcementEl, announcement.text);
        }
        
        return announcementEl;
      },

      /**
       * Process announcement timer
       * @param {Object} announcement - Announcement data
       * @param {string} announcementId - Announcement ID
       * @returns {string} Processed content with timer
       */
      processAnnouncementTimer: function(announcement, announcementId) {
        var timerStorageKey = 'timer_' + announcementId;
        
        // Get stored timer data
        let storedTimer = Utils.storage.get(timerStorageKey, null);
        
        // Check if we need to initialize or reset the timer
        var shouldResetTimer = !storedTimer || 
                              (announcement.timer.resetOnPageLoad && !window.cartyTimersInitialized);
        
        if (shouldResetTimer) {
          // Parse timer value
          var [minutes, seconds] = announcement.timer.timer.split(':').map(Number);
          var totalSeconds = (minutes * 60) + seconds;
          
          // Set up new timer with absolute end time
          storedTimer = {
            endTime: Date.now() + (totalSeconds * 1000),
            expired: false,
            totalDuration: totalSeconds * 1000
          };
          
          // Store the new timer
          Utils.storage.set(timerStorageKey, storedTimer);
        }
        
        // Mark timers as initialized for this page load
        if (!window.cartyTimersInitialized) {
          window.cartyTimersInitialized = true;
        }
        
        // Handle expired timers
        if (storedTimer.expired || (storedTimer.endTime && Date.now() > storedTimer.endTime)) {
          // Timer is expired - show expired message
          if (announcement.timer.expiryAction === 'showExpiryText') {
            return `
              <div class="carty-timer-expired">
                ${announcement.timer.expiredText || 'Offer has expired'}
              </div>
            `;
          } else if (announcement.timer.expiryAction === 'hideAnnouncement') {
            // Just don't show this announcement at all
            return '';
          }
        }
        
        // Timer is active - show timer
        // Calculate remaining time
        var now = Date.now();
        var remaining = Math.max(0, storedTimer.endTime - now);
        var remainingSeconds = Math.ceil(remaining / 1000);
        
        var mins = Math.floor(remainingSeconds / 60);
        var secs = remainingSeconds % 60;
        var timerDisplay = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        
        // Create timer HTML with unique ID
        var timerId = `carty_timer_${announcementId}_${index}`;
        var timerHTML = `
          <span class="carty-timer" data-timer-id="${timerId}">
            <span class="carty-timer-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </span>
            <span class="carty-timer-display" id="${timerId}">${timerDisplay}</span>
          </span>
        `;
        
        // Replace the {{TIMER}} placeholder with actual timer HTML
        var content = announcement.text.replace('{{TIMER}}', timerHTML);
        
        // Set up interval to update this specific timer
        // Clear any existing interval for this timer
        if (this.activeTimers && this.activeTimers[timerId]) {
          clearInterval(this.activeTimers[timerId]);
        }
        
        // Initialize activeTimers if needed
        if (!this.activeTimers) this.activeTimers = {};
        
        // Start a new interval for this timer
        this.activeTimers[timerId] = setInterval(() => {
          var timerElement = document.getElementById(timerId);
          if (!timerElement) {
            // Timer element no longer exists, clear interval
            clearInterval(this.activeTimers[timerId]);
            return;
          }
          
          // Get remaining time
          var now = Date.now();
          var timerData = Utils.storage.get(timerStorageKey);
          if (!timerData || !timerData.endTime) {
            clearInterval(this.activeTimers[timerId]);
            return;
          }
          
          var remaining = Math.max(0, timerData.endTime - now);
          var remainingSeconds = Math.ceil(remaining / 1000);
          
          if (remainingSeconds <= 0) {
            // Timer has expired
            timerData.expired = true;
            Utils.storage.set(timerStorageKey, timerData);
            
            clearInterval(this.activeTimers[timerId]);
            
            // Refresh announcements to show expired state
            this.renderAnnouncements();
            return;
          }
          
          // Update timer display
          var mins = Math.floor(remainingSeconds / 60);
          var secs = remainingSeconds % 60;
          timerElement.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }, 1000);
        
        return content;
      },
      
      /**
       * Render achievements in the cart based on cart value
       * @param {Object} cart - Cart data
       */
      renderAchievements: function(cart) {
        var container = DOM.findOne('.carty-slide-cart__achievements');
        if (!container) return;
        
        // Clear existing achievements
        DOM.empty(container);
        
        // If achievements are disabled, hide the container
        if (!Config.get('achievements.show')) {
          DOM.hide(container);
          return;
        }
        
        DOM.show(container);
        
        // Get achievements from config
        var achievements = Config.get('achievements.data', []);
        
        // Process each achievement
        achievements.forEach((achievement, index) => {
          var achievementEl = this.processAchievement(achievement, cart, index);
          if (achievementEl) {
            container.appendChild(achievementEl);
          }
        });
      },
      
      /**
       * Process a single achievement
       * @param {Object} achievement - Achievement data
       * @param {Object} cart - Cart data
       * @param {number} index - Achievement index
       * @returns {Element} Achievement element
       */
      processAchievement: function(achievement, cart, index) {
        if (!achievement || !cart) return null;
        
        var achievementEl = DOM.create('div', {
          className: 'carty-slide-cart__achievement',
          style: {
            animationDelay: `${0.1 + (index * 0.05)}s`
          }
        });
        
        // Apply custom background color
        if (achievement.bgColor) {
          achievementEl.style.backgroundColor = achievement.bgColor;
        }
        
        // Process achievement based on target type
        var targetType = achievement.targetType || 'price';
        let targetValue = parseFloat(achievement.minAmount || 0);
        let currentValue = 0;
        let message = '';
        let isAchieved = false;
        
        if (targetType === 'price') {
          // Calculate current cart value
          currentValue = cart.total_price / 100; // Convert cents to dollars
          
          // Check if target is reached
          isAchieved = currentValue >= targetValue;
          
          if (isAchieved) {
            // Show success message
            message = achievement.successText || 'Achievement unlocked!';
          } else {
            // Calculate remaining amount
            var remaining = targetValue - currentValue;
            
            // Format the remaining value
            var formattedRemaining = Utils.formatMoney(remaining * 100); // Convert back to cents for formatting
            
            // Replace placeholder in message
            message = achievement.text.replace('{{TARGET}}', formattedRemaining);
          }
        } else if (targetType === 'quantity') {
          // Count total items
          currentValue = cart.item_count || 0;
          
          // Check if target is reached
          isAchieved = currentValue >= targetValue;
          
          if (isAchieved) {
            // Show success message
            message = achievement.successText || 'Achievement unlocked!';
          } else {
            // Calculate remaining quantity
            var remaining = targetValue - currentValue;
            
            // Replace placeholder in message
            message = achievement.text.replace('{{TARGET}}', remaining);
          }
        } else if (targetType === 'product' && achievement.productId) {
          // Check if specific product is in cart
          var productInCart = cart.items.some(item => 
            String(item.product_id) === String(achievement.productId)
          );
          
          isAchieved = productInCart;
          
          if (isAchieved) {
            message = achievement.successText || 'Achievement unlocked!';
          } else {
            message = achievement.text;
          }
        }
        
        // Create content HTML
        let contentHTML = `
          <div class="carty-achievement-text">
            ${message}
          </div>
        `;
        
        // Add progress bar if showing price or quantity achievements
        if ((targetType === 'price' || targetType === 'quantity') && !isAchieved) {
          // Calculate progress percentage (capped at 100%)
          var progressPercent = Math.min(100, (currentValue / targetValue) * 100);
          
          contentHTML += `
            <div class="carty-achievement-progress-container">
              <div class="carty-achievement-progress-bar">
                <div class="carty-achievement-progress-fill" style="width: ${progressPercent}%"></div>
              </div>
              <div class="carty-achievement-progress-labels">
                <span>$0</span>
                <span>${Utils.formatMoney(targetValue * 100)}</span>
              </div>
            </div>
          `;
        }
        
        // Apply achieved styles
        if (isAchieved) {
          DOM.addClass(achievementEl, 'carty-achievement--achieved');
          
          // Apply success styles
          DOM.setStyles(achievementEl, {
            backgroundColor: '#e9f7ef',
            color: '#2ecc71',
            fontWeight: 'bold'
          });
        }
        
        DOM.html(achievementEl, contentHTML);
        return achievementEl;
      }
    };

    // Register the module
    Carty.registerModule('slidecart', SlideCart);
  });
})();



/**
 * Carty - Recommendations Module
 * Handles product recommendations, upsells, and frequently bought together logic
 * Version 5.0.0
 */
(function() {
  'use strict';

  // Wait for dependencies
  Carty.ready(['utils', 'config', 'cart', 'product'], function(Utils, Config, CartService, ProductService) {
    // Module object
    var Recommendations = {
      /**
       * Module version
       */
      version: '5.0.0',

      /**
       * Recommendations cache
       */
      cache: {
        recommendations: {},
        frequentlyBought: {},
        collectionProducts: {},
        lastCalculated: {}
      },

      /**
       * Initialize the recommendations module
       * @returns {Promise} Initialization promise
       */
      init: function() {
        Utils.log('Initializing recommendations module');

        // Set up event listeners
        this.setupEventListeners();

        // Initialize purchase history tracking
        this.initPurchaseHistory();
        
        // Load cached correlation data
        this.loadCorrelationData();

        Utils.log('Recommendations module initialized');
        return Promise.resolve();
      },

      /**
       * Set up event listeners
       */
      setupEventListeners: function() {
        // Listen for cart updates to refresh recommendations
        Carty.on('cart:updated', event => {
          // Check if we need to update on cart changes
          if (Config.get('upsellSettings.updateUpsellsOnCartChange', true)) {
            // Clear cache for product recommendations
            this.invalidateRecommendationCache();
          }
        });

        // Listen for product views to track for recommendations
        Carty.on('product:viewed', event => {
          if (event.data && event.data.product) {
            this.trackProductView(event.data.product);
          }
        });

        // Listen for purchase completed events
        Carty.on('checkout:completed', event => {
          if (event.data && event.data.order) {
            this.trackPurchase(event.data.order);
          }
        });
      },

      /**
       * Initialize purchase history tracking
       */
      initPurchaseHistory: function() {
        // Check if purchase tracking is enabled
        if (Config.get('privacy.requireConsentForTracking', false)) {
          // Only track if user has given consent
          var hasConsent = Utils.storage.get(Config.get('privacy.consentCookieName', 'carty_consent'), false);
          if (!hasConsent) {
            Utils.log('Purchase tracking disabled due to missing consent');
            return;
          }
        }

        // Get purchase history from storage
        this.purchaseHistory = Utils.storage.get('purchase_history', []);

        // Clean up old entries based on retention period
        var retentionDays = Config.get('privacy.retentionPeriod', 30);
        var cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        // Filter out entries older than retention period
        this.purchaseHistory = this.purchaseHistory.filter(item => {
          if (!item.timestamp) return false;
          var itemDate = new Date(item.timestamp);
          return itemDate >= cutoffDate;
        });

        // Save filtered history
        Utils.storage.set('purchase_history', this.purchaseHistory);
      },

      /**
       * Load product correlation data
       */
      loadCorrelationData: function() {
        // Load from local storage or initialize empty
        this.correlationData = Utils.storage.get('product_correlations', {
          matrix: {},
          viewsWithPurchase: {},
          productViews: {}
        });
      },

      /**
       * Track product view for recommendations
       * @param {Object} product - Product data
       */
      trackProductView: function(product) {
        if (!product || !product.id) return;

        // Check if tracking is allowed
        if (Config.get('privacy.requireConsentForTracking', false)) {
          var hasConsent = Utils.storage.get(Config.get('privacy.consentCookieName', 'carty_consent'), false);
          if (!hasConsent) return;
        }

        try {
          // Add to session views
          this.trackInSessionIntent(product);

          // Add to recent views for persistence
          var recentlyViewed = Utils.storage.get('recently_viewed', []);
          
          // Remove if exists and add to front (most recent)
          var filteredList = recentlyViewed.filter(id => id !== String(product.id));
          filteredList.unshift(String(product.id));
          
          // Limit list size
          var maxItems = Config.get('performance.maxRecentlyViewed', 50);
          var trimmedList = filteredList.slice(0, maxItems);
          
          Utils.storage.set('recently_viewed', trimmedList);
          
          // Update view timestamp
          var viewTimestamps = Utils.storage.get('view_timestamps', {});
          viewTimestamps[product.id] = Date.now();
          Utils.storage.set('view_timestamps', viewTimestamps);
          
          // Update correlation data
          this.updateProductViewCorrelations(product);
        } catch (e) {
          Utils.logError('Error tracking product view', e);
        }
      },

      /**
       * Track purchase for recommendations
       * @param {Object} order - Order data
       */
      trackPurchase: function(order) {
        if (!order || !order.line_items || !order.line_items.length) return;

        // Check if tracking is allowed
        if (Config.get('privacy.requireConsentForTracking', false)) {
          var hasConsent = Utils.storage.get(Config.get('privacy.consentCookieName', 'carty_consent'), false);
          if (!hasConsent) return;
        }

        try {
          // Get purchased product IDs
          var purchasedProductIds = order.line_items.map(item => String(item.product_id));
          
          // Add to purchase history
          var purchaseHistory = Utils.storage.get('purchase_history', []);
          
          // Add new purchase entry
          purchaseHistory.push({
            timestamp: Date.now(),
            orderId: order.order_number || order.id,
            products: purchasedProductIds
          });
          
          // Enforce retention period
          var retentionDays = Config.get('privacy.retentionPeriod', 30);
          var cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
          
          var filteredHistory = purchaseHistory.filter(item => {
            return new Date(item.timestamp) >= cutoffDate;
          });
          
          Utils.storage.set('purchase_history', filteredHistory);
          
          // Update correlation data with purchase
          this.updatePurchaseCorrelations(purchasedProductIds);
        } catch (e) {
          Utils.logError('Error tracking purchase', e);
        }
      },

      /**
       * Track current product in session intent data
       * @param {Object} product - Product data
       */
      trackInSessionIntent: function(product) {
        if (!product || !product.id) return;
        
        try {
          // Initialize session intent if needed
          if (!this.sessionIntent) {
            this.sessionIntent = {
              currentSessionViews: [],
              categoryInterests: {},
              attributeInterests: {},
              currentIntent: {
                primaryCategory: null,
                priceRange: { min: 0, max: 0, avg: 0 },
                preferredVendors: [],
                keyAttributes: [],
                searchTerms: []
              },
              sessionStart: Date.now(),
              maxTrackedItems: 10
            };
          }
          
          // Check if we've already tracked this product in this session
          var existingIndex = this.sessionIntent.currentSessionViews.findIndex(
            item => item.id === product.id
          );
          
          if (existingIndex >= 0) {
            // Product already viewed in this session - update and move to front
            var existingView = this.sessionIntent.currentSessionViews[existingIndex];
            existingView.viewCount = (existingView.viewCount || 1) + 1;
            existingView.lastViewed = Date.now();
            
            // Move to front of array
            this.sessionIntent.currentSessionViews.splice(existingIndex, 1);
            this.sessionIntent.currentSessionViews.unshift(existingView);
          } else {
            // New product view - add to front of array
            this.sessionIntent.currentSessionViews.unshift({
              id: product.id,
              type: product.product_type || null,
              title: product.title || null,
              vendor: product.vendor || null,
              tags: product.tags || [],
              price: product.price || 0,
              viewCount: 1,
              firstViewed: Date.now(),
              lastViewed: Date.now()
            });
            
            // Trim the list if needed
            if (this.sessionIntent.currentSessionViews.length > this.sessionIntent.maxTrackedItems) {
              this.sessionIntent.currentSessionViews.pop();
            }
          }
          
          // Update category interests
          if (product.product_type) {
            var type = product.product_type.toLowerCase();
            this.sessionIntent.categoryInterests[type] = 
              (this.sessionIntent.categoryInterests[type] || 0) + 1;
          }
          
          // Update vendor interests
          if (product.vendor) {
            var vendor = product.vendor.toLowerCase();
            
            // Update current intent
            if (!this.sessionIntent.currentIntent.preferredVendors.includes(vendor)) {
              this.sessionIntent.currentIntent.preferredVendors.push(vendor);
              
              // Keep only top 3 vendors
              if (this.sessionIntent.currentIntent.preferredVendors.length > 3) {
                this.sessionIntent.currentIntent.preferredVendors.pop();
              }
            }
          }
          
          // Track product attributes (from tags)
          if (product.tags && Array.isArray(product.tags)) {
            product.tags.forEach(tag => {
              var normalizedTag = tag.toLowerCase();
              this.sessionIntent.attributeInterests[normalizedTag] = 
                (this.sessionIntent.attributeInterests[normalizedTag] || 0) + 1;
                
              // Capture key attributes for intent
              var importantAttributes = [
                'material', 'style', 'size', 'color', 'fabric', 
                'occasion', 'season', 'feature', 'benefit'
              ];
              
              importantAttributes.forEach(attr => {
                if (normalizedTag.includes(attr) && 
                    !this.sessionIntent.currentIntent.keyAttributes.includes(normalizedTag)) {
                  this.sessionIntent.currentIntent.keyAttributes.push(normalizedTag);
                }
              });
            });
          }
          
          // Update price range
          if (product.price && product.price > 0) {
            var currentRange = this.sessionIntent.currentIntent.priceRange;
            
            // Initialize price range if this is the first product
            if (currentRange.min === 0 || product.price < currentRange.min) {
              currentRange.min = product.price;
            }
            
            if (currentRange.max === 0 || product.price > currentRange.max) {
              currentRange.max = product.price;
            }
            
            // Update average price
            var prices = this.sessionIntent.currentSessionViews
              .map(item => item.price)
              .filter(price => price > 0);
              
            if (prices.length > 0) {
              currentRange.avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
            }
          }
          
          // Analyze current intent
          this.analyzeCurrentIntent();
        } catch (e) {
          Utils.logError('Error tracking product in session intent', e);
        }
      },

      /**
       * Analyze session data to determine user's shopping intent
       */
      analyzeCurrentIntent: function() {
        try {
          if (!this.sessionIntent) return;
          
          // Determine primary category of interest
          var categories = this.sessionIntent.categoryInterests;
          let primaryCategory = null;
          let maxCount = 0;
          
          Object.entries(categories).forEach(([category, count]) => {
            if (count > maxCount) {
              maxCount = count;
              primaryCategory = category;
            }
          });
          
          this.sessionIntent.currentIntent.primaryCategory = primaryCategory;
          
          // Prune key attributes to most relevant
          if (this.sessionIntent.currentIntent.keyAttributes.length > 5) {
            // Sort by how frequently they appear
            var sortedAttributes = this.sessionIntent.currentIntent.keyAttributes
              .map(attr => ({
                attr,
                count: this.sessionIntent.attributeInterests[attr] || 0
              }))
              .sort((a, b) => b.count - a.count);
              
            // Keep only top 5
            this.sessionIntent.currentIntent.keyAttributes = 
              sortedAttributes.slice(0, 5).map(item => item.attr);
          }
        } catch (e) {
          Utils.logError('Error analyzing intent', e);
        }
      },

      /**
       * Update correlation data based on product views
       * @param {Object} product - Viewed product
       */
      updateProductViewCorrelations: function(product) {
        if (!product || !product.id) return;

        try {
          // Update product view count
          if (!this.correlationData.productViews[product.id]) {
            this.correlationData.productViews[product.id] = 0;
          }
          this.correlationData.productViews[product.id]++;

          // Get recently viewed products
          var recentlyViewed = Utils.storage.get('recently_viewed', []).slice(0, 10);

          // Update co-view correlations
          recentlyViewed.forEach(viewedId => {
            if (viewedId === String(product.id)) return; // Skip self

            // Initialize matrix entries if needed
            if (!this.correlationData.matrix[product.id]) {
              this.correlationData.matrix[product.id] = {};
            }
            if (!this.correlationData.matrix[product.id][viewedId]) {
              this.correlationData.matrix[product.id][viewedId] = {
                coViews: 0,
                coPurchases: 0,
                score: 0
              };
            }

            // Increment co-view count
            this.correlationData.matrix[product.id][viewedId].coViews++;

            // Reciprocal relationship
            if (!this.correlationData.matrix[viewedId]) {
              this.correlationData.matrix[viewedId] = {};
            }
            if (!this.correlationData.matrix[viewedId][product.id]) {
              this.correlationData.matrix[viewedId][product.id] = {
                coViews: 0,
                coPurchases: 0,
                score: 0
              };
            }
            this.correlationData.matrix[viewedId][product.id].coViews++;

            // Update correlation scores
            this.updateCorrelationScore(product.id, viewedId);
            this.updateCorrelationScore(viewedId, product.id);
          });

          // Periodically save correlation data
          this.saveCorrelationData();
        } catch (e) {
          Utils.logError('Error updating product view correlations', e);
        }
      },

      /**
       * Update correlation data based on purchases
       * @param {Array} purchasedProductIds - IDs of purchased products
       */
      updatePurchaseCorrelations: function(purchasedProductIds) {
        if (!purchasedProductIds || !purchasedProductIds.length) return;

        try {
          // Get recently viewed products
          var recentlyViewed = Utils.storage.get('recently_viewed', []).slice(0, 20);

          // Update views that led to purchase
          recentlyViewed.forEach(viewedId => {
            if (!this.correlationData.viewsWithPurchase[viewedId]) {
              this.correlationData.viewsWithPurchase[viewedId] = 0;
            }
            this.correlationData.viewsWithPurchase[viewedId]++;
          });

          // Update co-purchase correlations for each pair of purchased products
          for (let i = 0; i < purchasedProductIds.length; i++) {
            var product1 = purchasedProductIds[i];

            // Initialize if needed
            if (!this.correlationData.matrix[product1]) {
              this.correlationData.matrix[product1] = {};
            }

            // Update correlations with other purchased products
            for (let j = 0; j < purchasedProductIds.length; j++) {
              if (i === j) continue; // Skip self
              var product2 = purchasedProductIds[j];

              // Initialize if needed
              if (!this.correlationData.matrix[product1][product2]) {
                this.correlationData.matrix[product1][product2] = {
                  coViews: 0,
                  coPurchases: 0,
                  score: 0
                };
              }

              // Increment co-purchase count
              this.correlationData.matrix[product1][product2].coPurchases++;

              // Update correlation score
              this.updateCorrelationScore(product1, product2);
            }
          }

          // Save updated correlation data
          this.saveCorrelationData();
        } catch (e) {
          Utils.logError('Error updating purchase correlations', e);
        }
      },

      /**
       * Update correlation score between two products
       * @param {string} product1 - First product ID
       * @param {string} product2 - Second product ID
       */
      updateCorrelationScore: function(product1, product2) {
        try {
          // Skip if either matrix entry doesn't exist
          if (!this.correlationData.matrix[product1] || 
              !this.correlationData.matrix[product1][product2]) {
            return;
          }

          var entry = this.correlationData.matrix[product1][product2];
          
          // Calculate score components
          var coViewScore = Math.log(entry.coViews + 1) * 2;
          var coPurchaseScore = Math.log(entry.coPurchases + 1) * 5;
          
          // Combine into a single score
          entry.score = coViewScore + coPurchaseScore;
        } catch (e) {
          Utils.logError('Error updating correlation score', e);
        }
      },

      /**
       * Save correlation data to storage
       */
      saveCorrelationData: function() {
        try {
          // Only save periodically to reduce writes
          var now = Date.now();
          var lastSaved = this._lastCorrelationSave || 0;
          
          if (now - lastSaved > 60000) { // Save at most once per minute
            // Trim correlation data to prevent excessive storage
            this.trimCorrelationData();
            
            // Save to storage
            Utils.storage.set('product_correlations', this.correlationData);
            this._lastCorrelationSave = now;
          }
        } catch (e) {
          Utils.logError('Error saving correlation data', e);
        }
      },

      /**
       * Trim correlation data to limit size
       */
      trimCorrelationData: function() {
        try {
          var maxProducts = 500; // Maximum number of products to track
          var maxRelatedPerProduct = 20; // Maximum related products per product
          
          // Trim product views to top viewed products
          var productViewEntries = Object.entries(this.correlationData.productViews);
          if (productViewEntries.length > maxProducts) {
            // Sort by view count
            var sortedProducts = productViewEntries.sort((a, b) => b[1] - a[1]);
            
            // Create new object with only top products
            var newProductViews = {};
            sortedProducts.slice(0, maxProducts).forEach(([id, count]) => {
              newProductViews[id] = count;
            });
            
            this.correlationData.productViews = newProductViews;
          }
          
          // Trim matrix to most important correlations
          Object.keys(this.correlationData.matrix).forEach(productId => {
            var relatedProducts = this.correlationData.matrix[productId];
            var relatedEntries = Object.entries(relatedProducts);
            
            if (relatedEntries.length > maxRelatedPerProduct) {
              // Sort by score
              var sortedRelated = relatedEntries.sort((a, b) => b[1].score - a[1].score);
              
              // Create new object with only top related
              var newRelated = {};
              sortedRelated.slice(0, maxRelatedPerProduct).forEach(([id, data]) => {
                newRelated[id] = data;
              });
              
              this.correlationData.matrix[productId] = newRelated;
            }
          });
        } catch (e) {
          Utils.logError('Error trimming correlation data', e);
        }
      },

      /**
       * Get frequently bought together products
       * @param {string|Object} product - Product ID or product object
       * @param {number} limit - Maximum number of products to return
       * @returns {Promise<Array>} Array of recommended products
       */
      getFrequentlyBoughtTogether: function(product, limit = 3) {
        // Get product ID
        var productId = typeof product === 'object' ? product.id : product;
        
        if (!productId) {
          return Promise.resolve([]);
        }
        
        // Check cache first
        var cacheKey = `fbt_${productId}_${limit}`;
        if (this.cache.frequentlyBought[cacheKey]) {
          return Promise.resolve(this.cache.frequentlyBought[cacheKey]);
        }
        
        // Get related products based on correlation data
        return Promise.resolve()
          .then(() => {
            // Check if we have correlation data for this product
            if (this.correlationData && this.correlationData.matrix && this.correlationData.matrix[productId]) {
              var relatedData = this.correlationData.matrix[productId];
              
              // Sort by score (highest first)
              var sortedRelated = Object.entries(relatedData)
                .sort((a, b) => b[1].score - a[1].score)
                .map(entry => entry[0]); // Product IDs only
              
              // Limit results
              var topRelated = sortedRelated.slice(0, limit * 2); // Get more than needed for filtering
              
              // Fetch detailed product data
              return Promise.all(
                topRelated.map(id => ProductService.getProduct(id))
              );
            }
            
            // No correlation data, fall back to recommendations API
            return ProductService.getRecommendedProducts(productId, limit);
          })
          .then(products => {
            // Filter out unavailable products
            var availableProducts = products.filter(p => p && p.available !== false);
            
            // Cache results
            this.cache.frequentlyBought[cacheKey] = availableProducts.slice(0, limit);
            
            return this.cache.frequentlyBought[cacheKey];
          })
          .catch(error => {
            Utils.logError('Error getting frequently bought together products', error);
            return [];
          });
      },

      /**
       * Get upsell products for the cart
       * @param {Array} [cartItems] - Cart items (defaults to current cart)
       * @param {Array} [excludeIds] - Product IDs to exclude
       * @param {number} [limit] - Maximum number of products to return
       * @returns {Promise<Array>} Array of recommended products
       */
      getCartUpsellProducts: function(cartItems = null, excludeIds = [], limit = 4) {
        return new Promise((resolve) => {
          // If no cart items provided, use current cart
          var getCartItems = cartItems ? Promise.resolve(cartItems) : CartService.getCart().then(cart => cart.items);
          
          getCartItems.then(items => {
            // If no items, return empty array
            if (!items || !items.length) {
              resolve([]);
              return;
            }
            
            // Normalize excludeIds to strings
            var normalizedExcludeIds = excludeIds.map(id => String(id));
            
            // Get product IDs already in cart to exclude
            var cartProductIds = items.map(item => String(item.product_id));
            
            // Combined exclusions
            var allExcludeIds = [...new Set([...normalizedExcludeIds, ...cartProductIds])];
            
            // Determine upsell strategy
            var strategy = this.determineUpsellStrategy(items);
            
            // Execute appropriate strategy
            this.executeUpsellStrategy(strategy, items, allExcludeIds, limit)
              .then(products => {
                // Enhance product diversity
                var diverseProducts = this.enhanceProductDiversity(products);
                resolve(diverseProducts.slice(0, limit));
              })
              .catch(error => {
                Utils.logError('Error getting upsell products', error);
                resolve([]);
              });
          });
        });
      },

      /**
       * Determine the best upsell strategy based on cart contents
       * @param {Array} items - Cart items
       * @returns {string} Strategy name
       */
      determineUpsellStrategy: function(items) {
        // Get configured strategy or auto determine
        var configStrategy = Config.get('upsellSettings.upsellAlgorithm', 'smart');
        
        // If strategy is explicitly set and not 'smart', use it
        if (configStrategy !== 'smart') {
          return configStrategy;
        }
        
        // Auto-determine strategy
        var cartTotal = items.reduce((sum, item) => sum + item.line_price, 0);
        var itemCount = items.length;
        
        // For high-value carts, focus on accessories
        if (cartTotal > 15000) { // $150+
          return 'accessories';
        }
        
        // For single-item carts, focus on complementary products
        if (itemCount === 1) {
          return 'complementary';
        }
        
        // For multi-item carts with low value, focus on bundle savings
        if (itemCount > 1 && cartTotal < 5000) { // Under $50
          return 'bundle';
        }
        
        // For specific product types, use specialized strategies
        var productTypes = items.map(item => item.product_type).filter(Boolean);
        if (productTypes.some(type => {
          var lowerType = (type || '').toLowerCase();
          return lowerType.includes('apparel') || 
                 lowerType.includes('clothing') || 
                 lowerType.includes('wear');
        })) {
          return 'outfit';
        }
        
        // Default to collaborative strategy
        return 'collaborative';
      },

      /**
       * Execute specific upsell strategy
       * @param {string} strategy - Strategy name
       * @param {Array} items - Cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products to return
       * @returns {Promise<Array>} Recommended products
       */
      executeUpsellStrategy: function(strategy, items, excludeIds, limit) {
        Utils.log(`Executing upsell strategy: ${strategy}`);
        
        switch (strategy) {
          case 'complementary':
            return this.getComplementaryProducts(items, excludeIds, limit);
          
          case 'accessories':
            return this.getAccessoryProducts(items, excludeIds, limit);
          
          case 'bundle':
            return this.getBundleUpsells(items, excludeIds, limit);
          
          case 'outfit':
            return this.getOutfitRecommendations(items, excludeIds, limit);
            
          case 'collaborative':
            return this.getCollaborativeRecommendations(items, excludeIds, limit);
            
          default:
            // Fall back to general recommendations
            return this.getGeneralRecommendations(items, excludeIds, limit);
        }
      },

      /**
       * Get complementary products for cart items
       * @param {Array} items - Cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products to return
       * @returns {Promise<Array>} Recommended products
       */
      getComplementaryProducts: function(items, excludeIds, limit) {
        if (!items || !items.length) return Promise.resolve([]);
        
        // Use the main product to get recommendations
        var mainItem = items[0];
        var mainProductId = mainItem.product_id;
        
        // Get complementary product tags based on product type
        var complementaryTags = this.getComplementaryTags(items);
        
        // First try to get products with complementary tags
        return ProductService.searchByTags(complementaryTags, limit * 2)
          .then(products => {
            // Filter out excluded products
            var filteredProducts = products.filter(p => 
              p && !excludeIds.includes(String(p.id))
            );
            
            // If we have enough tag-based products, use them
            if (filteredProducts.length >= limit) {
              return filteredProducts.slice(0, limit);
            }
            
            // Otherwise add some recommendations from Shopify
            return ProductService.getRecommendedProducts(mainProductId, limit * 2)
              .then(recommended => {
                // Filter out excluded products
                var filteredRecommended = recommended.filter(p => 
                  p && !excludeIds.includes(String(p.id))
                );
                
                // Combine and de-duplicate
                var combined = [...filteredProducts];
                
                // Add recommendations that aren't already in results
                filteredRecommended.forEach(product => {
                  if (!combined.some(p => p.id === product.id)) {
                    combined.push(product);
                  }
                });
                
                return combined.slice(0, limit);
              });
          })
          .catch(error => {
            Utils.logError('Error getting complementary products', error);
            
            // Fall back to regular recommendations
            return ProductService.getRecommendedProducts(mainProductId, limit)
              .then(products => 
                products.filter(p => p && !excludeIds.includes(String(p.id))).slice(0, limit)
              );
          });
      },

      /**
       * Get accessory products for cart items
       * @param {Array} items - Cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products to return
       * @returns {Promise<Array>} Recommended products
       */
      getAccessoryProducts: function(items, excludeIds, limit) {
        if (!items || !items.length) return Promise.resolve([]);
        
        // Look for high-value items first
        var sortedItems = [...items].sort((a, b) => b.price - a.price);
        var mainItem = sortedItems[0];
        
        // Get tags that indicate accessories
        var accessoryTags = [
          'accessory', 'accessories', 'add-on', 'addon', 'complements'
        ];
        
        // Add product-specific tags based on product type
        var mainProductType = mainItem.product_type?.toLowerCase() || '';
        
        if (mainProductType.includes('phone') || mainProductType.includes('smartphone')) {
          accessoryTags.push('case', 'screen protector', 'charger', 'cable', 'stand', 'holder');
        } else if (mainProductType.includes('camera')) {
          accessoryTags.push('lens', 'battery', 'memory card', 'tripod', 'bag', 'strap');
        } else if (mainProductType.includes('laptop') || mainProductType.includes('computer')) {
          accessoryTags.push('mouse', 'keyboard', 'adapter', 'cable', 'bag', 'stand', 'cooling pad');
        } else if (mainProductType.includes('tv')) {
          accessoryTags.push('mount', 'bracket', 'hdmi', 'remote', 'sound bar', 'speaker');
        }
        
        // Filter by price - accessories should be less expensive than main items
        var mainItemPrice = mainItem.price;
        var maxAccessoryPrice = mainItemPrice * 0.7; // Accessories should be cheaper
        
        // First try to get vendor-specific accessories
        var vendorName = mainItem.vendor;
        
        return ProductService.searchByVendorAndTags(vendorName, accessoryTags, limit * 2)
          .then(products => {
            // Filter out excluded products and limit by price
            var filteredProducts = products.filter(p => 
              p && 
              !excludeIds.includes(String(p.id)) &&
              p.price < maxAccessoryPrice
            );
            
            // If we have enough vendor-specific accessories, use them
            if (filteredProducts.length >= limit) {
              return filteredProducts.slice(0, limit);
            }
            
            // Otherwise add some generic accessories
            return ProductService.searchByTags(accessoryTags, limit * 2)
              .then(genericAccessories => {
                // Filter out excluded products and limit by price
                var filteredGeneric = genericAccessories.filter(p => 
                  p && 
                  !excludeIds.includes(String(p.id)) &&
                  p.price < maxAccessoryPrice
                );
                
                // Combine and de-duplicate
                var combined = [...filteredProducts];
                
                // Add generic accessories that aren't already in results
                filteredGeneric.forEach(product => {
                  if (!combined.some(p => p.id === product.id)) {
                    combined.push(product);
                  }
                });
                
                return combined.slice(0, limit);
              });
          })
          .catch(error => {
            Utils.logError('Error getting accessory products', error);
            
            // Fall back to regular recommendations
            return ProductService.getRecommendedProducts(mainItem.product_id, limit)
              .then(products => 
                products.filter(p => p && !excludeIds.includes(String(p.id))).slice(0, limit)
              );
          });
      },

      /**
       * Get bundle recommendations for cart items
       * @param {Array} items - Cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products to return
       * @returns {Promise<Array>} Recommended products
       */
      getBundleUpsells: function(items, excludeIds, limit) {
        if (!items || !items.length) return Promise.resolve([]);
        
        // Use correlation data for bundle recommendations
        var promises = items.map(item => {
          return this.getFrequentlyBoughtTogether(item.product_id, Math.ceil(limit / items.length) + 2);
        });
        
        return Promise.all(promises)
          .then(results => {
            // Flatten results
            var allProducts = [].concat(...results);
            
            // Filter out excluded products
            var filteredProducts = allProducts.filter(p => 
              p && !excludeIds.includes(String(p.id))
            );
            
            // Remove duplicates
            var uniqueProducts = [];
            var seenIds = new Set();
            
            filteredProducts.forEach(product => {
              if (product && !seenIds.has(String(product.id))) {
                seenIds.add(String(product.id));
                uniqueProducts.push(product);
              }
            });
            
            // Score and sort products for bundle compatibility
            var scoredProducts = uniqueProducts.map(product => {
              return {
                ...product,
                bundleScore: this.calculateBundleCompatibility(product, items)
              };
            }).sort((a, b) => b.bundleScore - a.bundleScore);
            
            return scoredProducts.slice(0, limit);
          })
          .catch(error => {
            Utils.logError('Error getting bundle upsells', error);
            
            // Fall back to regular recommendations
            return this.getGeneralRecommendations(items, excludeIds, limit);
          });
      },

      /**
       * Calculate bundle compatibility score
       * @param {Object} product - Product to score
       * @param {Array} cartItems - Current cart items
       * @returns {number} Compatibility score
       */
      calculateBundleCompatibility: function(product, cartItems) {
        if (!product || !cartItems || !cartItems.length) return 0;
        
        let compatibility = 0;
        
        // 1. Compatible vendors - products from same vendor work well together
        var cartVendors = cartItems.map(item => item.vendor).filter(Boolean);
        if (product.vendor && cartVendors.includes(product.vendor)) {
          compatibility += 10;
        }
        
        // 2. Compatible product type - matching types suggest related items
        var cartTypes = cartItems.map(item => item.product_type).filter(Boolean);
        if (product.product_type && cartTypes.includes(product.product_type)) {
          compatibility += 10;
        }
        
        // 3. Price compatibility - products within reasonable price range
        var cartPrices = cartItems.map(item => item.price || 0).filter(price => price > 0);
        if (cartPrices.length > 0 && product.price > 0) {
          var avgCartPrice = cartPrices.reduce((sum, price) => sum + price, 0) / cartPrices.length;
          
          // Good bundle items are somewhat less expensive than main products
          if (product.price < avgCartPrice && product.price > (avgCartPrice * 0.3)) {
            compatibility += 15;
          }
        }
        
        // 4. Complementary tags
        var productTags = product.tags || [];
        var complementaryTerms = ['accessory', 'accessories', 'compatible', 'matching', 'bundle', 'set', 'add-on'];
        
        var hasComplementaryTag = productTags.some(tag => 
          complementaryTerms.some(term => 
            tag.toLowerCase().includes(term)
          )
        );
        
        if (hasComplementaryTag) {
          compatibility += 15;
        }
        
        // 5. Correlation data - highly correlated products are likely good bundle matches
        var productId = String(product.id);
        let correlationScore = 0;
        
        cartItems.forEach(item => {
          var itemId = String(item.product_id);
          
          if (this.correlationData?.matrix?.[itemId]?.[productId]) {
            correlationScore += this.correlationData.matrix[itemId][productId].score || 0;
          }
        });
        
        compatibility += Math.min(20, correlationScore * 5);
        
        return compatibility;
      },

      /**
       * Get outfit recommendations for apparel items
       * @param {Array} items - Cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products to return
       * @returns {Promise<Array>} Recommended products
       */
      getOutfitRecommendations: function(items, excludeIds, limit) {
        if (!items || !items.length) return Promise.resolve([]);
        
        // Look for clothing items
        var apparelItems = items.filter(item => {
          var type = (item.product_type || '').toLowerCase();
          return type.includes('apparel') || 
                 type.includes('clothing') || 
                 type.includes('wear') ||
                 type.includes('shirt') ||
                 type.includes('pant') ||
                 type.includes('dress') ||
                 type.includes('jacket');
        });
        
        if (!apparelItems.length) {
          // No apparel items, fall back to general recommendations
          return this.getGeneralRecommendations(items, excludeIds, limit);
        }
        
        // Determine what clothing categories to recommend based on what's in cart
        var cartCategories = apparelItems.map(item => (item.product_type || '').toLowerCase());
        
        // Map of complementary clothing items
        var outfitMap = {
          'shirt': ['pants', 'jeans', 'shorts', 'jacket', 'blazer', 'tie', 'cufflinks'],
          'tshirt': ['pants', 'jeans', 'shorts', 'jacket', 'hoodie'],
          'blouse': ['skirt', 'pants', 'jeans', 'cardigan', 'jacket'],
          'dress': ['cardigan', 'jacket', 'necklace', 'earrings', 'clutch', 'purse'],
          'pants': ['shirt', 'tshirt', 'blouse', 'top', 'sweater', 'belt', 'shoes'],
          'jeans': ['shirt', 'tshirt', 'top', 'sweater', 'jacket', 'belt', 'shoes'],
          'jacket': ['shirt', 'tshirt', 'dress', 'pants', 'jeans', 'skirt'],
          'shoes': ['socks', 'pants', 'jeans', 'dress'],
          'sweater': ['shirt', 'pants', 'jeans', 'skirt'],
          'skirt': ['blouse', 'top', 'sweater', 'tights', 'heels']
        };
        
        // Build list of categories to look for
        var targetCategories = new Set();
        
        cartCategories.forEach(category => {
          // Look for category matches in the outfit map
          Object.entries(outfitMap).forEach(([key, complementaryItems]) => {
            if (category.includes(key)) {
              // Add all complementary items for this category
              complementaryItems.forEach(item => targetCategories.add(item));
            }
          });
        });
        
        // Also check if certain categories are missing from cart
        var essentialCategories = ['shirt', 'pants', 'shoes'];
        essentialCategories.forEach(category => {
          if (!cartCategories.some(cat => cat.includes(category))) {
            targetCategories.add(category);
          }
        });
        
        // Convert to array and get products matching these categories
        var categoryArray = Array.from(targetCategories);
        
        if (!categoryArray.length) {
          // No specific categories, fall back to general recommendations
          return this.getGeneralRecommendations(items, excludeIds, limit);
        }
        
        // Try to get products from same vendor first
        var vendors = apparelItems.map(item => item.vendor).filter(Boolean);
        
        // Get products with matching vendor and categories
        var vendorPromises = vendors.map(vendor => 
          ProductService.searchByVendorAndCategories(vendor, categoryArray, Math.ceil(limit / vendors.length) + 1)
        );
        
        return Promise.all(vendorPromises)
          .then(results => {
            // Flatten results
            var allProducts = [].concat(...results);
            
            // Filter out excluded products
            var filteredProducts = allProducts.filter(p => 
              p && !excludeIds.includes(String(p.id))
            );
            
            // If we have enough products, use them
            if (filteredProducts.length >= limit) {
              return filteredProducts.slice(0, limit);
            }
            
            // Otherwise add some generic category matches
            return ProductService.searchByCategories(categoryArray, limit * 2)
              .then(categoryProducts => {
                // Filter out excluded products
                var filteredCategoryProducts = categoryProducts.filter(p => 
                  p && !excludeIds.includes(String(p.id))
                );
                
                // Combine and de-duplicate
                var combined = [...filteredProducts];
                
                // Add category products that aren't already in results
                filteredCategoryProducts.forEach(product => {
                  if (!combined.some(p => p.id === product.id)) {
                    combined.push(product);
                  }
                });
                
                return combined.slice(0, limit);
              });
          })
          .catch(error => {
            Utils.logError('Error getting outfit recommendations', error);
            
            // Fall back to general recommendations
            return this.getGeneralRecommendations(items, excludeIds, limit);
          });
      },

      /**
       * Get collaborative recommendations based on purchase patterns
       * @param {Array} items - Cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products to return
       * @returns {Promise<Array>} Recommended products
       */
      getCollaborativeRecommendations: function(items, excludeIds, limit) {
        if (!items || !items.length) return Promise.resolve([]);
        
        // Use correlation data for recommendations
        var productIds = items.map(item => String(item.product_id));
        
        // Check if we have correlation data
        if (!this.correlationData || !this.correlationData.matrix) {
          // Fall back to regular recommendations
          return this.getGeneralRecommendations(items, excludeIds, limit);
        }
        
        // Collect all correlated products across all cart items
        var correlatedProducts = new Map();
        
        productIds.forEach(productId => {
          if (this.correlationData.matrix[productId]) {
            Object.entries(this.correlationData.matrix[productId]).forEach(([relatedId, data]) => {
              // Skip excluded products
              if (excludeIds.includes(relatedId)) return;
              
              // Add or update score
              if (correlatedProducts.has(relatedId)) {
                correlatedProducts.set(relatedId, correlatedProducts.get(relatedId) + data.score);
              } else {
                correlatedProducts.set(relatedId, data.score);
              }
            });
          }
        });
        
        // Convert to array and sort by score
        var sortedIds = Array.from(correlatedProducts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0])
          .slice(0, limit * 2); // Get more than needed for filtering
        
        // If we have enough correlated products, fetch full details
        if (sortedIds.length > 0) {
          return Promise.all(
            sortedIds.map(id => ProductService.getProduct(id))
          )
            .then(products => {
              // Filter out null/undefined results and unavailable products
              var availableProducts = products
                .filter(p => p && p.available !== false)
                .slice(0, limit);
              
              if (availableProducts.length >= Math.ceil(limit / 2)) {
                return availableProducts;
              }
              
              // Not enough results, supplement with general recommendations
              return this.getGeneralRecommendations(items, [...excludeIds, ...availableProducts.map(p => String(p.id))], limit - availableProducts.length)
                .then(generalRecs => [...availableProducts, ...generalRecs].slice(0, limit));
            });
        }
        
        // Not enough correlated products, fall back to general recommendations
        return this.getGeneralRecommendations(items, excludeIds, limit);
      },

      /**
       * Get general recommendations based on current cart
       * @param {Array} items - Cart items
       * @param {Array} excludeIds - Product IDs to exclude
       * @param {number} limit - Maximum number of products to return
       * @returns {Promise<Array>} Recommended products
       */
      getGeneralRecommendations: function(items, excludeIds, limit) {
        if (!items || !items.length) return Promise.resolve([]);
        
        // Try to get recommendations for the main item
        var mainItem = items[0];
        
        return ProductService.getRecommendedProducts(mainItem.product_id, limit * 2)
          .then(recommendations => {
            // Filter out excluded products
            var filteredRecommendations = recommendations.filter(p => 
              p && !excludeIds.includes(String(p.id))
            );
            
            // If we have enough recommendations, use them
            if (filteredRecommendations.length >= limit) {
              return filteredRecommendations.slice(0, limit);
            }
            
            // Otherwise add some collection products
            var collectionHandle = Config.get('upsellSettings.collectionHandle');
            
            if (collectionHandle) {
              return ProductService.getCollectionProducts(collectionHandle, limit * 2)
                .then(collectionProducts => {
                  // Filter out excluded products
                  var filteredCollectionProducts = collectionProducts.filter(p => 
                    p && !excludeIds.includes(String(p.id))
                  );
                  
                  // Combine and de-duplicate
                  var combined = [...filteredRecommendations];
                  
                  // Add collection products that aren't already in results
                  filteredCollectionProducts.forEach(product => {
                    if (!combined.some(p => p && p.id === product.id)) {
                      combined.push(product);
                    }
                  });
                  
                  return combined.slice(0, limit);
                });
            } 
            
            // No collection, just return what we have
            return filteredRecommendations.slice(0, limit);
          })
          .catch(error => {
            Utils.logError('Error getting general recommendations', error);
            
            // Fall back to collection products
            var collectionHandle = Config.get('upsellSettings.collectionHandle', 'frontpage');
            
            return ProductService.getCollectionProducts(collectionHandle, limit)
              .then(products => 
                products.filter(p => p && !excludeIds.includes(String(p.id))).slice(0, limit)
              )
              .catch(() => {
                // Last resort - random products
                return ProductService.getRandomProducts(limit)
                  .then(products => 
                    products.filter(p => p && !excludeIds.includes(String(p.id))).slice(0, limit)
                  );
              });
          });
      },

      /**
       * Get complementary product tags based on cart content
       * @param {Array} cartItems - Current cart items
       * @returns {Array} Complementary tags to look for
       */
      getComplementaryTags: function(cartItems) {
        var complementaryMap = {
          // Apparel complements
          'shirt': ['tie', 'belt', 'pants', 'jacket', 'cufflinks', 'accessories'],
          'pants': ['shirt', 'belt', 'shoes', 'socks', 'top'],
          'dress': ['earrings', 'necklace', 'purse', 'clutch', 'shoes', 'jewelry'],
          'shoes': ['socks', 'polish', 'insoles', 'laces'],
          
          // Electronics complements
          'phone': ['case', 'screen protector', 'charger', 'cable', 'headphones'],
          'laptop': ['mouse', 'bag', 'sleeve', 'charger', 'adapter', 'stand'],
          'camera': ['lens', 'tripod', 'memory card', 'bag', 'battery'],
          
          // Home complements
          'sofa': ['cushion', 'throw', 'rug', 'coffee table', 'side table'],
          'bed': ['sheets', 'pillows', 'duvet', 'comforter', 'bedding'],
          'dining table': ['chairs', 'placemats', 'dinnerware', 'centerpiece'],
          
          // Beauty complements
          'foundation': ['brush', 'primer', 'powder', 'concealer'],
          'lipstick': ['lip liner', 'lip gloss', 'makeup remover'],
          'shampoo': ['conditioner', 'hair mask', 'hair brush', 'styling product']
        };
        
        // Extract product types and titles from cart items
        var productKeywords = cartItems.flatMap(item => {
          var title = (item.product_title || '').toLowerCase();
          var type = (item.product_type || '').toLowerCase();
          return [type, ...title.split(' ')];
        });
        
        // Collect all potential complementary tags
        var complementaryTags = [];
        
        productKeywords.forEach(keyword => {
          if (complementaryMap[keyword]) {
            complementaryTags.push(...complementaryMap[keyword]);
          }
        });
        
        return [...new Set(complementaryTags)]; // Remove duplicates
      },

      /**
       * Enhance product diversity to prevent showing too many similar products
       * @param {Array} products - Products to diversify
       * @returns {Array} Diversified products
       */
      enhanceProductDiversity: function(products) {
        if (!products || products.length <= 2) return products;
        
        var maxProductsPerType = 2;
        var maxProductsPerVendor = 2;
        
        // Count types and vendors
        var typeCount = {};
        var vendorCount = {};
        
        // Sort by relevance first (preserve the original sorting)
        var result = [];
        
        products.forEach(product => {
          var type = product.product_type || 'unknown';
          var vendor = product.vendor || 'unknown';
          
          // Initialize counters
          typeCount[type] = typeCount[type] || 0;
          vendorCount[vendor] = vendorCount[vendor] || 0;
          
          // Check if we already have enough of this type or vendor
          if (typeCount[type] < maxProductsPerType && vendorCount[vendor] < maxProductsPerVendor) {
            result.push(product);
            typeCount[type]++;
            vendorCount[vendor]++;
          }
          
          // If we're below our target count, add products anyway
          if (result.length < 3 && !result.includes(product)) {
            result.push(product);
          }
        });
        
        // If we don't have enough products after diversity filtering, 
        // add more from the original set
        if (result.length < 3 && products.length > 3) {
          for (let i = 0; i < products.length && result.length < 4; i++) {
            if (!result.includes(products[i])) {
              result.push(products[i]);
            }
          }
        }
        
        return result;
      },

      /**
       * Invalidate recommendation cache
       */
      invalidateRecommendationCache: function() {
        this.cache.recommendations = {};
        this.cache.lastCalculated = {};
      },

      /**
       * Track search term to understand user intent
       * @param {string} term - Search term
       */
      trackSearchTerm: function(term) {
        if (!term) return;
        
        try {
          // Check if tracking is allowed
          if (Config.get('privacy.requireConsentForTracking', false)) {
            var hasConsent = Utils.storage.get(Config.get('privacy.consentCookieName', 'carty_consent'), false);
            if (!hasConsent) return;
          }
          
          // Initialize session intent if needed
          if (!this.sessionIntent) {
            this.sessionIntent = {
              currentSessionViews: [],
              categoryInterests: {},
              attributeInterests: {},
              currentIntent: {
                primaryCategory: null,
                priceRange: { min: 0, max: 0, avg: 0 },
                preferredVendors: [],
                keyAttributes: [],
                searchTerms: []
              },
              sessionStart: Date.now(),
              maxTrackedItems: 10
            };
          }
          
          // Add search term if not already tracked
          if (!this.sessionIntent.currentIntent.searchTerms.includes(term.toLowerCase())) {
            this.sessionIntent.currentIntent.searchTerms.unshift(term.toLowerCase());
            
            // Keep only the last 5 search terms
            if (this.sessionIntent.currentIntent.searchTerms.length > 5) {
              this.sessionIntent.currentIntent.searchTerms.pop();
            }
          }
          
          Utils.log(`Tracked search term: ${term}`);
        } catch (e) {
          Utils.logError('Error tracking search term', e);
        }
      },

      /**
       * Get the current intent data
       * @returns {Object} Current intent data
       */
      getCurrentIntent: function() {
        if (!this.sessionIntent) {
          return {
            primaryCategory: null,
            priceRange: { min: 0, max: 0, avg: 0 },
            preferredVendors: [],
            keyAttributes: [],
            searchTerms: []
          };
        }
        
        return this.sessionIntent.currentIntent;
      },

      /**
       * Score a product against current session intent
       * @param {Object} product - Product to score
       * @returns {number} Relevance score
       */
      scoreProductByIntent: function(product) {
        if (!product || !this.sessionIntent) return 0;
        
        let score = 0;
        var intent = this.sessionIntent.currentIntent;
        
        // 1. Category match (highest priority)
        if (intent.primaryCategory && 
            product.product_type && 
            product.product_type.toLowerCase() === intent.primaryCategory) {
          score += 20;
        }
        
        // 2. Vendor match
        if (product.vendor && 
            intent.preferredVendors.includes(product.vendor.toLowerCase())) {
          score += 15;
        }
        
        // 3. Price range compatibility
        if (product.price && intent.priceRange.avg > 0) {
          var ratio = product.price / intent.priceRange.avg;
          
          // Prefer products in a similar price range
          if (ratio >= 0.7 && ratio <= 1.3) {
            score += 15; // Within 30% of average viewed price
          } else if (ratio >= 0.5 && ratio <= 1.5) {
            score += 10; // Within 50% of average viewed price
          } else if (ratio >= 0.3 && ratio <= 1.7) {
            score += 5;  // Within 70% of average viewed price
          }
        }
        
        // 4. Attribute matches (tags)
        var productTags = (product.tags || []).map(tag => tag.toLowerCase());
        let attributeMatches = 0;
        
        intent.keyAttributes.forEach(attr => {
          if (productTags.some(tag => tag.includes(attr) || attr.includes(tag))) {
            attributeMatches++;
          }
        });
        
        score += attributeMatches * 8;
        
        // 5. Search term relevance
        if (intent.searchTerms.length > 0 && product.title) {
          var productTitle = product.title.toLowerCase();
          let searchTermMatches = 0;
          
          intent.searchTerms.forEach((term, index) => {
            if (productTitle.includes(term)) {
              // More recent searches get higher weight
              var recencyWeight = 1 - (index * 0.15); // 1.0, 0.85, 0.7, 0.55, 0.4
              searchTermMatches += 10 * recencyWeight;
            }
          });
          
          score += searchTermMatches;
        }
        
        return score;
      }
    };

    // Register the module
    Carty.registerModule('recommendations', Recommendations);
  });
})();

/**
 * Carty - Integrations Module
 * Handles third-party integrations with other services
 * Version 5.0.0
 */
(function() {
  'use strict';

  // Wait for dependencies
  Carty.ready(['utils', 'config', 'cart'], function(Utils, Config, CartService) {
    // Module object
    var Integrations = {
      /**
       * Module version
       */
      version: '5.0.0',

      /**
       * Integrations state
       */
      loadedIntegrations: {},
      customIntegrations: {},

      /**
       * Initialize the integrations module
       * @returns {Promise} Initialization promise
       */
      init: function() {
        Utils.log('Initializing Integrations module');

        // Get enabled integrations from config
        var integrations = Config.get('integrations', {});

        try {
          // Initialize default integrations
          var initPromises = [];
          
          // Klaviyo integration
          if (integrations.klaviyo && integrations.klaviyo.enable) {
            initPromises.push(this.initKlaviyo(integrations.klaviyo));
          }
          
          // Other default integrations
          if (integrations.ga4 && integrations.ga4.enable) {
            initPromises.push(this.initGA4(integrations.ga4));
          }
          
          if (integrations.facebook && integrations.facebook.enable) {
            initPromises.push(this.initFacebookPixel(integrations.facebook));
          }
          
          // Apply compatibility fixes for third-party apps
          this.applyCompatibilityFixes();
          
          // Register hooks for additional integration points
          this.registerHooks();

          Utils.log('Integrations module initialized');
          return Promise.all(initPromises).then(() => {
            Carty.trigger('integrations:initialized');
            return true;
          });
        } catch (error) {
          Utils.logError('Error initializing Integrations module', error);
          return Promise.reject(error);
        }
      },

      /**
       * Initialize Klaviyo integration
       * @param {Object} config - Klaviyo configuration
       * @returns {Promise} Initialization promise
       */
      initKlaviyo: function(config) {
        return new Promise((resolve, reject) => {
          try {
            if (!config || !config.publicKey) {
              Utils.logWarn('Klaviyo integration enabled but missing public key');
              return resolve(false);
            }
            
            Utils.log('Initializing Klaviyo integration');
            
            // Add Klaviyo script if not already present
            if (!window._learnq) {
              window._learnq = window._learnq || [];
              
              var script = document.createElement('script');
              script.type = 'text/javascript';
              script.async = true;
              script.src = `https://a.klaviyo.com/media/js/analytics/analytics.js`;
              
              script.onload = () => {
                // Initialize Klaviyo with public key
                window._learnq.push(['account', config.publicKey]);
                
                // Track page view
                this.trackKlaviyoPageView();
                
                // Set up event listeners for Klaviyo
                this.setupKlaviyoListeners();
                
                this.loadedIntegrations.klaviyo = true;
                Utils.log('Klaviyo integration initialized');
                resolve(true);
              };
              
              script.onerror = () => {
                Utils.logError('Failed to load Klaviyo script');
                reject(new Error('Failed to load Klaviyo script'));
              };
              
              document.head.appendChild(script);
            } else {
              // Klaviyo already loaded
              this.loadedIntegrations.klaviyo = true;
              Utils.log('Klaviyo integration initialized (script already loaded)');
              resolve(true);
            }
          } catch (error) {
            Utils.logError('Error initializing Klaviyo integration', error);
            reject(error);
          }
        });
      },

      /**
       * Track page view in Klaviyo
       */
      trackKlaviyoPageView: function() {
        if (!window._learnq || !this.loadedIntegrations.klaviyo) return;
        
        try {
          window._learnq.push(['track', 'Viewed Page', {
            Title: document.title,
            Url: window.location.href,
            Referrer: document.referrer || ''
          }]);
        } catch (error) {
          Utils.logWarn('Error tracking Klaviyo page view', error);
        }
      },

      /**
       * Set up event listeners for Klaviyo tracking
       */
      setupKlaviyoListeners: function() {
        if (!window._learnq || !this.loadedIntegrations.klaviyo) return;
        
        // Product viewed
        Carty.on('product:viewed', (event) => {
          if (!event.data) return;
          
          var product = event.data;
          
          try {
            window._learnq.push(['track', 'Viewed Product', {
              ProductID: product.id || product.product_id,
              ProductName: product.title || product.product_title || '',
              ProductURL: window.location.href,
              Price: (product.price / 100) || 0,
              CompareAtPrice: (product.compare_at_price / 100) || 0,
              Brand: product.vendor || '',
              Categories: [product.product_type || product.type || ''],
              ImageURL: this.getProductImageUrl(product)
            }]);
          } catch (error) {
            Utils.logWarn('Error tracking Klaviyo product view', error);
          }
        });
        
        // Added to cart
        Carty.on('product:added', (event) => {
          if (!event.data) return;
          
          var data = event.data;
          var product = data.product;
          var variant = data.variant;
          
          try {
            window._learnq.push(['track', 'Added to Cart', {
              ProductID: product.id || product.product_id,
              ProductName: product.title || product.product_title || '',
              ProductURL: window.location.href,
              Price: (data.price / 100) || (product.price / 100) || 0,
              CompareAtPrice: (product.compare_at_price / 100) || 0,
              Brand: product.vendor || '',
              Categories: [product.product_type || product.type || ''],
              ImageURL: this.getProductImageUrl(product),
              Quantity: data.quantity || 1,
              VariantID: variant?.id || data.variant_id || null,
              FromUpsell: data.from_upsell || false
            }]);
          } catch (error) {
            Utils.logWarn('Error tracking Klaviyo add to cart', error);
          }
        });
        
        // Started checkout
        Carty.on('checkout:started', () => {
          CartService.getCart().then(cart => {
            if (!cart || !cart.items) return;
            
            try {
              // Format cart for Klaviyo
              var items = cart.items.map(item => ({
                ProductID: item.product_id,
                ProductName: item.product_title || item.title || '',
                Price: (item.price / 100) || 0,
                Quantity: item.quantity,
                VariantID: item.variant_id || null
              }));
              
              window._learnq.push(['track', 'Started Checkout', {
                Items: items,
                ItemCount: cart.item_count || 0,
                TotalPrice: (cart.total_price / 100) || 0,
                Currency: cart.currency || 'USD'
              }]);
            } catch (error) {
              Utils.logWarn('Error tracking Klaviyo checkout', error);
            }
          });
        });
      },

      /**
       * Initialize GA4 integration
       * @param {Object} config - GA4 configuration
       * @returns {Promise} Initialization promise
       */
      initGA4: function(config) {
        return new Promise((resolve, reject) => {
          try {
            if (!config || !config.measurementId) {
              Utils.logWarn('GA4 integration enabled but missing measurement ID');
              return resolve(false);
            }
            
            Utils.log('Initializing GA4 integration');
            
            // Check if GA4 already loaded
            if (window.gtag) {
              this.loadedIntegrations.ga4 = true;
              this.setupGA4Listeners();
              Utils.log('GA4 integration initialized (script already loaded)');
              return resolve(true);
            }
            
            // Add GA4 script
            window.dataLayer = window.dataLayer || [];
            window.gtag = function() {
              dataLayer.push(arguments);
            };
            
            // Initialize with config
            window.gtag('js', new Date());
            window.gtag('config', config.measurementId, {
              send_page_view: true
            });
            
            // Load script
            var script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`;
            
            script.onload = () => {
              this.loadedIntegrations.ga4 = true;
              this.setupGA4Listeners();
              Utils.log('GA4 integration initialized');
              resolve(true);
            };
            
            script.onerror = () => {
              Utils.logError('Failed to load GA4 script');
              reject(new Error('Failed to load GA4 script'));
            };
            
            document.head.appendChild(script);
          } catch (error) {
            Utils.logError('Error initializing GA4 integration', error);
            reject(error);
          }
        });
      },

      /**
       * Set up GA4 event listeners
       */
      setupGA4Listeners: function() {
        if (!window.gtag || !this.loadedIntegrations.ga4) return;
        
        // View item
        Carty.on('product:viewed', (event) => {
          if (!event.data) return;
          
          var product = event.data;
          
          try {
            window.gtag('event', 'view_item', {
              currency: product.currency || 'USD',
              value: (product.price / 100) || 0,
              items: [{
                item_id: product.id || product.product_id,
                item_name: product.title || product.product_title || '',
                price: (product.price / 100) || 0,
                item_brand: product.vendor || '',
                item_category: product.product_type || product.type || '',
                item_variant: product.variant_title || ''
              }]
            });
          } catch (error) {
            Utils.logWarn('Error tracking GA4 view item', error);
          }
        });
        
        // Add to cart
        Carty.on('product:added', (event) => {
          if (!event.data) return;
          
          var data = event.data;
          var product = data.product;
          
          try {
            window.gtag('event', 'add_to_cart', {
              currency: product.currency || 'USD',
              value: ((data.price / 100) || (product.price / 100) || 0) * (data.quantity || 1),
              items: [{
                item_id: product.id || product.product_id,
                item_name: product.title || product.product_title || '',
                price: (data.price / 100) || (product.price / 100) || 0,
                item_brand: product.vendor || '',
                item_category: product.product_type || product.type || '',
                item_variant: data.variant?.title || '',
                quantity: data.quantity || 1
              }]
            });
          } catch (error) {
            Utils.logWarn('Error tracking GA4 add to cart', error);
          }
        });
        
        // Begin checkout
        Carty.on('checkout:started', () => {
          CartService.getCart().then(cart => {
            if (!cart || !cart.items) return;
            
            try {
              // Format items for GA4
              var items = cart.items.map(item => ({
                item_id: item.product_id,
                item_name: item.product_title || item.title || '',
                price: (item.price / 100) || 0,
                item_brand: item.vendor || '',
                item_variant: item.variant_title || '',
                quantity: item.quantity
              }));
              
              window.gtag('event', 'begin_checkout', {
                currency: cart.currency || 'USD',
                value: (cart.total_price / 100) || 0,
                items: items
              });
            } catch (error) {
              Utils.logWarn('Error tracking GA4 checkout', error);
            }
          });
        });
      },

      /**
       * Initialize Facebook Pixel integration
       * @param {Object} config - Facebook Pixel configuration
       * @returns {Promise} Initialization promise
       */
      initFacebookPixel: function(config) {
        return new Promise((resolve, reject) => {
          try {
            if (!config || !config.pixelId) {
              Utils.logWarn('Facebook Pixel integration enabled but missing pixel ID');
              return resolve(false);
            }
            
            Utils.log('Initializing Facebook Pixel integration');
            
            // Check if Pixel already loaded
            if (window.fbq) {
              this.loadedIntegrations.facebook = true;
              this.setupFacebookListeners();
              Utils.log('Facebook Pixel integration initialized (script already loaded)');
              return resolve(true);
            }
            
            // Add Facebook Pixel
            !function(f,b,e,v,n,t,s) {
              if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)
            }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
            
            window.fbq('init', config.pixelId);
            window.fbq('track', 'PageView');
            
            // Confirm script loaded
            setTimeout(() => {
              if (window.fbq) {
                this.loadedIntegrations.facebook = true;
                this.setupFacebookListeners();
                Utils.log('Facebook Pixel integration initialized');
                resolve(true);
              } else {
                Utils.logWarn('Facebook Pixel init called but fbq not available');
                resolve(false);
              }
            }, 500);
          } catch (error) {
            Utils.logError('Error initializing Facebook Pixel integration', error);
            reject(error);
          }
        });
      },

      /**
       * Set up Facebook Pixel event listeners
       */
      setupFacebookListeners: function() {
        if (!window.fbq || !this.loadedIntegrations.facebook) return;
        
        // View content
        Carty.on('product:viewed', (event) => {
          if (!event.data) return;
          
          var product = event.data;
          
          try {
            window.fbq('track', 'ViewContent', {
              content_type: 'product',
              content_ids: [product.id || product.product_id],
              content_name: product.title || product.product_title || '',
              content_category: product.product_type || product.type || '',
              value: (product.price / 100) || 0,
              currency: product.currency || 'USD'
            });
          } catch (error) {
            Utils.logWarn('Error tracking Facebook Pixel view content', error);
          }
        });
        
        // Add to cart
        Carty.on('product:added', (event) => {
          if (!event.data) return;
          
          var data = event.data;
          var product = data.product;
          
          try {
            window.fbq('track', 'AddToCart', {
              content_type: 'product',
              content_ids: [product.id || product.product_id],
              content_name: product.title || product.product_title || '',
              value: ((data.price / 100) || (product.price / 100) || 0) * (data.quantity || 1),
              currency: product.currency || 'USD',
              contents: [{
                id: product.id || product.product_id,
                quantity: data.quantity || 1,
                price: (data.price / 100) || (product.price / 100) || 0
              }]
            });
          } catch (error) {
            Utils.logWarn('Error tracking Facebook Pixel add to cart', error);
          }
        });
        
        // Initiate checkout
        Carty.on('checkout:started', () => {
          CartService.getCart().then(cart => {
            if (!cart || !cart.items) return;
            
            try {
              // Format items for Facebook Pixel
              var contents = cart.items.map(item => ({
                id: item.product_id,
                quantity: item.quantity,
                price: (item.price / 100) || 0
              }));
              
              var contentIds = cart.items.map(item => item.product_id);
              
              window.fbq('track', 'InitiateCheckout', {
                content_type: 'product',
                content_ids: contentIds,
                contents: contents,
                value: (cart.total_price / 100) || 0,
                currency: cart.currency || 'USD',
                num_items: cart.item_count || 0
              });
            } catch (error) {
              Utils.logWarn('Error tracking Facebook Pixel checkout', error);
            }
          });
        });
      },

      /**
       * Apply compatibility fixes for third-party apps
       */
      applyCompatibilityFixes: function() {
        var compatibility = Config.get('compatibility', {});
        
        // PageFly compatibility
        if (compatibility.pagefly) {
          this.applyPageFlyFixes();
        }
        
        // Recharge compatibility
        if (compatibility.recharge) {
          this.applyRechargeFixes();
        }
        
        // Bold Subscriptions compatibility
        if (compatibility.boldSubscriptions) {
          this.applyBoldSubscriptionsFixes();
        }
        
        // Shogun compatibility
        if (compatibility.shogun) {
          this.applyShogunFixes();
        }
        
        // GemPages compatibility
        if (compatibility.gempages) {
          this.applyGemPagesFixes();
        }
        
        // Best Currency Converter compatibility
        if (compatibility.bestCurrencyConverter) {
          this.applyBestCurrencyConverterFixes();
        }
      },

      /**
       * Apply PageFly compatibility fixes
       */
      applyPageFlyFixes: function() {
        try {
          // Monitor for PageFly add to cart events
          document.addEventListener('click', (e) => {
            var target = e.target;
            var pageflyButton = 
              target.closest('.pf-btn') || 
              target.closest('.pf-add-to-cart') ||
              target.closest('[data-pf-type="ProductATC"]');
            
            if (pageflyButton) {
              // PageFly ATC button clicked
              // Wait for PageFly to process the click and update cart
              setTimeout(() => {
                // Refresh our cart
                CartService.refreshCart();
              }, 1000);
            }
          });
          
          Utils.log('PageFly compatibility fixes applied');
        } catch (error) {
          Utils.logWarn('Error applying PageFly compatibility fixes', error);
        }
      },

      /**
       * Apply ReCharge compatibility fixes
       */
      applyRechargeFixes: function() {
        try {
          // ReCharge uses its own checkout button
          // Override normal checkout button in our cart drawer
          Carty.on('cart:opened', () => {
            setTimeout(() => {
              var rechargeCheckout = document.querySelector('.rc_checkout_link');
              var cartyCheckout = document.querySelector('.carty-slide-cart__checkout-button');
              
              if (rechargeCheckout && cartyCheckout) {
                // Update our checkout button to use ReCharge checkout URL
                var rechargeUrl = rechargeCheckout.getAttribute('href');
                if (rechargeUrl) {
                  cartyCheckout.setAttribute('href', rechargeUrl);
                }
              }
            }, 1000);
          });
          
          // Modify ATC behavior to handle subscription options
          Carty.on('product:beforeAdd', (event) => {
            var form = event.data && event.data.form;
            
            if (form && form.querySelector('.rc_widget, .rc-widget')) {
              // ReCharge widget detected, let it handle the cart addition
              event.preventDefault();
              
              // Let ReCharge form submit normally
              form.submit();
              
              // Wait for ReCharge to process the form and update cart
              setTimeout(() => {
                CartService.refreshCart();
              }, 1500);
            }
          });
          
          Utils.log('ReCharge compatibility fixes applied');
        } catch (error) {
          Utils.logWarn('Error applying ReCharge compatibility fixes', error);
        }
      },

      /**
       * Apply Bold Subscriptions compatibility fixes
       */
      applyBoldSubscriptionsFixes: function() {
        try {
          // Bold also uses its own checkout button
          Carty.on('cart:opened', () => {
            setTimeout(() => {
              var boldCheckout = document.querySelector('.bold_checkout_link, .ro_widget');
              var cartyCheckout = document.querySelector('.carty-slide-cart__checkout-button');
              
              if (boldCheckout && cartyCheckout) {
                // Update our checkout button to use Bold checkout URL
                var boldUrl = boldCheckout.getAttribute('href');
                if (boldUrl) {
                  cartyCheckout.setAttribute('href', boldUrl);
                }
              }
            }, 1000);
          });
          
          // Modify ATC behavior to handle subscription options
          Carty.on('product:beforeAdd', (event) => {
            var form = event.data && event.data.form;
            
            if (form && (
              form.querySelector('.bold_options, .bold-ro__choice-header') ||
              document.querySelector('.bold_options, .bold-ro__choice-header')
            )) {
              // Bold widget detected, let it handle the cart addition
              event.preventDefault();
              
              // Let Bold form submit normally
              form.submit();
              
              // Wait for Bold to process the form and update cart
              setTimeout(() => {
                CartService.refreshCart();
              }, 1500);
            }
          });
          
          Utils.log('Bold Subscriptions compatibility fixes applied');
        } catch (error) {
          Utils.logWarn('Error applying Bold Subscriptions compatibility fixes', error);
        }
      },

      /**
       * Apply Shogun compatibility fixes
       */
      applyShogunFixes: function() {
        try {
          // Monitor for Shogun add to cart events
          document.addEventListener('click', (e) => {
            var target = e.target;
            var shogunButton = 
              target.closest('.shg-btn') || 
              target.closest('.shg-add-to-cart') ||
              target.closest('[data-shg-btn-name="add to cart"]');
            
            if (shogunButton) {
              // Shogun ATC button clicked
              // Wait for Shogun to process the click and update cart
              setTimeout(() => {
                // Refresh our cart
                CartService.refreshCart();
              }, 1000);
            }
          });
          
          Utils.log('Shogun compatibility fixes applied');
        } catch (error) {
          Utils.logWarn('Error applying Shogun compatibility fixes', error);
        }
      },

      /**
       * Apply GemPages compatibility fixes
       */
      applyGemPagesFixes: function() {
        try {
          // Monitor for GemPages add to cart events
          document.addEventListener('click', (e) => {
            var target = e.target;
            var gempagesButton = 
              target.closest('.gf_button') || 
              target.closest('.gf_add-to-cart') ||
              target.closest('.gf-cart-content');
            
            if (gempagesButton) {
              // GemPages ATC button clicked
              // Wait for GemPages to process the click and update cart
              setTimeout(() => {
                // Refresh our cart
                CartService.refreshCart();
              }, 1000);
            }
          });
          
          Utils.log('GemPages compatibility fixes applied');
        } catch (error) {
          Utils.logWarn('Error applying GemPages compatibility fixes', error);
        }
      },

      /**
       * Apply Best Currency Converter compatibility fixes
       */
      applyBestCurrencyConverterFixes: function() {
        try {
          // Best Currency Converter modifies prices on the page
          // We need to make sure our formatted prices use the converted currency
          
          // Override Utils.formatMoney method if Best Currency Converter is detected
          if (window.BOLDCURRENCY) {
            var originalFormatMoney = Utils.formatMoney;
            
            Utils.formatMoney = function(cents, format) {
              // First use our normal formatter
              let formattedPrice = originalFormatMoney.call(Utils, cents, format);
              
              // Then let the currency converter modify it if it wants to
              if (window.BOLDCURRENCY && window.BOLDCURRENCY.converter) {
                try {
                  formattedPrice = window.BOLDCURRENCY.converter.convertMoneyToString(cents);
                } catch (e) {
                  // Fallback to our original format
                }
              }
              
              return formattedPrice;
            };
          }
          
          Utils.log('Best Currency Converter compatibility fixes applied');
        } catch (error) {
          Utils.logWarn('Error applying Best Currency Converter compatibility fixes', error);
        }
      },

      /**
       * Register hooks for integration points with the app
       */
      registerHooks: function() {
        // Add hook for cart items customization
        if (!Carty.hooks) Carty.hooks = {};
        
        Carty.hooks.modifyCartItem = function(item) {
          // Pass through any registered hook transformations
          let modifiedItem = item;
          
          // Get instance of Integrations module
          var Integrations = Carty.getModule('integrations');
          
          if (Integrations && Integrations.customIntegrations) {
            // Pass through each registered cart item modifier
            Object.values(Integrations.customIntegrations).forEach(integration => {
              if (integration && typeof integration.modifyCartItem === 'function') {
                try {
                  modifiedItem = integration.modifyCartItem(modifiedItem) || modifiedItem;
                } catch (e) {
                  Utils.logWarn(`Error in custom integration's modifyCartItem: ${e.message}`);
                }
              }
            });
          }
          
          return modifiedItem;
        };
        
        // Add hook for checkout customization
        Carty.hooks.beforeCheckout = function(checkoutUrl) {
          let url = checkoutUrl;
          
          // Get instance of Integrations module
          var Integrations = Carty.getModule('integrations');
          
          if (Integrations && Integrations.customIntegrations) {
            // Pass through each registered checkout modifier
            Object.values(Integrations.customIntegrations).forEach(integration => {
              if (integration && typeof integration.modifyCheckoutUrl === 'function') {
                try {
                  url = integration.modifyCheckoutUrl(url) || url;
                } catch (e) {
                  Utils.logWarn(`Error in custom integration's modifyCheckoutUrl: ${e.message}`);
                }
              }
            });
          }
          
          return url;
        };
      },

      /**
       * Register a custom integration
       * @param {string} name - Integration name
       * @param {Object} integration - Integration object
       */
      registerCustomIntegration: function(name, integration) {
        if (!name || !integration) {
          Utils.logWarn('Cannot register integration: missing name or integration object');
          return false;
        }
        
        this.customIntegrations[name] = integration;
        
        // Initialize if it has an init method
        if (typeof integration.init === 'function') {
          try {
            integration.init();
            Utils.log(`Custom integration "${name}" registered and initialized`);
          } catch (e) {
            Utils.logWarn(`Error initializing custom integration "${name}": ${e.message}`);
          }
        } else {
          Utils.log(`Custom integration "${name}" registered`);
        }
        
        return true;
      },

      /**
       * Get a registered custom integration
       * @param {string} name - Integration name
       * @returns {Object|null} Integration object
       */
      getCustomIntegration: function(name) {
        return this.customIntegrations[name] || null;
      },

      /**
       * Get product image URL from product object
       * @param {Object} product - Product data
       * @returns {string} Image URL
       */
      getProductImageUrl: function(product) {
        let imageUrl = '';
        
        if (product.featured_image) {
          imageUrl = product.featured_image.url || product.featured_image.src || product.featured_image;
        } else if (product.image) {
          imageUrl = product.image;
        } else if (product.images && product.images.length) {
          imageUrl = product.images[0].src || product.images[0];
        } else {
          imageUrl = '//cdn.shopify.com/s/assets/no-image-2048-5e88c1b20e087fb7bbe9a3771824e743c244f437e4f8ba93bbf7b11b53f7824c.gif';
        }
        
        // Format image URL
        if (imageUrl && !imageUrl.includes('//')) {
          imageUrl = '//' + window.location.host + imageUrl;
        }
        
        return imageUrl;
      }
    };

    // Register the module
    Carty.registerModule('integrations', Integrations);
  });
})();
