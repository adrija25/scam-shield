document.addEventListener("DOMContentLoaded", () => {

    // -----------------------------------------
    // FREE PLAN CONFIGURATION
    // -----------------------------------------

    const FREE_DAILY_SCAN_LIMIT = 5;


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

    const upgradeButton =
        document.getElementById("upgradeButton");

    const settingsButton =
        document.getElementById("settingsButton");

    const privacyButton =
        document.getElementById("privacyButton");

    const termsButton =
        document.getElementById("termsButton");

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

    const passwordFieldsCount =
        document.getElementById("passwordFieldsCount");

    const paymentFieldsCount =
        document.getElementById("paymentFieldsCount");

    const scansRemaining =
        document.getElementById("scansRemaining");

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
    // GET TODAY'S DATE KEY
    // -----------------------------------------

    function getTodayKey() {

        const now =
            new Date();

        const year =
            now.getFullYear();

        const month =
            String(
                now.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                now.getDate()
            ).padStart(2, "0");

        return (
            year +
            "-" +
            month +
            "-" +
            day
        );

    }


    // -----------------------------------------
    // GET FREE PLAN USAGE
    // -----------------------------------------

    function getScanUsage(callback) {

        chrome.storage.local.get(
            [
                "scamShieldScanDate",
                "scamShieldDailyScans"
            ],
            (data) => {

                const today =
                    getTodayKey();

                const storedDate =
                    data.scamShieldScanDate;

                let scansUsed =
                    Number(
                        data.scamShieldDailyScans
                    ) || 0;


                // New day = reset usage.

                if (storedDate !== today) {

                    scansUsed = 0;

                    chrome.storage.local.set({
                        scamShieldScanDate:
                            today,

                        scamShieldDailyScans:
                            0
                    });

                }


                callback(scansUsed);

            }
        );

    }


    // -----------------------------------------
    // UPDATE SCANS REMAINING
    // -----------------------------------------

    function updateScansRemaining() {

        getScanUsage((scansUsed) => {

            const remaining =
                Math.max(
                    0,
                    FREE_DAILY_SCAN_LIMIT -
                    scansUsed
                );

            if (scansRemaining) {

                scansRemaining.textContent =
                    remaining;

            }

        });

    }


    // -----------------------------------------
    // RECORD SUCCESSFUL SCAN
    // -----------------------------------------

    function recordSuccessfulScan(callback) {

        getScanUsage((scansUsed) => {

            const newScanCount =
                scansUsed + 1;

            chrome.storage.local.set(
                {
                    scamShieldScanDate:
                        getTodayKey(),

                    scamShieldDailyScans:
                        newScanCount
                },
                () => {

                    updateScansRemaining();

                    if (callback) {
                        callback();
                    }

                }
            );

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


        // -------------------------------------
        // STATUS
        // -------------------------------------

        if (statusBadge) {

            const status =
                response.status ||
                "Unknown";

            statusBadge.textContent =
                status;

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


        // -------------------------------------
        // DOMAIN
        // -------------------------------------

        if (domainName) {

            domainName.textContent =
                response.hostname ||
                "Unknown website";

        }


        // -------------------------------------
        // SCAN DETAILS
        // -------------------------------------

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

        if (passwordFieldsCount) {

            passwordFieldsCount.textContent =
                response.passwordFields ?? 0;

        }

        if (paymentFieldsCount) {

            paymentFieldsCount.textContent =
                response.paymentFields ?? 0;

        }


        // -------------------------------------
        // RISK REASONS
        // -------------------------------------

        if (reasonsList) {

            reasonsList.innerHTML =
                "";

            if (
                Array.isArray(
                    response.reasons
                ) &&
                response.reasons.length > 0
            ) {

                response.reasons.forEach(
                    (reason) => {

                        const item =
                            document.createElement(
                                "p"
                            );

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
                    document.createElement(
                        "p"
                    );

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
    // SEND SCAN REQUEST
    // -----------------------------------------

    function performScan() {

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


                // Count only scans that actually
                // completed successfully.

                recordSuccessfulScan(
                    () => {

                        displayResults(
                            response
                        );

                    }
                );

            }
        );

    }


    // -----------------------------------------
    // CHECK FREE LIMIT BEFORE SCANNING
    // -----------------------------------------

    function runScan() {

        getScanUsage((scansUsed) => {

            if (
                scansUsed >=
                FREE_DAILY_SCAN_LIMIT
            ) {

                showError(
                    "You have used your 5 free scans for today. Scam Shield Pro will provide unlimited scans."
                );

                return;
            }

            performScan();

        });

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
            () => {

                showView(scanView);

                updateScansRemaining();

            }
        );

    }


    // -----------------------------------------
    // UPGRADE BUTTON
    // -----------------------------------------

    if (upgradeButton) {

        upgradeButton.addEventListener(
            "click",
            () => {

                alert(
                    "Scam Shield Pro payments are being connected to the secure Arthiva Labs payment system. No payment has been initiated."
                );

            }
        );

    }


    // -----------------------------------------
    // SETTINGS BUTTON
    // -----------------------------------------

    if (settingsButton) {

        settingsButton.addEventListener(
            "click",
            () => {

                alert(
                    "Scam Shield Settings will be available here."
                );

            }
        );

    }


    // -----------------------------------------
    // PRIVACY BUTTON
    // -----------------------------------------

    if (privacyButton) {

        privacyButton.addEventListener(
            "click",
            () => {

                alert(
                    "Scam Shield Privacy Policy will be available here."
                );

            }
        );

    }


    // -----------------------------------------
    // TERMS BUTTON
    // -----------------------------------------

    if (termsButton) {

        termsButton.addEventListener(
            "click",
            () => {

                alert(
                    "Scam Shield Terms of Use will be available here."
                );

            }
        );

    }


    // -----------------------------------------
    // INITIALISE POPUP
    // -----------------------------------------

    showView(scanView);

    updateScansRemaining();

});
