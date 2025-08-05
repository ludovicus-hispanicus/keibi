// Main initialization and coordination - FIXED VERSION
import { globalState } from './state/globalState.js';

// Import all the managers/handlers we need
let styleManager, tabManager, fileHandler, previewContextMenu, csvNavigation, exportManager;
let csvManager = null; // FIXED: Added csvManager reference

// Main application class
class BibliographyManager {
    constructor() {
        // We'll initialize managers after DOM is ready
        this.managersInitialized = false;
    }

    async init() {
        this.initializeDOM();
        await this.initializeManagers();
        this.setupEventListeners();
        this.loadInitialData();
        this.initializeUI();
    }

    async initializeManagers() {
        try {
            // Dynamically import all managers
            const [
                StyleManagerModule,
                TabManagerModule,
                FileHandlerModule,
                PreviewContextMenuModule,
                CSVNavigationModule,
                ExportManagerModule,
                CSVManagerModule,
                WordExporterModule // ADDED: Move WordExporter here
            ] = await Promise.all([
                import('./styles/styleManager.js'),
                import('./ui/tabManager.js'),
                import('./ui/fileHandler.js'),
                import('./preview/contextMenu.js'),
                import('./csvEditor/navigation.js'),
                import('./rightColumn/exportManager.js'),
                import('./csvEditor/csvManager.js'),
                import('./export/wordExporter.js') // ADDED: Import WordExporter in parallel
            ]);

            // Initialize all managers
            styleManager = new StyleManagerModule.StyleManager();
            tabManager = new TabManagerModule.TabManager();
            fileHandler = new FileHandlerModule.FileHandler();
            previewContextMenu = new PreviewContextMenuModule.PreviewContextMenu();
            csvNavigation = new CSVNavigationModule.CSVNavigation();
            exportManager = new ExportManagerModule.ExportManager();
            csvManager = new CSVManagerModule.CSVManager();

            // FIXED: Make csvManager globally accessible for tab switching
            globalState.csvManager = csvManager;

            // Initialize Word export button
            WordExporterModule.addWordExportButton();

            this.managersInitialized = true;
            console.log('All managers initialized successfully');
        } catch (error) {
            console.error('Error initializing managers:', error);
        }
    }

    initializeDOM() {
        // Initialize global DOM references
        globalState.outputDiv = document.getElementById('bibliographyOutput');
        globalState.bibliographyOutputGlobal = document.getElementById('bibliographyOutput');
        globalState.entryCount = document.getElementById('entryCount');
        globalState.styleEditorsContainer = document.getElementById('styleEditorsContainer');
        globalState.formatPreviewPanel = document.getElementById('formatPreviewPanel');
        globalState.entryTypesContainerEl = document.getElementById('entryTypesContainer');
        globalState.stylePreviewMainDisplay = document.getElementById('stylePreviewMainDisplay');
        globalState.csvCellDetailPreviewer = document.getElementById('csvCellDetailPreviewer');

        // Validate critical elements
        if (!globalState.outputDiv || !globalState.entryCount || !globalState.styleEditorsContainer || 
            !globalState.formatPreviewPanel || !globalState.stylePreviewMainDisplay || !globalState.csvCellDetailPreviewer) {
            console.error("CRITICAL: Core UI elements missing.");
            const uploadStatus = document.getElementById('uploadStatus');
            if (uploadStatus) uploadStatus.innerHTML = '<span class="status-error">Error: Core UI missing.</span>';
        }

        // Setup preview area for editing
        if (globalState.bibliographyOutputGlobal) {
            globalState.bibliographyOutputGlobal.addEventListener('contextmenu', (e) => {
                if (previewContextMenu) previewContextMenu.showContextMenu(e);
            });
            globalState.bibliographyOutputGlobal.addEventListener('input', (e) => this.handlePreviewInputChange(e));
        }

        // Initialize cell detail previewer
        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.innerHTML = '<p class="text-gray-500 italic">Click a cell in the table to see its full content here.</p>';
        }

