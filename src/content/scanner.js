chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action !== "scanPage") {
        return;
    }

    const pageData = {

        url: window.location.href,

        title: document.title,

        https: location.protocol === "https:",

        forms: document.forms.length,

        images: document.images.length,

        links: document.links.length

    };

    sendResponse(pageData);

});
