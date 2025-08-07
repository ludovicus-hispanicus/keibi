// js/ui/tabManager.js (Production-ready with minimal logs)
import { globalState } from '../state/globalState.js';

export class TabManager {
    constructor() {
        this.lastActiveMainTabId = 'preview-tab';
        this.csvTabInitialized = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const sidebarTabs = document.querySelectorAll('.sidebar-tab');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => this.handleMainTabClick(button));
        });

        sidebarTabs.forEach(tab => {
            tab.addEventListener('click', () => this.handleSidebarTabClick(tab));
        });
    }

    handleMainTabClick(button) {
        const tabId = button.dataset.tab;
        const newTabId = `${tabId}-tab`;
        
        if (this.lastActiveMainTabId === newTabId) {
            return;
        }
        
        this.lastActiveMainTabId = newTabId;
        
        this.updateMainTabStyles(button);
        this.showMainTabContent(tabId);
        
        if (tabId === 'csv-editor') {
            this.handleCSVEditorTabActivation();
        } else {
            this.hideCellDetailPreviewer();
        }
    }

    updateMainTabStyles(activeButton) {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
            btn.classList.remove('active', 'text-[var(--cerulean)]', 'border-[var(--cerulean)]', 'font-bold');
            btn.classList.add('text-[var(--text-secondary-on-light-bg)]', 'border-transparent');
        });
        
        activeButton.classList.add('active', 'text-[var(--cerulean)]', 'border-[var(--cerulean)]', 'font-bold');
        activeButton.classList.remove('text-[var(--text-secondary-on-light-bg)]', 'border-transparent');
    }

    showMainTabContent(tabId) {
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(c => c.style.display = (c.id === `${tabId}-tab`) ? 'block' : 'none');
        
        if (globalState.stylePreviewMainDisplay) {
            globalState.stylePreviewMainDisplay.style.display = 'none';
        }
    }

    async handleCSVEditorTabActivation() {
        try {
            if (!globalState.csvData || globalState.csvData.length === 0) {
                const csvGrid = document.getElementById('csvGrid');
                if (csvGrid) {
                    csvGrid.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-text-secondary); font-style: italic;">Please upload a CSV file first.</div>';
                }
                return;
            }

            if (globalState.csvManager) {
                if (globalState.csvManager.isGridReady && globalState.csvManager.isGridReady()) {
                    if (globalState.csvCellDetailPreviewer) {
                        globalState.csvCellDetailPreviewer.style.display = 'block';
                    }
                    
                    setTimeout(() => {
                        if (globalState.csvManager.restoreSelection && !globalState.csvManager.restoreSelection()) {
                            if (globalState.csvCellDetailPreviewer) {
                                globalState.csvCellDetailPreviewer.innerHTML = '<span style="color: var(--color-text-secondary); font-style: italic;">Click a cell in the table to see its full content here.</span>';
                            }
                        }
                    }, 100);
                    
                    return;
                }
                
                globalState.csvManager.displayCSVTable();
                this.csvTabInitialized = true;
            } else {
                console.error('csvManager not found, creating fallback...');
                const CSVManagerModule = await import('../csvEditor/csvManager.js');
                globalState.csvManager = new CSVManagerModule.CSVManager();
                globalState.csvManager.displayCSVTable();
                this.csvTabInitialized = true;
            }
            
            if (globalState.csvCellDetailPreviewer) {
                globalState.csvCellDetailPreviewer.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading CSV editor:', error);
            const csvGrid = document.getElementById('csvGrid');
            if (csvGrid) {
                csvGrid.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #dc2626;">Error loading CSV editor: ' + error.message + '</div>';
            }
        }
    }

    hideCellDetailPreviewer() {
        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.style.display = 'none';
        }
    }

    handleSidebarTabClick(tab) {
        const sidebarTabId = tab.dataset.sidebarTab;
        
        this.updateSidebarTabStyles(tab);
        this.showSidebarContent(sidebarTabId);
        
        if (sidebarTabId === 'styles') {
            this.handleStylesTabActivation();
        } else {
            this.handleControlsTabActivation();
        }
    }

    updateSidebarTabStyles(activeTab) {
        const sidebarTabs = document.querySelectorAll('.sidebar-tab');
        sidebarTabs.forEach(t => t.classList.remove('active'));
        activeTab.classList.add('active');
    }

    showSidebarContent(sidebarTabId) {
        const sidebarContents = document.querySelectorAll('.sidebar-content');
        sidebarContents.forEach(c => c.style.display = (c.id === `${sidebarTabId}-tab`) ? 'block' : 'none');
    }

    async handleStylesTabActivation() {
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(tc => tc.style.display = 'none');
        
        if (globalState.stylePreviewMainDisplay) {
            globalState.stylePreviewMainDisplay.style.display = 'block';
        }
        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.style.display = 'none';
        }
        
        try {
            const module = await import('../styles/previewGenerator.js');
            const preview = new module.PreviewGenerator();
            preview.updateAllFormatPreviews();
        } catch (error) {
            console.error('Error loading preview generator:', error);
        }
    }

    handleControlsTabActivation() {
        if (globalState.stylePreviewMainDisplay) {
            globalState.stylePreviewMainDisplay.style.display = 'none';
        }
        
        const targetMainTab = document.getElementById(this.lastActiveMainTabId);
        if (targetMainTab) {
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(tc => tc.style.display = (tc.id === this.lastActiveMainTabId) ? 'block' : 'none');
            
            if (this.lastActiveMainTabId === 'csv-editor-tab' && globalState.csvCellDetailPreviewer) {
                globalState.csvCellDetailPreviewer.style.display = 'block';
                
                if (globalState.csvManager && globalState.csvManager.isGridReady && !globalState.csvManager.isGridReady()) {
                    this.handleCSVEditorTabActivation();
                }
            } else if (globalState.csvCellDetailPreviewer) {
                globalState.csvCellDetailPreviewer.style.display = 'none';
            }
            
            this.updateMainTabButtonStyles();
        }
    }

    updateMainTabButtonStyles() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(tb => {
            const isActive = tb.dataset.tab === this.lastActiveMainTabId.replace('-tab', '');
            tb.classList.toggle('active', isActive);
            tb.classList.toggle('text-[var(--cerulean)]', isActive);
            tb.classList.toggle('border-[var(--cerulean)]', isActive);
            tb.classList.toggle('font-bold', isActive);
            tb.classList.toggle('text-[var(--text-secondary-on-light-bg)]', !isActive);
            tb.classList.toggle('border-transparent', !isActive);
        });
    }

    switchToPreviewTab() {
        const previewTabButton = document.querySelector('.tab-button[data-tab="preview"]');
        if (previewTabButton) previewTabButton.click();
    }

    resetCSVTabState() {
        if (globalState.csvManager && globalState.csvManager.cleanup) {
            globalState.csvManager.cleanup();
        }
        this.csvTabInitialized = false;
    }

    initializeDefaultTabs() {
        const initialSidebarTab = document.querySelector('.sidebar-tab[data-sidebar-tab="controls"]');
        if (initialSidebarTab) initialSidebarTab.click();

        const activeMainTabButton = document.querySelector(`.tab-button[data-tab="${this.lastActiveMainTabId.replace('-tab', '')}"]`);
        if (activeMainTabButton) {
            this.handleMainTabClick(activeMainTabButton);
        } else {
            const tabButtons = document.querySelectorAll('.tab-button');
            if (tabButtons.length > 0) {
                this.handleMainTabClick(tabButtons[0]);
            }
        }
    }
}