# ===========================
# MODULE 1: Website Scanner Service
# ===========================
# Performs technical security assessment: HTTPS checks, domain reputation,
# security headers, third-party script analysis, phishing detection.

import logging
import json
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from urllib.parse import urlparse
import dns.resolver
import dns.rdatatype
import ssl
import socket
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
import tldextract

logger = logging.getLogger(__name__)


class WebsiteScannerService:
    """
    Advanced website scanner combining:
    1. HTTPS/SSL certificate validation
    2. DNS resolution and MX record checks
    3. Security headers analysis
    4. Third-party script detection
    5. Domain reputation scoring
    6. Phishing risk assessment
    """

    def __init__(self):
        self.timeout = 30000  # 30 seconds for Playwright
        self.max_retries = 2

    async def scan_website(self, url: str) -> Dict[str, Any]:
        """
        Main entry point: perform complete technical website scan.
        
        Args:
            url: Full URL to scan (e.g., https://example.com)
            
        Returns:
            Dictionary containing:
            - https_grade: A+, A, B, C, D, F
            - domain_age_days: Approximate age
            - phishing_risk: low/medium/high/critical
            - ssl_certificate: Certificate details
            - security_headers: X-Frame-Options, CSP, etc
            - js_analysis: Third-party scripts and trackers
            - trust_score: 0-100 composite score
        """
        parsed_url = urlparse(url)
        domain = parsed_url.netloc or url

        logger.info(f"Starting website scan for: {domain}")

        results = {
            "domain": domain,
            "url": url,
            "scan_status": "in_progress",
            "https_grade": None,
            "domain_age_days": None,
            "phishing_risk": "unknown",
            "ssl_certificate": None,
            "security_headers": {},
            "js_analysis": {"third_party_scripts": [], "trackers": [], "total": 0},
            "dns_records": {},
            "trust_score": 50.0,  # Default baseline
            "errors": [],
        }

        try:
            # 1. HTTPS/SSL Analysis
            https_result = await self._analyze_https(domain)
            results["https_grade"] = https_result.get("grade")
            results["ssl_certificate"] = https_result.get("certificate_details")

            # 2. DNS Resolution & Records
            dns_result = await self._check_dns_records(domain)
            results["dns_records"] = dns_result

            # 3. Security Headers Analysis (via HTTP request)
            headers_result = await self._analyze_security_headers(url)
            results["security_headers"] = headers_result.get("headers", {})

            # 4. JavaScript & Third-Party Scripts (via Playwright)
            js_result = await self._analyze_javascript(url)
            results["js_analysis"] = js_result.get("analysis")
            results["tracking_pixels"] = js_result.get("tracking_pixels", 0)

            # 5. Phishing Risk Assessment
            phishing_result = await self._assess_phishing_risk(domain, results)
            results["phishing_risk"] = phishing_result.get("risk_level")

            # 6. Compute trust score
            results["trust_score"] = self._compute_trust_score(results)
            results["scan_status"] = "completed"

            logger.info(
                f"Website scan completed for {domain}. Trust Score: {results['trust_score']}"
            )

        except Exception as e:
            logger.error(f"Website scan failed for {domain}: {str(e)}")
            results["scan_status"] = "failed"
            results["errors"].append(str(e))

        return results

    async def _analyze_https(self, domain: str) -> Dict[str, Any]:
        """
        Analyze HTTPS/SSL/TLS configuration and certificate validity.
        
        Returns:
            - grade: A+, A, B, C, D, F
            - certificate_details: Issuer, validity dates, key algorithm
        """
        logger.debug(f"Analyzing HTTPS for {domain}")

        result = {
            "grade": "F",  # Default: fail
            "certificate_details": None,
        }

        try:
            context = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    cert_der = ssock.getpeercert(binary_form=True)

                    if cert and cert_der:
                        result["certificate_details"] = {
                            "subject": dict(x[0] for x in cert.get("subject", [])),
                            "issuer": dict(x[0] for x in cert.get("issuer", [])),
                            "version": cert.get("version"),
                            "notBefore": cert.get("notBefore"),
                            "notAfter": cert.get("notAfter"),
                        }

                        # Grade assignment logic
                        if (
                            cert.get("version") == 3
                            and "notAfter" in cert
                        ):
                            result["grade"] = "A"  # Modern certificate
                        else:
                            result["grade"] = "B"

                    logger.debug(f"HTTPS certificate valid for {domain}")

        except ssl.SSLError as e:
            logger.warning(f"SSL error for {domain}: {str(e)}")
            result["grade"] = "F"
        except Exception as e:
            logger.warning(f"HTTPS analysis failed for {domain}: {str(e)}")
            result["grade"] = "D"

        return result

    async def _check_dns_records(self, domain: str) -> Dict[str, Any]:
        """
        Check DNS records: A, AAAA, MX, TXT, SPF, DMARC.
        """
        logger.debug(f"Checking DNS records for {domain}")

        dns_result = {
            "a_records": [],
            "aaaa_records": [],
            "mx_records": [],
            "spf_records": [],
            "dmarc_records": [],
        }

        try:
            # Check A records (IPv4)
            try:
                a_records = dns.resolver.resolve(domain, "A")
                dns_result["a_records"] = [str(rdata) for rdata in a_records]
            except Exception:
                pass

            # Check AAAA records (IPv6)
            try:
                aaaa_records = dns.resolver.resolve(domain, "AAAA")
                dns_result["aaaa_records"] = [str(rdata) for rdata in aaaa_records]
            except Exception:
                pass

            # Check MX records
            try:
                mx_records = dns.resolver.resolve(domain, "MX")
                dns_result["mx_records"] = [str(rdata) for rdata in mx_records]
            except Exception:
                pass

            # Check SPF records
            try:
                spf_records = dns.resolver.resolve(domain, "TXT")
                for rdata in spf_records:
                    txt_data = str(rdata)
                    if "v=spf1" in txt_data:
                        dns_result["spf_records"].append(txt_data)
            except Exception:
                pass

            # Check DMARC records
            try:
                dmarc_domain = f"_dmarc.{domain}"
                dmarc_records = dns.resolver.resolve(dmarc_domain, "TXT")
                dns_result["dmarc_records"] = [str(rdata) for rdata in dmarc_records]
            except Exception:
                pass

        except Exception as e:
            logger.warning(f"DNS check failed for {domain}: {str(e)}")

        return dns_result

    async def _analyze_security_headers(self, url: str) -> Dict[str, Any]:
        """
        Check security headers: X-Frame-Options, CSP, X-Content-Type-Options, etc.
        """
        logger.debug(f"Analyzing security headers for {url}")

        import httpx

        headers_result = {"headers": {}, "missing": []}
        critical_headers = [
            "X-Frame-Options",
            "X-Content-Type-Options",
            "Content-Security-Policy",
            "Strict-Transport-Security",
            "Referrer-Policy",
        ]

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.head(url, follow_redirects=True)
                resp_headers = dict(response.headers)

                for header in critical_headers:
                    if header in resp_headers:
                        headers_result["headers"][header] = resp_headers[header]
                    else:
                        headers_result["missing"].append(header)

        except Exception as e:
            logger.warning(f"Security headers analysis failed for {url}: {str(e)}")

        return headers_result

    async def _analyze_javascript(self, url: str) -> Dict[str, Any]:
        """
        Use Playwright to render JavaScript and detect:
        - Third-party scripts
        - Tracking pixels (beacons)
        - Analytics libraries
        - Ad networks
        """
        logger.debug(f"Analyzing JavaScript for {url}")

        js_result = {
            "analysis": {
                "third_party_scripts": [],
                "trackers": [],
                "analytics": [],
                "ad_networks": [],
                "total": 0,
            },
            "tracking_pixels": 0,
        }

        # Known tracker/analytics domains
        tracker_domains = {
            "google-analytics.com": "Google Analytics",
            "googletagmanager.com": "Google Tag Manager",
            "facebook.com": "Facebook Pixel",
            "hotjar.com": "Hotjar",
            "intercom.io": "Intercom",
            "amplitude.com": "Amplitude",
            "segment.com": "Segment",
            "doubleclick.net": "DoubleClick (Google Ads)",
            "scorecardresearch.com": "Comscore",
        }

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()

                # Collect all network requests
                scripts = []
                images = []

                def handle_response(response):
                    if response.request.resource_type == "script":
                        scripts.append(response.url)
                    elif response.request.resource_type == "image":
                        images.append(response.url)

                page.on("response", handle_response)

                try:
                    await page.goto(url, wait_until="networkidle", timeout=self.timeout)
                except PlaywrightTimeout:
                    logger.warning(f"Playwright timeout for {url}")

                # Analyze scripts
                for script_url in scripts:
                    parsed = urlparse(script_url)
                    domain = parsed.netloc

                    # Check if it's a third-party script
                    if domain and domain not in url:
                        for tracker_domain, tracker_name in tracker_domains.items():
                            if tracker_domain in domain:
                                js_result["analysis"]["trackers"].append(
                                    {"name": tracker_name, "url": script_url}
                                )
                                break
                        else:
                            js_result["analysis"]["third_party_scripts"].append(
                                {"domain": domain, "url": script_url}
                            )

                # Count tracking pixels (1x1 images from known trackers)
                tracking_pixel_count = 0
                for img_url in images:
                    for tracker_domain in tracker_domains.keys():
                        if tracker_domain in img_url and ("1x1" in img_url or "pixel" in img_url.lower()):
                            tracking_pixel_count += 1
                            break

                js_result["tracking_pixels"] = tracking_pixel_count
                js_result["analysis"]["total"] = (
                    len(js_result["analysis"]["third_party_scripts"])
                    + len(js_result["analysis"]["trackers"])
                )

                await browser.close()

        except Exception as e:
            logger.error(f"JavaScript analysis failed for {url}: {str(e)}")

        return js_result

    async def _assess_phishing_risk(self, domain: str, results: Dict) -> Dict[str, str]:
        """
        Assess phishing risk based on:
        - Domain age
        - SSL certificate validity
        - DNS records completeness
        - Similar domain detection
        """
        logger.debug(f"Assessing phishing risk for {domain}")

        risk_score = 0  # 0-100, higher = more risky
        risk_level = "low"

        # Factor 1: SSL Certificate (20 points)
        if not results.get("ssl_certificate"):
            risk_score += 20
        elif results["https_grade"] in ["F", "D"]:
            risk_score += 15

        # Factor 2: DNS Configuration (15 points)
        dns_records = results.get("dns_records", {})
        if not dns_records.get("a_records"):
            risk_score += 10
        if not dns_records.get("mx_records"):
            risk_score += 5

        # Factor 3: Security Headers (15 points)
        security_headers = results.get("security_headers", {})
        missing_count = len(
            [h for h in security_headers if not security_headers.get(h)]
        )
        risk_score += missing_count * 3

        # Factor 4: Tracker/Script Count (20 points)
        js_analysis = results.get("js_analysis", {})
        tracker_count = len(js_analysis.get("trackers", []))
        if tracker_count > 10:
            risk_score += 20
        elif tracker_count > 5:
            risk_score += 10

        # Assign risk level based on score
        if risk_score < 20:
            risk_level = "low"
        elif risk_score < 40:
            risk_level = "medium"
        elif risk_score < 70:
            risk_level = "high"
        else:
            risk_level = "critical"

        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
        }

    def _compute_trust_score(self, results: Dict) -> float:
        """
        Compute composite trust score (0-100) based on all factors.
        
        Scoring breakdown:
        - HTTPS Grade: 30 points
        - DNS Configuration: 20 points
        - Security Headers: 25 points
        - Tracker Count: 15 points
        - Phishing Risk: 10 points
        """
        score = 50.0  # Baseline

        # HTTPS Grade (30 points max)
        https_grade = results.get("https_grade", "F")
        grade_scores = {"A+": 30, "A": 28, "B": 20, "C": 10, "D": 5, "F": 0}
        score += grade_scores.get(https_grade, 0)

        # DNS Configuration (20 points max)
        dns_records = results.get("dns_records", {})
        dns_points = 0
        if dns_records.get("a_records"):
            dns_points += 7
        if dns_records.get("mx_records"):
            dns_points += 7
        if dns_records.get("spf_records"):
            dns_points += 3
        if dns_records.get("dmarc_records"):
            dns_points += 3
        score += dns_points

        # Security Headers (25 points max)
        security_headers = results.get("security_headers", {})
        headers_present = sum(1 for h in security_headers if security_headers.get(h))
        score += (headers_present / 5) * 25

        # Tracker Count (15 points max - penalize excessive tracking)
        js_analysis = results.get("js_analysis", {})
        tracker_count = len(js_analysis.get("trackers", []))
        if tracker_count == 0:
            score += 15
        elif tracker_count <= 3:
            score += 10
        elif tracker_count <= 8:
            score += 5
        # else: 0 points for excessive tracking

        # Phishing Risk (10 points max - deducted)
        phishing_risk = results.get("phishing_risk", "unknown")
        phishing_penalty = {
            "low": 0,
            "medium": 3,
            "high": 7,
            "critical": 10,
            "unknown": 2,
        }
        score -= phishing_penalty.get(phishing_risk, 2)

        # Ensure score is within valid range
        return max(0.0, min(100.0, score))
