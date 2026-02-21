/**
 * Onyx Stream Player - App Logic
 * Handles Data Rendering and View Management
 */

const App = {
    // Current state of the app
    state: {
        currentView: 'home',
        isLoading: false
    },

    // Initialize the application
    init: async function() {
        console.log("App Initializing...");
        this.bindEvents();
        await this.loadHomeContent();
    },

    // Bind UI events
    bindEvents: function() {
        // Handle Navigation Clicks
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const targetView = e.currentTarget.getAttribute('data-view');
                this.switchView(targetView);
            });
        });

        // Handle card clicks (For future player integration)
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.card-landscape, .card-portrait');
            if (card) {
                console.log("Card Selected:", card.getAttribute('data-title'));
                // Here we will later trigger player.js
            }
        });
    },

    // Switch between pages (Home, Movies, Shows, etc.)
    switchView: function(viewId) {
        if (this.state.currentView === viewId) return;

        console.log(`Switching to view: ${viewId}`);
        
        // 1. Update Navigation UI
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
            if (nav.getAttribute('data-view') === viewId) {
                nav.classList.add('active');
            }
        });

        // 2. Switch Pages
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById('view-' + viewId);
        
        if (targetPage) {
            targetPage.classList.add('active');
            this.state.currentView = viewId;
        }

        // 3. Special logic for Home (Reload data if needed)
        if (viewId === 'home') {
            // Content is already loaded usually, but can refresh here
        }
    },

    // Fetch and Render Home Page Rows
    loadHomeContent: async function() {
        const recentRow = document.getElementById('row-recent');
        const lastAddedRow = document.getElementById('row-last-added');

        if (!recentRow || !lastAddedRow) return;

        try {
            // Fetch real data from TMDB
            const trending = await TMDB.getTrending(); // For Landscape
            const popular = await TMDB.getPopular();   // For Portrait

            // Render "Current Watching" Row
            recentRow.innerHTML = trending.map(movie => this.templates.landscape(movie)).join('');

            // Render "Last Added" Row
            lastAddedRow.innerHTML = popular.map((movie, index) => {
                const isNew = index < 4; // Mark first 4 as "New"
                return this.templates.portrait(movie, isNew);
            }).join('');

        } catch (error) {
            console.error("Failed to load content:", error);
        }
    },

    // HTML Templates for the UI
    templates: {
        // Landscape Card (Top Row)
        landscape: function(movie) {
            // Generate random progress for the "Prime" look
            const progress = Math.floor(Math.random() * 80) + 10;
            const hours = Math.floor(Math.random() * 2) + 1;
            const mins = Math.floor(Math.random() * 59);
            
            return `
                <div class="card-landscape focusable" data-title="${movie.title}" data-id="${movie.id}">
                    <img src="${TMDB_IMAGE_BASE}${movie.backdrop_path}" alt="${movie.title}" loading="lazy">
                    <div class="card-overlay">
                        <div class="card-title">${movie.title.toUpperCase()}</div>
                        <div class="card-meta">
                            <span class="play-icon">▶</span>
                            <span>${hours}h ${mins}m remaining</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            `;
        },

        // Portrait Card (Bottom Row)
        portrait: function(movie, isNew) {
            return `
                <div class="card-portrait focusable" data-title="${movie.title}" data-id="${movie.id}">
                    <img src="${TMDB_IMAGE_BASE}${movie.poster_path}" alt="${movie.title}" loading="lazy">
                    ${isNew ? '<div class="dot-new"></div>' : ''}
                </div>
            `;
        }
    }
};

// Start the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());