// js/csvEditor/csvManager.js (With built-in diagnostic)
import { globalState } from '../state/globalState.js';
import { CSV_CONFIG } from '../config/constants.js';

export class CSVManager {
    constructor() {
        this.gridApi = null;
        this.currentGridInstance = null;
        this.gridInitialized = false;
        this.currentPreviewField = null;
        this._isUpdatingFromPreview = false;
        this._isUpdatingFromGrid = false;
        this._debugCounter = 0;
        
        console.log('[CSV_DEBUG] CSVManager constructor called');
    }

    // Built-in diagnostic method
    runDiagnostic() {
        console.log('=== GLOBAL STATE DIAGNOSTIC ===');

        // Check if globalState.csvData is a Proxy
        console.log('Is csvData a Proxy?', globalState.csvData.constructor.name);
        console.log('csvData prototype:', Object.getPrototypeOf(globalState.csvData).constructor.name);

        // Check the first few rows for any weird properties
        console.log('Row 0 object:', globalState.csvData[0]);
        console.log('Row 16 object:', globalState.csvData[16]);

        // Check if they're the same object reference (should be false)
        console.log('Are row 0 and 16 the same object?', globalState.csvData[0] === globalState.csvData[16]);

        // Check if the Title properties are somehow linked
        const row0Descriptor = Object.getOwnPropertyDescriptor(globalState.csvData[0], 'Title');
        const row16Descriptor = Object.getOwnPropertyDescriptor(globalState.csvData[16], 'Title');

        console.log('Row 0 Title descriptor:', row0Descriptor);
        console.log('Row 16 Title descriptor:', row16Descriptor);

        // Check if there are any getters/setters
        console.log('Row 0 has getter for Title?', row0Descriptor && typeof row0Descriptor.get === 'function');
        console.log('Row 16 has getter for Title?', row16Descriptor && typeof row16Descriptor.get === 'function');

        // Test a simple assignment to see what happens
        console.log('=== BEFORE TEST ASSIGNMENT ===');
        console.log('Row 0 Title:', globalState.csvData[0].Title);
        console.log('Row 16 Title:', globalState.csvData[16].Title);

        console.log('=== MAKING TEST ASSIGNMENT ===');
        console.log('Setting row 0 Title to "DIAGNOSTIC_TEST_12345"');
        globalState.csvData[0].Title = "DIAGNOSTIC_TEST_12345";

        console.log('=== AFTER TEST ASSIGNMENT ===');
        console.log('Row 0 Title:', globalState.csvData[0].Title);
        console.log('Row 16 Title:', globalState.csvData[16].Title);

        // Check if row 16 was affected
        if (globalState.csvData[16].Title === "DIAGNOSTIC_TEST_12345") {
            console.error('🚨 BUG CONFIRMED: Row 16 was affected by changing row 0!');
            
            // Let's check the prototype chain
            console.log('Row 0 prototype chain:');
            let obj = globalState.csvData[0];
            let level = 0;
            while (obj && level < 5) {
                console.log(`  Level ${level}:`, obj.constructor.name, obj);
                obj = Object.getPrototypeOf(obj);
                level++;
            }
            
            console.log('Row 16 prototype chain:');
            obj = globalState.csvData[16];
            level = 0;
            while (obj && level < 5) {
                console.log(`  Level ${level}:`, obj.constructor.name, obj);
                obj = Object.getPrototypeOf(obj);
                level++;
            }
        } else {
            console.log('✅ No cross-contamination detected in this test');
        }

        // Check if this is a Proxy issue in the debug globalState
        console.log('=== CHECKING FOR PROXY TRAPS ===');
        if (globalState.csvData.constructor.name === 'Proxy') {
            console.error('🚨 csvData is a Proxy! This might be causing the issue.');
        } else {
            console.log('✅ csvData is not a Proxy');
        }

        // Reset the test value
        globalState.csvData[0].Title = "Fulda";
        console.log('Reset row 0 Title back to "Fulda"');
        
        return this; // For chaining
    }

