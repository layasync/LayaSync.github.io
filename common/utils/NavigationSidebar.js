// NavigationSidebar.js
class NavigationSidebar {
    constructor() {
        // The list of tools to display in the sidebar.
        this.tools = [
            { name: "Home", path: "/", icon: "home" },
            { name: "QuickStart", path: "/quickstart/" },
            { name: "Time Machine", path: "/time-machine/" },
            { name: "Cloner", path: "/cloner/" },
        ];

        // Map of icon names to their SVG HTML strings.
        this.icons = {
            home: '<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
        };

        // Initialize the component
        this.init();
    }

    // Initialize the component
    init() {
        this.injectStyles();
        this.createSidebar();
        this.createFloatingActionButton();
        this.createOverlay();
        this.createReportModal();
        this.attachEventListeners();

        // Add class to body to indicate sidebar presence
        document.body.classList.add('has-sidebar');
    }

    // Inject styles into the document head
    injectStyles() {
        const cssContent = `
            /* =========================================================
            Design Tokens
            ========================================================= */
            :root {
                /* Sidebar */
                --sidebar-width: 260px;
                --sidebar-bg: #1e293b;
                --sidebar-border: #334155;
                --nav-item-hover: #334155;
                --nav-item-active: #2563eb;

                /* Floating Action Button (FAB) */
                --fab-size: 3rem;
                --fab-bg: linear-gradient(135deg, #3b82f6, #6366f1);
                --fab-bg-hover: linear-gradient(135deg, #2563eb, #4f46e5);
                --fab-color: #ffffff;
                --fab-shadow:
                    0 4px 6px -1px rgba(0, 0, 0, 0.1),
                    0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }

            /* =========================================================
            Layout
            ========================================================= */
            body {
                padding-left: 0;
                transition: padding-left 0.3s ease;
            }

            @media (min-width: 769px) {
                body.has-sidebar {
                    padding-left: var(--sidebar-width);
                }
            }

            /* =========================================================
            Sidebar Container
            ========================================================= */
            #stremio-sidebar {
                position: fixed;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                background-color: var(--sidebar-bg);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* Desktop Sidebar */
            @media (min-width: 769px) {
                #stremio-sidebar {
                    top: 0;
                    left: 0;
                    height: 100vh;
                    width: var(--sidebar-width);
                    flex-direction: column;
                    padding: 1.5rem 1rem;
                    background: rgba(30, 41, 59, 0.5);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-right: 1px solid rgba(255, 255, 255, 0.05);
                }
            }

            /* Mobile Popover Sidebar */
            @media (max-width: 768px) {
                #stremio-sidebar {
                    bottom: calc(2rem + var(--fab-size) + 1.5rem);
                    right: 2rem;
                    min-width: 220px;
                    padding: 1rem;
                    border-radius: 1.5rem;
                    background-color: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow:
                        0 20px 25px -5px rgba(0, 0, 0, 0.5),
                        0 8px 10px -6px rgba(0, 0, 0, 0.5),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);

                    transform-origin: bottom right;
                    transform: scale(0.9) translateY(20px);
                    opacity: 0;
                    pointer-events: none;
                    visibility: hidden;
                }

                #stremio-sidebar.open {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                    pointer-events: auto;
                    visibility: visible;
                }

                body.has-sidebar {
                    padding-left: 0 !important;
                }
            }

            /* =========================================================
            Sidebar Header
            ========================================================= */
            .sidebar-header {
                margin-bottom: 2rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                color: #fff;
                font-weight: 700;
                font-size: 1.2rem;
                padding-left: 0.5rem;
            }

            .sidebar-header svg {
                width: 24px;
                height: 24px;
                fill: var(--accent);
            }

            @media (max-width: 768px) {
                .sidebar-header {
                    display: none !important;
                }
            }

            /* =========================================================
            Navigation
            ========================================================= */
            .sidebar-nav {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .nav-link {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                font-weight: 500;
                text-decoration: none;
                border-radius: 0.5rem;
                color: #94a3b8;
                transition: background-color 0.2s, color 0.2s;
            }

            .nav-link:hover {
                background-color: var(--nav-item-hover);
                color: #fff;
            }

            .nav-link.active {
                background-color: var(--nav-item-active);
                color: #fff;
            }

            .nav-link.home-link {
                color: #e2e8f0; /* Brighter text */
                font-weight: 600;
                background-color: rgba(255, 255, 255, 0.03);
                margin-bottom: 0.5rem; /* Separation from other items */
                border: 1px solid rgba(255, 255, 255, 0.05);
            }

            .nav-link.home-link:hover {
                background-color: var(--nav-item-hover);
                border-color: transparent;
            }

            .nav-link svg {
                width: 20px;
                height: 20px;
                opacity: 0.8;
                fill: currentColor;
            }
            
            @media (max-width: 768px) {
                .nav-link {
                    width: 100%;
                    border-radius: 1rem;
                    font-size: 0.95rem;
                    color: #cbd5e1;
                }

                .nav-link:hover,
                .nav-link:active {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }
            }

            /* =========================================================
            Sidebar Footer
            ========================================================= */
            .sidebar-footer {
                margin-top: auto;
                padding-top: 1.5rem;
                padding-left: 0.5rem;
                font-size: 0.9rem;
                color: #94a3b8;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }

            .sidebar-footer div {
                margin-bottom: 0.25rem;
            }

            .sidebar-footer a {
                color: var(--accent);
                text-decoration: none;
                font-weight: 500;
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
            }

            .sidebar-footer a:hover {
                text-decoration: underline;
                color: #fff;
            }

            /* =========================================================
            Report Modal
            ========================================================= */
            #report-modal {
                position: fixed;
                inset: 0;
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
            }

            #report-modal.visible {
                opacity: 1;
                pointer-events: auto;
            }

            #report-modal-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
            }

            #report-modal-content {
                position: relative;
                width: 100%;
                max-width: 500px;
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 1rem;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                overflow: hidden;
                transform: scale(0.95);
                transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }

            #report-modal.visible #report-modal-content {
                transform: scale(1);
            }

            .report-header {
                padding: 1.25rem;
                border-bottom: 1px solid #1e293b;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #1e293b;
            }

            .report-header h3 {
                margin: 0;
                color: #f8fafc;
                font-size: 1.1rem;
                font-weight: 600;
            }

            .report-close {
                background: transparent;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 0.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .report-close:hover {
                background: #334155;
                color: #fff;
            }

            .report-body {
                padding: 1.5rem;
            }

            .form-group {
                margin-bottom: 1.25rem;
            }

            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                color: #cbd5e1;
                font-size: 0.9rem;
                font-weight: 500;
            }

            .form-group input, .form-group textarea {
                width: 100%;
                background: #1e293b;
                border: 1px solid #334155;
                color: #fff;
                padding: 0.75rem;
                border-radius: 0.5rem;
                font-family: inherit;
                font-size: 0.95rem;
                outline: none;
                transition: border-color 0.2s;
                resize: vertical;
                box-sizing: border-box;
            }

            .form-group input:focus, .form-group textarea:focus {
                border-color: #3b82f6;
                background: #0f172a;
            }

            .form-helper {
                font-size: 0.8rem;
                color: #64748b;
                margin-top: 0.4rem;
            }

            .report-footer {
                padding: 1.25rem;
                background: #0f172a;
                border-top: 1px solid #1e293b;
                display: flex;
                justify-content: flex-end;
                gap: 0.75rem;
            }

            .modal-btn {
                padding: 0.6rem 1rem;
                border-radius: 0.5rem;
                font-weight: 500;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }

            .btn-secondary {
                background: transparent;
                color: #94a3b8;
            }

            .btn-secondary:hover {
                background: #1e293b;
                color: #fff;
            }

            .btn-primary {
                background: linear-gradient(135deg, #3b82f6, #6366f1);
                color: white;
            }

            .btn-primary:hover {
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                opacity: 0.9;
            }

            .sidebar-report-btn {
                margin-top: 1rem;
                background: rgba(59, 130, 246, 0.1);
                color: #60a5fa;
                border: 1px solid rgba(59, 130, 246, 0.2);
                width: 100%;
                padding: 0.75rem;
                border-radius: 0.5rem;
                cursor: pointer;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                transition: all 0.2s;
                font-size: 0.9rem;
            }

            .sidebar-report-btn:hover {
                background: rgba(59, 130, 246, 0.2);
                border-color: rgba(59, 130, 246, 0.4);
                color: #93c5fd;
            }
            
            .sidebar-report-btn svg {
                width: 18px;
                height: 18px;
            }

            /* =========================================================
            Floating Action Button (FAB)
            ========================================================= */
            #mobile-fab {
                position: fixed;
                bottom: max(1.5rem, env(safe-area-inset-bottom));
                right: max(1.5rem, env(safe-area-inset-right));
                width: var(--fab-size);
                height: var(--fab-size);
                border-radius: 50%;
                background: var(--fab-bg);
                box-shadow: var(--fab-shadow);
                border: none;
                color: var(--fab-color);
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                transition: transform 0.2s, box-shadow 0.2s;
                -webkit-tap-highlight-color: transparent;
            }

            #mobile-fab:hover {
                transform: scale(1.05);
            }

            #mobile-fab:active {
                transform: scale(0.95);
            }

            #mobile-fab svg {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 24px;
                height: 24px;
                transform: translate(-50%, -50%);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                stroke: #ffffff;
                stroke-width: 2.5;
                fill: none;
            }

            /* FAB Icon States */
            #mobile-fab .icon-menu {
                opacity: 1;
                transform: translate(-50%, -50%) rotate(0) scale(1);
            }

            #mobile-fab.open .icon-menu {
                opacity: 0;
                transform: translate(-50%, -50%) rotate(90deg) scale(0.5);
            }

            #mobile-fab .icon-close {
                opacity: 0;
                transform: translate(-50%, -50%) rotate(-90deg) scale(0.5);
            }

            #mobile-fab.open .icon-close {
                opacity: 1;
                transform: translate(-50%, -50%) rotate(0) scale(1);
            }

            /* =========================================================
            Mobile Overlay
            ========================================================= */
            @media (max-width: 768px) {
                #mobile-fab {
                    display: flex;
                }

                #sidebar-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    z-index: 900;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s;
                }

                #sidebar-overlay.visible {
                    opacity: 1;
                    pointer-events: auto;
                }
            }
        `;

        const styleSheet = document.createElement("style");
        styleSheet.innerText = cssContent;
        document.head.appendChild(styleSheet);
    }

