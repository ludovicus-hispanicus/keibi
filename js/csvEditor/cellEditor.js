import { globalState } from '../state/globalState.js';

// Enhanced cell editing functionality with AG-Grid support and detailed logging
export class CellEditor {
    constructor() {
        console.log('[CellEditor] Enhanced constructor called with AG-Grid support');
    }

    // NEW: AG-Grid specific cell previewer method
    showAgGridCellInPreviewer(rowIndex, fieldName, value, agGridApi) {
        console.log(`[showAgGridCellInPreviewer] CALLED with:`, {
            rowIndex,
            fieldName,
            value: `"${value}"`,
            hasPreviewerElement: !!globalState.csvCellDetailPreviewer,
            hasAgGridApi: !!agGridApi
        });

        if (!globalState.csvCellDetailPreviewer) {
            console.error('[showAgGridCellInPreviewer] csvCellDetailPreviewer not found in globalState!');
            return;
        }

        // Clear previous content
        globalState.csvCellDetailPreviewer.innerHTML = '';

        // Create header display
        const headerDisplay = document.createElement('div');
        headerDisplay.className = 'preview-field-name';
        headerDisplay.style.cssText = 'padding-bottom: 4px; margin-bottom: 4px; border-bottom: 1px solid var(--color-border-primary); color: var(--color-text-primary); font-weight: 600; font-size: 14px;';
        headerDisplay.textContent = `${fieldName}:`;
        globalState.csvCellDetailPreviewer.appendChild(headerDisplay);
        console.log('[showAgGridCellInPreviewer] Created header display');

        // Create textarea
        const textarea = document.createElement('textarea');
        textarea.style.cssText = 'width: 100%; padding: 8px 12px; margin-top: 4px; border: 1px solid var(--color-border-primary); border-radius: 6px; font-size: 12px; font-family: var(--font-family-mono); background-color: white; resize: vertical; transition: all 150ms; outline: none;';
        textarea.value = value;
        textarea.dataset.rowIndex = rowIndex;
        textarea.dataset.fieldName = fieldName;
        globalState.previewerInputField = textarea;

        console.log('[showAgGridCellInPreviewer] Created textarea with:', {
            value: textarea.value,
            rowIndex: textarea.dataset.rowIndex,
            fieldName: textarea.dataset.fieldName
        });

        // Setup AG-Grid specific event listeners
        this.setupAgGridTextareaEventListeners(textarea, agGridApi);
        globalState.csvCellDetailPreviewer.appendChild(textarea);
        
        console.log('[showAgGridCellInPreviewer] Added textarea to previewer');
        
        // Focus with slight delay for better UX
        setTimeout(() => {
            textarea.focus();
            console.log('[showAgGridCellInPreviewer] Focused textarea');
        }, 100);
    }

    // NEW: AG-Grid specific event listeners
    setupAgGridTextareaEventListeners(textarea, agGridApi) {
        console.log('[setupAgGridTextareaEventListeners] Setting up AG-Grid event listeners');

        const currentOnBlurHandler = (event) => {
            console.log('[agGrid.textarea.onBlur] Blur event triggered');
            this.handleAgGridPreviewerEdit(event, agGridApi);
        };
        
        const currentOnKeyDownHandler = (e) => {
            console.log(`[agGrid.textarea.onKeyDown] Key pressed: ${e.key}, ctrlKey: ${e.ctrlKey}`);
            
            if (e.key === 'Enter' && e.ctrlKey) {
                console.log('[agGrid.textarea.onKeyDown] Ctrl+Enter detected, saving and blurring');
                e.preventDefault(); 
                this.handleAgGridPreviewerEdit(e, agGridApi); 
                textarea.blur();
            } else if (e.key === 'Escape') {
                console.log('[agGrid.textarea.onKeyDown] Escape detected, reverting value');
                e.preventDefault();
                const originalValueInDS = globalState.csvData[parseInt(textarea.dataset.rowIndex)][textarea.dataset.fieldName] || '';
                console.log(`[agGrid.textarea.onKeyDown] Reverting to original value: "${originalValueInDS}"`);
                textarea.value = originalValueInDS; 
                textarea.blur();
            }
        };
        
        textarea.addEventListener('blur', currentOnBlurHandler);
        textarea.addEventListener('keydown', currentOnKeyDownHandler);
        textarea._onBlurHandler = currentOnBlurHandler;
        textarea._onKeyDownHandler = currentOnKeyDownHandler;
        textarea._agGridApi = agGridApi; // Store reference for cleanup
        
        // Focus/blur styling
        textarea.addEventListener('focus', () => {
            textarea.style.borderColor = 'var(--color-border-focus)';
            textarea.style.boxShadow = 'var(--focus-ring)';
        });
        textarea.addEventListener('blur', () => {
            textarea.style.borderColor = 'var(--color-border-primary)';
            textarea.style.boxShadow = 'none';
        });
        
        console.log('[setupAgGridTextareaEventListeners] AG-Grid event listeners attached');
    }

