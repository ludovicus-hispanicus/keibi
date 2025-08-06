// File System Access API Integration for KeiBi Bibliography Manager
// This file adds direct file system access capabilities to the app

// Import the new modular functions
import { CSVParser } from './js/utils/csvParser.js';
import { BibliographyGenerator } from './js/preview/BibliographyGenerator.js';
import { globalState } from './js/state/globalState.js';

// Global variable to store the file handle for saving back to the same file
let currentFileHandle = null;

// Check if browser supports the File System Access API
function isFSAPISupported() {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
}

// Initialize the file system integration
function initFileSystemIntegration() {
    // Check for API support
    const isSupported = isFSAPISupported();
    console.log("File System API supported:", isSupported);
    
    // Show appropriate UI elements
    const legacyFileInput = document.getElementById('legacyFileInput');
    const fsApiButtons = document.getElementById('fsApiButtons');
    
    if (isSupported && legacyFileInput && fsApiButtons) {
        // Show File System API buttons and hide traditional file input
        legacyFileInput.style.display = 'none';
        fsApiButtons.classList.remove('hidden');
        
        // Set up event listeners for File System API buttons
        document.getElementById('openFileBtn')?.addEventListener('click', openCSVFile);
        document.getElementById('saveFileBtn')?.addEventListener('click', saveToOriginalFile);
        document.getElementById('saveAsBtn')?.addEventListener('click', saveCSVAs);
        
        // Update the buttons in the CSV editor tab
        const saveCSVBtn = document.getElementById('saveCSVBtn');
        if (saveCSVBtn) {
            saveCSVBtn.textContent = 'Save';
            saveCSVBtn.addEventListener('click', saveToOriginalFile);
        }
        
        const exportCSVBtn = document.getElementById('exportCSVBtn');
        if (exportCSVBtn) {
            exportCSVBtn.textContent = 'Save As...';
            exportCSVBtn.addEventListener('click', saveCSVAs);
        }
    } else if (legacyFileInput) {
        // Show the legacy file input and add a compatibility note
        legacyFileInput.style.display = 'block';
        
        const note = document.createElement('div');
        note.className = 'text-xs text-yellow-600 mt-1';
        note.textContent = 'Note: Direct file editing not supported in this browser. Files will be downloaded rather than saved directly.';
        legacyFileInput.appendChild(note);
    }
}

// Function to open a file using the File System Access API
async function openCSVFile() {
    try {
        // Show the file picker
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'CSV Files',
                accept: {'text/csv': ['.csv']}
            }],
            multiple: false
        });
        
        // Store the file handle for later saving
        currentFileHandle = fileHandle;
        
        // Get the file
        const file = await fileHandle.getFile();
        
        // Read the file contents
        const contents = await file.text();
        
        // Update UI
        const fileNameDisplay = document.getElementById('uploadStatus');
        if (fileNameDisplay) {
            fileNameDisplay.innerHTML = `
                <div class="flex items-center">
                    <span class="text-green-600">Opened: ${file.name}</span>
                </div>
            `;
        }

        
        // Parse CSV and update application state
        await processCSVContent(contents);
        
        return true;
    } catch (error) {
        console.error('Error opening file:', error);
        
        // Check if it's because the API is not supported
        if (error.name === 'TypeError' && !window.showOpenFilePicker) {
            alert('Your browser does not support direct file access. Please use Chrome, Edge, or another modern browser.');
        } else if (error.name === 'AbortError') {
            // User cancelled the file picker, no need to show error
            console.log("File picker cancelled by user");
            return false;
        } else {
            alert('Error opening file: ' + error.message);
        }
        
        return false;
    }
}

// Function to save back to the original file
async function saveToOriginalFile() {
    try {
        if (!currentFileHandle) {
            console.log("No file handle, redirecting to Save As");
            return await saveCSVAs(); // If no file handle, do a "Save As" instead
        }
        
        console.log("Saving to original file:", await currentFileHandle.getFile());
        
        // Generate CSV content
        let csvContent = generateCSVContent();
        
        // Create a writable stream
        const writable = await currentFileHandle.createWritable();
        
        // Write the file
        await writable.write(csvContent);
        
        // Close the file
        await writable.close();
        
        // Update application state to match saved state
        globalState.originalCsvData = JSON.parse(JSON.stringify(globalState.editedCsvData));
        
        // Update UI
        const statusElement = document.getElementById('uploadStatus');
        if (statusElement) {
            const filename = (await currentFileHandle.getFile()).name;
            statusElement.innerHTML = `
                <div class="flex items-center">
                    <span class="text-green-600">Saved: ${filename}</span>
                </div>
            `;
        }

        
        alert('File saved successfully!');
        
        // Update bibliography view using new modular approach
        const generator = new BibliographyGenerator();
        generator.generateBibliography();
        
        return true;
    } catch (error) {
        console.error('Error saving file:', error);
        alert('Error saving file: ' + error.message);
        return false;
    }
}

