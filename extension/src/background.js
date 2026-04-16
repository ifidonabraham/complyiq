/**
 * ===========================
 * ComplyIQ Background Service Worker (Manifest V3)
 * ===========================
 * 
 * Responsibilities:
 * 1. Handle API communication with ComplyIQ backend
 * 2. Cache scan results (24h TTL)
 * 3. Manage API key storage
 * 4. Listen to message events from content scripts & popup
 * 5. Track current tab domain
 * 6. Orchestrate scan requests
 */

const CONFIG = {
  BACKEND_URL: "http://localhost:8000",
  CACHE_TTL_HOURS: 24,
  API_ENDPOINTS: {
    CHECK: "/api/v1/scans/check",
    GET_RESULT: "/api/v1/scans",
  },
};

/**
 * Initialize extension on install/update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

/**
 * Listen for messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async operations
  if (request.type === "SCAN_DOMAIN") {
    handleScanDomain(request.domain, request.url, sender.tab.id).then(
      (result) => {
        sendResponse({ success: true, data: result });
      }
    );
    return true; // Keep channel open for async response
  }

  if (request.type === "GET_CACHED_RESULT") {
    getCachedResult(request.domain).then((result) => {
      sendResponse({ success: true, data: result });
    });
    return true;
  }

  if (request.type === "GET_API_KEY") {
    getApiKey().then((key) => {
      sendResponse({ success: true, data: key });
    });
    return true;
  }

  if (request.type === "SET_API_KEY") {
    setApiKey(request.key).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Main scan handler: initiate scan and poll for results
 */
async function handleScanDomain(domain, url, tabId) {
  try {
    const apiKey = await getApiKey();

    if (!apiKey) {
      return {
        status: "error",
        message: "API key not configured. Please set it in extension options.",
        requiresConfig: true,
      };
    }

    // Check cache first
    const cached = await getCachedResult(domain);
    if (cached && cached.timestamp) {
      const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
      if (ageHours < CONFIG.CACHE_TTL_HOURS) {
        console.log(`[ComplyIQ] Using cached result for ${domain} (${ageHours.toFixed(1)}h old)`);
        return cached.result;
      }
    }

    // Initiate new scan
    console.log(`[ComplyIQ] Starting new scan for ${domain}`);

    const scanResponse = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API_ENDPOINTS.CHECK}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ url }),
    });

    if (!scanResponse.ok) {
      const errorData = await scanResponse.json();
      throw new Error(errorData.detail || `HTTP ${scanResponse.status}`);
    }

    const scanData = await scanResponse.json();
    const scanId = scanData.id;

    console.log(`[ComplyIQ] Scan initiated (ID: ${scanId}), polling for results...`);

    // Poll for completion (max 60 seconds)
    const result = await pollScanResult(scanId, apiKey);

    // Cache the result
    await cacheScanResult(domain, result);

    return result;
  } catch (error) {
    console.error(`[ComplyIQ] Scan error for ${domain}:`, error);
    return {
      status: "error",
      message: error.message,
    };
  }
}

/**
 * Poll for scan results until completion or timeout
 */
async function pollScanResult(scanId, apiKey, maxAttempts = 60) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${CONFIG.BACKEND_URL}${CONFIG.API_ENDPOINTS.GET_RESULT}/${scanId}`,
        {
          headers: { "X-API-Key": apiKey },
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.scan_status === "completed") {
        console.log(`[ComplyIQ] Scan ${scanId} completed (Rating: ${data.complyiq_rating})`);
        return data;
      }

      if (data.scan_status === "failed") {
        throw new Error(data.error_message || "Scan failed on backend");
      }

      // Still pending, wait before next poll
      console.log(`[ComplyIQ] Scan ${scanId} status: ${data.scan_status}, retrying...`);
      await sleep(1000);
    } catch (error) {
      console.error(`[ComplyIQ] Poll error:`, error);
      if (attempt === maxAttempts - 1) throw error;
      await sleep(1000);
    }
  }

  throw new Error("Scan polling timeout (60s exceeded)");
}

/**
 * Cache management functions
 */
async function getCachedResult(domain) {
  return new Promise((resolve) => {
    chrome.storage.local.get(`cache_${domain}`, (result) => {
      resolve(result[`cache_${domain}`] || null);
    });
  });
}

async function cacheScanResult(domain, result) {
  const cacheKey = `cache_${domain}`;
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [cacheKey]: {
          result,
          timestamp: Date.now(),
        },
      },
      resolve
    );
  });
}

/**
 * API key management (stored in chrome.storage.sync - encrypted by Chrome)
 */
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("complyiq_api_key", (result) => {
      resolve(result.complyiq_api_key || null);
    });
  });
}

async function setApiKey(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ complyiq_api_key: key }, resolve);
  });
}

/**
 * Utility: Sleep function for polling delays
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