    // Create and inject the sidebar DOM element
    createSidebar() {
        // Create container
        this.sidebarElement = document.createElement('nav');
        this.sidebarElement.id = 'stremio-sidebar';

        // Create Header
        const logoSvg = `<svg viewBox="0 0 100 100"><text y=".9em" font-size="90">🦆</text></svg>`;
        const headerDiv = document.createElement('div');
        headerDiv.className = 'sidebar-header';
        headerDiv.innerHTML = `${logoSvg}<span>Stremio Tools</span>`;
        this.sidebarElement.appendChild(headerDiv);

        // Create Navigation List
        const navList = document.createElement('ul');
        navList.className = 'sidebar-nav';

        // Iterate through tools to create links (using a loop instead of functional map)
        for (let i = 0; i < this.tools.length; i++) {
            const tool = this.tools[i];
            const listItem = this.createNavLocationItem(tool);
            navList.appendChild(listItem);
        }

        this.sidebarElement.appendChild(navList);
        this.createFooter();
        document.body.prepend(this.sidebarElement);
    }

    // Create a single navigation item list element
    createNavLocationItem(tool) {
        const fullPath = this.getCorrectPath(tool.path);
        const activeClass = this.isActive(tool.path) ? 'active' : '';
        const homeClass = tool.name === 'Home' ? 'home-link' : ''; // Home link is styled differently
        const iconSvg = this.icons[tool.icon] || '';

        const li = document.createElement('li');
        li.innerHTML = `
            <a href="${fullPath}" class="nav-link ${activeClass} ${homeClass}">
                ${iconSvg}<span>${tool.name}</span>
            </a>
        `;
        return li;
    }

