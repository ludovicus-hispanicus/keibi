import { DEFAULT_STYLE_TEMPLATES } from '../config/constants.js';

// Global state management
class GlobalState {
    constructor() {
        // DOM elements
        this.outputDiv = null;
        this.entryCount = null;
        this.styleEditorsContainer = null;
        this.formatPreviewPanel = null;
        this.entryTypesContainerEl = null;
        this.stylePreviewMainDisplay = null;
        this.csvCellDetailPreviewer = null;
        this.currentFileHandle = null;

        // Data
        this.csvData = [];
        this.csvHeaders = [];
        this.originalCsvData = [];
        this.editedCsvData = [];
        
        // UI state
        this.currentlySelectedCell = { rowIndex: -1, header: null, element: null };
        this.previewerInputField = null;
        this.customContextMenu = null;
        this.bibliographyOutputGlobal = null;
        this.savedSelectionRange = null;
        
        // Style templates - NOW PROPERLY IMPORTING DEFAULT_STYLE_TEMPLATES
        this.styleTemplates = { ...DEFAULT_STYLE_TEMPLATES };
    }

    // Getters and setters for state management
    setCsvData(data) {
        this.csvData = data;
        this.editedCsvData = JSON.parse(JSON.stringify(data));
        this.originalCsvData = JSON.parse(JSON.stringify(data));
    }

    getCsvData() {
        return this.csvData;
    }

    setStyleTemplates(templates) {
        this.styleTemplates = templates;
    }

    getStyleTemplates() {
        return this.styleTemplates;
    }

    // Reset to defaults
    resetStyleTemplates() {
        this.styleTemplates = { ...DEFAULT_STYLE_TEMPLATES };
    }
}

export const globalState = new GlobalState();