    displayCSVTable() {
        console.log('[CSV_DEBUG] displayCSVTable called');
        const gridContainer = document.getElementById('csvGrid');
        
        if (!globalState.csvData || !globalState.csvHeaders || !gridContainer) {
            console.error('[CSV_DEBUG] Missing data or grid container');
            return;
        }

        // RUN DIAGNOSTIC AUTOMATICALLY WHEN GRID IS DISPLAYED
        console.log('[CSV_DEBUG] Running automatic diagnostic...');
        this.runDiagnostic();

        if (globalState.csvData.length === 0) {
            gridContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-text-secondary); font-style: italic;">No CSV data to display.</div>';
            return;
        }

        if (this.gridInitialized && this.gridApi) {
            let currentRowCount = 0;
            this.gridApi.forEachNode(() => currentRowCount++);
            if (currentRowCount === globalState.csvData.length) {
                console.log('[CSV_DEBUG] Refreshing existing grid');
                this.gridApi.setGridOption('rowData', globalState.csvData);
                this.gridApi.sizeColumnsToFit();
                return;
            }
        }

        if (this.gridApi) {
            this.gridApi.destroy();
            this.gridApi = null;
            this.gridInitialized = false;
        }

        gridContainer.innerHTML = '';

        const columnDefs = globalState.csvHeaders.map(header => ({
            field: header,
            headerName: header,
            editable: true,
            sortable: true,
            filter: true,
            resizable: true,
            minWidth: CSV_CONFIG?.STANDARD_COLUMN_WIDTH || 150,
            flex: 1,
            cellEditor: 'agTextCellEditor',
            cellEditorParams: { maxLength: 2000 },
            cellRenderer: params => params.value && params.value.length > 50
                ? `<span title="${params.value}">${params.value}</span>`
                : params.value || ''
        }));

        const gridOptions = {
            columnDefs: columnDefs,
            rowData: globalState.csvData,
            defaultColDef: {
                editable: true,
                sortable: true,
                filter: true,
                resizable: true,
                minWidth: 100,
                filterParams: { debounceMs: 200, suppressAndOrCondition: true }
            },
            rowSelection: 'single',
            onCellValueChanged: (event) => {
                this._debugCounter++;
                console.log(`[CSV_DEBUG] onCellValueChanged #${this._debugCounter}:`, {
                    rowIndex: event.node.rowIndex,
                    field: event.colDef.field,
                    oldValue: event.oldValue,
                    newValue: event.newValue
                });
                
                if (this._isUpdatingFromPreview) {
                    console.log(`[CSV_DEBUG] Skipping onCellValueChanged #${this._debugCounter} - updating from preview`);
                    return;
                }
                
                // RUN DIAGNOSTIC BEFORE HANDLING THE EDIT
                console.log('[CSV_DEBUG] Running diagnostic BEFORE handling cell edit...');
                console.log('Row 0 Title before edit:', globalState.csvData[0].Title);
                console.log('Row 16 Title before edit:', globalState.csvData[16].Title);
                
                this.handleAgGridCellEdit(event);
                this.syncGridToPreview(event.node.rowIndex, event.colDef.field, event.newValue);
                
                // RUN DIAGNOSTIC AFTER HANDLING THE EDIT
                console.log('[CSV_DEBUG] Running diagnostic AFTER handling cell edit...');
                console.log('Row 0 Title after edit:', globalState.csvData[0].Title);
                console.log('Row 16 Title after edit:', globalState.csvData[16].Title);
            },
            onCellClicked: (event) => {
                this.selectCellAndShowInPreviewer(event);
            },
            onCellDoubleClicked: (event) => {
                event.event.preventDefault();
                event.event.stopPropagation();
                setTimeout(() => {
                    event.api.startEditingCell({
                        rowIndex: event.node.rowIndex,
                        colKey: event.column.getColId()
                    });
                }, 10);
            },
            onCellEditingStarted: (event) => {
                this.setupLiveCellSync(event);
            },
            onCellEditingStopped: (event) => {
                this.syncGridToPreview(event.node.rowIndex, event.colDef.field, event.newValue || event.oldValue);
            },
            onGridReady: (params) => {
                console.log('[CSV_DEBUG] onGridReady called');
                params.api.sizeColumnsToFit();
                const quickFilterInput = document.getElementById('quickFilterInput');
                if (quickFilterInput) {
                    quickFilterInput.addEventListener('input', (e) => {
                        params.api.setGridOption('quickFilterText', e.target.value);
                    });
                }
            },
            animateRows: true,
            suppressRowClickSelection: false,
            suppressCellFocus: false,
            enterNavigatesVertically: true,
            enterNavigatesVerticallyAfterEdit: true,
            singleClickEdit: false,
            stopEditingWhenCellsLoseFocus: true,
            enableCellTextSelection: true
        };

