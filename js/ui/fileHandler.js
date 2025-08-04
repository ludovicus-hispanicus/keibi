import { globalState } from '../state/globalState.js';
import { CSVParser } from '../utils/csvParser.js';

// File upload and processing
export class FileHandler {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const csvFileInput = document.getElementById('csvFile');
        if (csvFileInput) {
            csvFileInput.addEventListener('change', (event) => this.handleFileUpload(event));
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        const uploadStatus = document.getElementById('uploadStatus');
        const csvPreview = document.getElementById('csvPreview');
        
        if (!file) { 
            if (uploadStatus) uploadStatus.textContent = 'No file selected.'; 
            return; 
        }
        
        if (!uploadStatus || !csvPreview) { 
            console.error("UI elements for upload missing"); 
            return; 
        }
        
        this.updateUploadStatus('Loading...', 'loading');
        this.resetUIState();

        const reader = new FileReader();
        reader.onload = (e) => this.processFileContent(e.target.result, file.name, uploadStatus, csvPreview);
        reader.onerror = () => this.updateUploadStatus('Error reading file.', 'error');
        reader.readAsText(file);
    }

    updateUploadStatus(message, type = 'info') {
        const uploadStatus = document.getElementById('uploadStatus');
        if (!uploadStatus) return;
        
        uploadStatus.textContent = message;
        uploadStatus.className = `status text-sm mt-2 ${this.getStatusClass(type)}`;
    }

    getStatusClass(type) {
        switch (type) {
            case 'success': return 'status-success';
            case 'error': return 'status-error';
            case 'loading': return 'text-gray-600';
            default: return 'text-gray-600';
        }
    }

    resetUIState() {
        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.innerHTML = '<p class="text-gray-500 italic">Click a cell in the table to see its full content here.</p>';
        }
        globalState.currentlySelectedCell = { rowIndex: -1, header: null, element: null };
    }

    async processFileContent(content, fileName, uploadStatus, csvPreview) {
        try {
            const parseResult = CSVParser.parseCSV(content);
            this.validateParseResult(parseResult, content);
            
            this.updateGlobalState(parseResult);
            this.updateUI(fileName, parseResult, uploadStatus, csvPreview);
            await this.handlePostProcessing();
            
        } catch (error) {
            this.handleProcessingError(error, uploadStatus);
        }
    }

    validateParseResult(parseResult, content) {
        if (!parseResult || !parseResult.entries || !parseResult.headers) {
            throw new Error("CSV parsing failed.");
        }
        
        if (parseResult.entries.length === 0 && content.trim() !== '') {
            const lines = content.trim().split(/\r\n|\n/);
            if (lines.length === 0) {
                throw new Error("CSV file is empty.");
            }
        } else if (parseResult.entries.length === 0 && content.trim() === '') {
            throw new Error("CSV file is empty.");
        }
    }

    updateGlobalState(parseResult) {
        globalState.csvData = parseResult.entries;
        globalState.csvHeaders = parseResult.headers;
        globalState.editedCsvData = JSON.parse(JSON.stringify(parseResult.entries));
        globalState.originalCsvData = JSON.parse(JSON.stringify(parseResult.entries));
    }

    updateUI(fileName, parseResult, uploadStatus, csvPreview) {
        csvPreview.innerHTML = `<strong>Preview:</strong> ${parseResult.headers.join(', ')} (${parseResult.entries.length} entries).`;
        uploadStatus.textContent = `Loaded: ${fileName}`;
        uploadStatus.className = 'status status-success';
    }

    async handlePostProcessing() {
        try {
            // Update entry types dropdown
            const entryTypeModule = await import('../rightColumn/entryTypeManager.js');
            const manager = new entryTypeModule.EntryTypeManager();
            manager.updateEntryTypesDropdown();
            
            // Generate initial bibliography
            const bibliographyModule = await import('../preview/BibliographyGenerator.js');
            const generator = new bibliographyModule.BibliographyGenerator();
            generator.generateBibliography();
            
            // Handle tab switching
            const activeCSVTab = document.querySelector('.tab-button[data-tab="csv-editor"].active');
            if (activeCSVTab) {
                const csvModule = await import('../csvEditor/csvManager.js');
                const csvManager = new csvModule.CSVManager();
                csvManager.displayCSVTable();
            } else {
                const previewTabButton = document.querySelector('.tab-button[data-tab="preview"]');
                if (previewTabButton) previewTabButton.click();
            }
        } catch (error) {
            console.error('Error in post-processing:', error);
        }
    }

    handleProcessingError(error, uploadStatus) {
        console.error('Error processing CSV file:', error);
        uploadStatus.textContent = `Error: ${error.message}`;
        uploadStatus.className = 'status status-error';
        
        if (globalState.outputDiv) {
            globalState.outputDiv.innerHTML = `<div class="text-red-500 p-2">Failed: ${error.message}</div>`;
        }
        
        this.clearGlobalState();
        this.clearTableUI();
    }

    clearGlobalState() {
        globalState.csvData = [];
        globalState.editedCsvData = [];
        globalState.originalCsvData = [];
        globalState.csvHeaders = [];
    }

    clearTableUI() {
        const tableBody = document.getElementById('csvTableBody');
        const tableHeader = document.getElementById('csvTableHeader');
        
        if (tableBody) tableBody.innerHTML = '';
        if (tableHeader) tableHeader.innerHTML = '';
        
        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.innerHTML = '<p class="text-gray-500 italic">CSV data could not be loaded.</p>';
            globalState.previewerInputField = null;
        }
    }
}