    // NEW: AG-Grid specific edit handler
    handleAgGridPreviewerEdit(event, agGridApi) {
        console.log('[handleAgGridPreviewerEdit] CALLED');
        
        const textarea = event.target;
        if (!textarea._onBlurHandler && !textarea._onKeyDownHandler) {
            console.log('[handleAgGridPreviewerEdit] No event handlers found, skipping');
            return;
        }

        const rowIndex = parseInt(textarea.dataset.rowIndex);
        const fieldName = textarea.dataset.fieldName;
        const newValue = textarea.value;

        console.log('[handleAgGridPreviewerEdit] Edit details:', {
            rowIndex,
            fieldName,
            newValue: `"${newValue}"`,
            oldValue: `"${globalState.editedCsvData[rowIndex]?.[fieldName] || ''}"`
        });

        // Clean up event listeners
        if (textarea._onBlurHandler) {
            textarea.removeEventListener('blur', textarea._onBlurHandler);
            delete textarea._onBlurHandler;
            console.log('[handleAgGridPreviewerEdit] Removed blur handler');
        }

        if (textarea._onKeyDownHandler) {
            textarea.removeEventListener('keydown', textarea._onKeyDownHandler);
            delete textarea._onKeyDownHandler;
            console.log('[handleAgGridPreviewerEdit] Removed keydown handler');
        }

        if (isNaN(rowIndex) || !fieldName) {
            console.error("[handleAgGridPreviewerEdit] Invalid context", { rowIndex, fieldName }); 
            return;
        }
        
        // Check if value actually changed
        const currentValue = globalState.csvData[rowIndex]?.[fieldName] || '';
        if (currentValue === newValue) {
            console.log('[handleAgGridPreviewerEdit] Value unchanged, skipping update');
            return;
        }

        // Update global state data
        if (globalState.csvData[rowIndex]) {
            globalState.csvData[rowIndex][fieldName] = newValue;
        }
        if (globalState.editedCsvData[rowIndex]) {
            globalState.editedCsvData[rowIndex][fieldName] = newValue;
        }
        
        console.log('[handleAgGridPreviewerEdit] Updated data in globalState');

        // Update AG-Grid
        if (agGridApi) {
            const rowNode = agGridApi.getRowNode(rowIndex);
            if (rowNode) {
                rowNode.setDataValue(fieldName, newValue);
                console.log('[handleAgGridPreviewerEdit] Updated AG-Grid cell');
            } else {
                console.warn('[handleAgGridPreviewerEdit] Could not find AG-Grid row node');
            }
        }
        
        console.log('[handleAgGridPreviewerEdit] Complete');
    }

