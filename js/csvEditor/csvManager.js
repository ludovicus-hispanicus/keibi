import { globalState } from '../state/globalState.js';
import { CSV_CONFIG } from '../config/constants.js';

// Enhanced CSV table with AG-Grid - CLEAN VERSION
export class CSVManager {
    constructor() {
        // AG-Grid specific properties
        this.gridApi = null;
        this.currentGridInstance = null;
        this.gridInitialized = false;
        
        console.log('[CSVManager] AG-Grid enhanced constructor called');
    }

    displayCSVTable() {
        console.log('[displayCSVTable] AG-Grid Function CALLED');

        const gridContainer = document.getElementById('csvGrid');
        
        if (!globalState.csvData || !globalState.csvHeaders || !gridContainer) {
            console.error('[displayCSVTable] ABORTING: Critical data or elements missing.');
            if (globalState.csvCellDetailPreviewer) {
                globalState.csvCellDetailPreviewer.innerHTML = '<p style="color: #dc2626;">Error: Missing data or grid container.</p>';
            }
            return;
        }

        if (globalState.csvData.length === 0) {
            console.warn('[displayCSVTable] csvData is empty.');
            gridContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-text-secondary); font-style: italic;">No CSV data to display.</div>';
            if (globalState.csvCellDetailPreviewer) {
                globalState.csvCellDetailPreviewer.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic;">No data to display.</p>';
            }
            return;
        }

        // Check if grid is already initialized and has the same data
        if (this.gridInitialized && this.gridApi) {
            console.log('[displayCSVTable] Grid already exists, checking if refresh is needed...');
            
            // Get current row count
            let currentRowCount = 0;
            this.gridApi.forEachNode(() => currentRowCount++);
            
            // If data hasn't changed significantly, just refresh
            if (currentRowCount === globalState.csvData.length) {
                console.log('[displayCSVTable] Refreshing existing grid data');
                this.gridApi.setGridOption('rowData', [...globalState.csvData]);
                this.gridApi.sizeColumnsToFit();
                return;
            }
        }

        // Only destroy and recreate if necessary
        if (this.gridApi) {
            console.log('[displayCSVTable] Destroying existing grid');
            this.gridApi.destroy();
            this.gridApi = null;
            this.gridInitialized = false;
        }

        // Clear container
        gridContainer.innerHTML = '';

        // Create column definitions from CSV headers
        const columnDefs = globalState.csvHeaders.map(header => ({
            field: header,
            headerName: header,
            editable: true,
            sortable: true,
            filter: true,
            resizable: true,
            minWidth: CSV_CONFIG?.STANDARD_COLUMN_WIDTH || 150,
            flex: 1,
            
            // FIXED: Improved cell editing configuration
            cellEditor: 'agTextCellEditor',
            cellEditorParams: {
                maxLength: 2000  // Allow long text
            },
            
            // FIXED: Better cell renderer
            cellRenderer: params => {
                if (params.value && params.value.length > 50) {
                    return `<span title="${params.value}">${params.value}</span>`;
                }
                return params.value || '';
            }
        }));

