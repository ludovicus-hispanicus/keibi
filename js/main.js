// js/main.js (Updated with TypeError fix, Ctrl+S/Cmd+S, and proofing cleanup)
import { globalState } from './state/globalState.js';

// Import all the managers/handlers we need
let styleManager, tabManager, fileHandler, previewContextMenu, csvNavigation, exportManager;
let csvManager = null;

// Main application class
class BibliographyManager {
    constructor() {
        this.managersInitialized = false;
    }

    async init() {
        this.initializeDOM();
        await this.initializeManagers();
        this.setupEventListeners();
        this.loadInitialData();
        this.initializeUI();
        this.setupKeyboardShortcuts();
    }

    initializeDOM() {
        globalState.outputDiv = document.getElementById('bibliographyOutput');
        globalState.bibliographyOutputGlobal = document.getElementById('bibliographyOutput');
        globalState.entryCount = document.getElementById('entryCount');
        globalState.styleEditorsContainer = document.getElementById('styleEditorsContainer');
        globalState.formatPreviewPanel = document.getElementById('formatPreviewPanel');
        globalState.entryTypesContainerEl = document.getElementById('entryTypesContainer');
        globalState.stylePreviewMainDisplay = document.getElementById('stylePreviewMainDisplay');
        globalState.csvCellDetailPreviewer = document.getElementById('csvCellDetailPreviewer');

        if (!globalState.outputDiv || !globalState.entryCount || !globalState.styleEditorsContainer ||
            !globalState.formatPreviewPanel || !globalState.stylePreviewMainDisplay || !globalState.csvCellDetailPreviewer) {
            console.error("CRITICAL: Core UI elements missing.");
            const uploadStatus = document.getElementById('uploadStatus');
            if (uploadStatus) uploadStatus.innerHTML = '<span class="status-error">Error: Core UI missing.</span>';
        }

        if (globalState.bibliographyOutputGlobal) {
            globalState.bibliographyOutputGlobal.addEventListener('contextmenu', (e) => {
                if (previewContextMenu) previewContextMenu.showContextMenu(e);
            });
            // Removed 'input' event listener to avoid TypeError
        }

        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.innerHTML = '<p class="text-gray-500 italic">Click a cell in the table to see its full content here.</p>';
        }

        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    async initializeManagers() {
        try {
            const [
                StyleManagerModule,
                TabManagerModule,
                FileHandlerModule,
                PreviewContextMenuModule,
                CSVNavigationModule,
                ExportManagerModule,
                CSVManagerModule,
                WordExporterModule
            ] = await Promise.all([
                import('./styles/styleManager.js'),
                import('./ui/tabManager.js'),
                import('./ui/fileHandler.js'),
                import('./preview/contextMenu.js'),
                import('./csvEditor/navigation.js'),
                import('./rightColumn/exportManager.js'),
                import('./csvEditor/csvManager.js'),
                import('./export/wordExporter.js')
            ]);

            styleManager = new StyleManagerModule.StyleManager();
            tabManager = new TabManagerModule.TabManager();
            fileHandler = new FileHandlerModule.FileHandler();
            previewContextMenu = new PreviewContextMenuModule.PreviewContextMenu();
            csvNavigation = new CSVNavigationModule.CSVNavigation();
            exportManager = new ExportManagerModule.ExportManager();
            csvManager = new CSVManagerModule.CSVManager();
            globalState.csvManager = csvManager;

            WordExporterModule.addWordExportButton();
            this.managersInitialized = true;
            console.log('All managers initialized successfully');
        } catch (error) {
            console.error('Error initializing managers:', error);
        }
    }

