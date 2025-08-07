// js/csvEditor/csvManager.js (Production-ready with minimal logs)
import { globalState } from '../state/globalState.js';
import { CSV_CONFIG } from '../config/constants.js';

export class CSVManager {
    constructor() {
        this.gridApi = null;
        this.currentGridInstance = null;
        this.gridInitialized = false;
    }

    displayCSVTable() {
        const gridContainer = document.getElementById('csvGrid');
        
        if (!globalState.csvData || !globalState.csvHeaders || !gridContainer) {
            console.error('Missing data or grid container.');
            if (globalState.csvCellDetailPreviewer) {
                globalState.csvCellDetailPreviewer.innerHTML = '<p style="color: #dc2626;">Error: Missing data or grid container.</p>';
            }
            return;
        }

        if (globalState.csvData.length === 0) {
            gridContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-text-secondary); font-style: italic;">No CSV data to display.</div>';
            if (globalState.csvCellDetailPreviewer) {
                globalState.csvCellDetailPreviewer.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic;">No data to display.</p>';
            }
            return;
        }

        if (this.gridInitialized && this.gridApi) {
            let currentRowCount = 0;
            this.gridApi.forEachNode(() => currentRowCount++);
            if (currentRowCount === globalState.csvData.length) {
                this.gridApi.setGridOption('rowData', [...globalState.csvData]);
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
            rowData: [...globalState.csvData],
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
                this.handleAgGridCellEdit(event);
                if (!this._isCurrentlyEditing || (event.newValue && event.newValue.trim() !== '')) {
                    this.syncCellToPreview(event.node.rowIndex, event.colDef.field, event.newValue);
                }
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
                this._isCurrentlyEditing = true;
                this.setupLiveCellSync(event);
            },
            onCellEditingStopped: (event) => {
                this._isCurrentlyEditing = false;
                this.syncCellToPreview(event.node.rowIndex, event.colDef.field, event.newValue || event.oldValue);
            },
            onGridReady: (params) => {
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
            enableCellTextSelection: true,
            onCellKeyDown: (event) => {
                const key = event.event.key;
                const isEditing = event.node.isEditing && event.node.isEditing();
                
                if (!isEditing) {
                    if (key === 'F2' || key === 'Enter') {
                        event.api.startEditingCell({
                            rowIndex: event.node.rowIndex,
                            colKey: event.column.getColId()
                        });
                        event.event.preventDefault();
                    } else if (key === 'Delete' || key === 'Backspace') {
                        event.node.setDataValue(event.column.getColId(), '');
                        event.event.preventDefault();
                    }
                } else {
                    if (key === 'Escape') {
                        event.api.stopEditing(true);
                        event.event.preventDefault();
                    } else if (key === 'Enter') {
                        event.api.stopEditing(false);
                        event.event.preventDefault();
                    } else if (key === 'Tab') {
                        event.api.stopEditing(false);
                    }
                }
            },
        };

        this.gridApi = agGrid.createGrid(gridContainer, gridOptions);
        this.gridInitialized = true;
        
        if (globalState.csvCellDetailPreviewer) {
            globalState.csvCellDetailPreviewer.innerHTML = '<span style="color: var(--color-text-secondary); font-style: italic;">Click a cell in the table to see its full content here.</span>';
        }
        
        if (!globalState.originalCsvData.length && globalState.csvData.length) {
            globalState.originalCsvData = JSON.parse(JSON.stringify(globalState.csvData));
        }
        if (!globalState.editedCsvData.length && globalState.csvData.length) {
            globalState.editedCsvData = JSON.parse(JSON.stringify(globalState.csvData));
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
    }

    selectCellAndShowInPreviewer(event) {
        const rowIndex = event.node.rowIndex;
        const fieldName = event.colDef.field;
        const value = event.value || '';
        
        event.node.setSelected(true);
        this.showAgGridCellInPreviewer(rowIndex, fieldName, value);
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
        textarea.value = value;
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

        let isUpdatingFromCell = false;
        let updateTimeout;
        
        const updateGridCellFromPreview = () => {
            if (isUpdatingFromCell) return;
            
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
                    this._updatingFromPreview = true;
                    rowNode.setDataValue(currentFieldName, newValue);
                    setTimeout(() => this._updatingFromPreview = false, 100);
                }
            }
        };

