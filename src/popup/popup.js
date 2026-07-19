document.addEventListener("DOMContentLoaded", () => {

    // -----------------------------------------
    // CONFIGURATION
    // -----------------------------------------

    const FREE_DAILY_SCAN_LIMIT = 5;

    const ARTHIVA_API_BASE =
        "https://arthiva-labs.pages.dev";

    const CHECKOUT_URL =
        "https://scam-shield-2sn.pages.dev/checkout.html";

    const PRO_TOKEN_KEY =
        "scamShieldProAccessToken";

    const PRO_STATUS_KEY =
        "scamShieldPro";

    const INSTALLATION_ID_KEY =
        "scamShieldInstallationId";

    let isProUser = false;


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
    // PRO ELEMENTS
    // -----------------------------------------

    const planBadge =
        document.getElementById("planBadge");

    const currentPlanName =
        document.getElementById(
            "currentPlanName"
        );

    const scanAllowance =
        document.getElementById(
            "scanAllowance"
        );

    const upgradeCard =
        document.getElementById(
            "upgradeCard"
        );

    const proActiveCard =
        document.getElementById(
            "proActiveCard"
        );

    const activationCodeInput =
        document.getElementById(
            "activationCodeInput"
        );

    const activateProButton =
        document.getElementById(
            "activateProButton"
        );

    const activationMessage =
        document.getElementById(
            "activationMessage"
        );


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

                view.classList.remove(
                    "hidden"
                );

            } else {

                view.classList.add(
                    "hidden"
                );

            }

        });

    }


    // -----------------------------------------
    // GET OR CREATE INSTALLATION ID
    // -----------------------------------------

    function getInstallationId() {

        return new Promise(
            (resolve, reject) => {

                chrome.storage.local.get(
                    [
                        INSTALLATION_ID_KEY
                    ],
                    (data) => {

                        if (
                            chrome.runtime
                                .lastError
                        ) {

                            reject(
                                new Error(
                                    "Scam Shield could not access this browser's installation information."
                                )
                            );

                            return;

                        }


                        const existingId =
                            data[
                                INSTALLATION_ID_KEY
                            ];


                        if (
                            typeof existingId ===
                                "string" &&
                            existingId.length >= 16
                        ) {

                            resolve(
                                existingId
                            );

                            return;

                        }


                        /*
                            Create a random UUID for
                            this Scam Shield installation.

                            The ID does not contain the
                            user's name, email address,
                            IP address, or device details.

                            It exists only to enforce the
                            allowed number of Scam Shield
                            Pro installations.
                        */

                        const installationId =
                            crypto.randomUUID();


                        chrome.storage.local.set(
                            {
                                [INSTALLATION_ID_KEY]:
                                    installationId
                            },
                            () => {

                                if (
                                    chrome.runtime
                                        .lastError
                                ) {

                                    reject(
                                        new Error(
                                            "Scam Shield could not save this browser's installation information."
                                        )
                                    );

                                    return;

                                }


                                resolve(
                                    installationId
                                );

                            }
                        );

                    }
                );

            }
        );

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


                if (
                    storedDate !==
                    today
                ) {

                    scansUsed = 0;

                    chrome.storage.local.set({
                        scamShieldScanDate:
                            today,

                        scamShieldDailyScans:
                            0
                    });

                }


                callback(
                    scansUsed
                );

            }
        );

    }


    // -----------------------------------------
    // UPDATE FREE SCANS REMAINING
    // -----------------------------------------

    function updateScansRemaining() {

        if (isProUser) {

            if (scansRemaining) {

                scansRemaining.textContent =
                    "∞";

            }

            return;

        }


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
    // RECORD SUCCESSFUL FREE SCAN
    // -----------------------------------------

    function recordSuccessfulScan(
        callback
    ) {

        /*
            Pro users have unlimited scans.

            We do not increment the free-plan
            daily scan counter for verified
            Pro users.
        */

        if (isProUser) {

            if (callback) {
                callback();
            }

            return;

        }


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
    // UPDATE PLAN UI
    // -----------------------------------------

    function updatePlanUI() {

        if (isProUser) {

            if (planBadge) {

                planBadge.textContent =
                    "PRO";

            }


            if (currentPlanName) {

                currentPlanName.textContent =
                    "Scam Shield Pro";

            }


            if (scansRemaining) {

                scansRemaining.textContent =
                    "∞";

            }


            if (scanAllowance) {

                const allowanceText =
                    scanAllowance.querySelector(
                        "span"
                    );

                if (allowanceText) {

                    allowanceText.textContent =
                        "unlimited scans";

                }

            }


            if (upgradeCard) {

                upgradeCard.classList.add(
                    "hidden"
                );

            }


            if (proActiveCard) {

                proActiveCard.classList.remove(
                    "hidden"
                );

            }


            return;

        }


        // FREE PLAN UI

        if (planBadge) {

            planBadge.textContent =
                "FREE";

        }


        if (currentPlanName) {

            currentPlanName.textContent =
                "Scam Shield Free";

        }


        if (scanAllowance) {

            const allowanceText =
                scanAllowance.querySelector(
                    "span"
                );

            if (allowanceText) {

                allowanceText.textContent =
                    "scans left today";

            }

        }


        if (upgradeCard) {

            upgradeCard.classList.remove(
                "hidden"
            );

        }


        if (proActiveCard) {

            proActiveCard.classList.add(
                "hidden"
            );

        }


        updateScansRemaining();

    }


    // -----------------------------------------
    // ACTIVATION MESSAGE
    // -----------------------------------------

    function showActivationMessage(
        message,
        isError = false
    ) {

        if (!activationMessage) {
            return;
        }


        activationMessage.textContent =
            message;


        activationMessage.style.color =
            isError
                ? "#a42a2a"
                : "#17604d";

    }


    // -----------------------------------------
    // VALIDATE PRO TOKEN WITH ARTHIVA
    // -----------------------------------------

    async function validateProToken(
        token
    ) {

        const installationId =
            await getInstallationId();


        const response =
            await fetch(
                ARTHIVA_API_BASE +
                "/api/activate-scam-shield",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            token:
                                token,

                            installationId:
                                installationId
                        })
                }
            );


        let data;


        try {

            data =
                await response.json();

        } catch (error) {

            throw new Error(
                "Arthiva Labs returned an invalid activation response."
            );

        }


        if (
            !response.ok ||
            !data.success ||
            !data.valid ||
            !data.activated ||
            !data.pro
        ) {

            throw new Error(
                data.error ||
                "This activation code is not valid."
            );

        }


        if (
            data.product !==
                "scam-shield" ||

            data.offer !==
                "pro"
        ) {

            throw new Error(
                "This activation code does not belong to Scam Shield Pro."
            );

        }


        return data;

    }


    // -----------------------------------------
    // ACTIVATE PRO
    // -----------------------------------------

    async function activatePro() {

        if (!activationCodeInput) {
            return;
        }


        const token =
            activationCodeInput
                .value
                .trim();


        if (!token) {

            showActivationMessage(
                "Paste your activation code first.",
                true
            );

            return;

        }


        if (
            !/^[a-fA-F0-9]{64}$/.test(
                token
            )
        ) {

            showActivationMessage(
                "This activation code is not in the expected format.",
                true
            );

            return;

        }


        if (activateProButton) {

            activateProButton.disabled =
                true;

            activateProButton.textContent =
                "Activating...";

        }


        showActivationMessage(
            "Checking your purchase..."
        );


        try {

            await validateProToken(
                token
            );


            chrome.storage.local.set(
                {
                    [PRO_TOKEN_KEY]:
                        token,

                    [PRO_STATUS_KEY]:
                        true
                },
                () => {

                    if (
                        chrome.runtime
                            .lastError
                    ) {

                        showActivationMessage(
                            "Pro was verified, but Scam Shield could not save the activation on this browser.",
                            true
                        );

                        if (
                            activateProButton
                        ) {

                            activateProButton.disabled =
                                false;

                            activateProButton.textContent =
                                "Activate Pro";

                        }

                        return;

                    }


                    isProUser =
                        true;


                    updatePlanUI();


                    showActivationMessage(
                        "Scam Shield Pro is active."
                    );


                    if (
                        activationCodeInput
                    ) {

                        activationCodeInput.value =
                            "";

                    }

                }
            );


        } catch (error) {

            console.error(
                "Scam Shield activation error",
                error
            );


            showActivationMessage(
                error.message ||
                "Unable to activate Scam Shield Pro.",
                true
            );


            if (activateProButton) {

                activateProButton.disabled =
                    false;

                activateProButton.textContent =
                    "Activate Pro";

            }

        }

    }


    // -----------------------------------------
    // RESTORE AND REVALIDATE PRO ACCESS
    // -----------------------------------------

    function restoreProAccess() {

        chrome.storage.local.get(
            [
                PRO_TOKEN_KEY,
                PRO_STATUS_KEY
            ],
            async (data) => {

                const storedToken =
                    data[
                        PRO_TOKEN_KEY
                    ];


                if (
                    !storedToken ||
                    data[
                        PRO_STATUS_KEY
                    ] !== true
                ) {

                    isProUser =
                        false;

                    updatePlanUI();

                    return;

                }


                try {

                    /*
                        Reuse the same permanent
                        installation ID that was
                        registered when Pro was
                        originally activated.
                    */

                    const installationId =
                        await getInstallationId();


                    const response =
                        await fetch(
                            ARTHIVA_API_BASE +
                            "/api/activate-scam-shield",
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        token:
                                            storedToken,

                                        installationId:
                                            installationId
                                    })
                            }
                        );


                    /*
                        If the Arthiva server itself
                        is temporarily unavailable,
                        preserve the previously verified
                        local Pro entitlement.

                        This prevents a legitimate buyer
                        from losing access just because
                        of a temporary server outage.
                    */

                    if (!response.ok) {

                        isProUser =
                            true;

                        updatePlanUI();

                        return;

                    }


                    let validationData;


                    try {

                        validationData =
                            await response.json();

                    } catch (error) {

                        /*
                            Invalid/unreadable server
                            response is treated as a
                            temporary validation failure.
                        */

                        isProUser =
                            true;

                        updatePlanUI();

                        return;

                    }


                    /*
                        The server responded normally.

                        Pro remains active only if the
                        entitlement is explicitly valid.
                    */

                    if (
                        validationData.success ===
                            true &&

                        validationData.valid ===
                            true &&

                        validationData.activated ===
                            true &&

                        validationData.pro ===
                            true &&

                        validationData.product ===
                            "scam-shield" &&

                        validationData.offer ===
                            "pro"
                    ) {

                        isProUser =
                            true;

                        updatePlanUI();

                        return;

                    }


                    /*
                        The server definitively rejected
                        the entitlement.

                        Remove the stored Pro state.
                    */

                    chrome.storage.local.remove(
                        [
                            PRO_TOKEN_KEY,
                            PRO_STATUS_KEY
                        ],
                        () => {

                            isProUser =
                                false;

                            updatePlanUI();

                        }
                    );


                } catch (error) {

                    console.error(
                        "Unable to revalidate stored Scam Shield Pro access",
                        error
                    );


                    /*
                        Network failure or temporary
                        connection problem.

                        Keep the previously verified
                        local entitlement and try
                        validation again when the
                        popup is opened later.
                    */

                    isProUser =
                        true;

                    updatePlanUI();

                }

            }
        );

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
                statusClass ===
                    "suspicious" ||
                statusClass ===
                    "dangerous"
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


        if (passwordFieldsCount) {

            passwordFieldsCount.textContent =
                response.passwordFields ?? 0;

        }


        if (paymentFieldsCount) {

            paymentFieldsCount.textContent =
                response.paymentFields ?? 0;

        }


        if (reasonsList) {

            reasonsList.innerHTML =
                "";


            if (
                Array.isArray(
                    response.reasons
                ) &&
                response.reasons.length >
                    0
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


        showView(
            resultsView
        );

    }


    // -----------------------------------------
    // SEND SCAN REQUEST
    // -----------------------------------------

    function performScan() {

        showView(
            loadingView
        );


        chrome.runtime.sendMessage(
            {
                action:
                    "scan"
            },
            (response) => {

                if (
                    chrome.runtime
                        .lastError
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
                    response.success ===
                        false
                ) {

                    showError(
                        response?.error ||
                        "No scan response was received."
                    );

                    return;

                }


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
    // CHECK PLAN BEFORE SCANNING
    // -----------------------------------------

    function runScan() {

        /*
            Verified Pro users bypass
            the free daily scan limit.
        */

        if (isProUser) {

            performScan();

            return;

        }


        getScanUsage((scansUsed) => {

            if (
                scansUsed >=
                FREE_DAILY_SCAN_LIMIT
            ) {

                showError(
                    "You have used your 5 free scans for today. Upgrade to Scam Shield Pro for unlimited scans."
                );

                return;

            }


            performScan();

        });

    }


    // -----------------------------------------
    // SCAN BUTTON EVENTS
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

                showView(
                    scanView
                );

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

                chrome.tabs.create({
                    url:
                        CHECKOUT_URL
                });

            }
        );

    }


    // -----------------------------------------
    // ACTIVATE PRO BUTTON
    // -----------------------------------------

    if (activateProButton) {

        activateProButton.addEventListener(
            "click",
            activatePro
        );

    }


    if (activationCodeInput) {

        activationCodeInput.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    activatePro();

                }

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

    showView(
        scanView
    );


    restoreProAccess();


    updateScansRemaining();

});