        // Grid options
        const gridOptions = {
            columnDefs: columnDefs,
            rowData: [...globalState.csvData],
            
            defaultColDef: {
                editable: true,
                sortable: true,
                filter: true,
                resizable: true,
                minWidth: 100,
                filterParams: {
                    debounceMs: 200,
                    suppressAndOrCondition: true
                }
            },

            rowSelection: 'single',
            
            // FIXED: Enhanced event handlers for live sync
            onCellValueChanged: (event) => {
                this.handleAgGridCellEdit(event);
                // FIXED: Only sync to preview if the change is meaningful (not empty during editing)
                if (!this._isCurrentlyEditing || (event.newValue && event.newValue.trim() !== '')) {
                    this.syncCellToPreview(event.node.rowIndex, event.colDef.field, event.newValue);
                }
            },
            
            onCellClicked: (event) => {
                // Single click: Select cell and show in previewer
                console.log('Cell single-clicked - showing in previewer');
                this.selectCellAndShowInPreviewer(event);
            },

            onCellDoubleClicked: (event) => {
                // Double click: Start inline editing (cursor stays in cell)
                console.log('Cell double-clicked - starting inline edit in cell');
                
                // Prevent any preview field activation
                event.event.preventDefault();
                event.event.stopPropagation();
                
                // Start inline editing immediately
                setTimeout(() => {
                    event.api.startEditingCell({
                        rowIndex: event.node.rowIndex,
                        colKey: event.column.getColId()
                    });
                }, 10);
            },

            // ADDED: Real-time sync while typing in cell
            onCellEditingStarted: (event) => {
                console.log('Cell editing started - enabling live sync');
                this._isCurrentlyEditing = true; // Set flag to indicate editing is in progress
                this.setupLiveCellSync(event);
            },

            onCellEditingStopped: (event) => {
                console.log('Cell editing stopped');
                this._isCurrentlyEditing = false; // Clear editing flag
                // Update preview field with final value
                this.syncCellToPreview(event.node.rowIndex, event.colDef.field, event.newValue || event.oldValue);
            },

            onGridReady: (params) => {
                console.log('AG-Grid ready with', globalState.csvData.length, 'rows');
                
                params.api.sizeColumnsToFit();
                
                const quickFilterInput = document.getElementById('quickFilterInput');
                if (quickFilterInput) {
                    quickFilterInput.addEventListener('input', (e) => {
                        params.api.setGridOption('quickFilterText', e.target.value);
                    });
                    console.log('Quick filter search box connected');
                }
            },

            // FIXED: Google Sheets-like navigation and editing
            animateRows: true,
            suppressRowClickSelection: false,
            suppressCellFocus: false,
            enterNavigatesVertically: true,
            enterNavigatesVerticallyAfterEdit: true,
            
            // FIXED: Disable single-click editing, use double-click only
            singleClickEdit: false,
            
            // FIXED: Stop editing when clicking away
            stopEditingWhenCellsLoseFocus: true,
            
            // FIXED: Enable keyboard navigation like Google Sheets
            enableCellTextSelection: true,
            
            // FIXED: Handle keyboard events for better navigation
            onCellKeyDown: (event) => {
                const key = event.event.key;
                const isEditing = event.node.isEditing && event.node.isEditing();
                
                // If not editing, enable various shortcuts
                if (!isEditing) {
                    if (key === 'F2' || key === 'Enter') {
                        // Start inline editing in the cell
                        event.api.startEditingCell({
                            rowIndex: event.node.rowIndex,
                            colKey: event.column.getColId()
                        });
                        event.event.preventDefault();
                    }
                    else if (key === 'Delete' || key === 'Backspace') {
                        // Clear cell content
                        event.node.setDataValue(event.column.getColId(), '');
                        event.event.preventDefault();
                    }
                }
                // If editing, handle editing shortcuts
                else {
                    if (key === 'Escape') {
                        event.api.stopEditing(true); // Cancel editing
                        event.event.preventDefault();
                    }
                    else if (key === 'Enter') {
                        event.api.stopEditing(false); // Save and move down
                        event.event.preventDefault();
                    }
                    else if (key === 'Tab') {
                        event.api.stopEditing(false); // Save and move right
                        // AG-Grid handles Tab navigation automatically
                    }
                }
            },
        };

        // Create grid
        console.log('[displayCSVTable] Creating new AG-Grid instance with createGrid()');
        this.gridApi = agGrid.createGrid(gridContainer, gridOptions);
        this.gridInitialized = true;
        
