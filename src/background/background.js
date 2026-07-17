chrome.runtime.onInstalled.addListener(() => {
    console.log("🛡️ Scam Shield installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action === "scan") {

        chrome.tabs.query(
            {
                active: true,
                currentWindow: true
            },
            (tabs) => {

                chrome.tabs.sendMessage(
                    tabs[0].id,
                    {
                        action: "scanPage"
                    },
                    (response) => {

                        sendResponse(response);

                    }
                );

            }
        );

        return true;
    }

});
