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

                        const currentHostname = window.location.hostname;

                        const externalLinks = Array.from(document.links)
                            .filter((link) => {

                                try {
                                    return new URL(link.href).hostname !== currentHostname;
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
                            https: window.location.protocol === "https:",
                            forms: document.forms.length,
                            images: document.images.length,
                            links: document.links.length,
                            externalLinks: externalLinks
                        };
                    }
                });

                if (!results || results.length === 0) {
                    sendResponse({
                        success: false,
                        error: "The website could not be scanned."
                    });

                    return;
                }

                sendResponse(results[0].result);

            } catch (error) {

                console.error("Scam Shield scan failed:", error);

                sendResponse({
                    success: false,
                    error: error.message
                });

            }

        }
    );

    return true;
});
