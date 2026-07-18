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

                        // Collect visible page text for
                        // scam-language analysis.

                        const pageText =
                            (
                                document.body?.innerText ||
                                ""
                            )
                                .toLowerCase()
                                .slice(0, 100000);

                        return {

                            success: true,

                            url:
                                window.location.href,

                            hostname:
                                currentHostname,

                            title:
                                document.title,

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
                                externalLinks,

                            pageText:
                                pageText
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
                // INITIAL RISK SCORE
                // -----------------------------------------

                let score = 100;

                const reasons = [];


                // -----------------------------------------
                // RULE 1
                // INSECURE CONNECTION
                // -----------------------------------------

                if (!pageData.https) {

                    score -= 30;

                    reasons.push(
                        "No secure HTTPS connection"
                    );
                }


                // -----------------------------------------
                // RULE 2
                // UNUSUALLY LONG DOMAIN
                // -----------------------------------------

                if (
                    pageData.hostname &&
                    pageData.hostname.length > 40
                ) {

                    score -= 10;

                    reasons.push(
                        "Unusually long domain name"
                    );
                }


                // -----------------------------------------
                // RULE 3
                // UNUSUAL DOMAIN STRUCTURE
                // -----------------------------------------

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


                // -----------------------------------------
                // RULE 4
                // IP ADDRESS USED AS DOMAIN
                // -----------------------------------------

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


                // -----------------------------------------
                // RULE 5
                // LARGE NUMBER OF EXTERNAL LINKS
                // -----------------------------------------

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


                // -----------------------------------------
                // RULE 6
                // FORM ON INSECURE PAGE
                // -----------------------------------------

                if (
                    pageData.forms > 0 &&
                    !pageData.https
                ) {

                    score -= 20;

                    reasons.push(
                        "Form detected on an insecure page"
                    );
                }


                // -----------------------------------------
                // RULE 7
                // SCAM / URGENCY LANGUAGE
                // -----------------------------------------

                const urgencyPhrases = [

                    "act now",
                    "immediate action required",
                    "urgent action required",
                    "limited time offer",
                    "offer expires today",
                    "verify immediately",
                    "respond immediately",
                    "account will be suspended",
                    "account has been suspended",
                    "account suspended",
                    "account will be closed",
                    "your account is locked",
                    "unusual activity detected"

                ];

                const prizePhrases = [

                    "you have won",
                    "you've won",
                    "congratulations you won",
                    "claim your prize",
                    "claim your reward",
                    "claim your winnings",
                    "you are a winner",
                    "selected as a winner",
                    "free gift waiting"

                ];

                const paymentPhrases = [

                    "pay immediately",
                    "payment required immediately",
                    "send payment now",
                    "wire transfer",
                    "pay with gift card",
                    "payment by gift card",
                    "buy gift cards",
                    "send cryptocurrency",
                    "send bitcoin",
                    "pay in bitcoin"

                ];

                const jobScamPhrases = [

                    "easy money",
                    "guaranteed income",
                    "earn money instantly",
                    "earn from home instantly",
                    "no experience required earn",
                    "guaranteed job",
                    "pay registration fee",
                    "pay training fee",
                    "pay application fee"

                ];


                const findMatches = (phrases) => {

                    return phrases.filter(
                        (phrase) =>
                            pageData.pageText.includes(
                                phrase
                            )
                    );

                };


                const urgencyMatches =
                    findMatches(urgencyPhrases);

                const prizeMatches =
                    findMatches(prizePhrases);

                const paymentMatches =
                    findMatches(paymentPhrases);

                const jobMatches =
                    findMatches(jobScamPhrases);


                // Urgency alone is a relatively weak signal.

                if (urgencyMatches.length >= 2) {

                    score -= 10;

                    reasons.push(
                        "Multiple urgency or account-pressure phrases detected"
                    );
                }


                // Prize scams are a stronger signal.

                if (prizeMatches.length >= 1) {

                    score -= 15;

                    reasons.push(
                        "Prize or reward language commonly associated with scams detected"
                    );
                }


                // Suspicious payment instructions
                // are a stronger risk signal.

                if (paymentMatches.length >= 1) {

                    score -= 20;

                    reasons.push(
                        "Suspicious payment language detected"
                    );
                }


                // Job scam language.

                if (jobMatches.length >= 1) {

                    score -= 15;

                    reasons.push(
                        "Potential job or recruitment scam language detected"
                    );
                }


                // -----------------------------------------
                // FINAL SCORE
                // -----------------------------------------

                score =
                    Math.max(
                        0,
                        Math.min(100, score)
                    );


                // -----------------------------------------
                // STATUS
                // -----------------------------------------

                let status;

                if (score >= 80) {

                    status = "Safe";

                } else if (score >= 50) {

                    status = "Suspicious";

                } else {

                    status = "Dangerous";

                }


                // -----------------------------------------
                // RETURN RESULTS
                // -----------------------------------------

                sendResponse({

                    ...pageData,

                    // Do not send the full page text
                    // back to the popup.

                    pageText: undefined,

                    score:
                        score,

                    status:
                        status,

                    reasons:
                        reasons
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
