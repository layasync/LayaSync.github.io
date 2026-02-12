// =======================================
// TV REMOTE COLOR BUTTON CONTROL SYSTEM
// =======================================

// Get all navigation items
const tvNavItems = document.querySelectorAll(".nav-item");

// Track focused index
let currentIndex = 0;

// Focus first nav item when page loads
tvNavItems[currentIndex].focus();


// =======================================
// Move focus left or right
// =======================================
function moveHorizontal(direction) {

    if (direction === "right") {
        currentIndex++;
        if (currentIndex >= tvNavItems.length) {
            currentIndex = 0; // loop back
        }
    }

    if (direction === "left") {
        currentIndex--;
        if (currentIndex < 0) {
            currentIndex = tvNavItems.length - 1; // loop to end
        }
    }

    tvNavItems[currentIndex].focus();
}


// =======================================
// Activate selected page
// =======================================
function selectCurrent() {

    const selectedItem = tvNavItems[currentIndex];
    const pageId = selectedItem.getAttribute("data-page");

    // Use switchPage from app.js
    switchPage(pageId, selectedItem);
}


// =======================================
// Listen for TV remote keys
// =======================================
document.addEventListener("keydown", function(event) {

    const key = event.key;

    // GREEN → RIGHT
    if (key === "ColorF1Green" || key === "Green") {
        moveHorizontal("right");
    }

    // BLUE → LEFT
    if (key === "ColorF3Blue" || key === "Blue") {
        moveHorizontal("left");
    }

    // YELLOW → SELECT (Down behavior)
    if (key === "ColorF2Yellow" || key === "Yellow") {
        selectCurrent();
    }

    // RED → Go to Home (Up behavior)
    if (key === "ColorF0Red" || key === "Red") {

        currentIndex = 0;
        tvNavItems[currentIndex].focus();
        selectCurrent();
    }

}); 