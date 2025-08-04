import { globalState } from '../state/globalState.js';
import { CSV_CONFIG } from '../config/constants.js';
import { CellEditor } from './cellEditor.js';

// Enhanced CSV table with AG-Grid - FIXED VERSION
export class CSVManager {
    constructor() {
        this.cellEditor = new CellEditor();
        
        // AG-Grid specific properties
        this.gridApi = null; // Updated: Use gridApi instead of agGridApi
        this.currentGridInstance = null;
        this.gridInitialized = false; // Track initialization state
        
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
            flex: 1, // Auto-size columns
            cellEditor: 'agTextCellEditor',
            // Custom cell renderer for long text with tooltip
            cellRenderer: params => {
                if (params.value && params.value.length > 50) {
                    return `<span title="${params.value}">${params.value}</span>`;
                }
                return params.value || '';
            }
        }));

        // FIXED: Updated grid options with correct AG-Grid v31+ properties
        const gridOptions = {
            columnDefs: columnDefs,
            rowData: [...globalState.csvData], // Create a copy
            
            // Editing settings
            defaultColDef: {
                editable: true,
                sortable: true,
                filter: true,
                resizable: true,
                minWidth: 100
            },

            // Selection settings - REMOVED enableRangeSelection (Enterprise only)
            rowSelection: 'single',
            
            // Event handlers
            onCellValueChanged: (event) => {
                this.handleAgGridCellEdit(event);
            },
            
            onCellClicked: (event) => {
                this.handleAgGridCellClick(event);
            },

            onGridReady: (params) => {
                console.log('AG-Grid ready with', globalState.csvData.length, 'rows');
                
                // Auto-size columns to fit
                params.api.sizeColumnsToFit();
            },

            // UI settings - REMOVED invalid options
            animateRows: true,
            
            // Keyboard navigation
            suppressRowClickSelection: false,
            suppressCellFocus: false,
            
            // FIXED: Updated navigation properties
            enterNavigatesVertically: true,
            enterNavigatesVerticallyAfterEdit: true
        };

        // FIXED: Use createGrid instead of new Grid()
        console.log('[displayCSVTable] Creating new AG-Grid instance with createGrid()');
        this.gridApi = agGrid.createGrid(gridContainer, gridOptions);
        this.gridInitialized = true;
        
        // Update cell previewer
        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.innerHTML = '<span style="color: var(--color-text-secondary); font-style: italic;">Click a cell in the table to see its full content here.</span>';
        }
        
        // Update original data arrays to match
        if (!globalState.originalCsvData.length && globalState.csvData.length) {
            globalState.originalCsvData = JSON.parse(JSON.stringify(globalState.csvData));
        }
        if (!globalState.editedCsvData.length && globalState.csvData.length) {
            globalState.editedCsvData = JSON.parse(JSON.stringify(globalState.csvData));
        }

        // Setup export functionality
        this.setupExportButton();

        console.log('[displayCSVTable] AG-Grid initialized successfully');
    }

    // AG-Grid event handlers
    handleAgGridCellEdit(event) {
        console.log('AG-Grid cell edited:', event.colDef.field, 'New value:', event.newValue);
        
        const rowIndex = event.node.rowIndex;
        const fieldName = event.colDef.field;
        const newValue = event.newValue;
        
        if (isNaN(rowIndex) || !fieldName) {
            console.error('Invalid cell edit event:', { rowIndex, fieldName });
            return;
        }

        // Update global state data arrays
        if (globalState.csvData[rowIndex]) {
            globalState.csvData[rowIndex][fieldName] = newValue;
        }
        if (globalState.editedCsvData[rowIndex]) {
            globalState.editedCsvData[rowIndex][fieldName] = newValue;
        }

        console.log(`Updated row ${rowIndex}, field ${fieldName} to:`, newValue);
    }

    handleAgGridCellClick(event) {
        const rowIndex = event.node.rowIndex;
        const fieldName = event.colDef.field;
        const value = event.value || '';
        
        console.log('AG-Grid cell clicked:', { rowIndex, fieldName, value });
        
        // Update the cell detail previewer using existing CellEditor
        if (this.cellEditor && this.cellEditor.showAgGridCellInPreviewer) {
            this.cellEditor.showAgGridCellInPreviewer(rowIndex, fieldName, value, this.gridApi);
        } else {
            // Fallback to local method
            this.showAgGridCellInPreviewer(rowIndex, fieldName, value);
        }
    }

    showAgGridCellInPreviewer(rowIndex, fieldName, value) {
        if (!globalState.csvCellDetailPreviewer) return;
        
        globalState.csvCellDetailPreviewer.innerHTML = '';

        const headerDisplay = document.createElement('div');
        headerDisplay.className = 'preview-field-name';
        headerDisplay.style.cssText = 'padding-bottom: 4px; margin-bottom: 4px; border-bottom: 1px solid var(--color-border-primary); color: var(--color-text-primary); font-weight: 600; font-size: 14px;';
        headerDisplay.textContent = `${fieldName}:`;
        globalState.csvCellDetailPreviewer.appendChild(headerDisplay);

        const textarea = document.createElement('textarea');
        textarea.style.cssText = 'width: 100%; padding: 8px 12px; margin-top: 4px; border: 1px solid var(--color-border-primary); border-radius: 6px; font-size: 12px; font-family: var(--font-family-mono); background-color: white; resize: vertical; transition: all 150ms; outline: none;';
        textarea.value = value;
        textarea.dataset.rowIndex = rowIndex;
        textarea.dataset.fieldName = fieldName;

        const handlePreviewerChange = () => {
            const newValue = textarea.value;
            
            // Update global state
            if (globalState.csvData[rowIndex]) {
                globalState.csvData[rowIndex][fieldName] = newValue;
            }
            if (globalState.editedCsvData[rowIndex]) {
                globalState.editedCsvData[rowIndex][fieldName] = newValue;
            }
            
            // Update AG-Grid
            if (this.gridApi) {
                const rowNode = this.gridApi.getRowNode(rowIndex);
                if (rowNode) {
                    rowNode.setDataValue(fieldName, newValue);
                }
            }
            
            console.log(`Previewer updated row ${rowIndex}, field ${fieldName}`);
        };

        textarea.addEventListener('blur', handlePreviewerChange);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                handlePreviewerChange();
                textarea.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                textarea.value = value; // Reset to original
                textarea.blur();
            }
        });

        // Focus style
        textarea.addEventListener('focus', () => {
            textarea.style.borderColor = 'var(--color-border-focus)';
            textarea.style.boxShadow = 'var(--focus-ring)';
        });
        textarea.addEventListener('blur', () => {
            textarea.style.borderColor = 'var(--color-border-primary)';
            textarea.style.boxShadow = 'none';
        });

        globalState.csvCellDetailPreviewer.appendChild(textarea);
        setTimeout(() => textarea.focus(), 100); // Small delay for better UX
    }

    // FIXED: Add method to check if grid exists and is ready
    isGridReady() {
        return this.gridInitialized && this.gridApi && !this.gridApi.isDestroyed();
    }

    // FIXED: Add method to refresh grid without recreating
    refreshGrid() {
        if (this.isGridReady()) {
            console.log('[refreshGrid] Refreshing existing grid');
            this.gridApi.setGridOption('rowData', [...globalState.csvData]);
            this.gridApi.sizeColumnsToFit();
            return true;
        }
        return false;
    }

    // FIXED: Add cleanup method
    cleanup() {
        console.log('[cleanup] Cleaning up CSV Manager');
        if (this.gridApi && !this.gridApi.isDestroyed()) {
            this.gridApi.destroy();
        }
        this.gridApi = null;
        this.gridInitialized = false;
    }

    // Export functionality (keeping your existing logic but with fixed API references)
    setupExportButton() {
        console.log('[setupExportButton] Setting up export functionality...');
        
        // Find or create export button
        let exportBtn = document.getElementById('saveCSVBtn');
        if (!exportBtn) {
            // Create export button if it doesn't exist
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
            // Remove existing listeners
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
            // Get current data from AG-Grid if available
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

            // Generate CSV content
            const csvContent = this.generateCSVContent();
            
            // Create and download file
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
            
            // Trigger bibliography regeneration if needed
            if (typeof generateBibliography === 'function') {
                generateBibliography();
            }
            
        } catch (error) {
            console.error('[exportCSV] Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    }

    generateCSVContent() {
        // Use Papa Parse if available, otherwise manual generation
        if (typeof Papa !== 'undefined') {
            return Papa.unparse({
                fields: globalState.csvHeaders,
                data: globalState.csvData
            });
        } else {
            // Manual CSV generation
            const rows = [globalState.csvHeaders];
            globalState.csvData.forEach(entry => {
                const row = globalState.csvHeaders.map(header => {
                    const value = entry[header] || '';
                    // Escape quotes and wrap in quotes if contains comma or quotes
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

    // Legacy method compatibility - can be removed or kept as no-op
    setupKeyboardNavigation() {
        console.log('[setupKeyboardNavigation] AG-Grid handles navigation automatically');
        // AG-Grid provides built-in keyboard navigation, so this can be simplified or removed
    }

    // Keep these methods for compatibility but they're no longer needed with AG-Grid
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