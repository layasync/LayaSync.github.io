// ==========================================
// SAMSUNG TV BROWSER COLOR DPAD ENGINE
// Using XF86 color keys
// ==========================================

// Select nav items and pages
const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

// Track navigation position
let currentIndex = 0;
let inNav = true; // true = top navigation active

// Initialize first selection
navItems[currentIndex].classList.add("active");
navItems[currentIndex].scrollIntoView({
    behavior: "smooth",
    inline: "center"
});


// ==========================================
// Activate Selected Page
// ==========================================
function activatePage(index) {

    navItems.forEach(nav => nav.classList.remove("active"));
    pages.forEach(page => page.classList.remove("active-page"));

    navItems[index].classList.add("active");

    const pageId = navItems[index].getAttribute("data-page");
    const page = document.getElementById(pageId);

    page.classList.add("active-page");

    page.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// ==========================================
// Horizontal Navigation (LEFT / RIGHT)
// ==========================================
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


// ==========================================
// Vertical Navigation (UP / DOWN)
// ==========================================
function moveVertical(direction) {

    if (direction === "down") {
        inNav = false;

        const pageId = navItems[currentIndex].getAttribute("data-page");
        const page = document.getElementById(pageId);

        page.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    if (direction === "up") {
        inNav = true;

        navItems[currentIndex].scrollIntoView({
            behavior: "smooth",
            inline: "center"
        });
    }
}


// ==========================================
// KEY LISTENER
// ==========================================
document.addEventListener("keydown", function(event) {

    const key = event.key;

    // XF86Green → RIGHT
    if (key === "XF86Green") {
        moveHorizontal("right");
    }

    // XF86Blue → LEFT
    if (key === "XF86Blue") {
        moveHorizontal("left");
    }

    // XF86Red → UP
    if (key === "XF86Red") {
        moveVertical("up");
    }

    // XF86Yellow → DOWN
    if (key === "XF86Yellow") {
        moveVertical("down");
    }

    // Center / OK button
    if (key === "Enter") {
        activatePage(currentIndex);
    }

});