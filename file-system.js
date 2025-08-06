// js/file-system.js (Fixed Proofed column and added logging)
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
    const isSupported = isFSAPISupported();
    console.log("File System API supported:", isSupported);
    
    const legacyFileInput = document.getElementById('legacyFileInput');
    const fsApiButtons = document.getElementById('fsApiButtons');
    
    if (isSupported && legacyFileInput && fsApiButtons) {
        legacyFileInput.style.display = 'none';
        fsApiButtons.classList.remove('hidden');
        
        document.getElementById('openFileBtn')?.addEventListener('click', openCSVFile);
        document.getElementById('saveFileBtn')?.addEventListener('click', saveToOriginalFile);
        document.getElementById('saveAsBtn')?.addEventListener('click', saveCSVAs);
        
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
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'CSV Files',
                accept: {'text/csv': ['.csv']}
            }],
            multiple: false
        });
        
        currentFileHandle = fileHandle;
        
        const file = await fileHandle.getFile();
        
        const contents = await file.text();
        
        const fileNameDisplay = document.getElementById('uploadStatus');
        if (fileNameDisplay) {
            fileNameDisplay.innerHTML = `
                <div class="flex items-center">
                    <span class="text-green-600">Opened: ${file.name}</span>
                </div>
            `;
        }
        
        // Reset proofing states when loading a new CSV
        globalState.proofingStates = {};
        localStorage.setItem('proofingStates', JSON.stringify({}));
        console.log('Proofing states reset for new CSV');
        
        await processCSVContent(contents);
        
        return true;
    } catch (error) {
        console.error('Error opening file:', error);
        
        if (error.name === 'TypeError' && !window.showOpenFilePicker) {
            alert('Your browser does not support direct file access. Please use Chrome, Edge, or another modern browser.');
        } else if (error.name === 'AbortError') {
            console.log("File picker cancelled by user");
            return false;
        } else {
            alert('Error opening file: ' + error.message);
        }
        
        return false;
    }
}

// Function to validate CSV content
function validateCSVContent(csvContent, headers) {
    if (typeof csvContent !== 'string') {
        console.error('Invalid CSV content: not a string');
        return false;
    }
    if (csvContent.length < headers.length) {
        console.error('Invalid CSV content: too short to contain headers');
        return false;
    }
    if (!headers.every(header => csvContent.includes(header))) {
        console.error('Invalid CSV content: missing expected headers');
        return false;
    }
    return true;
}

// Function to save back to the original file
async function saveToOriginalFile() {
    try {
        if (!currentFileHandle) {
            console.log("No file handle, redirecting to Save As");
            return await saveCSVAs();
        }
        
        const file = await currentFileHandle.getFile();
        console.log("💾 Saving to original file:", file);
        
        // Sync from grid if it exists
        if (globalState.csvManager && globalState.csvManager.gridApi && !globalState.csvManager.gridApi.isDestroyed()) {
            console.log("📊 Syncing current grid data before save...");
            globalState.csvManager.gridApi.stopEditing();
            const currentData = [];
            globalState.csvManager.gridApi.forEachNode(node => {
                if (node.data) {
                    currentData.push(node.data);
                }
            });
            globalState.csvData = [...currentData];
            globalState.editedCsvData = JSON.parse(JSON.stringify(currentData)); // Deep copy
        }
        
        // Add Proofed column to editedCsvData
        globalState.editedCsvData.forEach((row, index) => {
            row.Proofed = globalState.proofingStates[index] ? 'true' : 'false';
            console.log(`Set Proofed for row ${index}: ${row.Proofed}`);
        });
        
        // Ensure Proofed is in headers
        if (!globalState.csvHeaders.includes('Proofed')) {
            globalState.csvHeaders.push('Proofed');
            console.log('Added Proofed to csvHeaders:', globalState.csvHeaders);
        }
        
        // Generate CSV content
        let csvContent = await generateCSVContent();
        
        // Validate CSV content
        if (!validateCSVContent(csvContent, globalState.csvHeaders)) {
            throw new Error('Generated CSV content is invalid');
        }
        
        // Log CSV content preview for debugging
        console.log('csvContent type:', typeof csvContent, 'preview:', csvContent.slice(0, 200));
        
        // Create a writable stream
        const writable = await currentFileHandle.createWritable();
        
        // Write the file
        await writable.write({
            type: 'write',
            data: csvContent
        });
        
        // Close the file
        await writable.close();
        
        // Update application state
        globalState.originalCsvData = JSON.parse(JSON.stringify(globalState.editedCsvData));
        
        // Update UI
        const statusElement = document.getElementById('uploadStatus');
        if (statusElement) {
            const filename = file.name;
            statusElement.innerHTML = `
                <div class="flex items-center">
                    <span class="text-green-600">Saved: ${filename}</span>
                </div>
            `;
        }
        
        console.log('✅ File successfully saved to disk!');
        
        // Regenerate bibliography
        const generator = new BibliographyGenerator();
        generator.generateBibliography();
        
        return true;
    } catch (error) {
        console.error('💥 Error saving file:', error);
        alert('Error saving file: ' + error.message);
        return false;
    }
}