    // Create the footer with guides link
    createFooter() {
        const footer = document.createElement('div');
        footer.className = 'sidebar-footer';
        footer.innerHTML = `
            <div style="margin-bottom: 0.5rem">Need help?</div>
            <a href="https://duckkota.gitlab.io/guides/" target="_blank" style="display: block; margin-bottom: 1rem;">
                Check out my Guides &rarr;
            </a>
            <button id="report-issue-btn" class="sidebar-report-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
                Report Issue
            </button>
        `;
        this.sidebarElement.appendChild(footer);
    }

    // Create the Floating Action Button (FAB) for mobile
    createFloatingActionButton() {
        this.fabElement = document.createElement('button');
        this.fabElement.id = 'mobile-fab';
        this.fabElement.innerHTML = `
            <svg class="fab-icon icon-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="18" x2="20" y2="18"></line>
            </svg>
            <svg class="fab-icon icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        document.body.prepend(this.fabElement);
    }

    // Create the overlay background for mobile
    createOverlay() {
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'sidebar-overlay';
        document.body.prepend(this.overlayElement);
    }

    // Create the Report Issue Modal
    createReportModal() {
        this.reportModal = document.createElement('div');
        this.reportModal.id = 'report-modal';
        this.reportModal.innerHTML = `
            <div id="report-modal-backdrop"></div>
            <div id="report-modal-content">
                <div class="report-header" style="padding: 1.25rem; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; background: #1e293b;">
                    <h3>Report an Issue</h3>
                </div>
                <div class="report-body">
                    <form id="report-form">
                        <div class="form-group">
                            <label for="report-desc">What went wrong?</label>
                            <textarea id="report-desc" rows="4" placeholder="Please describe the issue or error you encountered.\nThe more information you provide, the faster I can fix it." required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="report-contact">Contact Info (Optional)</label>
                            <input type="text" id="report-contact" placeholder="Discord username">
                        </div>
                        <div class="report-footer" style="padding: 0; padding-top: 1rem; border: none; background: transparent;">
                            <button type="button" class="modal-btn btn-secondary" id="cancel-report">Cancel</button>
                            <button type="submit" class="modal-btn btn-primary">Submit Report</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(this.reportModal);
    }

