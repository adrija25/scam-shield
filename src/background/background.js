/**
 * Scam Shield
 * Background Service Worker
 * Arthiva Labs
 *
 * Rule-based website risk analysis.
 * AI is not used to determine the Trust Score.
 */

chrome.runtime.onInstalled.addListener(() => {
    console.log("🛡️ Scam Shield installed.");
});


// =========================================
// CONFIGURATION
// =========================================

const SCAN_TIMEOUT_MS = 30000;


// =========================================
// HELPER: RUN PROMISE WITH TIMEOUT
// =========================================

function withTimeout(promise, milliseconds) {

    let timeoutId;

    const timeoutPromise =
        new Promise((_, reject) => {

            timeoutId =
                setTimeout(() => {

                    reject(
                        new Error(
                            "The website scan took too long. Please try again."
                        )
                    );

                }, milliseconds);

        });

    return Promise.race([
        promise,
        timeoutPromise
    ]).finally(() => {

        clearTimeout(timeoutId);

    });

}


// =========================================
// MESSAGE LISTENER
// =========================================

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        if (message.action !== "scan") {
            return;
        }

        handleScan(sendResponse);

        return true;
    }
);


// =========================================
// HANDLE WEBSITE SCAN
// =========================================

async function handleScan(sendResponse) {

    try {

        // -----------------------------------------
        // FIND ACTIVE TAB
        // -----------------------------------------

        const tabs =
            await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

        if (
            !tabs ||
            tabs.length === 0 ||
            !tabs[0].id
        ) {

            sendResponse({
                success: false,
                error:
                    "No active browser tab was found."
            });

            return;
        }


        const activeTab =
            tabs[0];

        const tabId =
            activeTab.id;

        const tabUrl =
            activeTab.url || "";


        // -----------------------------------------
        // CHECK WHETHER PAGE CAN BE SCANNED
        // -----------------------------------------

        if (
            !tabUrl.startsWith("http://") &&
            !tabUrl.startsWith("https://")
        ) {

            sendResponse({
                success: false,
                error:
                    "Scam Shield can only scan regular HTTP and HTTPS websites."
            });

            return;
        }


        // -----------------------------------------
        // SCAN CURRENT WEBPAGE
        // -----------------------------------------

        const scanPromise =
            chrome.scripting.executeScript({

                target: {
                    tabId: tabId
                },

                func: () => {

                    const currentHostname =
                        window.location.hostname;


                    // ---------------------------------
                    // EXTERNAL LINKS
                    // ---------------------------------

                    const linksToInspect =
                        Array.from(document.links)
                            .slice(0, 2000);

                    const externalLinks =
                        linksToInspect
                            .filter((link) => {

                                try {

                                    const linkUrl =
                                        new URL(
                                            link.href,
                                            window.location.href
                                        );

                                    return (
                                        linkUrl.hostname &&
                                        linkUrl.hostname !==
                                        currentHostname
                                    );

                                } catch {

                                    return false;

                                }

                            })
                            .length;


                    // ---------------------------------
                    // PASSWORD FIELDS
                    // ---------------------------------

                    const passwordFields =
                        document.querySelectorAll(
                            'input[type="password"]'
                        ).length;


                    // ---------------------------------
                    // PAYMENT-RELATED FIELDS
                    // ---------------------------------

                    const paymentKeywords = [
                        "card",
                        "cardnumber",
                        "credit",
                        "debit",
                        "cvv",
                        "cvc",
                        "expiry",
                        "expiration",
                        "payment",
                        "billing"
                    ];


                    const inputFields =
                        Array.from(
                            document.querySelectorAll(
                                "input"
                            )
                        )
                            .slice(
                                0,
                                1000
                            );


                    const paymentFields =
                        inputFields.filter(
                            (input) => {

                                const fieldText = (
                                    (input.name || "") +
                                    " " +
                                    (input.id || "") +
                                    " " +
                                    (input.placeholder || "") +
                                    " " +
                                    (input.autocomplete || "")
                                ).toLowerCase();


                                return paymentKeywords.some(
                                    (keyword) =>
                                        fieldText.includes(
                                            keyword
                                        )
                                );

                            }
                        ).length;


                    // ---------------------------------
                    // VISIBLE PAGE TEXT
                    // ---------------------------------

                    // Limit text processing to prevent
                    // very large pages from creating
                    // unnecessary scan overhead.

                    const pageText =
                        (
                            document.body?.innerText ||
                            ""
                        )
                            .toLowerCase()
                            .slice(
                                0,
                                50000
                            );


                    // ---------------------------------
                    // RETURN PAGE DATA
                    // ---------------------------------

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

                        passwordFields:
                            passwordFields,

                        paymentFields:
                            paymentFields,

                        pageText:
                            pageText

                    };

                }

            });


        // -----------------------------------------
        // APPLY SCAN TIMEOUT
        // -----------------------------------------

        const results =
            await withTimeout(
                scanPromise,
                SCAN_TIMEOUT_MS
            );


        // -----------------------------------------
        // VALIDATE SCAN RESULT
        // -----------------------------------------

        if (
            !results ||
            results.length === 0
        ) {

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


        // =========================================
        // RISK SCORING
        // =========================================

        let score = 100;

        const reasons = [];


        // -----------------------------------------
        // RULE 1
        // NO HTTPS
        // -----------------------------------------

        if (!pageData.https) {

            score -= 30;

            reasons.push(
                "No secure HTTPS connection"
            );

        }


        // -----------------------------------------
        // RULE 2
        // LONG DOMAIN
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
        // RAW IP ADDRESS
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
        // EXCESSIVE EXTERNAL LINKS
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


        // =========================================
        // SCAM-LANGUAGE RULES
        // =========================================

        const urgencyPhrases = [

            "act now",
            "immediate action required",
            "urgent action required",
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


        const suspiciousPaymentPhrases = [

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
            "guaranteed job",
            "pay registration fee",
            "pay training fee",
            "pay application fee"

        ];


        const findMatches =
            (phrases) => {

                return phrases.filter(
                    (phrase) =>
                        pageData.pageText.includes(
                            phrase
                        )
                );

            };


        const urgencyMatches =
            findMatches(
                urgencyPhrases
            );


        const prizeMatches =
            findMatches(
                prizePhrases
            );


        const suspiciousPaymentMatches =
            findMatches(
                suspiciousPaymentPhrases
            );


        const jobScamMatches =
            findMatches(
                jobScamPhrases
            );


        // -----------------------------------------
        // RULE 7
        // MULTIPLE URGENCY SIGNALS
        // -----------------------------------------

        if (
            urgencyMatches.length >= 2
        ) {

            score -= 10;

            reasons.push(
                "Multiple urgency or account-pressure phrases detected"
            );

        }


        // -----------------------------------------
        // RULE 8
        // PRIZE / REWARD SCAM LANGUAGE
        // -----------------------------------------

        if (
            prizeMatches.length >= 1
        ) {

            score -= 15;

            reasons.push(
                "Prize or reward language commonly associated with scams detected"
            );

        }


        // -----------------------------------------
        // RULE 9
        // SUSPICIOUS PAYMENT LANGUAGE
        // -----------------------------------------

        if (
            suspiciousPaymentMatches.length >= 1
        ) {

            score -= 20;

            reasons.push(
                "Suspicious payment language detected"
            );

        }


        // -----------------------------------------
        // RULE 10
        // JOB SCAM LANGUAGE
        // -----------------------------------------

        if (
            jobScamMatches.length >= 1
        ) {

            score -= 15;

            reasons.push(
                "Potential job or recruitment scam language detected"
            );

        }


        // -----------------------------------------
        // RULE 11
        // PASSWORD FIELD ON INSECURE PAGE
        // -----------------------------------------

        if (
            pageData.passwordFields > 0 &&
            !pageData.https
        ) {

            score -= 25;

            reasons.push(
                "Password field detected on an insecure page"
            );

        }


        // -----------------------------------------
        // RULE 12
        // PAYMENT FIELD ON INSECURE PAGE
        // -----------------------------------------

        if (
            pageData.paymentFields > 0 &&
            !pageData.https
        ) {

            score -= 30;

            reasons.push(
                "Payment-related fields detected on an insecure page"
            );

        }


        // -----------------------------------------
        // RULE 13
        // PAYMENT FIELDS + SUSPICIOUS
        // PAYMENT PRESSURE
        // -----------------------------------------

        if (
            pageData.paymentFields > 0 &&
            suspiciousPaymentMatches.length > 0
        ) {

            score -= 20;

            reasons.push(
                "Payment fields appear alongside suspicious payment instructions"
            );

        }


        // -----------------------------------------
        // RULE 14
        // PASSWORD FIELD + ACCOUNT PRESSURE
        // -----------------------------------------

        if (
            pageData.passwordFields > 0 &&
            urgencyMatches.length >= 2
        ) {

            score -= 15;

            reasons.push(
                "Login credentials are requested alongside account-pressure language"
            );

        }


        // -----------------------------------------
        // KEEP SCORE BETWEEN 0 AND 100
        // -----------------------------------------

        score =
            Math.max(
                0,
                Math.min(
                    100,
                    score
                )
            );


        // -----------------------------------------
        // DETERMINE STATUS
        // -----------------------------------------

        let status;


        if (score >= 80) {

            status =
                "Safe";

        } else if (score >= 50) {

            status =
                "Suspicious";

        } else {

            status =
                "Dangerous";

        }


        // -----------------------------------------
        // RETURN RESULTS TO POPUP
        // -----------------------------------------

        sendResponse({

            success: true,

            url:
                pageData.url,

            hostname:
                pageData.hostname,

            title:
                pageData.title,

            https:
                pageData.https,

            forms:
                pageData.forms,

            images:
                pageData.images,

            links:
                pageData.links,

            externalLinks:
                pageData.externalLinks,

            passwordFields:
                pageData.passwordFields,

            paymentFields:
                pageData.paymentFields,

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


        // -----------------------------------------
        // USER-FRIENDLY ERROR HANDLING
        // -----------------------------------------

        let errorMessage =
            "Scam Shield could not scan this website.";


        if (
            error &&
            error.message
        ) {

            const message =
                error.message.toLowerCase();


            if (
                message.includes(
                    "took too long"
                )
            ) {

                errorMessage =
                    "The website scan took too long. Please try again.";


            } else if (
                message.includes(
                    "cannot access"
                ) ||
                message.includes(
                    "cannot be scripted"
                ) ||
                message.includes(
                    "extensions gallery cannot be scripted"
                )
            ) {

                errorMessage =
                    "Chrome does not allow extensions to scan this page.";


            } else if (
                message.includes(
                    "missing host permission"
                )
            ) {

                errorMessage =
                    "Scam Shield does not have permission to scan this website.";


            } else {

                errorMessage =
                    error.message;

            }

        }


        sendResponse({

            success: false,

            error:
                errorMessage

        });

    }

}