        // FIXED: Add cleanup when window is unloaded
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    setupEventListeners() {
        // Sort option listener
        const sortOption = document.getElementById('sortOption');
        if (sortOption) {
            sortOption.addEventListener('change', () => {
                if (globalState.csvData.length > 0) {
                    this.generateBibliography();
                }
            });
        }

        // Export buttons
        const exportHTMLBtn = document.getElementById('exportHTMLBtn');
        if (exportHTMLBtn) {
            exportHTMLBtn.addEventListener('click', () => {
                if (exportManager) exportManager.exportBibliographyAsHTML();
            });
        }

        const saveCSVBtn = document.getElementById('saveCSVBtn');
        if (saveCSVBtn) {
            saveCSVBtn.addEventListener('click', () => {
                if (exportManager) exportManager.saveCSVChanges();
            });
        }

        // Style management buttons
        const saveStylesBtn = document.getElementById('saveStylesBtn');
        if (saveStylesBtn) {
            saveStylesBtn.addEventListener('click', () => this.handleSaveAllStyles());
        }

        const resetStylesBtn = document.getElementById('resetStylesBtn');
        if (resetStylesBtn) {
            resetStylesBtn.addEventListener('click', () => {
                if (styleManager) styleManager.resetStyles();
            });
        }

        const addCustomStyleBtn = document.getElementById('addCustomStyleBtn');
        if (addCustomStyleBtn) {
            addCustomStyleBtn.addEventListener('click', () => this.handleAddCustomStyle());
        }
    }

    loadInitialData() {
        if (styleManager) {
            styleManager.loadSavedStyles();
        }
    }

    initializeUI() {
        // Initialize navigation enhancements
        if (csvNavigation) {
            csvNavigation.enhanceCellNavigation();
            csvNavigation.addColumnHoverEffect();
        }

        // Initialize default tabs
        if (tabManager) {
            tabManager.initializeDefaultTabs();
        }
    }

    handleSaveAllStyles() {
        if (!styleManager) return;
        
        styleManager.persistAllStylesToStorage();
        alert('All current style configurations saved successfully!');
        styleManager.updateAllComponents();
        
        if (globalState.csvData.length > 0) {
            this.generateBibliography();
        }
    }

    handleAddCustomStyle() {
        const nameInput = document.getElementById('customStyleName');
        const formatInput = document.getElementById('customStyleFormat');
        
        if (!nameInput || !formatInput) { 
            console.error("Custom style input fields not found."); 
            return; 
        }
        
        const newNameRaw = nameInput.value.trim();
        const newFormat = formatInput.value.trim();
        
        if (styleManager && styleManager.addCustomStyle(newNameRaw, newFormat)) {
            nameInput.value = '';
            formatInput.value = '';
        }
    }

    async handlePreviewInputChange(event) {
        try {
            const module = await import('./preview/BibliographyGenerator.js');
            const generator = new module.BibliographyGenerator();
            generator.handlePreviewInputChange(event);
        } catch (error) {
            console.error('Error handling preview input change:', error);
        }
    }

    async generateBibliography() {
        try {
            const module = await import('./preview/BibliographyGenerator.js');
            const generator = new module.BibliographyGenerator();
            return generator.generateBibliography();
        } catch (error) {
            console.error('Error generating bibliography:', error);
            return 0;
        }
    }

    // FIXED: Add cleanup method
    cleanup() {
        console.log('Cleaning up Bibliography Manager...');
        if (csvManager) {
            csvManager.cleanup();
        }
    }
}

// FIXED: Make app globally accessible for debugging
let app;

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Bibliography Manager initializing...');
    app = new BibliographyManager();
    await app.init();
    console.log('Bibliography Manager initialized successfully');
    
    // FIXED: Make app accessible globally for debugging
    window.bibliographyApp = app;
    
    // REMOVED: Manual tab switching - let TabManager handle it
    // The tabManager.js should handle all tab switching
});

