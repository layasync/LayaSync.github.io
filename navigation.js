document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-view');
        
        // Update Nav UI
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Swap Views
        document.querySelectorAll('.page-view').forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(`view-${target}`);
        if(targetView) targetView.classList.add('active');
    });
}); 