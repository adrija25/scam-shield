document.addEventListener("DOMContentLoaded", () => {

    const button = document.getElementById("scanButton");

    if (!button) {
        console.error("Scam Shield: Scan button not found.");
        return;
    }

    button.addEventListener("click", () => {

        button.textContent = "Scanning...";
        button.disabled = true;

        chrome.runtime.sendMessage(
            {
                action: "scan"
            },
            (response) => {

                button.textContent = "Scan Website";
                button.disabled = false;

                if (chrome.runtime.lastError) {

                    alert(
                        "Scan failed: " +
                        chrome.runtime.lastError.message
                    );

                    return;
                }

                if (!response || response.success === false) {

                    alert(
                        "Scan failed: " +
                        (response?.error || "No response received.")
                    );

                    return;
                }

                const reasons =
                    response.reasons &&
                    response.reasons.length > 0
                        ? response.reasons.join("\n• ")
                        : "No major risk signals detected.";

                alert(
                    "SCAM SHIELD RESULTS" +
                    "\n\nTrust Score: " + response.score + "/100" +
                    "\nStatus: " + response.status +
                    "\n\nWebsite: " + response.title +
                    "\n\nDomain: " + response.hostname +
                    "\n\nHTTPS: " + (response.https ? "Yes" : "No") +
                    "\n\nForms: " + response.forms +
                    "\n\nLinks: " + response.links +
                    "\n\nExternal Links: " + response.externalLinks +
                    "\n\nWhy:" +
                    "\n• " + reasons
                );

            }
        );

    });

});
