// js/state/globalState.js (Debug version with comprehensive logging)
import { DEFAULT_STYLE_TEMPLATES } from '../config/constants.js';

// Global state management with debug logging
class GlobalState {
    constructor() {
        console.log('[GLOBAL_STATE_DEBUG] GlobalState constructor called');
        
        // DOM elements
        this.outputDiv = null;
        this.entryCount = null;
        this.styleEditorsContainer = null;
        this.formatPreviewPanel = null;
        this.entryTypesContainerEl = null;
        this.stylePreviewMainDisplay = null;
        this.csvCellDetailPreviewer = null;
        this.currentFileHandle = null;

        // Data with proxy for debugging
        this._csvData = [];
        this._csvHeaders = [];
        this._originalCsvData = [];
        this._editedCsvData = [];
        
        // Create proxies to track modifications
        this.csvData = this.createDebugProxy('csvData', this._csvData);
        this.csvHeaders = this._csvHeaders;
        this.originalCsvData = this._originalCsvData;
        this.editedCsvData = this.createDebugProxy('editedCsvData', this._editedCsvData);
        
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
            console.error('[GLOBAL_STATE_DEBUG] Invalid proofingStates in localStorage:', e);
            this.proofingStates = {};
            localStorage.setItem('proofingStates', JSON.stringify(this.proofingStates));
        }

