// ===============================
// NORMAL DPAD TV NAVIGATION
// ===============================

// Get elements
const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

// Track current nav index
let currentIndex = 0;

// Focus first nav item on load
navItems[currentIndex].focus();


// ===============================
// Center focused nav item
// ===============================
function centerNavItem(item) {
    item.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
    });
}


// ===============================
// Switch Page Function
// ===============================
function activatePage(index) {

    // Remove active from all
    navItems.forEach(nav => nav.classList.remove("active"));
    pages.forEach(page => page.classList.remove("active-page"));

    // Add active to current
    navItems[index].classList.add("active");

    const pageId = navItems[index].getAttribute("data-page");
    const page = document.getElementById(pageId);

    page.classList.add("active-page");

    // Scroll page into view (center vertically)
    page.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    // Center nav visually
    centerNavItem(navItems[index]);
}


// ===============================
// Listen for Arrow Keys
// ===============================
document.addEventListener("keydown", function(event) {

    switch (event.key) {

        case "ArrowRight":
            currentIndex++;
            if (currentIndex >= navItems.length) {
                currentIndex = 0;
            }
            navItems[currentIndex].focus();
            centerNavItem(navItems[currentIndex]);
            break;

        case "ArrowLeft":
            currentIndex--;
            if (currentIndex < 0) {
                currentIndex = navItems.length - 1;
            }
            navItems[currentIndex].focus();
            centerNavItem(navItems[currentIndex]);
            break;

        case "Enter":
        case "ArrowDown":
            activatePage(currentIndex);
            break;

        case "ArrowUp":
            // Jump back to nav focus
            navItems[currentIndex].focus();
            centerNavItem(navItems[currentIndex]);
            break;
    }

});