// Function to save CSV as a new file
async function saveCSVAs() {
    try {
        // Get suggested filename from current file or default
        const suggestedName = currentFileHandle ? 
            (await currentFileHandle.getFile()).name : 'bibliography.csv';
        
        console.log("Save As dialog with suggested name:", suggestedName);
        
        // Show the save file picker
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: suggestedName,
            types: [{
                description: 'CSV Files',
                accept: {'text/csv': ['.csv']}
            }]
        });
        
        // Generate CSV content
        let csvContent = generateCSVContent();
        
        // Create a writable stream
        const writable = await fileHandle.createWritable();
        
        // Write the file
        await writable.write(csvContent);
        
        // Close the file
        await writable.close();
        
        // Update current file handle
        currentFileHandle = fileHandle;
        
        // Update application state
        globalState.originalCsvData = JSON.parse(JSON.stringify(globalState.editedCsvData));
        
        // Update UI
        const file = await fileHandle.getFile();
        const fileNameDisplay = document.getElementById('uploadStatus');
        if (fileNameDisplay) {
            fileNameDisplay.innerHTML = `
                <div class="flex items-center">
                    <span class="text-green-600">Saved: ${file.name}</span>
                </div>
            `;
        }
        
        alert('File saved successfully!');
        return true;
    } catch (error) {
        console.error('Error saving file:', error);
        
        if (error.name === 'AbortError') {
            // User cancelled the file picker, no need to show error
            console.log("Save As canceled by user");
            return false;
        } else {
            alert('Error saving file: ' + error.message);
            return false;
        }
    }
}

// Helper function to generate CSV content from current data
async function generateCSVContent() {
    const { globalState } = await import('./js/state/globalState.js');
    const { CSVParser } = await import('./js/utils/csvParser.js');
    
    if (!globalState.editedCsvData.length) {
        throw new Error('No CSV data to export.');
    }
    
    if (!globalState.csvHeaders || globalState.csvHeaders.length === 0) {
        const allHeaders = new Set();
        globalState.editedCsvData.forEach(entry => Object.keys(entry).forEach(key => allHeaders.add(key)));
        globalState.csvHeaders = Array.from(allHeaders);
        
        if (!globalState.csvHeaders.length) {
            throw new Error('CSV headers undetermined.');
        }
    }
    
    // Use Papa Parse to generate clean CSV
    return CSVParser.generateCSV(globalState.csvHeaders, globalState.editedCsvData);
}

