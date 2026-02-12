// Select all nav buttons
const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

// Central function to switch pages
function switchPage(pageId, clickedItem) {

    // Remove active class from all nav buttons
    navItems.forEach(nav => nav.classList.remove("active"));

    // Add active to selected button
    clickedItem.classList.add("active");

    // Hide all pages
    pages.forEach(page => page.classList.remove("active-page"));

    // Show selected page
    document.getElementById(pageId).classList.add("active-page");
}

// Click / Touch support (Mobile & Mouse)
navItems.forEach(item => {

    item.addEventListener("click", function(e) {
        e.preventDefault();
        const pageId = this.getAttribute("data-page");
        switchPage(pageId, this);
    });

});  