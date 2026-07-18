/**
 * Scam Shield
 * Risk Scoring Engine
 * Arthiva Labs
 *
 * The engine starts every website with a trust score of 100.
 * Risk signals reduce the score.
 *
 * This is rule-based and does not depend on AI.
 */

function calculateRiskScore(pageData) {
    let score = 100;
    const reasons = [];

    // --------------------------------------------------
    // RULE 1: HTTPS CHECK
    // --------------------------------------------------

    if (!pageData.https) {
        score -= 30;

        reasons.push({
            type: "danger",
            title: "No secure HTTPS connection",
            description:
                "This website is not using a secure HTTPS connection. Avoid entering passwords, payment information, or personal details."
        });
    } else {
        reasons.push({
            type: "safe",
            title: "Secure HTTPS connection",
            description:
                "This website is using an encrypted HTTPS connection."
        });
    }

    // --------------------------------------------------
    // RULE 2: SUSPICIOUS DOMAIN LENGTH
    // --------------------------------------------------

    if (pageData.hostname && pageData.hostname.length > 40) {
        score -= 10;

        reasons.push({
            type: "warning",
            title: "Unusually long domain name",
            description:
                "Long or complicated domain names can sometimes be used by deceptive websites."
        });
    }

    // --------------------------------------------------
    // RULE 3: SUSPICIOUS DOMAIN CHARACTERS
    // --------------------------------------------------

    if (
        pageData.hostname &&
        (pageData.hostname.includes("--") ||
            (pageData.hostname.match(/-/g) || []).length >= 4)
    ) {
        score -= 15;

        reasons.push({
            type: "warning",
            title: "Unusual domain structure",
            description:
                "The domain contains an unusual number or pattern of hyphens."
        });
    }

    // --------------------------------------------------
    // RULE 4: IP ADDRESS USED AS DOMAIN
    // --------------------------------------------------

    const ipAddressPattern =
        /^(?:\d{1,3}\.){3}\d{1,3}$/;

    if (
        pageData.hostname &&
        ipAddressPattern.test(pageData.hostname)
    ) {
        score -= 25;

        reasons.push({
            type: "danger",
            title: "Website uses an IP address",
            description:
                "Legitimate public websites normally use a registered domain name instead of a raw IP address."
        });
    }

    // --------------------------------------------------
    // RULE 5: LARGE NUMBER OF EXTERNAL LINKS
    // --------------------------------------------------

    if (
        pageData.links > 0 &&
        pageData.externalLinks / pageData.links > 0.7 &&
        pageData.externalLinks >= 10
    ) {
        score -= 10;

        reasons.push({
            type: "warning",
            title: "Many external links detected",
            description:
                "A large proportion of links on this page lead to other domains."
        });
    }

    // --------------------------------------------------
    // RULE 6: FORMS ON NON-HTTPS WEBSITE
    // --------------------------------------------------

    if (
        pageData.forms > 0 &&
        !pageData.https
    ) {
        score -= 20;

        reasons.push({
            type: "danger",
            title: "Form detected on an insecure page",
            description:
                "This page contains a form but does not use HTTPS. Information entered into the form may not be securely transmitted."
        });
    }

    // --------------------------------------------------
    // KEEP SCORE BETWEEN 0 AND 100
    // --------------------------------------------------

    score = Math.max(0, Math.min(100, score));

    // --------------------------------------------------
    // DETERMINE TRUST LEVEL
    // --------------------------------------------------

    let status;

    if (score >= 80) {
        status = "Safe";
    } else if (score >= 50) {
        status = "Suspicious";
    } else {
        status = "Dangerous";
    }

    return {
        score,
        status,
        reasons
    };
}

// Make the function available to other extension scripts.
globalThis.ScamShieldRiskEngine = {
    calculateRiskScore
};