// Process CSV content (compatible with existing code)
async function processCSVContent(content) {
    try {
        const csvPreview = document.getElementById('csvPreview');
        
        // Use the new modular CSVParser instead of parseCSV function
        const parseResult = CSVParser.parseCSV(content);
        if (!parseResult || !parseResult.entries || !parseResult.headers) {
            throw new Error("CSV parsing failed.");
        }
        
        // Check for empty file or just headers
        if (parseResult.entries.length === 0 && content.trim() !== '') {
            const lines = content.trim().split(/\r\n|\n/);
            if (lines.length === 1 && parseResult.headers.length > 0 && 
                lines[0].split(',').length === parseResult.headers.length) {
                // Only header
            } else if (lines.length === 0) {
                throw new Error("CSV file is empty.");
            }
        } else if (parseResult.entries.length === 0 && content.trim() === '') {
            throw new Error("CSV file is empty.");
        }

        // Update application state using globalState
        globalState.csvData = parseResult.entries;
        globalState.csvHeaders = parseResult.headers;
        globalState.editedCsvData = JSON.parse(JSON.stringify(parseResult.entries));
        globalState.originalCsvData = JSON.parse(JSON.stringify(parseResult.entries));

        // Update preview
        if (csvPreview) {
            csvPreview.innerHTML = `<strong>Preview:</strong> ${globalState.csvHeaders.join(', ')} (${globalState.csvData.length} entries).`;
        }

        // Update UI components using new modular approach
        try {
            const entryTypeModule = await import('./js/rightColumn/entryTypeManager.js');
            const manager = new entryTypeModule.EntryTypeManager();
            manager.updateEntryTypesDropdown();
        } catch (error) {
            console.warn('Error updating entry types:', error);
        }
        
        // Generate bibliography using new modular approach
        const generator = new BibliographyGenerator();
        generator.generateBibliography();

        // Switch to appropriate view
        const activeCSVTab = document.querySelector('.tab-button[data-tab="csv-editor"].active');
        if (activeCSVTab) { 
            // If CSV editor tab is active, refresh it
            try {
                const csvModule = await import('./js/csvEditor/csvManager.js');
                const csvManager = new csvModule.CSVManager();
                csvManager.displayCSVTable();
            } catch (error) {
                console.warn('Error displaying CSV table:', error);
            }
        } else { 
            // Otherwise, switch to preview tab
            const previewTabButton = document.querySelector('.tab-button[data-tab="preview"]');
            if (previewTabButton) previewTabButton.click();
        }
        
        return true;
    } catch (error) {
        console.error('Error processing CSV content:', error);
        
        const uploadStatus = document.getElementById('uploadStatus');
        const outputDiv = document.getElementById('bibliographyOutput');
        
        if (uploadStatus) {
            uploadStatus.textContent = `Error: ${error.message}`;
            uploadStatus.className = 'status status-error text-sm mt-2';
        }
        
        if (outputDiv) {
            outputDiv.innerHTML = `<div class="text-red-500 p-2">Failed: ${error.message}</div>`;
        }
        
        // Reset application state using globalState
        globalState.csvData = []; 
        globalState.editedCsvData = []; 
        globalState.originalCsvData = []; 
        globalState.csvHeaders = [];
        
        // Clear UI
        if (document.getElementById('csvTableBody')) {
            document.getElementById('csvTableBody').innerHTML = '';
        }
        if (document.getElementById('csvTableHeader')) {
            document.getElementById('csvTableHeader').innerHTML = '';
        }
        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.innerHTML = 
                '<p class="text-gray-500 italic">CSV data could not be loaded.</p>';
            globalState.previewerInputField = null;
        }
        
        // Update UI components using new modular approach
        try {
            const entryTypeModule = await import('./js/rightColumn/entryTypeManager.js');
            const manager = new entryTypeModule.EntryTypeManager();
            manager.updateEntryTypesDropdown();
        } catch (error) {
            console.warn('Error updating entry types after error:', error);
        }
        
        const generator = new BibliographyGenerator();
        generator.generateBibliography();
        
        return false;
    }
}

// Handle compatibility with existing exportCSV and saveCSVChanges functions
// Replaces them if available
if (typeof window.exportCSV === 'function') {
    const originalExportCSV = window.exportCSV;
    window.exportCSV = function() {
        if (isFSAPISupported()) {
            return saveCSVAs();
        } else {
            return originalExportCSV();
        }
    };
}

if (typeof window.saveCSVChanges === 'function') {
    const originalSaveCSVChanges = window.saveCSVChanges;
    window.saveCSVChanges = function() {
        if (isFSAPISupported() && currentFileHandle) {
            return saveToOriginalFile();
        } else {
            return originalSaveCSVChanges();
        }
    };
}

// Initialize when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for other scripts to initialize first
    setTimeout(initFileSystemIntegration, 100);
    
    // Also handle the traditional file input for compatibility
    const csvFileInput = document.getElementById('csvFile');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                processCSVContent(e.target.result);
                
                // Update the status to show the filename
                const uploadStatus = document.getElementById('uploadStatus');
                if (uploadStatus) {
                    uploadStatus.textContent = `Loaded: ${file.name}`;
                    uploadStatus.className = 'status status-success text-sm mt-2';
                }
            };
            reader.readAsText(file);
        });
    }
});

// Export functions for use by other modules
window.openCSVFile = openCSVFile;
window.saveToOriginalFile = saveToOriginalFile;
window.saveCSVAs = saveCSVAs;