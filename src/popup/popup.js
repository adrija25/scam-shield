document.addEventListener("DOMContentLoaded", () => {

    // -----------------------------------------
    // GET POPUP ELEMENTS
    // -----------------------------------------

    const scanView =
        document.getElementById("scanView");

    const loadingView =
        document.getElementById("loadingView");

    const resultsView =
        document.getElementById("resultsView");

    const errorView =
        document.getElementById("errorView");

    const scanButton =
        document.getElementById("scanButton");

    const scanAgainButton =
        document.getElementById("scanAgainButton");

    const tryAgainButton =
        document.getElementById("tryAgainButton");

    const scoreNumber =
        document.getElementById("scoreNumber");

    const statusBadge =
        document.getElementById("statusBadge");

    const domainName =
        document.getElementById("domainName");

    const reasonsList =
        document.getElementById("reasonsList");

    const httpsStatus =
        document.getElementById("httpsStatus");

    const formsCount =
        document.getElementById("formsCount");

    const externalLinksCount =
        document.getElementById("externalLinksCount");

    const errorMessage =
        document.getElementById("errorMessage");


    // -----------------------------------------
    // VIEW CONTROLLER
    // -----------------------------------------

    function showView(viewToShow) {

        const views = [
            scanView,
            loadingView,
            resultsView,
            errorView
        ];

        views.forEach((view) => {

            if (!view) {
                return;
            }

            if (view === viewToShow) {
                view.classList.remove("hidden");
            } else {
                view.classList.add("hidden");
            }

        });

    }


    // -----------------------------------------
    // DISPLAY ERROR
    // -----------------------------------------

    function showError(message) {

        if (errorMessage) {
            errorMessage.textContent =
                message ||
                "Scam Shield could not scan this page.";
        }

        showView(errorView);

    }


    // -----------------------------------------
    // DISPLAY SCAN RESULTS
    // -----------------------------------------

    function displayResults(response) {

        if (scoreNumber) {
            scoreNumber.textContent =
                response.score ?? "--";
        }

        if (statusBadge) {

            const status =
                response.status || "Unknown";

            statusBadge.textContent = status;

            statusBadge.classList.remove(
                "safe",
                "suspicious",
                "dangerous"
            );

            const statusClass =
                status.toLowerCase();

            if (
                statusClass === "safe" ||
                statusClass === "suspicious" ||
                statusClass === "dangerous"
            ) {
                statusBadge.classList.add(
                    statusClass
                );
            }

        }

        if (domainName) {

            domainName.textContent =
                response.hostname ||
                "Unknown website";

        }

        if (httpsStatus) {

            httpsStatus.textContent =
                response.https
                    ? "Yes"
                    : "No";

        }

        if (formsCount) {

            formsCount.textContent =
                response.forms ?? 0;

        }

        if (externalLinksCount) {

            externalLinksCount.textContent =
                response.externalLinks ?? 0;

        }


        // -----------------------------------------
        // DISPLAY RISK REASONS
        // -----------------------------------------

        if (reasonsList) {

            reasonsList.innerHTML = "";

            if (
                Array.isArray(response.reasons) &&
                response.reasons.length > 0
            ) {

                response.reasons.forEach(
                    (reason) => {

                        const item =
                            document.createElement("p");

                        item.className =
                            "reason-item warning";

                        item.textContent =
                            reason;

                        reasonsList.appendChild(
                            item
                        );

                    }
                );

            } else {

                const item =
                    document.createElement("p");

                item.className =
                    "reason-item";

                item.textContent =
                    "No major risk signals detected by the current Scam Shield rules.";

                reasonsList.appendChild(
                    item
                );

            }

        }

        showView(resultsView);

    }


    // -----------------------------------------
    // RUN WEBSITE SCAN
    // -----------------------------------------

    function runScan() {

        showView(loadingView);

        chrome.runtime.sendMessage(
            {
                action: "scan"
            },
            (response) => {

                if (
                    chrome.runtime.lastError
                ) {

                    showError(
                        "Scan failed: " +
                        chrome.runtime
                            .lastError
                            .message
                    );

                    return;
                }

                if (
                    !response ||
                    response.success === false
                ) {

                    showError(
                        response?.error ||
                        "No scan response was received."
                    );

                    return;
                }

                displayResults(response);

            }
        );

    }


    // -----------------------------------------
    // BUTTON EVENTS
    // -----------------------------------------

    if (scanButton) {

        scanButton.addEventListener(
            "click",
            runScan
        );

    }

    if (scanAgainButton) {

        scanAgainButton.addEventListener(
            "click",
            runScan
        );

    }

    if (tryAgainButton) {

        tryAgainButton.addEventListener(
            "click",
            runScan
        );

    }


    // -----------------------------------------
    // INITIAL VIEW
    // -----------------------------------------

    showView(scanView);

});
