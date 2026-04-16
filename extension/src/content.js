/**
 * ===========================
 * ComplyIQ Content Script (runs on every webpage)
 * ===========================
 * 
 * Responsibilities:
 * 1. Detect sensitive form fields (BVN, NIN, email, phone, card, password)
 * 2. Monitor for form submissions
 * 3. Inject warning overlays for risky interactions
 * 4. Track domain and notify background worker
 * 5. Listen for user interactions on sensitive fields
 */

const SENSITIVE_PATTERNS = {
  bvn: {
    regex: /\b\d{11}\b/, // 11-digit pattern
    name: "BVN",
    warning: "⚠️ BVN (Bank Verification Number) Detected",
    advice: "Only enter your BVN on legitimate banking websites",
  },
  nin: {
    regex: /\b\d{11}\b/, // 11-digit pattern (same as BVN, differentiated by field name)
    name: "NIN",
    warning: "⚠️ NIN (National ID Number) Detected",
    advice: "Only share your NIN with official government services",
  },
  email: {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    name: "Email",
    warning: "📧 Email Address Detected",
    advice: "Verify HTTPS and ensure you trust this website",
  },
  phone: {
    regex: /(\+?234|0)[789]\d{9}/, // Nigerian phone number
    name: "Phone Number",
    warning: "📱 Phone Number Detected",
    advice: "Be cautious sharing your phone number",
  },
  card: {
    regex: /\b\d{13,19}\b/, // Card PAN
    name: "Card Number",
    warning: "💳 Card Number Field Detected",
    advice: "Only enter card details on secure, verified payment pages",
  },
  password: {
    regex: /.+/, // Any input (matched by type)
    name: "Password",
    warning: "🔐 Password Field Detected",
    advice: "Never reuse passwords across multiple websites",
  },
};

const FIELD_SELECTORS = {
  bvn: ["input[name*='bvn' i]", "input[placeholder*='bvn' i]"],
  nin: ["input[name*='nin' i]", "input[placeholder*='nin' i]"],
  email: [
    "input[type='email']",
    "input[name*='email' i]",
    "input[placeholder*='email' i]",
  ],
  phone: [
    "input[type='tel']",
    "input[name*='phone' i]",
    "input[name*='mobile' i]",
    "input[placeholder*='phone' i]",
  ],
  card: [
    "input[name*='card' i]",
    "input[placeholder*='card' i]",
    "input[placeholder*='credit' i]",
  ],
  password: ["input[type='password']"],
};

// State tracking
let currentDomain = extractDomain(window.location.hostname);
let detectedFields = new Set();
let isProcessing = false;

/**
 * Initialize content script
 */
function init() {
  console.log(`[ComplyIQ] Initialized on ${currentDomain}`);

  // Request scan from background worker
  requestDomainScan();

  // Monitor DOM for sensitive fields
  monitorSensitiveFields();

  // Watch for form submissions
  watchFormSubmissions();

  // Watch for user interactions on sensitive fields
  watchFieldInteractions();
}

/**
 * Extract domain from hostname (for clean display)
 */
function extractDomain(hostname) {
  return hostname.replace(/^www\./, "");
}

/**
 * Request background worker to scan current domain
 */
function requestDomainScan() {
  chrome.runtime.sendMessage(
    {
      type: "SCAN_DOMAIN",
      domain: currentDomain,
      url: window.location.href,
    },
    (response) => {
      if (response?.success) {
        console.log("[ComplyIQ] Scan result received:", response.data);
      } else {
        console.warn("[ComplyIQ] Scan request failed:", response?.data?.message);
      }
    }
  );
}

/**
 * Monitor DOM for sensitive form fields
 */
function monitorSensitiveFields() {
  // Initial scan
  scanForFields();

  // Watch for dynamically added fields (SPAs)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.addedNodes.length > 0 &&
        mutation.type === "childList"
      ) {
        scanForFields();
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Scan page for sensitive fields and add monitoring
 */
function scanForFields() {
  for (const [fieldType, selectors] of Object.entries(FIELD_SELECTORS)) {
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          const fieldId = getFieldId(element);

          // Skip if already tracked
          if (detectedFields.has(fieldId)) return;

          detectedFields.add(fieldId);

          console.log(
            `[ComplyIQ] Detected ${fieldType} field:`,
            element.name || element.id
          );

          // Add visual indicator (subtle, non-intrusive)
          addFieldIndicator(element, fieldType);

          // Add interaction listeners
          element.addEventListener("focus", (e) =>
            handleFieldFocus(e, fieldType)
          );
          element.addEventListener("input", (e) =>
            handleFieldInput(e, fieldType)
          );
        });
      } catch (error) {
        console.debug(`[ComplyIQ] Selector error:`, error);
      }
    }
  }
}

/**
 * Generate unique field identifier
 */
function getFieldId(element) {
  return (
    element.id ||
    element.name ||
    `${element.tagName}_${Date.now()}_${Math.random()}`
  );
}

/**
 * Add subtle visual indicator to field
 */
function addFieldIndicator(element, fieldType) {
  if (element.dataset.complyiqMarked) return;

  element.dataset.complyiqMarked = true;

  // Add border style
  element.style.borderColor = "#D946EF"; // Neon violet
  element.style.borderWidth = "2px";
  element.style.boxShadow = "0 0 8px rgba(217, 70, 239, 0.3)";
  element.style.transition = "all 200ms ease";
}

