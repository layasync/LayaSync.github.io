// =====================================
// COLOR BUTTON DPAD ENGINE
// =====================================

// Select nav items and pages
const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

// Track position
let currentIndex = 0;
let inNav = true; // true = in top navigation

// Focus first nav item
navItems[currentIndex].classList.add("active");
navItems[currentIndex].scrollIntoView({ behavior: "smooth", inline: "center" });


// =====================================
// Activate page
// =====================================
function activatePage(index) {

    // Remove active state
    navItems.forEach(nav => nav.classList.remove("active"));
    pages.forEach(page => page.classList.remove("active-page"));

    // Activate selected nav
    navItems[index].classList.add("active");

    const pageId = navItems[index].getAttribute("data-page");
    const page = document.getElementById(pageId);

    page.classList.add("active-page");

    page.scrollIntoView({ behavior: "smooth", block: "start" });
}


// =====================================
// HORIZONTAL NAVIGATION
// =====================================
function moveHorizontal(direction) {

    if (!inNav) return;

    if (direction === "right") {
        currentIndex++;
        if (currentIndex >= navItems.length) currentIndex = 0;
    }

    if (direction === "left") {
        currentIndex--;
        if (currentIndex < 0) currentIndex = navItems.length - 1;
    }

    navItems.forEach(nav => nav.classList.remove("active"));
    navItems[currentIndex].classList.add("active");

    navItems[currentIndex].scrollIntoView({
        behavior: "smooth",
        inline: "center"
    });
}


// =====================================
// VERTICAL NAVIGATION
// =====================================
function moveVertical(direction) {

    if (direction === "down") {
        inNav = false;

        const pageId = navItems[currentIndex].getAttribute("data-page");
        const page = document.getElementById(pageId);

        page.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (direction === "up") {
        inNav = true;

        navItems[currentIndex].scrollIntoView({
            behavior: "smooth",
            inline: "center"
        });
    }
}


// =====================================
// COLOR KEY LISTENER
// =====================================
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

    // RED → UP
    if (key === "ColorF0Red" || key === "Red") {
        moveVertical("up");
    }

    // YELLOW → DOWN
    if (key === "ColorF2Yellow" || key === "Yellow") {
        moveVertical("down");
    }

    // ENTER (center button)
    if (key === "Enter") {
        activatePage(currentIndex);
    }

});