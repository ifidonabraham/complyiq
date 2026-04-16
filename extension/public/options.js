/**
 * ===========================
 * ComplyIQ Options Script
 * ===========================
 */

const CONFIG = {
  BACKEND_URL: "http://localhost:8000",
};

// DOM elements
const apiKeyInput = document.getElementById("apiKeyInput");
const toggleApiKeyBtn = document.getElementById("toggleApiKeyBtn");
const backendUrlInput = document.getElementById("backendUrlInput");
const testApiBtn = document.getElementById("testApiBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const statusMessage = document.getElementById("statusMessage");

const enableNotificationsCheckbox =
  document.getElementById("enableNotificationsCheckbox");
const enableRiskWarningsCheckbox =
  document.getElementById("enableRiskWarningsCheckbox");
const enableFormConfirmationCheckbox =
  document.getElementById("enableFormConfirmationCheckbox");
const enableLoggingCheckbox = document.getElementById("enableLoggingCheckbox");
const clearCacheBtn = document.getElementById("clearCacheBtn");

/**
 * Initialize options page
 */
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  setupEventListeners();
});

/**
 * Load current settings from Chrome storage
 */
function loadSettings() {
  // API Key
  chrome.storage.sync.get("complyiq_api_key", (result) => {
    if (result.complyiq_api_key) {
      apiKeyInput.value = result.complyiq_api_key;
    }
  });

  // Backend URL
  chrome.storage.local.get("complyiq_backend_url", (result) => {
    if (result.complyiq_backend_url) {
      backendUrlInput.value = result.complyiq_backend_url;
    }
  });

  // Notification settings
  chrome.storage.local.get(
    {
      complyiq_notifications: true,
      complyiq_risk_warnings: true,
      complyiq_form_confirmation: true,
      complyiq_logging: true,
    },
    (result) => {
      enableNotificationsCheckbox.checked = result.complyiq_notifications;
      enableRiskWarningsCheckbox.checked = result.complyiq_risk_warnings;
      enableFormConfirmationCheckbox.checked =
        result.complyiq_form_confirmation;
      enableLoggingCheckbox.checked = result.complyiq_logging;
    }
  );
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Toggle API key visibility
  toggleApiKeyBtn.addEventListener("click", () => {
    const type = apiKeyInput.type === "password" ? "text" : "password";
    apiKeyInput.type = type;
    toggleApiKeyBtn.textContent = type === "password" ? "👁️" : "👁️‍🗨️";
  });

  // Save settings
  saveSettingsBtn.addEventListener("click", saveSettings);

  // Test API connection
  testApiBtn.addEventListener("click", testConnection);

  // Clear cache
  clearCacheBtn.addEventListener("click", clearCache);

  // Auto-save notification settings
  enableNotificationsCheckbox.addEventListener("change", () => {
    chrome.storage.local.set({
      complyiq_notifications: enableNotificationsCheckbox.checked,
    });
  });

  enableRiskWarningsCheckbox.addEventListener("change", () => {
    chrome.storage.local.set({
      complyiq_risk_warnings: enableRiskWarningsCheckbox.checked,
    });
  });

  enableFormConfirmationCheckbox.addEventListener("change", () => {
    chrome.storage.local.set({
      complyiq_form_confirmation: enableFormConfirmationCheckbox.checked,
    });
  });

  enableLoggingCheckbox.addEventListener("change", () => {
    chrome.storage.local.set({
      complyiq_logging: enableLoggingCheckbox.checked,
    });
  });
}

/**
 * Save API key and backend URL
 */
async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const backendUrl = backendUrlInput.value.trim();

  if (!apiKey) {
    showStatus("Please enter your API key", "error");
    return;
  }

  if (!backendUrl) {
    showStatus("Please enter a backend URL", "error");
    return;
  }

  // Save to Chrome storage
  chrome.storage.sync.set({ complyiq_api_key: apiKey });
  chrome.storage.local.set({ complyiq_backend_url: backendUrl });

  showStatus("✓ Settings saved successfully", "success");
  saveSettingsBtn.disabled = true;
  setTimeout(() => {
    saveSettingsBtn.disabled = false;
  }, 1000);
}

/**
 * Test API connection
 */
async function testConnection() {
  const apiKey = apiKeyInput.value.trim();
  const backendUrl = backendUrlInput.value.trim();

  if (!apiKey) {
    showStatus("Please enter your API key first", "error");
    return;
  }

  if (!backendUrl) {
    showStatus("Please enter a backend URL first", "error");
    return;
  }

  testApiBtn.disabled = true;
  showStatus("Testing connection...", "info");

  try {
    const response = await fetch(`${backendUrl}/health`, {
      headers: { "X-API-Key": apiKey },
    });

    if (response.ok) {
      const data = await response.json();
      showStatus(
        `✓ Connection successful! (Database: ${data.database}, Redis: ${data.redis})`,
        "success"
      );
    } else {
      showStatus(`✗ Connection failed (HTTP ${response.status})`, "error");
    }
  } catch (error) {
    showStatus(`✗ Connection failed: ${error.message}`, "error");
  } finally {
    testApiBtn.disabled = false;
  }
}

/**
 * Clear scan cache
 */
function clearCache() {
  const confirmed = confirm(
    "Are you sure you want to clear all cached scan results? This will remove all website history."
  );

  if (!confirmed) return;

  chrome.storage.local.get(null, (items) => {
    const keysToDelete = Object.keys(items).filter((key) =>
      key.startsWith("cache_")
    );

    if (keysToDelete.length === 0) {
      showStatus("Cache is already empty", "info");
      return;
    }

    chrome.storage.local.remove(keysToDelete, () => {
      showStatus(
        `✓ Cleared ${keysToDelete.length} cached scan result(s)`,
        "success"
      );
    });
  });
}

/**
 * Show status message
 */
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove("hidden");

  if (type !== "info") {
    setTimeout(() => {
      statusMessage.classList.add("hidden");
    }, 4000);
  }
}