/**
 * Handle field focus: show warning badge
 */
function handleFieldFocus(event, fieldType) {
  const element = event.target;
  const pattern = SENSITIVE_PATTERNS[fieldType];

  // Highlight more prominently on focus
  element.style.boxShadow = "0 0 16px rgba(217, 70, 239, 0.6)";

  // Show inline warning
  showInlineWarning(element, pattern);
}

/**
 * Handle field input: monitor for real data entry
 */
function handleFieldInput(event, fieldType) {
  const element = event.target;
  const value = element.value.trim();

  if (!value) return;

  const pattern = SENSITIVE_PATTERNS[fieldType];

  // Check if actual data is being entered
  if (
    fieldType === "password" ||
    pattern.regex.test(value) ||
    value.length > 3
  ) {
    console.warn(
      `[ComplyIQ] User entering ${fieldType} data on ${currentDomain}`
    );

    // Request domain risk score
    chrome.runtime.sendMessage(
      {
        type: "GET_CACHED_RESULT",
        domain: currentDomain,
      },
      (response) => {
        if (response?.success && response.data?.result) {
          const rating = response.data.result.complyiq_rating;

          // Show warning if risky
          if (rating && rating < 60) {
            showRiskWarning(element, rating, pattern);
          }
        }
      }
    );
  }
}

/**
 * Show inline warning overlay above field
 */
function showInlineWarning(element, pattern) {
  // Check if warning already exists
  if (element.nextElementSibling?.dataset.complyiqWarning) return;

  const warning = document.createElement("div");
  warning.dataset.complyiqWarning = true;
  warning.style.cssText = `
    background: rgba(217, 70, 239, 0.15);
    border: 1px solid rgba(217, 70, 239, 0.5);
    border-radius: 6px;
    padding: 8px 12px;
    margin: 4px 0;
    font-size: 12px;
    color: #e0e7ff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideDown 300ms ease;
    position: relative;
    z-index: 10000;
  `;

  warning.innerHTML = `
    <span style="flex-shrink: 0;">🛡️</span>
    <span><strong>${pattern.name}:</strong> ${pattern.advice}</span>
  `;

  element.parentNode.insertBefore(warning, element);

  // Auto-remove after 8 seconds
  setTimeout(() => {
    warning.remove();
  }, 8000);

  // Add animation
  if (!document.querySelector("style[data-complyiq]")) {
    const style = document.createElement("style");
    style.dataset.complyiq = true;
    style.textContent = `
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Show risk warning if domain is unsafe
 */
function showRiskWarning(element, rating, pattern) {
  // Show banner above field with strong warning
  const banner = document.createElement("div");
  banner.style.cssText = `
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
    border-left: 4px solid #991B1B;
    padding: 12px 16px;
    margin: 8px 0;
    border-radius: 6px;
    font-size: 13px;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    position: relative;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  `;

  banner.innerHTML = `
    <strong>⚠️ WEBSITE RISK WARNING</strong>
    <div style="font-size: 12px; margin-top: 4px; opacity: 0.95;">
      This website has a low ComplyIQ rating (${rating.toFixed(1)}/100).
      <strong>Avoid entering sensitive data here.</strong>
      <a href="#" style="color: #fbbf24; text-decoration: underline; margin-left: 4px;">
        Learn more →
      </a>
    </div>
  `;

  element.parentNode.insertBefore(banner, element);

  // Remove after 15 seconds
  setTimeout(() => {
    banner.remove();
  }, 15000);
}

/**
 * Watch form submissions on risky sites
 */
function watchFormSubmissions() {
  document.addEventListener("submit", (event) => {
    const form = event.target;

    // Get domain score
    chrome.runtime.sendMessage(
      {
        type: "GET_CACHED_RESULT",
        domain: currentDomain,
      },
      (response) => {
        if (response?.success && response.data?.result) {
          const rating = response.data.result.complyiq_rating;

          // If very risky, show confirmation
          if (rating && rating < 40) {
            const proceed = confirm(
              `⚠️ ComplyIQ: This website has a CRITICAL risk rating (${rating.toFixed(
                1
              )}/100).\n\nAre you sure you want to submit your data?`
            );

            if (!proceed) {
              event.preventDefault();
            }
          }
        }
      }
    );
  });
}

/**
 * Watch for field interactions (focus, blur, etc)
 */
function watchFieldInteractions() {
  document.addEventListener(
    "focusin",
    (event) => {
      const element = event.target;

      // Check if it's an input field
      if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA"
      ) {
        // Highlight field
        if (element.style.borderColor === "#D946EF") {
          element.style.boxShadow =
            "0 0 20px rgba(217, 70, 239, 0.8)";
        }
      }
    },
    true
  );

  document.addEventListener(
    "focusout",
    (event) => {
      const element = event.target;

      if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA"
      ) {
        // Reduce highlight
        if (element.style.borderColor === "#D946EF") {
          element.style.boxShadow =
            "0 0 8px rgba(217, 70, 239, 0.3)";
        }
      }
    },
    true
  );
}

// Start on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
