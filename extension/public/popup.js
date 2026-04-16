/**
 * ===========================
 * ComplyIQ Popup Script
 * ===========================
 * 
 * Handles popup UI rendering and interactions
 */

const CONFIG = {
  BACKEND_URL: "http://localhost:8000",
};

// DOM elements
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const successState = document.getElementById("successState");

let currentDomain = null;
let currentTab = null;

/**
 * Initialize popup on load
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  if (!currentTab.url) {
    showError("Unable to determine website");
    return;
  }

  currentDomain = extractDomain(new URL(currentTab.url).hostname);

  // Request background worker to scan
  chrome.runtime.sendMessage(
    {
      type: "SCAN_DOMAIN",
      domain: currentDomain,
      url: currentTab.url,
    },
    (response) => {
      if (response?.success && response.data) {
        handleScanResult(response.data);
      } else {
        showError(response?.data?.message || "Scan failed");
      }
    }
  );

  // Setup button listeners
  setupEventListeners();
});

/**
 * Setup button event listeners
 */
function setupEventListeners() {
  document
    .getElementById("openSettingsBtn")
    ?.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });

  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("viewReportBtn")?.addEventListener("click", () => {
    // Open dashboard (would link to React frontend in production)
    chrome.tabs.create({
      url: `${CONFIG.BACKEND_URL}/dashboard?domain=${currentDomain}`,
    });
  });

  document.getElementById("rescanBtn")?.addEventListener("click", () => {
    // Clear cache and rescan
    chrome.runtime.sendMessage(
      {
        type: "SCAN_DOMAIN",
        domain: currentDomain,
        url: currentTab.url,
        forceRefresh: true,
      },
      (response) => {
        if (response?.success) {
          handleScanResult(response.data);
        }
      }
    );
  });
}

/**
 * Handle scan result and render UI
 */
function handleScanResult(scanData) {
  if (scanData.status === "error") {
    showError(scanData.message, scanData.requiresConfig);
    return;
  }

  if (
    scanData.scan_status !== "completed" &&
    scanData.scan_status !== "cached"
  ) {
    showError("Scan still processing. Please refresh in a moment.");
    return;
  }

  // Render the UI
  renderPopup(scanData);
  swap(loadingState, successState);
}

/**
 * Render popup with scan data
 */
function renderPopup(data) {
  const rating = data.complyiq_rating || 50;
  const trustScore = data.trust_score || 50;
  const complianceScore = data.compliance_score || 50;

  // Domain name
  document.getElementById("domainName").textContent = currentDomain;

  // Rating circle
  const percentage = rating / 100;
  const circumference = 2 * Math.PI * 45; // radius 45
  const strokeDasharray = circumference * percentage;
  document.getElementById("progressCircle").style.strokeDasharray =
    `${strokeDasharray} ${circumference}`;

  // Rating score
  document.getElementById("ratingScore").textContent = rating.toFixed(1);

  // Color based on rating
  const ratingColor = getRatingColor(rating);
  document.getElementById("progressCircle").style.stroke = ratingColor;

  // Verdict
  const { verdict, description } = getVerdict(rating);
  document.getElementById("verdict").textContent = verdict;
  document.getElementById("verdictDesc").textContent = description;
  document.getElementById("verdict").style.color = ratingColor;

  // Scores
  document.getElementById("trustScore").textContent = trustScore.toFixed(0);
  document.getElementById("complianceScore").textContent =
    complianceScore.toFixed(0);
  document.getElementById("httpsGrade").textContent =
    data.https_grade || "?";

  // Key findings
  renderFindings(data);

  // Last scanned
  const date = new Date(data.created_at);
  const timeAgo = getTimeAgo(date);
  document.getElementById("lastScanned").textContent =
    `Last scanned: ${timeAgo}`;
}

/**
 * Render key findings list
 */
function renderFindings(data) {
  const findings = [];

  // HTTPS finding
  if (data.https_grade === "A" || data.https_grade === "A+") {
    findings.push("✓ Strong HTTPS encryption");
  } else if (data.https_grade === "F") {
    findings.push("⚠️ No HTTPS - Not secure");
  }

  // Privacy policy
  if (data.privacy_policy_found) {
    const quality = data.privacy_policy_quality || "unknown";
    findings.push(`✓ Privacy policy (${quality})`);
  } else {
    findings.push("⚠️ No privacy policy found");
  }

  // Consent banner
  if (data.consent_banner_found) {
    findings.push("✓ Consent banner present");
  }

  // Trackers
  if (data.js_analysis?.trackers) {
    const trackerCount = data.js_analysis.trackers.length;
    if (trackerCount === 0) {
      findings.push("✓ No trackers detected");
    } else if (trackerCount <= 3) {
      findings.push(`⚠️ ${trackerCount} tracker(s) found`);
    } else {
      findings.push(`⚠️ ${trackerCount} trackers - Extensive tracking`);
    }
  }

  // Sensitive fields
  const sensitiveFields =
    data.sensitive_fields_inventory || {};
  if (
    sensitiveFields.bvn?.length > 0 ||
    sensitiveFields.nin?.length > 0 ||
    sensitiveFields.card?.length > 0
  ) {
    findings.push("⚠️ Sensitive fields detected");
  }

  // NDPA
  if (data.consent_text_mentions_ndpa) {
    findings.push("✓ NDPA mention in consent");
  }

  // Render findings
  const findingsList = document.getElementById("keyFindings");
  findingsList.innerHTML = findings
    .map((f) => `<li>${f}</li>`)
    .join("");
}

/**
 * Get rating color based on score
 */
function getRatingColor(rating) {
  if (rating >= 80) return "#00D9FF"; // Neon blue
  if (rating >= 60) return "#06B6D4"; // Cyan
  if (rating >= 40) return "#FBBF24"; // Amber
  if (rating >= 20) return "#FB923C"; // Orange
  return "#EF4444"; // Red
}

/**
 * Get verdict text based on rating
 */
function getVerdict(rating) {
  if (rating >= 80)
    return {
      verdict: "EXCELLENT",
      description: "This site appears safe and trustworthy",
    };
  if (rating >= 60)
    return {
      verdict: "GOOD",
      description: "Generally safe, but review findings",
    };
  if (rating >= 40)
    return {
      verdict: "FAIR",
      description: "Exercise caution on this site",
    };
  if (rating >= 20)
    return {
      verdict: "POOR",
      description: "Multiple privacy/security concerns",
    };
  return {
    verdict: "CRITICAL",
    description: "Significant risk - Avoid this site",
  };
}

/**
 * Format time ago (e.g., "5 minutes ago")
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

/**
 * Extract domain from hostname
 */
function extractDomain(hostname) {
  return hostname.replace(/^www\./, "");
}

/**
 * Show error state
 */
function showError(message, requiresConfig = false) {
  document.getElementById("errorMessage").textContent = message;

  if (!requiresConfig) {
    document.getElementById("openSettingsBtn").style.display = "none";
  }

  swap(loadingState, errorState);
}

/**
 * Swap visibility between two elements
 */
function swap(hideEl, showEl) {
  hideEl.classList.add("hidden");
  showEl.classList.remove("hidden");
}
