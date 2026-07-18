/**
 * Scam Shield
 * Background Service Worker
 * Arthiva Labs
 */

chrome.runtime.onInstalled.addListener(() => {
    console.log("🛡️ Scam Shield installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action !== "scan") {
        return;
    }

    chrome.tabs.query(
        {
            active: true,
            currentWindow: true
        },
        async (tabs) => {

            try {

                if (!tabs || tabs.length === 0 || !tabs[0].id) {
                    sendResponse({
                        success: false,
                        error: "No active browser tab was found."
                    });

                    return;
                }

                const tabId = tabs[0].id;

                const results = await chrome.scripting.executeScript({
                    target: {
                        tabId: tabId
                    },

                    func: () => {

                        const currentHostname =
                            window.location.hostname;

                        const externalLinks =
                            Array.from(document.links)
                                .filter((link) => {

                                    try {

                                        return (
                                            new URL(link.href).hostname !==
                                            currentHostname
                                        );

                                    } catch {

                                        return false;

                                    }

                                })
                                .length;

                        return {
                            success: true,
                            url: window.location.href,
                            hostname: currentHostname,
                            title: document.title,
                            https:
                                window.location.protocol ===
                                "https:",
                            forms:
                                document.forms.length,
                            images:
                                document.images.length,
                            links:
                                document.links.length,
                            externalLinks:
                                externalLinks
                        };
                    }
                });

                if (!results || results.length === 0) {

                    sendResponse({
                        success: false,
                        error:
                            "The website could not be scanned."
                    });

                    return;
                }

                const pageData =
                    results[0].result;

                if (!pageData) {

                    sendResponse({
                        success: false,
                        error:
                            "No website data was returned."
                    });

                    return;
                }

                // -----------------------------------------
                // INITIAL RULE-BASED RISK SCORING
                // -----------------------------------------

                let score = 100;
                const reasons = [];

                if (!pageData.https) {

                    score -= 30;

                    reasons.push(
                        "No secure HTTPS connection"
                    );

                }

                if (
                    pageData.hostname &&
                    pageData.hostname.length > 40
                ) {

                    score -= 10;

                    reasons.push(
                        "Unusually long domain name"
                    );

                }

                if (
                    pageData.hostname &&
                    (
                        pageData.hostname.includes("--") ||
                        (
                            pageData.hostname.match(/-/g) ||
                            []
                        ).length >= 4
                    )
                ) {

                    score -= 15;

                    reasons.push(
                        "Unusual domain structure"
                    );

                }

                const ipAddressPattern =
                    /^(?:\d{1,3}\.){3}\d{1,3}$/;

                if (
                    pageData.hostname &&
                    ipAddressPattern.test(
                        pageData.hostname
                    )
                ) {

                    score -= 25;

                    reasons.push(
                        "Website uses an IP address instead of a normal domain"
                    );

                }

                if (
                    pageData.links > 0 &&
                    (
                        pageData.externalLinks /
                        pageData.links
                    ) > 0.7 &&
                    pageData.externalLinks >= 10
                ) {

                    score -= 10;

                    reasons.push(
                        "Large number of external links detected"
                    );

                }

                if (
                    pageData.forms > 0 &&
                    !pageData.https
                ) {

                    score -= 20;

                    reasons.push(
                        "Form detected on an insecure page"
                    );

                }

                score =
                    Math.max(
                        0,
                        Math.min(100, score)
                    );

                let status;

                if (score >= 80) {

                    status = "Safe";

                } else if (score >= 50) {

                    status = "Suspicious";

                } else {

                    status = "Dangerous";

                }

                sendResponse({
                    ...pageData,
                    score: score,
                    status: status,
                    reasons: reasons
                });

            } catch (error) {

                console.error(
                    "Scam Shield scan failed:",
                    error
                );

                sendResponse({
                    success: false,
                    error: error.message
                });

            }

        }
    );

    return true;
});
