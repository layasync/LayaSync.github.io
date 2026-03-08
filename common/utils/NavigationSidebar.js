// NavigationSidebar.js

class NavigationSidebar {
    constructor() {
        // The list of tools to display in the sidebar.
        this.tools = [
            { name: "Home", path: "/", icon: "home" },
            { name: "QuickStart", path: "/quickstart/" },
            { name: "Time Machine", path: "/time-machine/" },
            { name: "Account Cloner", path: "/cloner/" },
            { name: "Addon Butler", path: "/addon-butler/" },
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
                --fab-size: 3.5rem;
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
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* Desktop Sidebar */
            @media (min-width: 769px) {
                #stremio-sidebar {
                    top: 0;
                    left: 0;
                    height: 100vh;
                    width: var(--sidebar-width);
                    flex-direction: column;
                    padding: 1.5rem 1rem 0.5rem 1rem;
                    background: rgba(30, 41, 59, 0.5);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-right: 1px solid rgba(255, 255, 255, 0.05);
                }
            }

            /* Mobile Sidebar (Off-Canvas Overlay) */
            @media (max-width: 768px) {
                #stremio-sidebar {
                    top: 0;
                    right: 0;
                    height: 100vh;
                    width: 280px; /* Width of the drawer */
                    padding: 2rem 1.5rem;
                    background-color: #0f172a;
                    border-left: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: -10px 0 30px rgba(0,0,0,0.5);
                    transform: translateX(100%); /* Start hidden off-screen */
                    visibility: visible;
                    z-index: 2500; /* Above everything */
                    pointer-events: auto;
                }

                #stremio-sidebar.open {
                    transform: translateX(0);
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

            /* Show header on mobile too now */
            @media (max-width: 768px) {
                .sidebar-header {
                    display: flex !important;
                    margin-top: 1rem;
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
                    border-radius: 0.75rem;
                    font-size: 1rem;
                    padding: 1rem; 
                    /* Larger touch target */
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
                z-index: 3000;
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
                bottom: 1.5rem; /* Tweak for better corner placement */
                right: 1.5rem;
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

            /* Handle safe areas if supported */
            @supports (padding-bottom: env(safe-area-inset-bottom)) {
                #mobile-fab {
                    bottom: calc(2rem + env(safe-area-inset-bottom));
                    right: calc(2rem + env(safe-area-inset-right));
                }
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
                width: 28px;
                height: 28px;
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
                    z-index: 2400; /* Below sidebar, above everything else */
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
            <a href="https://duckkota.gitlab.io/guides/" target="_blank" style="display: block; margin-bottom: 1rem;">
                Check out my Guides &rarr;
            </a>
            <button id="report-issue-btn" class="sidebar-report-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
                Report Issue
            </button>
        `;
        this.sidebarElement.appendChild(footer);

        // ------
        // Add the following line of code to the innerHTML above to enable donations again
        // ------
        // <div style="margin-top: 1rem; display: flex; gap: 10px; justify-content: center;">
        //     <a href="https://ko-fi.com/duckstreams" target="_blank" title="Support on Ko-Fi" style="width: 50px; height: 50px; background: #29abe0; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        //         <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="Ko-Fi" style="width: 32px; height: auto;">
        //     </a>
        //     <a href="#" id="crypto-donate-btn" title="Donate Crypto" style="width: 50px; height: 50px; background: #f7931a; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); color: white;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        //         <img src="${this.getCorrectPath('/common/assets/crypto/bitcoin-btc-logo.svg')}" alt="BTC" style="width: 42px; height: 42px;">
        //     </a>
        // </div>
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

        // Crypto Donate Listener
        const cryptoBtn = document.getElementById('crypto-donate-btn');
        if (cryptoBtn) {
            cryptoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openCryptoModal();
            });
        }
    }

    // Toggle the mobile menu state
    handleToggleMenu() {
        this.sidebarElement.classList.toggle('open');
        this.fabElement.classList.toggle('open');
        this.overlayElement.classList.toggle('visible');
    }

    // Open Report Modal
    openReportModal() {
        // Check if error reporting is blocked
        if (window.ErrorHandler && ErrorHandler.isBlocked()) {
            Modal.error("Please temporarily disable it to report an issue.", "Ad Blocker Detected");
            return;
        }

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
        const uniqueId = `report-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        // Create the error object and send it to HoneyBadger
        const error = new Error("User Report: " + desc.substring(0, 50));

        if (window.ErrorHandler) {
            ErrorHandler.report(error, {
                fingerprint: uniqueId,
                context: {
                    ...context,
                    fullDescription: desc
                }
            });

            // Close the report modal first
            this.closeReportModal();

            // Show success feedback
            Modal.success("Thanks for helping me improve!", "Report Sent!");
        } else {
            // Fallback
            this.closeReportModal();
            Modal.error('Error tracking system is not loaded yet. Please try again in a moment.');
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

    // Open Crypto Donation Modal
    openCryptoModal() {
        if (!window.Modal) {
            Logger.error('NavigationSidebar', "Modal utility not found");
            return;
        }

        const contentHtml = `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; text-align: left;">
                <p style="color: #cbd5e1; font-size: 0.95rem; margin-top: 0; margin-bottom: 0.5rem;">Thank you for your support! You can send cryptocurrency to the following addresses:</p>
                
                <div style="display: flex; align-items: center; background: #1e293b; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #334155; transition: border-color 0.2s;" onmouseover="this.style.borderColor='#475569'" onmouseout="this.style.borderColor='#334155'">
                    <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: rgba(247, 147, 26, 0.1); border-radius: 50%; margin-right: 1rem; flex-shrink: 0;">
                        <img src="${this.getCorrectPath('/common/assets/crypto/bitcoin-btc-logo.svg')}" width="40" height="40" alt="BTC" style="display:block;" />
                    </div>
                    <div style="flex-grow: 1; min-width: 0;">
                        <div style="font-weight: 600; color: #f8fafc; font-size: 0.95rem;">Bitcoin (BTC)</div>
                        <div id="crypto-btc-addr" style="font-family: monospace; font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">bc1qfvszy0uwgm6jk2a0whpuhe7jxfwec6pgl6vgu6</div>
                    </div>
                    <button data-copy="crypto-btc-addr" class="copy-icon-btn" style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: transparent; border: 1px solid #475569; color: #cbd5e1; border-radius: 0.35rem; cursor: pointer; transition: all 0.2s; margin-left: 0.75rem; flex-shrink: 0; padding: 0;" onmouseover="this.style.background='#334155'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'" title="Copy Address">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>

                <div style="display: flex; align-items: center; background: #1e293b; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #334155; transition: border-color 0.2s;" onmouseover="this.style.borderColor='#475569'" onmouseout="this.style.borderColor='#334155'">
                    <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: rgba(98, 126, 234, 0.1); border-radius: 50%; margin-right: 1rem; flex-shrink: 0;">
                        <img src="${this.getCorrectPath('/common/assets/crypto/ethereum-eth-logo.svg')}" width="40" height="40" alt="ETH" style="display:block;" />
                    </div>
                    <div style="flex-grow: 1; min-width: 0;">
                        <div style="font-weight: 600; color: #f8fafc; font-size: 0.95rem;">Ethereum (ETH)</div>
                        <div id="crypto-eth-addr" style="font-family: monospace; font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">0x3cb4Bc0C12b88594ff32054BBfd7a8d45d3F15FB</div>
                    </div>
                    <button data-copy="crypto-eth-addr" class="copy-icon-btn" style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: transparent; border: 1px solid #475569; color: #cbd5e1; border-radius: 0.35rem; cursor: pointer; transition: all 0.2s; margin-left: 0.75rem; flex-shrink: 0; padding: 0;" onmouseover="this.style.background='#334155'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'" title="Copy Address">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>

                <div style="display: flex; align-items: center; background: #1e293b; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #334155; transition: border-color 0.2s;" onmouseover="this.style.borderColor='#475569'" onmouseout="this.style.borderColor='#334155'">
                    <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: rgba(52, 93, 157, 0.1); border-radius: 50%; margin-right: 1rem; flex-shrink: 0;">
                        <img src="${this.getCorrectPath('/common/assets/crypto/litecoin-ltc-logo.svg')}" width="40" height="40" alt="LTC" style="display:block;" />
                    </div>
                    <div style="flex-grow: 1; min-width: 0;">
                        <div style="font-weight: 600; color: #f8fafc; font-size: 0.95rem;">Litecoin (LTC)</div>
                        <div id="crypto-ltc-addr" style="font-family: monospace; font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">ltc1q2z3s3ujhjfk6xa5wjcp4thmdsgh2ctrh37krn5</div>
                    </div>
                    <button data-copy="crypto-ltc-addr" class="copy-icon-btn" style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: transparent; border: 1px solid #475569; color: #cbd5e1; border-radius: 0.35rem; cursor: pointer; transition: all 0.2s; margin-left: 0.75rem; flex-shrink: 0; padding: 0;" onmouseover="this.style.background='#334155'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'" title="Copy Address">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>
            </div>
        `;

        Modal.show({
            title: "Donate Crypto",
            message: contentHtml,
            iconSvg: `<img src="${this.getCorrectPath('/common/assets/crypto/bitcoin-btc-logo.svg')}" alt="BTC" style="width: 42px; height: 42px;">`,
            iconColor: '#f7931a',
            buttons: [{ text: 'Close', type: 'primary', onClick: () => true }]
        });
    }
}

// Instantiate the class to run the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new NavigationSidebar());
} else {
    new NavigationSidebar();
}