    // EXISTING: Legacy table cell previewer method (kept for backwards compatibility)
    showCellContentInPreviewer(rowIndex, headerName) {
        console.log(`[showCellContentInPreviewer] LEGACY METHOD CALLED with:`, {
            rowIndex,
            headerName,
            hasPreviewerElement: !!globalState.csvCellDetailPreviewer,
            dataExists: !!globalState.csvData[rowIndex],
            headerExists: globalState.csvData[rowIndex] ? (headerName in globalState.csvData[rowIndex]) : false
        });

        if (!globalState.csvCellDetailPreviewer) {
            console.error('[showCellContentInPreviewer] csvCellDetailPreviewer not found in globalState!');
            return;
        }

        if (!globalState.csvData[rowIndex]) {
            console.error(`[showCellContentInPreviewer] No data found for row ${rowIndex}`);
            if (globalState.csvCellDetailPreviewer) {
                globalState.csvCellDetailPreviewer.innerHTML = '<p class="text-red-500">Could not load cell details - row not found.</p>';
                this.clearPreviewerField();
            }
            return;
        }

        if (typeof globalState.csvData[rowIndex][headerName] === 'undefined') {
            console.error(`[showCellContentInPreviewer] Header "${headerName}" not found in row ${rowIndex}`);
            console.log(`[showCellContentInPreviewer] Available headers in row:`, Object.keys(globalState.csvData[rowIndex]));
            if (globalState.csvCellDetailPreviewer) {
                globalState.csvCellDetailPreviewer.innerHTML = '<p class="text-red-500">Could not load cell details - header not found.</p>';
                this.clearPreviewerField();
            }
            return;
        }

        const value = globalState.csvData[rowIndex][headerName] || '';
        console.log(`[showCellContentInPreviewer] Cell value: "${value}" (type: ${typeof value})`);

        globalState.csvCellDetailPreviewer.innerHTML = '';

        const headerDisplay = document.createElement('div');
        headerDisplay.className = 'preview-field-name pb-1 mb-1 border-b border-gray-200 text-gray-700 font-semibold';
        headerDisplay.textContent = `${headerName}:`;
        globalState.csvCellDetailPreviewer.appendChild(headerDisplay);
        console.log('[showCellContentInPreviewer] Created header display');

        const textarea = document.createElement('textarea');
        textarea.className = 'w-full p-2 mt-1 border border-gray-300 rounded-md text-sm font-mono focus:ring-emerald-500 focus:border-emerald-500 min-h-[40px] bg-white resize-none';
        textarea.value = value;
        textarea.dataset.rowIndex = rowIndex;
        textarea.dataset.headerName = headerName;
        globalState.previewerInputField = textarea;

        console.log('[showCellContentInPreviewer] Created textarea with:', {
            value: textarea.value,
            rowIndex: textarea.dataset.rowIndex,
            headerName: textarea.dataset.headerName
        });

        this.setupTextareaEventListeners(textarea);
        globalState.csvCellDetailPreviewer.appendChild(textarea);
        
        console.log('[showCellContentInPreviewer] Added textarea to previewer');
        
        Promise.resolve().then(() => {
            textarea.focus();
            console.log('[showCellContentInPreviewer] Focused textarea');
        });
    }

    // EXISTING: Legacy event listeners setup
    setupTextareaEventListeners(textarea) {
        console.log('[setupTextareaEventListeners] Setting up LEGACY event listeners for textarea');

        const currentOnBlurHandler = (event) => {
            console.log('[legacy.textarea.onBlur] Blur event triggered');
            this.handlePreviewerEdit(event);
        };
        
        const currentOnKeyDownHandler = (e) => {
            console.log(`[legacy.textarea.onKeyDown] Key pressed: ${e.key}, ctrlKey: ${e.ctrlKey}`);
            
            if (e.key === 'Enter' && e.ctrlKey) {
                console.log('[legacy.textarea.onKeyDown] Ctrl+Enter detected, saving and blurring');
                e.preventDefault(); 
                this.handlePreviewerEdit(e); 
                textarea.blur();
            } else if (e.key === 'Escape') {
                console.log('[legacy.textarea.onKeyDown] Escape detected, reverting value');
                e.preventDefault();
                const originalValueInDS = globalState.csvData[parseInt(textarea.dataset.rowIndex)][textarea.dataset.headerName] || '';
                console.log(`[legacy.textarea.onKeyDown] Reverting to original value: "${originalValueInDS}"`);
                textarea.value = originalValueInDS; 
                textarea.blur();
            }
        };
        
        textarea.addEventListener('blur', currentOnBlurHandler);
        textarea.addEventListener('keydown', currentOnKeyDownHandler);
        textarea._onBlurHandler = currentOnBlurHandler;
        textarea._onKeyDownHandler = currentOnKeyDownHandler;
        
        console.log('[setupTextareaEventListeners] Legacy event listeners attached');
    }