    setupExportDropdowns() {
        const dropdownConfigs = [
            {
                triggerBtn: '#exportDropdownBtn',
                menu: '#exportDropdownMenu',
                htmlBtn: '#exportHTMLBtn',
                wordBtn: '#exportWordBtn',
                csvBtn: '#exportCSVBtn'
            },
            {
                triggerBtn: '#exportDropdownBtn2',
                menu: '#exportDropdownMenu2',
                htmlBtn: '#exportHTMLBtn2',
                wordBtn: '#exportWordBtn2',
                csvBtn: '#exportCSVBtn2'
            }
        ];

        dropdownConfigs.forEach(config => {
            const triggerBtn = document.querySelector(config.triggerBtn);
            const menu = document.querySelector(config.menu);
            const htmlBtn = document.querySelector(config.htmlBtn);
            const wordBtn = document.querySelector(config.wordBtn);
            const csvBtn = document.querySelector(config.csvBtn);

            if (!triggerBtn || !menu) return;

            triggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.export-dropdown-menu').forEach(otherMenu => {
                    if (otherMenu !== menu) {
                        otherMenu.style.display = 'none';
                    }
                });
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            });

            if (htmlBtn) {
                htmlBtn.addEventListener('click', () => {
                    menu.style.display = 'none';
                    if (exportManager) exportManager.exportBibliographyAsHTML();
                });
            }
            if (wordBtn) {
                wordBtn.addEventListener('click', async () => {
                    menu.style.display = 'none';
                    const { WordExporter } = await import('./export/wordExporter.js');
                    const exporter = new WordExporter();
                    await exporter.exportBibliographyAsWord();
                });
            }
            if (csvBtn) {
                csvBtn.addEventListener('click', () => {
                    menu.style.display = 'none';
                    if (exportManager) exportManager.exportCSV();
                });
            }
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.export-dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        });
    }

    setupEventListeners() {
        const sortOption = document.getElementById('sortOption');
        if (sortOption) {
            sortOption.addEventListener('change', () => {
                if (globalState.csvData.length > 0) {
                    this.generateBibliography();
                }
            });
        }

        this.setupExportDropdowns();

        const saveButtons = document.querySelectorAll('#saveFileBtn, #saveFileBtn2');
        saveButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                console.log('💾 Save button clicked - attempting to save to file system');
                
                try {
                    if (globalState.csvManager && globalState.csvManager.gridApi && !globalState.csvManager.gridApi.isDestroyed()) {
                        console.log('📊 Syncing grid data before save...');
                        const currentData = [];
                        globalState.csvManager.gridApi.forEachNode(node => {
                            if (node.data) {
                                currentData.push(node.data);
                            }
                        });
                        globalState.csvData = [...currentData];
                        globalState.editedCsvData = [...currentData];
                    }

                    if (window.saveToOriginalFile && typeof window.saveToOriginalFile === 'function') {
                        console.log('💾 Using File System API to save...');
                        const saved = await window.saveToOriginalFile();
                        
                        if (saved) {
                            console.log('✅ File saved successfully to disk!');
                            globalState.originalCsvData = JSON.parse(JSON.stringify(globalState.editedCsvData));
                            const module = await import('./preview/BibliographyGenerator.js');
                            const generator = new module.BibliographyGenerator();
                            generator.generateBibliography();
                        } else {
                            console.log('⚠️ Save was cancelled by user');
                        }
                    } else {
                        console.log('⚠️ File System API not available, using download fallback');
                        if (exportManager && exportManager.exportCSV) {
                            exportManager.exportCSV();
                            alert('File System API not supported. File has been downloaded instead.');
                        } else {
                            alert('Save functionality not available');
                        }
                    }
                } catch (error) {
                    console.error('💥 Error saving file:', error);
                    alert('Error saving file: ' + error.message);
                }
            });
        });

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

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', async (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                console.log('Ctrl+S/Cmd+S pressed - attempting to save');
                
                try {
                    if (globalState.csvManager && globalState.csvManager.gridApi && !globalState.csvManager.gridApi.isDestroyed()) {
                        console.log('📊 Syncing grid data before save...');
                        globalState.csvManager.gridApi.stopEditing();
                        const currentData = [];
                        globalState.csvManager.gridApi.forEachNode(node => {
                            if (node.data) {
                                currentData.push(node.data);
                            }
                        });
                        globalState.csvData = [...currentData];
                        globalState.editedCsvData = [...currentData];
                    }

                    if (window.saveToOriginalFile) {
                        const saved = await window.saveToOriginalFile();
                        if (saved) {
                            console.log('✅ File saved via keyboard shortcut');
                        } else {
                            console.log('⚠️ Save cancelled by user');
                        }
                    } else {
                        console.warn('Save function not available');
                        alert('Save functionality not available');
                    }
                } catch (error) {
                    console.error('Error saving via shortcut:', error);
                    alert('Error saving: ' + error.message);
                }
            }
        });
    }

    loadInitialData() {
        if (styleManager) {
            styleManager.loadSavedStyles();
        }
    }

    initializeUI() {
        if (csvNavigation) {
            csvNavigation.enhanceCellNavigation();
            csvNavigation.addColumnHoverEffect();
        }
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

    cleanup() {
        console.log('Cleaning up Bibliography Manager...');
        if (csvManager) {
            csvManager.cleanup();
        }
        localStorage.setItem('proofingStates', JSON.stringify(globalState.proofingStates));
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Bibliography Manager initializing...');
    const app = new BibliographyManager();
    await app.init();
    console.log('Bibliography Manager initialized successfully');
    
    window.bibliographyApp = app;
});