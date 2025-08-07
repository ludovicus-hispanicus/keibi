// js/state/globalState.js (Production-ready with minimal logs)
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
        
        // Style templates
        this.styleTemplates = { ...DEFAULT_STYLE_TEMPLATES };
        
        // Proofing states
        const proofingData = localStorage.getItem('proofingStates');
        try {
            this.proofingStates = proofingData ? JSON.parse(proofingData) : {};
        } catch (e) {
            console.error('Invalid proofingStates in localStorage:', e);
            this.proofingStates = {};
            localStorage.setItem('proofingStates', JSON.stringify(this.proofingStates));
        }
    }

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

    resetStyleTemplates() {
        this.styleTemplates = { ...DEFAULT_STYLE_TEMPLATES };
    }
}

export function updateEntryCount(count) {
    const entryCountElements = [
        document.getElementById('entryCount'),
        document.getElementById('csvEntryCount')
    ];
    
    entryCountElements.forEach(element => {
        if (element) {
            element.textContent = count > 0 ? `${count} entries` : '';
        }
    });
}

export const globalState = new GlobalState();