        console.log('[GLOBAL_STATE_DEBUG] GlobalState initialized');
    }

    createDebugProxy(arrayName, targetArray) {
        return new Proxy(targetArray, {
            set(target, property, value, receiver) {
                if (property === 'length') {
                    console.log(`[GLOBAL_STATE_DEBUG] ${arrayName}.length set to:`, value);
                } else if (!isNaN(property)) {
                    const index = parseInt(property);
                    if (typeof value === 'object' && value !== null) {
                        console.log(`[GLOBAL_STATE_DEBUG] ${arrayName}[${index}] set to object:`, {
                            keys: Object.keys(value),
                            sampleValues: this.getSampleValues(value)
                        });
                        
                        // Create a proxy for the row object to track field modifications
                        value = this.createRowDebugProxy(arrayName, index, value);
                    } else {
                        console.log(`[GLOBAL_STATE_DEBUG] ${arrayName}[${index}] set to:`, value);
                    }
                }
                return Reflect.set(target, property, value, receiver);
            },
            get(target, property, receiver) {
                return Reflect.get(target, property, receiver);
            }
        });
    }

    createRowDebugProxy(arrayName, rowIndex, rowObject) {
        return new Proxy(rowObject, {
            set(target, property, value, receiver) {
                const oldValue = target[property];
                if (oldValue !== value) {
                    console.log(`[GLOBAL_STATE_DEBUG] ${arrayName}[${rowIndex}].${property} changed:`, {
                        oldValue: `"${oldValue || ''}"`,
                        newValue: `"${value || ''}"`,
                        stackTrace: new Error().stack.split('\n').slice(1, 4).join('\n')
                    });
                    
                    // Check if this modification might be affecting other rows
                    this.checkForCrossRowEffects(arrayName, rowIndex, property, value);
                }
                return Reflect.set(target, property, value, receiver);
            },
            get(target, property, receiver) {
                return Reflect.get(target, property, receiver);
            }
        });
    }

    checkForCrossRowEffects(arrayName, modifiedRowIndex, modifiedProperty, newValue) {
        // This method will be bound to the GlobalState instance
        const globalStateInstance = globalState; // Reference to the global instance
        
        setTimeout(() => {
            if (arrayName === 'csvData' && globalStateInstance._csvData) {
                let suspiciousMatches = [];
                
                globalStateInstance._csvData.forEach((row, rowIndex) => {
                    if (rowIndex === modifiedRowIndex) return;
                    
                    Object.keys(row).forEach(fieldName => {
                        if (row[fieldName] === newValue && newValue.trim() !== '') {
                            suspiciousMatches.push({
                                rowIndex,
                                fieldName,
                                value: row[fieldName]
                            });
                        }
                    });
                });

                if (suspiciousMatches.length > 0) {
                    console.warn(`[GLOBAL_STATE_DEBUG] POTENTIAL ISSUE: Modified ${arrayName}[${modifiedRowIndex}].${modifiedProperty} but found same value in other locations:`, {
                        modifiedLocation: { rowIndex: modifiedRowIndex, property: modifiedProperty, value: newValue },
                        suspiciousMatches
                    });
                }
            }
        }, 10);
    }

    getSampleValues(obj) {
        const sample = {};
        const keys = Object.keys(obj).slice(0, 5); // First 5 keys
        keys.forEach(key => {
            const value = obj[key];
            if (typeof value === 'string' && value.length > 50) {
                sample[key] = `"${value.substring(0, 47)}..."`;
            } else {
                sample[key] = `"${value}"`;
            }
        });
        return sample;
    }

    setCsvData(data) {
        console.log('[GLOBAL_STATE_DEBUG] setCsvData called with', data.length, 'rows');
        
        // Deep copy to avoid reference issues
        const dataCopy = JSON.parse(JSON.stringify(data));
        
        // Clear and repopulate arrays
        this._csvData.length = 0;
        this._editedCsvData.length = 0;
        this._originalCsvData.length = 0;
        
        dataCopy.forEach((row, index) => {
            this._csvData.push(row);
            this._editedCsvData.push(JSON.parse(JSON.stringify(row)));
            this._originalCsvData.push(JSON.parse(JSON.stringify(row)));
        });
        
        console.log('[GLOBAL_STATE_DEBUG] setCsvData completed:', {
            csvDataLength: this._csvData.length,
            editedCsvDataLength: this._editedCsvData.length,
            originalCsvDataLength: this._originalCsvData.length
        });
    }

    getCsvData() {
        console.log('[GLOBAL_STATE_DEBUG] getCsvData called, returning', this._csvData.length, 'rows');
        return this._csvData;
    }

    setStyleTemplates(templates) {
        console.log('[GLOBAL_STATE_DEBUG] setStyleTemplates called');
        this.styleTemplates = templates;
    }

    getStyleTemplates() {
        console.log('[GLOBAL_STATE_DEBUG] getStyleTemplates called');
        return this.styleTemplates;
    }

    resetStyleTemplates() {
        console.log('[GLOBAL_STATE_DEBUG] resetStyleTemplates called');
        this.styleTemplates = { ...DEFAULT_STYLE_TEMPLATES };
    }

    // Debug method to check data integrity
    checkDataIntegrity() {
        console.log('[GLOBAL_STATE_DEBUG] Data integrity check:');
        
        const issues = [];
        
        // Check if arrays have same length
        if (this._csvData.length !== this._editedCsvData.length) {
            issues.push(`Length mismatch: csvData(${this._csvData.length}) vs editedCsvData(${this._editedCsvData.length})`);
        }
        
        // Check for unexpected duplicates
        const valueCounts = new Map();
        this._csvData.forEach((row, rowIndex) => {
            Object.keys(row).forEach(fieldName => {
                const value = row[fieldName];
                if (value && value.trim() !== '') {
                    const key = `${fieldName}:${value}`;
                    if (!valueCounts.has(key)) {
                        valueCounts.set(key, []);
                    }
                    valueCounts.get(key).push({ rowIndex, fieldName });
                }
            });
        });
        
        // Find duplicates
        const duplicates = [];
        valueCounts.forEach((locations, key) => {
            if (locations.length > 1) {
                duplicates.push({ key, locations });
            }
        });
        
        if (duplicates.length > 0) {
            console.warn('[GLOBAL_STATE_DEBUG] Found duplicate values:', duplicates);
        }
        
        if (issues.length > 0) {
            console.error('[GLOBAL_STATE_DEBUG] Data integrity issues found:', issues);
        } else {
            console.log('[GLOBAL_STATE_DEBUG] No data integrity issues found');
        }
        
        return { issues, duplicates };
    }
}

export function updateEntryCount(count) {
    console.log('[GLOBAL_STATE_DEBUG] updateEntryCount called with:', count);
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