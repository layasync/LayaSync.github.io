document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const viewId = item.getAttribute('data-view');
        
        // 1. Update Navigation Menu UI
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // 2. Hide all pages and show the target one
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        
        const targetPage = document.getElementById('view-' + viewId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    });
});