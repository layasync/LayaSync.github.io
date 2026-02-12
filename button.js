// ===============================
// MOUSE-OPTIMIZED NAVIGATION SYSTEM
// ===============================

// Select nav items and pages
const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");


// ===============================
// Center nav item in view
// ===============================
function centerNav(item) {
    item.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
    });
}


// ===============================
// Switch page
// ===============================
function switchPage(clickedItem) {

    // Remove active state
    navItems.forEach(nav => nav.classList.remove("active"));
    pages.forEach(page => page.classList.remove("active-page"));

    // Activate selected
    clickedItem.classList.add("active");

    const pageId = clickedItem.getAttribute("data-page");
    const page = document.getElementById(pageId);

    page.classList.add("active-page");

    // Scroll page to top smoothly
    page.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    // Center nav visually
    centerNav(clickedItem);
}


// ===============================
// Hover = Focus Behavior
// ===============================
navItems.forEach(item => {

    // When mouse enters nav item
    item.addEventListener("mouseenter", function() {
        centerNav(this);
    });

    // When clicked
    item.addEventListener("click", function(e) {
        e.preventDefault();
        switchPage(this);
    });

});