    // Attach event listeners for interactivity
    attachEventListeners() {
        // Using arrow function wrapper to preserve 'this' context, or function binding
        this.handleToggleMenu = this.handleToggleMenu.bind(this);

        this.fabElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleToggleMenu();
        });

        this.overlayElement.addEventListener('click', this.handleToggleMenu);

        this.sidebarElement.addEventListener('click', (e) => {
            // Close menu when a link is clicked on mobile
            if (e.target.closest('a') && window.innerWidth <= 768) {
                this.handleToggleMenu();
            }
        });

        // Report Modal Listeners
        const reportBtn = document.getElementById('report-issue-btn');
        const cancelBtn = this.reportModal.querySelector('#cancel-report');
        const form = this.reportModal.querySelector('#report-form');

        reportBtn.addEventListener('click', () => this.openReportModal());
        cancelBtn.addEventListener('click', () => this.closeReportModal());
        form.addEventListener('submit', (e) => this.handleReportSubmit(e));
    }

    // Toggle the mobile menu state
    handleToggleMenu() {
        this.sidebarElement.classList.toggle('open');
        this.fabElement.classList.toggle('open');
        this.overlayElement.classList.toggle('visible');
    }

    // Open Report Modal
    openReportModal() {
        this.reportModal.classList.add('visible');
        setTimeout(() => {
            const textarea = this.reportModal.querySelector('textarea');
            if (textarea) textarea.focus();
        }, 100);
    }

    // Close Report Modal
    closeReportModal() {
        this.reportModal.classList.remove('visible');
        // Reset form after transition
        setTimeout(() => {
            const form = this.reportModal.querySelector('form');
            if (form) form.reset();
        }, 300);
    }

    // Handle Report Submission
    handleReportSubmit(e) {
        e.preventDefault();

        const desc = document.getElementById('report-desc').value;
        const contact = document.getElementById('report-contact').value;

        // Create the error context
        const context = {
            component: 'UserReport',
            contact: contact || 'Anonymous',
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        // Create a unique ID to prevent grouping in Honeybadger
        const uniqueId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create the error object and send it to HoneyBadger
        const error = new Error("User Report: " + desc.substring(0, 50));
        if (window.sendErrorToHoneyBadger) {
            window.sendErrorToHoneyBadger(error, {
                fingerprint: uniqueId,
                context: {
                    ...context,
                    fullDescription: desc
                }
            });

            // Show success feedback
            const content = this.reportModal.querySelector('#report-modal-content');
            const originalHTML = content.innerHTML;

            content.innerHTML = `
                <div style="padding: 3rem; text-align: center;">
                    <svg style="width: 64px; height: 64px; margin-bottom: 1rem; color: #10b981;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <h3 style="margin: 0; color: #f8fafc; font-size: 1.5rem;">Report Sent!</h3>
                    <p style="color: #94a3b8; margin: 0.5rem 0 2rem;">Thanks for helping us improve.</p>
                    <button class="modal-btn btn-primary" id="close-success">Close</button>
                </div>
            `;

            content.querySelector('#close-success').addEventListener('click', () => {
                this.closeReportModal();
                // Restore form after close
                setTimeout(() => {
                    content.innerHTML = originalHTML;
                    // Re-attach listeners to the restored elements
                    const cancelBtn = content.querySelector('#cancel-report');
                    const form = content.querySelector('#report-form');

                    cancelBtn.addEventListener('click', () => this.closeReportModal());
                    form.addEventListener('submit', (ev) => this.handleReportSubmit(ev));
                }, 300);
            });

        } else {
            alert('Error tracking system is not loaded. Please try again later.');
        }
    }

    // Get the correct path for a link based on the current location
    getCorrectPath(targetPath) {
        const script = document.currentScript || document.querySelector('script[src*="NavigationSidebar.js"]');
        if (!script) return targetPath;

        const isSubDir = script.getAttribute('src').startsWith('../');

        // Normalize target for root
        if (targetPath === '/') {
            return isSubDir ? '../' : './';
        }

        const clean = targetPath.replace(/^\/+/, '');
        return isSubDir ? `../${clean}` : `${clean}`;
    }

    // Check if the given tool path matches the current page
    isActive(toolPath) {
        const currentPath = window.location.pathname;

        if (toolPath === '/') {
            return currentPath.endsWith('/stremio-tools/') ||
                currentPath.endsWith('/stremio-tools/index.html') ||
                currentPath === '/' ||
                (currentPath.endsWith('/index.html') && currentPath.split('/').length <= 2);
        }

        return currentPath.includes(toolPath);
    }
}

// Instantiate the class to run the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new NavigationSidebar());
} else {
    new NavigationSidebar();
}