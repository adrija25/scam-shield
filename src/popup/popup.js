document.addEventListener("DOMContentLoaded", () => {

    const button = document.getElementById("scanButton");

    button.addEventListener("click", () => {

        chrome.runtime.sendMessage(
            {
                action: "scan"
            },
            (response) => {

                if (!response) {

                    alert("No response received.");

                    return;

                }

                alert(

                    "Website: " + response.title +

                    "\n\nURL: " + response.url +

                    "\n\nHTTPS: " + response.https +

                    "\n\nForms: " + response.forms +

                    "\n\nImages: " + response.images +

                    "\n\nLinks: " + response.links

                );

            }
        );

    });

});
