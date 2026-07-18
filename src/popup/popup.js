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

                alert(
                    "Website: " + response.title +
                    "\n\nDomain: " + response.hostname +
                    "\n\nURL: " + response.url +
                    "\n\nHTTPS: " + (response.https ? "Yes" : "No") +
                    "\n\nForms: " + response.forms +
                    "\n\nImages: " + response.images +
                    "\n\nLinks: " + response.links +
                    "\n\nExternal Links: " + response.externalLinks
                );

            }
        );

    });

});
