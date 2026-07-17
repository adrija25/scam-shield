document.addEventListener("DOMContentLoaded", () => {
    console.log("🛡️ Scam Shield loaded.");

    const button = document.querySelector("button");

    if (button) {
        button.addEventListener("click", () => {
            alert("Website scanning will be added in the next milestone.");
        });
    }
});