    // EXISTING: Legacy edit handler
    handlePreviewerEdit(event) {
        console.log('[handlePreviewerEdit] LEGACY METHOD CALLED');
        
        const textarea = event.target;
        if (!textarea._onBlurHandler && !textarea._onKeyDownHandler) {
            console.log('[handlePreviewerEdit] No event handlers found, skipping');
            return;
        }

        const rowIndex = parseInt(textarea.dataset.rowIndex);
        const headerName = textarea.dataset.headerName;
        const newValue = textarea.value;

        console.log('[handlePreviewerEdit] Edit details:', {
            rowIndex,
            headerName,
            newValue: `"${newValue}"`,
            oldValue: `"${globalState.editedCsvData[rowIndex]?.[headerName] || ''}"`
        });

        // Clean up event listeners
        if (textarea._onBlurHandler) {
            textarea.removeEventListener('blur', textarea._onBlurHandler);
            delete textarea._onBlurHandler;
            console.log('[handlePreviewerEdit] Removed blur handler');
        }

        if (textarea._onKeyDownHandler) {
            textarea.removeEventListener('keydown', textarea._onKeyDownHandler);
            delete textarea._onKeyDownHandler;
            console.log('[handlePreviewerEdit] Removed keydown handler');
        }

        if (isNaN(rowIndex) || !headerName || !globalState.editedCsvData[rowIndex]) {
            console.error("[handlePreviewerEdit] Invalid context", { 
                rowIndex, 
                headerName, 
                hasEditedData: !!globalState.editedCsvData[rowIndex] 
            }); 
            return;
        }
        
        if (globalState.editedCsvData[rowIndex][headerName] === newValue) {
            console.log('[handlePreviewerEdit] Value unchanged, skipping update');
            return;
        }

        // Update data
        globalState.editedCsvData[rowIndex][headerName] = newValue;
        globalState.csvData[rowIndex][headerName] = newValue;
        
        console.log('[handlePreviewerEdit] Updated data in globalState');

        // Update table cell (legacy table)
        this.updateTableCell(rowIndex, headerName, newValue);
        
        console.log('[handlePreviewerEdit] Complete');
    }

    // EXISTING: Legacy table cell update method
    updateTableCell(rowIndex, headerName, newValue) {
        console.log(`[updateTableCell] LEGACY METHOD - Updating table cell [${rowIndex}][${headerName}] to "${newValue}"`);
        
        const tableBodyEl = document.getElementById('csvTableBody');
        if (!tableBodyEl) {
            console.log('[updateTableCell] csvTableBody element not found - probably using AG-Grid');
            return;
        }

        if (!tableBodyEl.rows || !tableBodyEl.rows[rowIndex]) {
            console.error(`[updateTableCell] Table row ${rowIndex} not found`);
            console.log('[updateTableCell] Available rows:', tableBodyEl.rows.length);
            return;
        }

        const tableRow = tableBodyEl.rows[rowIndex];
        console.log(`[updateTableCell] Found table row ${rowIndex} with ${tableRow.cells.length} cells`);

        const headerIndex = globalState.csvHeaders.indexOf(headerName);
        if (headerIndex === -1) {
            console.error(`[updateTableCell] Header "${headerName}" not found in csvHeaders`);
            console.log('[updateTableCell] Available headers:', globalState.csvHeaders);
            return;
        }

        console.log(`[updateTableCell] Header "${headerName}" found at index ${headerIndex}`);

        if (!tableRow.cells[headerIndex]) {
            console.error(`[updateTableCell] Cell at index ${headerIndex} not found`);
            console.log(`[updateTableCell] Available cells: ${tableRow.cells.length}`);
            return;
        }

        const cellInTable = tableRow.cells[headerIndex];
        const contentWrapper = cellInTable.querySelector('.cell-content-wrapper');
        
        if (contentWrapper) {
            contentWrapper.textContent = newValue;
            console.log('[updateTableCell] Updated content wrapper');
        } else {
            cellInTable.textContent = newValue;
            console.log('[updateTableCell] Updated cell directly (no wrapper found)');
        }
        
        console.log('[updateTableCell] Legacy table cell updated successfully');
    }

    // EXISTING: Clear previewer field
    clearPreviewerField() {
        console.log('[clearPreviewerField] Clearing previewer field');
        
        if (globalState.previewerInputField && globalState.previewerInputField._onBlurHandler) {
            globalState.previewerInputField.removeEventListener('blur', globalState.previewerInputField._onBlurHandler);
            globalState.previewerInputField.removeEventListener('keydown', globalState.previewerInputField._onKeyDownHandler);
            console.log('[clearPreviewerField] Removed event listeners');
        }
        
        globalState.previewerInputField = null;
        console.log('[clearPreviewerField] Cleared previewerInputField');
    }
}