        // Update cell previewer
        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.innerHTML = '<span style="color: var(--color-text-secondary); font-style: italic;">Click a cell in the table to see its full content here.</span>';
        }
        
        // Update original data arrays
        if (!globalState.originalCsvData.length && globalState.csvData.length) {
            globalState.originalCsvData = JSON.parse(JSON.stringify(globalState.csvData));
        }
        if (!globalState.editedCsvData.length && globalState.csvData.length) {
            globalState.editedCsvData = JSON.parse(JSON.stringify(globalState.csvData));
        }

        this.setupExportButton();

        console.log('[displayCSVTable] AG-Grid initialized successfully');
    }

    handleAgGridCellEdit(event) {
        console.log('AG-Grid cell edited:', event.colDef.field, 'New value:', event.newValue);
        
        const rowIndex = event.node.rowIndex;
        const fieldName = event.colDef.field;
        const newValue = event.newValue;
        
        if (isNaN(rowIndex) || !fieldName) {
            console.error('Invalid cell edit event:', { rowIndex, fieldName });
            return;
        }

        if (globalState.csvData[rowIndex]) {
            globalState.csvData[rowIndex][fieldName] = newValue;
        }
        if (globalState.editedCsvData[rowIndex]) {
            globalState.editedCsvData[rowIndex][fieldName] = newValue;
        }

        console.log(`Updated row ${rowIndex}, field ${fieldName} to:`, newValue);
    }

    selectCellAndShowInPreviewer(event) {
        const rowIndex = event.node.rowIndex;
        const fieldName = event.colDef.field;
        const value = event.value || '';
        
        console.log('Cell selected:', { rowIndex, fieldName, value });
        
        // Highlight the selected cell (AG-Grid does this automatically)
        event.node.setSelected(true);
        
        // Show content in previewer and make it editable
        this.showAgGridCellInPreviewer(rowIndex, fieldName, value);
    }

    handleAgGridCellClick(event) {
        // This method is now replaced by selectCellAndShowInPreviewer
        // Keeping for backward compatibility
        this.selectCellAndShowInPreviewer(event);
    }

    showAgGridCellInPreviewer(rowIndex, fieldName, value) {
        if (!globalState.csvCellDetailPreviewer) return;
        
        // Clear any existing content and event listeners
        globalState.csvCellDetailPreviewer.innerHTML = '';

        // Create container for inline layout
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; align-items: flex-start; gap: 8px; width: 100%;';

        const headerDisplay = document.createElement('div');
        headerDisplay.className = 'preview-field-name';
        headerDisplay.style.cssText = 'color: var(--color-text-primary); font-weight: 600; font-size: 14px; white-space: nowrap; padding-top: 8px;';
        headerDisplay.textContent = `${fieldName}:`;

        const textarea = document.createElement('textarea');
        textarea.style.cssText = 'flex: 1; padding: 8px 12px; border: 1px solid var(--color-border-primary); border-radius: 6px; font-size: 12px; font-family: var(--font-family-mono); background-color: white; resize: vertical; transition: all 150ms; outline: none; min-height: 36px;';
        textarea.value = value;
        textarea.dataset.rowIndex = rowIndex;
        textarea.dataset.fieldName = fieldName;
        
        // Store reference for live sync
        this.currentPreviewField = textarea;
        
        textarea.readOnly = false;
        
        // FIXED: Only show placeholder if field is empty
        if (!value || value.trim() === '') {
            textarea.placeholder = 'Click here to edit, or double-click the cell above for inline editing';
        }

        // Add elements to container
        container.appendChild(headerDisplay);
        container.appendChild(textarea);
        globalState.csvCellDetailPreviewer.appendChild(container);

        // FIXED: Live bidirectional sync
        let isUpdatingFromCell = false;
        let updateTimeout;
        
        const updateGridCellFromPreview = () => {
            if (isUpdatingFromCell) return; // Prevent circular updates
            
            const newValue = textarea.value;
            const currentRowIndex = parseInt(textarea.dataset.rowIndex);
            const currentFieldName = textarea.dataset.fieldName;
            
            // Update global state
            if (globalState.csvData[currentRowIndex]) {
                globalState.csvData[currentRowIndex][currentFieldName] = newValue;
            }
            if (globalState.editedCsvData[currentRowIndex]) {
                globalState.editedCsvData[currentRowIndex][currentFieldName] = newValue;
            }
            
            // Update AG-Grid cell with sync flag
            if (this.gridApi && !this.gridApi.isDestroyed()) {
                const rowNode = this.gridApi.getRowNode(currentRowIndex);
                if (rowNode) {
                    // Set flag to prevent circular updates
                    this._updatingFromPreview = true;
                    rowNode.setDataValue(currentFieldName, newValue);
                    setTimeout(() => this._updatingFromPreview = false, 100);
                    console.log(`Live sync: preview → cell [${currentRowIndex}][${currentFieldName}]`);
                }
            }
        };

        // FIXED: Real-time sync from preview field to cell
        textarea.addEventListener('input', () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(updateGridCellFromPreview, 200); // Faster sync for live feel
        });

        // FIXED: Only clear placeholder on click, never clear actual content
        textarea.addEventListener('click', () => {
            if (textarea.placeholder && textarea.placeholder.trim() !== '') {
                textarea.placeholder = ''; // Only clear placeholder, never the value
                console.log('Preview field clicked - placeholder cleared, content preserved');
            }
        });

        textarea.addEventListener('focus', () => {
            // FIXED: Only clear placeholder, never the actual content
            if (textarea.placeholder && textarea.placeholder.trim() !== '') {
                textarea.placeholder = ''; // Clear placeholder only
            }
            
            textarea.style.borderColor = 'var(--color-border-focus)';
            textarea.style.boxShadow = 'var(--focus-ring)';
            textarea.style.backgroundColor = '#f8f9fa';
            console.log('Preview field focused - placeholder cleared, content preserved');
        });

        textarea.addEventListener('blur', () => {
            updateGridCellFromPreview(); // Final update on blur
            textarea.style.borderColor = 'var(--color-border-primary)';
            textarea.style.boxShadow = 'none';
            textarea.style.backgroundColor = 'white';
            
            // FIXED: Only restore placeholder if field is actually empty
            if (!textarea.value || textarea.value.trim() === '') {
                textarea.placeholder = 'Click here to edit, or double-click the cell above for inline editing';
            }
        });
        
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                updateGridCellFromPreview();
                textarea.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                textarea.value = value; // Reset to original
                textarea.blur();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                updateGridCellFromPreview();
                this.moveToNextCell(rowIndex, fieldName);
            }
        });

        console.log(`Preview field set up for live sync: ${fieldName} = "${value}"`);
    }

    // ADDED: Sync cell changes to preview field (cell → preview)
    syncCellToPreview(rowIndex, fieldName, newValue) {
        if (!this.currentPreviewField) return;
        
        // Check if this update is for the currently displayed field
        const currentRowIndex = parseInt(this.currentPreviewField.dataset.rowIndex);
        const currentFieldName = this.currentPreviewField.dataset.fieldName;
        
        if (currentRowIndex === rowIndex && currentFieldName === fieldName) {
            // Don't update if the change came from the preview field itself
            if (this._updatingFromPreview) return;
            
            // FIXED: Preserve the value properly, handle null/undefined
            const valueToSet = (newValue !== null && newValue !== undefined) ? newValue : '';
            this.currentPreviewField.value = valueToSet;
            
            // Clear placeholder when content is added
            if (valueToSet.trim() !== '' && this.currentPreviewField.placeholder) {
                this.currentPreviewField.placeholder = '';
            }
            
            console.log(`Live sync: cell → preview [${rowIndex}][${fieldName}] = "${valueToSet}"`);
        }
    }

    // ADDED: Set up live sync while typing in cell
    setupLiveCellSync(event) {
        const rowIndex = event.node.rowIndex;
        const fieldName = event.colDef.field;
        
        // Get the cell editor input element
        setTimeout(() => {
            const cellEditor = document.querySelector('.ag-cell-editor input, .ag-cell-editor textarea');
            if (cellEditor && this.currentPreviewField) {
                const currentRowIndex = parseInt(this.currentPreviewField.dataset.rowIndex);
                const currentFieldName = this.currentPreviewField.dataset.fieldName;
                
                // Only sync if editing the same field shown in preview
                if (currentRowIndex === rowIndex && currentFieldName === fieldName) {
                    // FIXED: Better sync handling during editing
                    const syncToPreview = () => {
                        if (this.currentPreviewField && !this._updatingFromPreview) {
                            // Only update if there's actual content or if the user cleared it intentionally
                            const editorValue = cellEditor.value;
                            this.currentPreviewField.value = editorValue;
                            console.log(`Live sync: cell editor → preview "${editorValue}"`);
                        }
                    };
                    
                    // Remove any existing listeners to prevent duplicates
                    cellEditor.removeEventListener('input', cellEditor._syncHandler);
                    
                    // Add new listener and store reference for cleanup
                    cellEditor._syncHandler = syncToPreview;
                    cellEditor.addEventListener('input', syncToPreview);
                    
                    console.log('Live cell sync enabled');
                }
            }
        }, 50); // Small delay to ensure editor is ready
    }

    // FIXED: Add method to move to next cell (Google Sheets style)
    moveToNextCell(currentRowIndex, currentFieldName) {
        if (!this.gridApi || !globalState.csvHeaders) return;
        
        const currentColIndex = globalState.csvHeaders.indexOf(currentFieldName);
        let nextRowIndex = currentRowIndex;
        let nextColIndex = currentColIndex + 1;
        
        // If we're at the last column, move to first column of next row
        if (nextColIndex >= globalState.csvHeaders.length) {
            nextColIndex = 0;
            nextRowIndex = currentRowIndex + 1;
        }
        
        // If we're past the last row, stay at current position
        if (nextRowIndex >= globalState.csvData.length) {
            return;
        }
        
        // Select the next cell
        const nextFieldName = globalState.csvHeaders[nextColIndex];
        const nextValue = globalState.csvData[nextRowIndex][nextFieldName] || '';
        
        // Focus the next cell in the grid
        this.gridApi.setFocusedCell(nextRowIndex, nextFieldName);
        
        // Update the previewer
        this.showAgGridCellInPreviewer(nextRowIndex, nextFieldName, nextValue);
    }

    isGridReady() {
        return this.gridInitialized && this.gridApi && !this.gridApi.isDestroyed();
    }

    refreshGrid() {
        if (this.isGridReady()) {
            console.log('[refreshGrid] Refreshing existing grid');
            this.gridApi.setGridOption('rowData', [...globalState.csvData]);
            this.gridApi.sizeColumnsToFit();
            return true;
        }
        return false;
    }

    cleanup() {
        console.log('[cleanup] Cleaning up CSV Manager');
        if (this.gridApi && !this.gridApi.isDestroyed()) {
            this.gridApi.destroy();
        }
        this.gridApi = null;
        this.gridInitialized = false;
    }

    setupExportButton() {
        console.log('[setupExportButton] Setting up export functionality...');
        
        let exportBtn = document.getElementById('saveCSVBtn');
        if (!exportBtn) {
            const exportActions = document.querySelector('.editor-controls') || 
                                 document.querySelector('#mainExportActions');
            
            if (exportActions) {
                exportBtn = document.createElement('button');
                exportBtn.id = 'saveCSVBtn';
                exportBtn.textContent = 'Export CSV';
                exportBtn.className = 'btn-action padding-condensed text-sm';
                exportActions.appendChild(exportBtn);
                console.log('[setupExportButton] Created export button');
            }
        }

        if (exportBtn) {
            exportBtn.replaceWith(exportBtn.cloneNode(true));
            exportBtn = document.getElementById('saveCSVBtn');
            
            exportBtn.addEventListener('click', () => {
                console.log('[exportCSV] Exporting CSV...');
                this.exportCSV();
            });
            
            console.log('[setupExportButton] Export button ready');
        }
    }

    exportCSV() {
        try {
            if (this.gridApi && !this.gridApi.isDestroyed()) {
                const currentData = [];
                this.gridApi.forEachNode(node => {
                    if (node.data) {
                        currentData.push(node.data);
                    }
                });
                globalState.csvData = [...currentData];
                globalState.editedCsvData = [...currentData];
            }

            if (!globalState.csvHeaders || !globalState.csvData) {
                alert('No CSV data to export');
                return;
            }

            const csvContent = this.generateCSVContent();
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', 'bibliography_edited.csv');
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('[exportCSV] CSV exported successfully');
            
            if (typeof generateBibliography === 'function') {
                generateBibliography();
            }
            
        } catch (error) {
            console.error('[exportCSV] Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    }

    generateCSVContent() {
        if (typeof Papa !== 'undefined') {
            return Papa.unparse({
                fields: globalState.csvHeaders,
                data: globalState.csvData
            });
        } else {
            const rows = [globalState.csvHeaders];
            globalState.csvData.forEach(entry => {
                const row = globalState.csvHeaders.map(header => {
                    const value = entry[header] || '';
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return '"' + value.replace(/"/g, '""') + '"';
                    }
                    return value;
                });
                rows.push(row);
            });
            return rows.map(row => row.join(',')).join('\n');
        }
    }

    setupKeyboardNavigation() {
        console.log('[setupKeyboardNavigation] AG-Grid handles navigation automatically');
    }

    resetCellSelection() {
        console.log('[resetCellSelection] Using AG-Grid selection');
        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.innerHTML = '<span style="color: var(--color-text-secondary); font-style: italic;">Click a cell in the table below to see its full content here.</span>';
        }
    }

    clearSelection() {
        if (this.gridApi && !this.gridApi.isDestroyed()) {
            this.gridApi.deselectAll();
        }
    }
}