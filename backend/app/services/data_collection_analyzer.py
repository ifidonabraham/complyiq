# ===========================
# MODULE 2: Data Collection Analyzer Service
# ===========================
# Performs privacy & compliance assessment: privacy policy extraction,
# consent banner detection, sensitive field inventory, NDPA compliance checks.

import logging
import re
import json
from typing import Optional, Dict, List, Any, Tuple
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup
import httpx

logger = logging.getLogger(__name__)


class DataCollectionAnalyzerService:
    """
    Advanced privacy & compliance analyzer combining:
    1. Privacy policy detection and quality assessment
    2. Consent/cookie banner detection
    3. Sensitive field inventory (BVN, NIN, email, phone, card)
    4. Third-party data processor identification
    5. NDPA-specific compliance checks
    """

    def __init__(self):
        self.timeout = 30000  # 30 seconds
        # Regex patterns for Nigerian identifiers
        self.bvn_pattern = re.compile(r"\b\d{11}\b")  # BVN is 11 digits
        self.nin_pattern = re.compile(r"\b\d{11}\b")  # NIN is 11 digits
        self.phone_pattern = re.compile(
            r"(\+?234|0)[789]\d{9}\b"
        )  # Nigerian phone
        self.card_pattern = re.compile(
            r"\b\d{13,19}\b"
        )  # Card number (PAN)

        # Common privacy policy paths
        self.policy_paths = [
            "/privacy",
            "/privacy-policy",
            "/privacy_policy",
            "/policies/privacy",
            "/legal/privacy",
            "/pp",
            "/termsofservice",
            "/terms",
        ]

    async def analyze_data_collection(self, url: str) -> Dict[str, Any]:
        """
        Main entry point: perform complete privacy & compliance analysis.
        
        Args:
            url: Full URL to analyze
            
        Returns:
            Dictionary containing:
            - privacy_policy_found: bool
            - privacy_policy_url: str (if found)
            - privacy_policy_quality: str
            - consent_banner_found: bool
            - cookies_detected: int
            - tracking_pixels_detected: int
            - sensitive_fields_inventory: dict
            - data_processors: list
            - ndpa_compliance: dict
            - compliance_score: float
        """
        from urllib.parse import urlparse

        parsed_url = urlparse(url)
        domain = parsed_url.netloc

        logger.info(f"Starting data collection analysis for: {domain}")

        results = {
            "domain": domain,
            "url": url,
            "scan_status": "in_progress",
            "privacy_policy_found": False,
            "privacy_policy_url": None,
            "privacy_policy_quality": None,
            "privacy_policy_text": None,  # For AI analysis later
            "consent_banner_found": False,
            "consent_text": None,
            "cookies_detected": 0,
            "tracking_pixels_detected": 0,
            "sensitive_fields_inventory": {
                "bvn": [],
                "nin": [],
                "email": [],
                "phone": [],
                "card": [],
                "other": [],
            },
            "data_processors": [],
            "third_party_domains": [],
            "cookies_list": [],
            "ndpa_compliance": {
                "mentions_ndpa": False,
                "consent_text_ndpa_aware": False,
                "data_processor_list": False,
                "user_rights_explained": False,
                "retention_policy_clear": False,
            },
            "compliance_score": 50.0,
            "errors": [],
        }

        try:
            # 1. Find & fetch privacy policy
            policy_result = await self._find_privacy_policy(url)
            results["privacy_policy_found"] = policy_result["found"]
            results["privacy_policy_url"] = policy_result["url"]
            results["privacy_policy_text"] = policy_result["text"]

            # 2. Analyze policy quality & NDPA mentions
            if results["privacy_policy_text"]:
                quality_result = await self._analyze_policy_quality(
                    results["privacy_policy_text"]
                )
                results["privacy_policy_quality"] = quality_result["quality"]
                results["ndpa_compliance"]["mentions_ndpa"] = quality_result[
                    "mentions_ndpa"
                ]
                results["ndpa_compliance"]["user_rights_explained"] = quality_result[
                    "user_rights_explained"
                ]
                results["ndpa_compliance"]["retention_policy_clear"] = quality_result[
                    "retention_policy_clear"
                ]
                results["ndpa_compliance"]["data_processor_list"] = quality_result[
                    "data_processor_list"
                ]

            # 3. Detect consent banner & cookie consent
            consent_result = await self._detect_consent_banner(url)
            results["consent_banner_found"] = consent_result["found"]
            results["consent_text"] = consent_result["text"]
            results["cookies_detected"] = consent_result.get("cookie_count", 0)
            results["cookies_list"] = consent_result.get("cookies", [])
            results["ndpa_compliance"]["consent_text_ndpa_aware"] = consent_result.get(
                "ndpa_aware", False
            )

            # 4. Inventory sensitive form fields
            fields_result = await self._inventory_sensitive_fields(url)
            results["sensitive_fields_inventory"] = fields_result[
                "sensitive_fields"
            ]
            results["third_party_domains"] = fields_result["third_party_domains"]
            results["tracking_pixels_detected"] = fields_result.get(
                "tracking_pixels", 0
            )

            # 5. Identify data processors (third-party services)
            processors = await self._identify_data_processors(url)
            results["data_processors"] = processors

            # 6. Compute compliance score
            results["compliance_score"] = self._compute_compliance_score(results)
            results["scan_status"] = "completed"

            logger.info(
                f"Data collection analysis completed for {domain}. Compliance Score: {results['compliance_score']}"
            )

        except Exception as e:
            logger.error(f"Data collection analysis failed for {domain}: {str(e)}")
            results["scan_status"] = "failed"
            results["errors"].append(str(e))

        return results

    async def _find_privacy_policy(self, url: str) -> Dict[str, Any]:
        """
        Attempt to locate and fetch privacy policy.
        Try common URLs, robots.txt, sitemap.xml, and page footer links.
        """
        logger.debug(f"Finding privacy policy for {url}")

        from urllib.parse import urljoin, urlparse

        result = {
            "found": False,
            "url": None,
            "text": None,
        }

        parsed_base = urlparse(url)
        base_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"

        # Try common policy paths
        for path in self.policy_paths:
            full_url = urljoin(base_domain, path)
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.get(full_url)
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, "html.parser")
                        text = soup.get_text(separator=" ", strip=True)
                        if len(text) > 500:  # Sanity check
                            result["found"] = True
                            result["url"] = full_url
                            result["text"] = text[:50000]  # First 50k chars
                            logger.info(f"Privacy policy found: {full_url}")
                            return result
            except Exception as e:
                logger.debug(f"Failed to fetch {full_url}: {str(e)}")
                continue

        # Try finding policy link on main page
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "html.parser")

                    # Look for privacy policy links
                    for link in soup.find_all("a"):
                        href = link.get("href", "")
                        text = link.get_text(strip=True).lower()
                        if "privacy" in text or "policy" in text:
                            policy_url = urljoin(url, href)
                            try:
                                policy_response = await client.get(policy_url)
                                if policy_response.status_code == 200:
                                    policy_soup = BeautifulSoup(
                                        policy_response.text, "html.parser"
                                    )
                                    policy_text = policy_soup.get_text(
                                        separator=" ", strip=True
                                    )
                                    if len(policy_text) > 500:
                                        result["found"] = True
                                        result["url"] = policy_url
                                        result["text"] = policy_text[:50000]
                                        logger.info(f"Privacy policy found: {policy_url}")
                                        return result
                            except Exception:
                                continue
        except Exception as e:
            logger.debug(f"Failed to find policy link on main page: {str(e)}")

        return result

    async def _analyze_policy_quality(self, policy_text: str) -> Dict[str, Any]:
        """
        Analyze privacy policy text for quality indicators and NDPA compliance.
        """
        logger.debug("Analyzing policy quality")

        result = {
            "quality": "poor",  # poor, fair, good, excellent
            "mentions_ndpa": False,
            "user_rights_explained": False,
            "retention_policy_clear": False,
            "data_processor_list": False,
        }

        try:
            text_lower = policy_text.lower()
            score = 0

            # Check for NDPA mentions
            if any(
                keyword in text_lower
                for keyword in [
                    "ndpa",
                    "nigerian data protection",
                    "data protection act",
                ]
            ):
                result["mentions_ndpa"] = True
                score += 15

            # Check for user rights explanations
            if any(
                keyword in text_lower
                for keyword in [
                    "right to access",
                    "right to rectification",
                    "right to erasure",
                    "data subject rights",
                    "your rights",
                ]
            ):
                result["user_rights_explained"] = True
                score += 20

            # Check for data retention policy
            if any(
                keyword in text_lower
                for keyword in [
                    "retention",
                    "retained for",
                    "how long",
                    "data retention",
                ]
            ):
                result["retention_policy_clear"] = True
                score += 15

            # Check for data processor list
            if any(
                keyword in text_lower
                for keyword in [
                    "data processor",
                    "processor",
                    "third party",
                    "third-party",
                    "subprocessor",
                ]
            ):
                result["data_processor_list"] = True
                score += 15

            # Basic quality checks
            word_count = len(policy_text.split())
            if word_count > 2000:
                score += 20  # Comprehensive policy
            elif word_count > 500:
                score += 10
            else:
                score -= 5

            # Determine quality level
            if score >= 65:
                result["quality"] = "excellent"
            elif score >= 45:
                result["quality"] = "good"
            elif score >= 25:
                result["quality"] = "fair"
            else:
                result["quality"] = "poor"

        except Exception as e:
            logger.warning(f"Policy quality analysis failed: {str(e)}")

        return result

    async def _detect_consent_banner(self, url: str) -> Dict[str, Any]:
        """
        Use Playwright to detect consent/cookie banners and analyze consent text.
        """
        logger.debug(f"Detecting consent banner for {url}")

        result = {
            "found": False,
            "text": None,
            "cookie_count": 0,
            "cookies": [],
            "ndpa_aware": False,
        }

        # Common consent banner selectors
        banner_selectors = [
            "[class*='cookie']",
            "[id*='cookie']",
            "[class*='consent']",
            "[id*='consent']",
            "[class*='banner']",
            ".notice",
            ".modal-cookie",
        ]

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()

                # Listen for storage events to detect cookies
                cookies_before = []
                try:
                    await page.goto(url, wait_until="networkidle", timeout=self.timeout)
                    cookies_before = await page.context.cookies()
                except PlaywrightTimeout:
                    logger.warning(f"Playwright timeout for {url}")

                # Look for consent banner
                for selector in banner_selectors:
                    try:
                        elements = await page.locator(selector).all()
                        if elements:
                            for elem in elements:
                                text = await elem.text_content()
                                if text and len(text) > 20:  # Real banner
                                    result["found"] = True
                                    result["text"] = text.strip()
                                    
                                    # Check if mentions NDPA
                                    if "ndpa" in text.lower():
                                        result["ndpa_aware"] = True
                                    break
                    except Exception:
                        continue

                # Get cookies
                try:
                    all_cookies = await page.context.cookies()
                    result["cookie_count"] = len(all_cookies)
                    result["cookies"] = [
                        {
                            "name": cookie.get("name"),
                            "domain": cookie.get("domain"),
                            "expires": cookie.get("expires"),
                        }
                        for cookie in all_cookies[:10]  # First 10 cookies
                    ]
                except Exception:
                    pass

                await browser.close()

        except Exception as e:
            logger.error(f"Consent banner detection failed for {url}: {str(e)}")

        return result

    async def _inventory_sensitive_fields(self, url: str) -> Dict[str, Any]:
        """
        Detect sensitive form fields: BVN, NIN, email, phone, card, password.
        """
        logger.debug(f"Inventorying sensitive fields for {url}")

        result = {
            "sensitive_fields": {
                "bvn": [],
                "nin": [],
                "email": [],
                "phone": [],
                "card": [],
                "password": [],
                "other": [],
            },
            "third_party_domains": [],
            "tracking_pixels": 0,
        }

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()

                try:
                    await page.goto(url, wait_until="networkidle", timeout=self.timeout)
                except PlaywrightTimeout:
                    logger.warning(f"Playwright timeout for {url}")

                # Get all form inputs
                inputs = await page.locator("input").all()

                for input_elem in inputs:
                    try:
                        input_type = await input_elem.get_attribute("type")
                        input_name = (
                            await input_elem.get_attribute("name")
                        ) or ""
                        input_id = await input_elem.get_attribute("id") or ""
                        placeholder = await input_elem.get_attribute("placeholder") or ""
                        input_label = (
                            await page.locator(f"label[for='{input_id}']").text_content()
                            or ""
                        )

                        combined_text = (
                            f"{input_name} {input_id} {placeholder} {input_label}"
                        ).lower()

                        # Classify field
                        if "bvn" in combined_text:
                            result["sensitive_fields"]["bvn"].append(
                                {"name": input_name, "type": input_type}
                            )
                        elif "nin" in combined_text:
                            result["sensitive_fields"]["nin"].append(
                                {"name": input_name, "type": input_type}
                            )
                        elif "email" in combined_text or input_type == "email":
                            result["sensitive_fields"]["email"].append(
                                {"name": input_name, "type": input_type}
                            )
                        elif (
                            "phone" in combined_text
                            or "phone" in input_type
                            or "tel" in input_type
                        ):
                            result["sensitive_fields"]["phone"].append(
                                {"name": input_name, "type": input_type}
                            )
                        elif "card" in combined_text or "credit" in combined_text:
                            result["sensitive_fields"]["card"].append(
                                {"name": input_name, "type": input_type}
                            )
                        elif input_type == "password":
                            result["sensitive_fields"]["password"].append(
                                {"name": input_name, "type": input_type}
                            )

                    except Exception:
                        continue

                # Get all img sources (for tracking pixels)
                images = await page.locator("img").all()
                for img in images:
                    try:
                        src = await img.get_attribute("src")
                        if src and ("1x1" in src or "pixel" in src.lower()):
                            result["tracking_pixels"] += 1
                    except Exception:
                        continue

                await browser.close()

        except Exception as e:
            logger.error(f"Sensitive field inventory failed for {url}: {str(e)}")

        return result

    async def _identify_data_processors(self, url: str) -> List[Dict[str, str]]:
        """
        Identify third-party data processors mentioned or used on the site.
        """
        logger.debug(f"Identifying data processors for {url}")

        known_processors = {
            "google-analytics.com": "Google Analytics",
            "googletagmanager.com": "Google Tag Manager",
            "facebook.com": "Meta (Facebook)",
            "hotjar.com": "Hotjar Analytics",
            "segment.com": "Segment",
            "amplitude.com": "Amplitude Analytics",
            "databox.com": "Databox",
            "intercom.io": "Intercom",
            "freshdesk.com": "Freshdesk",
            "salesforce.com": "Salesforce",
        }

        processors = []

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(url)
                soup = BeautifulSoup(response.text, "html.parser")
                page_text = soup.get_text()

                for domain, name in known_processors.items():
                    if domain in response.text.lower() or name.lower() in page_text.lower():
                        processors.append(
                            {
                                "name": name,
                                "domain": domain,
                                "category": "Analytics/Tracking",
                            }
                        )

        except Exception as e:
            logger.debug(f"Data processor identification failed: {str(e)}")

        return processors

    def _compute_compliance_score(self, results: Dict) -> float:
        """
        Compute composite compliance score (0-100) based on NDPA & privacy standards.
        
        Scoring breakdown:
        - Privacy Policy: 30 points
        - Consent Banner: 20 points
        - NDPA Indicators: 25 points
        - Sensitive Field Protection: 15 points
        - Data Processors Disclosure: 10 points
        """
        score = 30.0  # Baseline

        # Privacy Policy (30 points max)
        if results.get("privacy_policy_found"):
            quality = results.get("privacy_policy_quality")
            quality_scores = {"excellent": 30, "good": 20, "fair": 10, "poor": 3}
            score += quality_scores.get(quality, 0)

        # Consent Banner (20 points max)
        if results.get("consent_banner_found"):
            score += 20

        # NDPA Indicators (25 points max)
        ndpa = results.get("ndpa_compliance", {})
        ndpa_points = 0
        if ndpa.get("mentions_ndpa"):
            ndpa_points += 8
        if ndpa.get("consent_text_ndpa_aware"):
            ndpa_points += 7
        if ndpa.get("user_rights_explained"):
            ndpa_points += 5
        if ndpa.get("data_processor_list"):
            ndpa_points += 5
        score += ndpa_points

        # Sensitive Field Protection (15 points max)
        sensitive_fields = results.get("sensitive_fields_inventory", {})
        detected_fields = sum(
            1
            for field_type in ["bvn", "nin", "phone", "card"]
            if sensitive_fields.get(field_type, [])
        )
        if detected_fields == 0:
            score += 15  # No sensitive fields = safer
        elif detected_fields <= 2:
            score += 8
        else:
            score -= detected_fields * 2

        # Data Processors Disclosure (10 points max)
        if results.get("data_processors"):
            score += 5
        if results.get("privacy_policy_text") and "processor" in results["privacy_policy_text"].lower():
            score += 5

        # Penalize issues
        if results.get("cookies_detected", 0) > 20:
            score -= 10  # Excessive cookies
        if results.get("tracking_pixels_detected", 0) > 5:
            score -= 5  # Excessive tracking

        # Ensure score is within valid range
        return max(0.0, min(100.0, score))