        this.gridApi = agGrid.createGrid(gridContainer, gridOptions);
        this.gridInitialized = true;
        
        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.innerHTML = '<span style="color: var(--color-text-secondary); font-style: italic;">Click a cell in the table to see its full content here.</span>';
        }

        this.setupExportButton();

        setTimeout(() => {
            if (!this.restoreSelection()) {
                if (globalState.csvCellDetailPreviewer) {
                    globalState.csvCellDetailPreviewer.innerHTML = '<span style="color: var(--color-text-secondary); font-style: italic;">Click a cell in the table to see its full content here.</span>';
                }
            }
        }, 200);
    }

    handleAgGridCellEdit(event) {
        const rowIndex = event.node.rowIndex;
        const fieldName = event.colDef.field;
        const newValue = event.newValue || '';
        const oldValue = event.oldValue || '';
        
        console.log('[CSV_DEBUG] handleAgGridCellEdit called:', {
            rowIndex,
            fieldName,
            oldValue: `"${oldValue}"`,
            newValue: `"${newValue}"`
        });
        
        if (isNaN(rowIndex) || !fieldName) {
            console.error('[CSV_DEBUG] Invalid cell edit event:', { rowIndex, fieldName });
            return;
        }

        if (!globalState.csvData[rowIndex]) {
            console.error('[CSV_DEBUG] No row at index', rowIndex, 'in csvData');
            return;
        }

        // PINPOINT DEBUGGING - Show exactly what happens during assignment
        console.log(`[CSV_DEBUG] BEFORE assignment - Row ${rowIndex} ${fieldName}:`, globalState.csvData[rowIndex][fieldName]);
        console.log(`[CSV_DEBUG] BEFORE assignment - Row 16 Title:`, globalState.csvData[16].Title);
        
        // Make the assignment
        console.log(`[CSV_DEBUG] Executing: globalState.csvData[${rowIndex}][${fieldName}] = "${newValue}"`);
        globalState.csvData[rowIndex][fieldName] = newValue;
        
        console.log(`[CSV_DEBUG] AFTER assignment - Row ${rowIndex} ${fieldName}:`, globalState.csvData[rowIndex][fieldName]);
        console.log(`[CSV_DEBUG] AFTER assignment - Row 16 Title:`, globalState.csvData[16].Title);
        
        // Check if editedCsvData assignment also causes issues
        if (globalState.editedCsvData[rowIndex]) {
            console.log(`[CSV_DEBUG] BEFORE editedCsvData assignment - Row 16 Title:`, globalState.csvData[16].Title);
            globalState.editedCsvData[rowIndex][fieldName] = newValue;
            console.log(`[CSV_DEBUG] AFTER editedCsvData assignment - Row 16 Title:`, globalState.csvData[16].Title);
        }
    }

    selectCellAndShowInPreviewer(event) {
        const rowIndex = event.node.rowIndex;
        const fieldName = event.colDef.field;
        const gridValue = event.value || '';
        
        const actualValue = globalState.csvData[rowIndex] ? (globalState.csvData[rowIndex][fieldName] || '') : '';
        
        if (gridValue !== actualValue) {
            console.warn('[CSV_DEBUG] GRID/STATE MISMATCH DETECTED:', {
                rowIndex,
                fieldName,
                gridValue: `"${gridValue}"`,
                globalStateValue: `"${actualValue}"`
            });
        }
        
        event.node.setSelected(true);
        this.showAgGridCellInPreviewer(rowIndex, fieldName, actualValue);
    }

    showAgGridCellInPreviewer(rowIndex, fieldName, value) {
        if (!globalState.csvCellDetailPreviewer) return;
        
        globalState.csvCellDetailPreviewer.innerHTML = '';

        const container = document.createElement('div');
        container.style.cssText = 'display: flex; align-items: flex-start; gap: 8px; width: 100%;';

        const headerDisplay = document.createElement('div');
        headerDisplay.className = 'preview-field-name';
        headerDisplay.style.cssText = 'color: var(--color-text-primary); font-weight: 600; font-size: 14px; white-space: nowrap; padding-top: 8px;';
        headerDisplay.textContent = `${fieldName}:`;

        const textarea = document.createElement('textarea');
        textarea.style.cssText = 'flex: 1; padding: 8px 12px; border: 1px solid var(--color-border-primary); border-radius: 6px; font-size: 12px; font-family: var(--font-family-mono); background-color: white; resize: vertical; transition: all 150ms; outline: none; min-height: 36px;';
        textarea.value = value || '';
        textarea.dataset.rowIndex = rowIndex;
        textarea.dataset.fieldName = fieldName;
        
        this.currentPreviewField = textarea;
        textarea.readOnly = false;
        
        if (!value || value.trim() === '') {
            textarea.placeholder = 'Click here to edit, or double-click the cell above for inline editing';
        }

        container.appendChild(headerDisplay);
        container.appendChild(textarea);
        globalState.csvCellDetailPreviewer.appendChild(container);

        let updateTimeout;
        
        const updateGridFromPreview = () => {
            if (this._isUpdatingFromGrid) return;
            
            const newValue = textarea.value;
            const currentRowIndex = parseInt(textarea.dataset.rowIndex);
            const currentFieldName = textarea.dataset.fieldName;
            
            if (globalState.csvData[currentRowIndex]) {
                globalState.csvData[currentRowIndex][currentFieldName] = newValue;
            }
            if (globalState.editedCsvData[currentRowIndex]) {
                globalState.editedCsvData[currentRowIndex][currentFieldName] = newValue;
            }
            
            if (this.gridApi && !this.gridApi.isDestroyed()) {
                const rowNode = this.gridApi.getRowNode(currentRowIndex);
                if (rowNode) {
                    this._isUpdatingFromPreview = true;
                    
                    try {
                        rowNode.setDataValue(currentFieldName, newValue);
                        this.gridApi.refreshCells({
                            rowNodes: [rowNode],
                            columns: [currentFieldName],
                            force: true
                        });
                    } catch (error) {
                        console.error('[CSV_DEBUG] Error updating grid from preview:', error);
                    } finally {
                        setTimeout(() => {
                            this._isUpdatingFromPreview = false;
                        }, 100);
                    }
                }
            }
        };

        textarea.addEventListener('input', () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(updateGridFromPreview, 300);
        });

        textarea.addEventListener('blur', () => {
            clearTimeout(updateTimeout);
            updateGridFromPreview();
            textarea.style.borderColor = 'var(--color-border-primary)';
            textarea.style.boxShadow = 'none';
            textarea.style.backgroundColor = 'white';
            if (!textarea.value || textarea.value.trim() === '') {
                textarea.placeholder = 'Click here to edit, or double-click the cell above for inline editing';
            }
        });

        textarea.addEventListener('focus', () => {
            textarea.style.borderColor = 'var(--color-border-focus)';
            textarea.style.boxShadow = 'var(--focus-ring)';
            textarea.style.backgroundColor = '#f8f9fa';
        });
        
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                clearTimeout(updateTimeout);
                updateGridFromPreview();
                textarea.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                textarea.value = value;
                textarea.blur();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                clearTimeout(updateTimeout);
                updateGridFromPreview();
                this.moveToNextCell(rowIndex, fieldName);
            }
        });

        setTimeout(() => {
            this.saveCurrentSelection();
        }, 50);
    }

    syncGridToPreview(rowIndex, fieldName, newValue) {
        if (!this.currentPreviewField || this._isUpdatingFromPreview) return;
        
        const currentRowIndex = parseInt(this.currentPreviewField.dataset.rowIndex);
        const currentFieldName = this.currentPreviewField.dataset.fieldName;
        
        if (currentRowIndex === rowIndex && currentFieldName === fieldName) {
            this._isUpdatingFromGrid = true;
            
            const valueToSet = (newValue !== null && newValue !== undefined) ? newValue : '';
            this.currentPreviewField.value = valueToSet;
            
            if (valueToSet.trim() !== '' && this.currentPreviewField.placeholder) {
                this.currentPreviewField.placeholder = '';
            }
            
            setTimeout(() => {
                this._isUpdatingFromGrid = false;
            }, 100);
        }
    }

    setupLiveCellSync(event) {
        const rowIndex = event.node.rowIndex;
        const fieldName = event.colDef.field;
        
        setTimeout(() => {
            const cellEditor = document.querySelector('.ag-cell-editor input, .ag-cell-editor textarea');
            if (cellEditor && this.currentPreviewField) {
                const currentRowIndex = parseInt(this.currentPreviewField.dataset.rowIndex);
                const currentFieldName = this.currentPreviewField.dataset.fieldName;
                
                if (currentRowIndex === rowIndex && currentFieldName === fieldName) {
                    const syncToPreview = () => {
                        if (this.currentPreviewField && !this._isUpdatingFromPreview) {
                            const editorValue = cellEditor.value;
                            this.currentPreviewField.value = editorValue;
                        }
                    };
                    
                    cellEditor.removeEventListener('input', cellEditor._syncHandler);
                    cellEditor._syncHandler = syncToPreview;
                    cellEditor.addEventListener('input', syncToPreview);
                }
            }
        }, 50);
    }

    moveToNextCell(currentRowIndex, currentFieldName) {
        if (!this.gridApi || !globalState.csvHeaders) return;
        
        const currentColIndex = globalState.csvHeaders.indexOf(currentFieldName);
        let nextRowIndex = currentRowIndex;
        let nextColIndex = currentColIndex + 1;
        
        if (nextColIndex >= globalState.csvHeaders.length) {
            nextColIndex = 0;
            nextRowIndex = currentRowIndex + 1;
        }
        
        if (nextRowIndex >= globalState.csvData.length) return;
        
        const nextFieldName = globalState.csvHeaders[nextColIndex];
        const nextValue = globalState.csvData[nextRowIndex][nextFieldName] || '';
        
        this.gridApi.setFocusedCell(nextRowIndex, nextFieldName);
        this.showAgGridCellInPreviewer(nextRowIndex, nextFieldName, nextValue);
    }

    isGridReady() {
        return this.gridInitialized && this.gridApi && !this.gridApi.isDestroyed();
    }

    refreshGrid() {
        if (this.isGridReady()) {
            this.gridApi.setGridOption('rowData', globalState.csvData);
            this.gridApi.sizeColumnsToFit();
            return true;
        }
        return false;
    }

    cleanup() {
        if (this.gridApi && !this.gridApi.isDestroyed()) {
            this.gridApi.destroy();
        }
        this.gridApi = null;
        this.gridInitialized = false;
        this.currentPreviewField = null;
    }

    setupExportButton() {
        // Implementation remains minimal for debugging focus
    }

    saveCurrentSelection() {
        if (this.currentPreviewField) {
            globalState.lastCSVSelection = {
                rowIndex: parseInt(this.currentPreviewField.dataset.rowIndex),
                fieldName: this.currentPreviewField.dataset.fieldName,
                value: this.currentPreviewField.value
            };
        }
    }

    restoreSelection() {
        if (globalState.lastCSVSelection && this.isGridReady()) {
            const { rowIndex, fieldName, value } = globalState.lastCSVSelection;
            const currentValue = globalState.csvData[rowIndex] ? 
                globalState.csvData[rowIndex][fieldName] || value : value;
            
            this.showAgGridCellInPreviewer(rowIndex, fieldName, currentValue);
            
            setTimeout(() => {
                if (this.gridApi && !this.gridApi.isDestroyed()) {
                    const rowNode = this.gridApi.getRowNode(rowIndex);
                    if (rowNode) {
                        this.gridApi.setFocusedCell(rowIndex, fieldName);
                        rowNode.setSelected(true);
                    }
                }
            }, 100);
            return true;
        }
        return false;
    }
}