// Function to save CSV as a new file
async function saveCSVAs() {
    try {
        const suggestedName = currentFileHandle ?
            (await currentFileHandle.getFile()).name : 'bibliography.csv';
        
        console.log("Save As dialog with suggested name:", suggestedName);
        
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: suggestedName,
            types: [{
                description: 'CSV Files',
                accept: {'text/csv': ['.csv']}
            }]
        });
        
        // Sync from grid if it exists
        if (globalState.csvManager && globalState.csvManager.gridApi && !globalState.csvManager.gridApi.isDestroyed()) {
            console.log("📊 Syncing current grid data before Save As...");
            globalState.csvManager.gridApi.stopEditing();
            const currentData = [];
            globalState.csvManager.gridApi.forEachNode(node => {
                if (node.data) {
                    currentData.push(node.data);
                }
            });
            globalState.csvData = [...currentData];
            globalState.editedCsvData = JSON.parse(JSON.stringify(currentData)); // Deep copy
        }
        
        // Add Proofed column to editedCsvData
        globalState.editedCsvData.forEach((row, index) => {
            row.Proofed = globalState.proofingStates[index] ? 'true' : 'false';
            console.log(`Set Proofed for row ${index}: ${row.Proofed}`);
        });
        
        // Ensure Proofed is in headers
        if (!globalState.csvHeaders.includes('Proofed')) {
            globalState.csvHeaders.push('Proofed');
            console.log('Added Proofed to csvHeaders:', globalState.csvHeaders);
        }
        
        // Generate CSV content
        let csvContent = await generateCSVContent();
        
        // Validate CSV content
        if (!validateCSVContent(csvContent, globalState.csvHeaders)) {
            throw new Error('Generated CSV content is invalid');
        }
        
        // Log CSV content preview for debugging
        console.log('csvContent type:', typeof csvContent, 'preview:', csvContent.slice(0, 200));
        
        // Create a writable stream
        const writable = await fileHandle.createWritable();
        
        // Write the file
        await writable.write({
            type: 'write',
            data: csvContent
        });
        
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
        
        console.log('✅ File saved as new file successfully!');
        alert('File saved successfully!');
        return true;
    } catch (error) {
        console.error('Error saving file:', error);
        
        if (error.name === 'AbortError') {
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
    if (!globalState.editedCsvData.length) {
        throw new Error('No CSV data to export.');
    }
    
    if (!globalState.csvHeaders || globalState.csvHeaders.length === 0) {
        const allHeaders = new Set();
        globalState.editedCsvData.forEach(entry => Object.keys(entry).forEach(key => allHeaders.add(key)));
        globalState.csvHeaders = Array.from(allHeaders);
        
        // Ensure Proofed column is included
        if (!globalState.csvHeaders.includes('Proofed')) {
            globalState.csvHeaders.push('Proofed');
            console.log('Added Proofed to csvHeaders in generateCSVContent:', globalState.csvHeaders);
        }
        
        if (!globalState.csvHeaders.length) {
            throw new Error('CSV headers undetermined.');
        }
    }
    
    // Log headers and sample data for debugging
    console.log('Generating CSV with headers:', globalState.csvHeaders);
    console.log('Sample editedCsvData:', globalState.editedCsvData.slice(0, 2));
    
    // Use Papa Parse to generate clean CSV
    const csvContent = CSVParser.generateCSV(globalState.csvHeaders, globalState.editedCsvData);
    console.log('Generated CSV content length:', csvContent.length);
    return csvContent;
}

// Process CSV content (compatible with existing code)
async function processCSVContent(content) {
    try {
        const csvPreview = document.getElementById('csvPreview');
        
        const parseResult = CSVParser.parseCSV(content);
        if (!parseResult || !parseResult.entries || !parseResult.headers) {
            throw new Error("CSV parsing failed.");
        }
        
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
        
        globalState.csvData = parseResult.entries;
        globalState.csvHeaders = parseResult.headers;
        globalState.editedCsvData = JSON.parse(JSON.stringify(parseResult.entries));
        globalState.originalCsvData = JSON.parse(JSON.stringify(parseResult.entries));
        
        // Load Proofed column into proofingStates
        globalState.proofingStates = {};
        globalState.editedCsvData.forEach((row, index) => {
            if (row.Proofed === 'true' || row.Proofed === true) {
                globalState.proofingStates[index] = true;
                console.log(`Loaded Proofed for row ${index}: true`);
            } else {
                globalState.proofingStates[index] = false;
                console.log(`Loaded Proofed for row ${index}: false`);
            }
        });
        try {
            localStorage.setItem('proofingStates', JSON.stringify(globalState.proofingStates));
            console.log('Saved proofingStates to localStorage after loading CSV:', globalState.proofingStates);
        } catch (error) {
            console.error('Error saving proofingStates to localStorage:', error);
        }
        
        if (csvPreview) {
            csvPreview.innerHTML = `<strong>Preview:</strong> ${globalState.csvHeaders.join(', ')} (${globalState.csvData.length} entries).`;
        }
        
        try {
            const entryTypeModule = await import('./js/rightColumn/entryTypeManager.js');
            const manager = new entryTypeModule.EntryTypeManager();
            manager.updateEntryTypesDropdown();
        } catch (error) {
            console.warn('Error updating entry types:', error);
        }
        
        const generator = new BibliographyGenerator();
        generator.generateBibliography();
        
        const activeCSVTab = document.querySelector('.tab-button[data-tab="csv-editor"].active');
        if (activeCSVTab) {
            try {
                const csvModule = await import('./csvEditor/csvManager.js');
                const csvManager = new csvModule.CSVManager();
                csvManager.displayCSVTable();
            } catch (error) {
                console.warn('Error displaying CSV table:', error);
            }
        } else {
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
        
        globalState.csvData = [];
        globalState.editedCsvData = [];
        globalState.originalCsvData = [];
        globalState.csvHeaders = [];
        
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
        
        try {
            const entryTypeModule = await import('./rightColumn/entryTypeManager.js');
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
    setTimeout(initFileSystemIntegration, 100);
    
    const csvFileInput = document.getElementById('csvFile');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                processCSVContent(e.target.result);
                
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