        textarea.addEventListener('input', () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(updateGridCellFromPreview, 200);
        });

        textarea.addEventListener('click', () => {
            if (textarea.placeholder && textarea.placeholder.trim() !== '') {
                textarea.placeholder = '';
            }
        });

        textarea.addEventListener('focus', () => {
            if (textarea.placeholder && textarea.placeholder.trim() !== '') {
                textarea.placeholder = '';
            }
            textarea.style.borderColor = 'var(--color-border-focus)';
            textarea.style.boxShadow = 'var(--focus-ring)';
            textarea.style.backgroundColor = '#f8f9fa';
        });

        textarea.addEventListener('blur', () => {
            updateGridCellFromPreview();
            textarea.style.borderColor = 'var(--color-border-primary)';
            textarea.style.boxShadow = 'none';
            textarea.style.backgroundColor = 'white';
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
                textarea.value = value;
                textarea.blur();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                updateGridCellFromPreview();
                this.moveToNextCell(rowIndex, fieldName);
            }
        });

        setTimeout(() => {
            this.saveCurrentSelection();
        }, 50);
    }

    syncCellToPreview(rowIndex, fieldName, newValue) {
        if (!this.currentPreviewField) return;
        
        const currentRowIndex = parseInt(this.currentPreviewField.dataset.rowIndex);
        const currentFieldName = this.currentPreviewField.dataset.fieldName;
        
        if (currentRowIndex === rowIndex && currentFieldName === fieldName) {
            if (this._updatingFromPreview) return;
            
            const valueToSet = (newValue !== null && newValue !== undefined) ? newValue : '';
            this.currentPreviewField.value = valueToSet;
            
            if (valueToSet.trim() !== '' && this.currentPreviewField.placeholder) {
                this.currentPreviewField.placeholder = '';
            }
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
                        if (this.currentPreviewField && !this._updatingFromPreview) {
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
        
        if (nextRowIndex >= globalState.csvData.length) {
            return;
        }
        
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
            this.gridApi.setGridOption('rowData', [...globalState.csvData]);
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
    }

    setupExportButton() {
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
            }
        }

        if (exportBtn) {
            exportBtn.replaceWith(exportBtn.cloneNode(true));
            exportBtn = document.getElementById('saveCSVBtn');
            exportBtn.addEventListener('click', () => this.exportCSV());
        }
    }

    exportCSV() {
        try {
            if (this.gridApi && !this.gridApi.isDestroyed()) {
                const currentData = [];
                this.gridApi.forEachNode(node => {
                    if (node.data) {
                        currentData.push({ ...node.data, Proofed: globalState.proofingStates[node.rowIndex] ? 'true' : 'false' });
                    }
                });
                globalState.csvData = [...currentData];
                globalState.editedCsvData = [...currentData];
            }

            if (!globalState.csvHeaders || !globalState.csvData) {
                alert('No CSV data to export');
                return;
            }

            if (!globalState.csvHeaders.includes('Proofed')) {
                globalState.csvHeaders = [...globalState.csvHeaders, 'Proofed'];
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
            
            if (typeof generateBibliography === 'function') {
                generateBibliography();
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    }

    generateCSVContent() {
        if (typeof Papa !== 'undefined') {
            return Papa.unparse({
                fields: globalState.csvHeaders,
                data: globalState.csvData.map(row => {
                    const newRow = {};
                    globalState.csvHeaders.forEach(header => {
                        newRow[header] = row[header] || '';
                    });
                    return newRow;
                })
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