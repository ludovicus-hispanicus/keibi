// js/preview/previewSyncManager.js (Updated for your existing system)
import { globalState } from '../state/globalState.js';

export class PreviewSyncManager {
    constructor() {
        this.isUpdatingFromCsv = false;
        this.isUpdatingFromPreview = false;
        this.debounceTimeout = null;
    }
    
    initialize() {
        this.setupPreviewEditingListeners();
        console.log('[PREVIEW_SYNC] PreviewSyncManager initialized');
    }
    
    setupPreviewEditingListeners() {
        if (!globalState.bibliographyOutputGlobal) {
            console.warn('[PREVIEW_SYNC] Bibliography output element not found');
            return;
        }
        
        // Create help tooltip
        const helpTooltip = this.showShortcutHelp();
        
        // Show help tooltip for preview fields
        globalState.bibliographyOutputGlobal.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('editable-field') || e.target.classList.contains('sync-enabled')) {
                helpTooltip.style.display = 'block';
                setTimeout(() => {
                    helpTooltip.style.display = 'none';
                }, 5000); // Show longer for more complex help
            }
        });
        
        // Show help tooltip for CSV editors
        document.addEventListener('focusin', (e) => {
            const csvTab = document.querySelector('.tab-content#csv-editor-tab');
            const isCSVTabActive = csvTab && csvTab.style.display !== 'none';
            
            if (isCSVTabActive && (
                e.target.classList.contains('ag-cell-editor') ||
                e.target.closest('.ag-cell-editor') ||
                (e.target.tagName === 'INPUT' && e.target.closest('#csvGrid'))
            )) {
                helpTooltip.style.display = 'block';
                setTimeout(() => {
                    helpTooltip.style.display = 'none';
                }, 5000);
            }
        });
        
        // Hide tooltip on focus out
        document.addEventListener('focusout', (e) => {
            setTimeout(() => {
                // Only hide if no editable field has focus
                if (!document.querySelector('.editable-field:focus, .sync-enabled:focus, .ag-cell-editor input:focus')) {
                    helpTooltip.style.display = 'none';
                }
            }, 100);
        });
        
        // Your existing event listeners for preview...
        globalState.bibliographyOutputGlobal.addEventListener('input', (e) => {
            if (e.target.classList.contains('editable-field') || e.target.classList.contains('sync-enabled')) {
                this.handleFieldEdit(e.target);
            }
        });
        
        globalState.bibliographyOutputGlobal.addEventListener('blur', (e) => {
            if (e.target.classList.contains('editable-field') || e.target.classList.contains('sync-enabled')) {
                this.finalizeFieldEdit(e.target);
            }
        }, true);
        
        console.log('[PREVIEW_SYNC] Event listeners setup complete with dual-context keyboard shortcuts');
    }
    
    handleFieldEdit(fieldElement) {
        if (this.isUpdatingFromCsv) return;
        
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.syncFieldToCsv(fieldElement);
        }, 300);
    }
    
    finalizeFieldEdit(fieldElement) {
        if (this.isUpdatingFromCsv) return;
        
        clearTimeout(this.debounceTimeout);
        this.syncFieldToCsv(fieldElement);
    }
    
    syncFieldToCsv(fieldElement) {
        // Enhanced null checking
        if (!fieldElement) {
            console.warn('[PREVIEW_SYNC] syncFieldToCsv called with null fieldElement');
            return;
        }
        
        if (!fieldElement.dataset) {
            console.warn('[PREVIEW_SYNC] fieldElement has no dataset:', fieldElement);
            return;
        }
        
        // Check if the element is still in the DOM
        if (!document.body.contains(fieldElement)) {
            console.warn('[PREVIEW_SYNC] fieldElement no longer in DOM, skipping sync');
            return;
        }
        
        // Check if the element has the required data attributes
        if (!fieldElement.dataset.csvField && !fieldElement.dataset.fieldName) {
            console.warn('[PREVIEW_SYNC] fieldElement missing required data attributes');
            return;
        }
        
        // Handle both new system (data-csv-field) and old system (data-field-name)
        const csvField = fieldElement.dataset.csvField || this.mapFieldNameToCsvField(fieldElement.dataset.fieldName);
        const rowIndex = parseInt(fieldElement.dataset.rowIndex || fieldElement.dataset.entryIndex);
        
        if (isNaN(rowIndex) || !csvField) {
            console.warn('[PREVIEW_SYNC] Invalid field metadata:', { 
                csvField, 
                rowIndex, 
                hasDataset: !!fieldElement.dataset 
            });
            return;
        }
        
        try {
            const newContent = this.extractPlainTextContent(fieldElement);
            
            console.log('[PREVIEW_SYNC] Syncing field to CSV:', {
                csvField,
                rowIndex,
                newContent: newContent.substring(0, 50) + (newContent.length > 50 ? '...' : '')
            });
            
            // Update the CSV data
            this.updateCsvData(rowIndex, csvField, newContent);
            
            // Update the CSV grid if it's open
            this.updateCsvGrid(rowIndex, csvField, newContent);
            
            // Update the field's original content reference
            if (fieldElement.dataset.originalContent !== undefined) {
                fieldElement.dataset.originalContent = newContent;
            }
        } catch (error) {
            console.error('[PREVIEW_SYNC] Error in syncFieldToCsv:', error);
        }
    }
    
    mapFieldNameToCsvField(fieldName) {
        if (!fieldName) return null;
        
        const mapping = {
            'TITLE': 'Title',
            'YEAR': 'Publication Year',
            'JOURNAL': 'Publication Title',
            'VOLUME': 'Volume',
            'PAGES': 'Pages',
            'PLACE': 'Place',
            'PUBLISHER': 'Publisher',
            'URL': 'URL',
            'DOI': 'DOI',
            'ITEM TYPE': 'Item Type',
            'SERIES': 'Series',
            'SERIES NUMBER': 'Series Number',
            'AKKADIAN': 'Akkadian',
            'DETERMINATIVE': 'Determinative',
            'KEIBI': 'related',
            'CONFER': 'Confer',
            'REVIEWER': 'Author Review'
        };
        
        // Handle numbered author/editor fields
        if (fieldName.startsWith('LASTNAME_') || fieldName.startsWith('FIRSTNAME_')) {
            return 'Author';
        }
        if (fieldName.startsWith('ED_LASTNAME_') || fieldName.startsWith('ED_FIRSTNAME_')) {
            return 'Editor';
        }
        
        return mapping[fieldName] || fieldName;
    }
    
    // ADD this method to your PreviewSyncManager to show shortcut help:

    showShortcutHelp() {
        const helpTooltip = document.createElement('div');
        helpTooltip.id = 'shortcut-help-tooltip';
        helpTooltip.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            font-size: 12px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: none;
            max-width: 320px;
            line-height: 1.5;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        // Detect if user is on Mac
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
        const modifier = isMac ? '⌘' : 'Ctrl';
        
        helpTooltip.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 12px; color: #ffd700;">Formatting Shortcuts</div>
            
            <div style="margin-bottom: 10px;">
                <div style="font-weight: 600; margin-bottom: 4px; color: #87ceeb;">In Preview (Visual):</div>
                <div style="margin-left: 8px;">
                    <div>${modifier}+I - <i>Italic text</i></div>
                    <div>${modifier}+Shift+= - Text<sup>superscript</sup></div>
                    <div>${modifier}+= - Text<sub>subscript</sub></div>
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <div style="font-weight: 600; margin-bottom: 4px; color: #98fb98;">In CSV Editor (Tags):</div>
                <div style="margin-left: 8px;">
                    <div>${modifier}+I - &lt;i&gt;text&lt;/i&gt;</div>
                    <div>${modifier}+Shift+= - &lt;sup&gt;text&lt;/sup&gt;</div>
                    <div>${modifier}+= - &lt;sub&gt;text&lt;/sub&gt;</div>
                </div>
            </div>
            
            <div style="border-top: 1px solid #444; padding-top: 8px; margin-top: 8px;">
                <div>${modifier}+Shift+C - Clear formatting</div>
                <div style="font-size: 10px; color: #ccc; margin-top: 4px;">or ${modifier}+0 to clear</div>
            </div>
        `;
        
        document.body.appendChild(helpTooltip);
        return helpTooltip;
    }


    setupPreviewEditingListeners() {
        if (!globalState.bibliographyOutputGlobal) {
            console.warn('[PREVIEW_SYNC] Bibliography output element not found');
            return;
        }
        
        // Create help tooltip
        const helpTooltip = this.showShortcutHelp();
        
        // Show/hide help tooltip when editing fields
        globalState.bibliographyOutputGlobal.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('editable-field') || e.target.classList.contains('sync-enabled')) {
                helpTooltip.style.display = 'block';
                setTimeout(() => {
                    helpTooltip.style.display = 'none';
                }, 3000); // Hide after 3 seconds
            }
        });
        
        globalState.bibliographyOutputGlobal.addEventListener('focusout', (e) => {
            if (e.target.classList.contains('editable-field') || e.target.classList.contains('sync-enabled')) {
                setTimeout(() => {
                    // Only hide if no other editable field has focus
                    if (!document.querySelector('.editable-field:focus, .sync-enabled:focus')) {
                        helpTooltip.style.display = 'none';
                    }
                }, 100);
            }
        });
        
        // Your existing event listeners...
        globalState.bibliographyOutputGlobal.addEventListener('input', (e) => {
            if (e.target.classList.contains('editable-field') || e.target.classList.contains('sync-enabled')) {
                this.handleFieldEdit(e.target);
            }
        });
        
        globalState.bibliographyOutputGlobal.addEventListener('blur', (e) => {
            if (e.target.classList.contains('editable-field') || e.target.classList.contains('sync-enabled')) {
                this.finalizeFieldEdit(e.target);
            }
        }, true);
        
        console.log('[PREVIEW_SYNC] Event listeners setup complete with keyboard shortcuts');
    }
    
    // REPLACE the extractPlainTextContent method in PreviewSyncManager:

    extractPlainTextContent(fieldElement) {
        // Instead of extracting plain text, preserve HTML formatting
        const clone = fieldElement.cloneNode(true);
        
        // Get the HTML content
        let htmlContent = clone.innerHTML;
        
        // Clean up any nested editable spans that might have been added during processing
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Remove any nested .editable-field spans to avoid duplication
        const nestedEditableFields = tempDiv.querySelectorAll('.editable-field');
        nestedEditableFields.forEach(nested => {
            // Replace the nested span with just its content
            nested.replaceWith(...nested.childNodes);
        });
        
        // Get the cleaned HTML
        const finalHTML = tempDiv.innerHTML;
        
        // Check if there's any formatting
        const hasFormatting = finalHTML.includes('<') && finalHTML.includes('>');
        
        if (hasFormatting) {
            console.log('[PREVIEW_SYNC] Preserving HTML formatting:', finalHTML);
            return finalHTML; // Return HTML instead of plain text
        } else {
            // If no formatting, return plain text
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            console.log('[PREVIEW_SYNC] No formatting, using plain text:', plainText);
            return plainText;
        }
    }

    // ALSO UPDATE the updatePreviewFromCsv method to handle HTML content:

    updatePreviewFromCsv(rowIndex, csvField, newValue) {
        if (this.isUpdatingFromPreview) return;
        
        this.isUpdatingFromCsv = true;
        
        try {
            // Find all editable fields for this row and CSV field
            const editableFields = globalState.bibliographyOutputGlobal.querySelectorAll(
                `.editable-field[data-row-index="${rowIndex}"][data-csv-field="${csvField}"], ` +
                `.editable-field[data-entry-index="${rowIndex}"], ` +
                `.sync-enabled[data-row-index="${rowIndex}"][data-csv-field="${csvField}"]`
            );
            
            editableFields.forEach(field => {
                // Check if this field corresponds to the changed CSV field
                const fieldCsvField = field.dataset.csvField || this.mapFieldNameToCsvField(field.dataset.fieldName);
                if (fieldCsvField === csvField) {
                    
                    // Check if the new value contains HTML
                    if (newValue && newValue.includes('<') && newValue.includes('>')) {
                        console.log('[PREVIEW_SYNC] Updating field with HTML content:', newValue);
                        field.innerHTML = newValue;
                    } else {
                        console.log('[PREVIEW_SYNC] Updating field with plain text:', newValue);
                        field.textContent = newValue;
                    }
                    
                    if (field.dataset.originalContent !== undefined) {
                        field.dataset.originalContent = newValue;
                    }
                }
            });
            
            console.log('[PREVIEW_SYNC] Updated preview from CSV:', { rowIndex, csvField, newValue });
        } catch (error) {
            console.error('[PREVIEW_SYNC] Error updating preview from CSV:', error);
        } finally {
            setTimeout(() => {
                this.isUpdatingFromCsv = false;
            }, 50);
        }
    }

    // ADD this method to handle HTML content properly in the grid:

    displayHtmlInGrid(htmlContent) {
        // For the CSV grid, we might want to show a simplified version
        // or indicate that there's formatting present
        
        if (htmlContent && htmlContent.includes('<') && htmlContent.includes('>')) {
            // Create a preview that shows both the formatted text and indicates HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            
            // Return a formatted string that indicates HTML is present
            return `${plainText} [HTML]`;
        }
        
        return htmlContent;
    }
    
    updateCsvData(rowIndex, csvField, newContent) {
        console.log('[PREVIEW_SYNC] updateCsvData called:', { rowIndex, csvField, newContent });
        
        if (!globalState.csvData[rowIndex]) {
            console.error('[PREVIEW_SYNC] Row not found:', rowIndex);
            return;
        }
        
        // Log the current state before update
        console.log('[PREVIEW_SYNC] Before update:', {
            rowIndex,
            csvField,
            currentValue: globalState.csvData[rowIndex][csvField],
            newContent
        });
        
        // Update both csvData and editedCsvData
        globalState.csvData[rowIndex][csvField] = newContent;
        
        if (globalState.editedCsvData[rowIndex]) {
            globalState.editedCsvData[rowIndex][csvField] = newContent;
        }
        
        // Also update originalCsvData to keep it in sync (optional, depends on your use case)
        if (globalState.originalCsvData[rowIndex]) {
            globalState.originalCsvData[rowIndex][csvField] = newContent;
        }
        
        // Verify the update
        console.log('[PREVIEW_SYNC] After update:', {
            rowIndex,
            csvField,
            newValue: globalState.csvData[rowIndex][csvField],
            editedValue: globalState.editedCsvData[rowIndex] ? globalState.editedCsvData[rowIndex][csvField] : 'N/A'
        });
        
        // Trigger a data integrity check
        setTimeout(() => {
            this.verifyDataIntegrity(rowIndex, csvField, newContent);
        }, 50);
    }

    // ADD this verification method to PreviewSyncManager:

    verifyDataIntegrity(rowIndex, csvField, expectedValue) {
        const actualValue = globalState.csvData[rowIndex][csvField];
        if (actualValue !== expectedValue) {
            console.error('[PREVIEW_SYNC] DATA INTEGRITY ERROR:', {
                rowIndex,
                csvField,
                expected: expectedValue,
                actual: actualValue
            });
            
            // Attempt to fix it
            globalState.csvData[rowIndex][csvField] = expectedValue;
            if (globalState.editedCsvData[rowIndex]) {
                globalState.editedCsvData[rowIndex][csvField] = expectedValue;
            }
            
            console.log('[PREVIEW_SYNC] Attempted to fix data integrity issue');
        }
    }
    
    updateCsvGrid(rowIndex, csvField, newContent) {
        console.log('[PREVIEW_SYNC] updateCsvGrid called:', { rowIndex, csvField, newContent });
        
        // Always try to update the grid, regardless of whether CSV tab is active
        if (globalState.csvManager) {
            console.log('[PREVIEW_SYNC] CSV manager exists, checking grid state...');
            
            // Check if grid exists and is initialized
            if (globalState.csvManager.gridApi && !globalState.csvManager.gridApi.isDestroyed()) {
                console.log('[PREVIEW_SYNC] Grid API is available');
                
                const rowNode = globalState.csvManager.gridApi.getRowNode(rowIndex);
                
                if (rowNode) {
                    this.isUpdatingFromPreview = true;
                    
                    try {
                        console.log('[PREVIEW_SYNC] Updating grid row node:', {
                            rowIndex,
                            currentValue: rowNode.data[csvField],
                            newValue: newContent
                        });
                        
                        // Update the row data directly first
                        rowNode.data[csvField] = newContent;
                        
                        // Then update through the API
                        rowNode.setDataValue(csvField, newContent);
                        
                        // Force refresh the specific cell
                        globalState.csvManager.gridApi.refreshCells({
                            rowNodes: [rowNode],
                            columns: [csvField],
                            force: true
                        });
                        
                        console.log('[PREVIEW_SYNC] Grid update successful');
                        
                    } catch (error) {
                        console.error('[PREVIEW_SYNC] Error updating CSV grid:', error);
                    } finally {
                        setTimeout(() => {
                            this.isUpdatingFromPreview = false;
                        }, 100);
                    }
                } else {
                    console.warn('[PREVIEW_SYNC] Row node not found for index:', rowIndex);
                }
            } else if (globalState.csvManager.gridInitialized === false) {
                console.log('[PREVIEW_SYNC] Grid not initialized yet, will update when CSV tab is opened');
            } else {
                console.warn('[PREVIEW_SYNC] Grid API not available or destroyed');
            }
        } else {
            console.warn('[PREVIEW_SYNC] CSV manager not found');
        }
    }

    // ADD this debug method to PreviewSyncManager to check the state:

    debugSyncState() {
        console.log('=== SYNC STATE DEBUG ===');
        console.log('CSV Manager exists:', !!globalState.csvManager);
        if (globalState.csvManager) {
            console.log('Grid initialized:', globalState.csvManager.gridInitialized);
            console.log('Grid API exists:', !!globalState.csvManager.gridApi);
            console.log('Grid API destroyed:', globalState.csvManager.gridApi ? globalState.csvManager.gridApi.isDestroyed() : 'N/A');
        }
        console.log('=== END SYNC STATE DEBUG ===');
    }

    preserveFormattingInField(fieldElement, newTextContent) {
        // This method would preserve formatting while updating content
        // For now, we'll implement basic formatting preservation
        
        const currentHTML = fieldElement.innerHTML;
        const hasFormatting = currentHTML.includes('<') && currentHTML.includes('>');
        
        if (!hasFormatting) {
            // No formatting to preserve, just update text
            fieldElement.textContent = newTextContent;
            return;
        }
        
        // Try to preserve formatting structure
        // This is a simple approach - you might want to make it more sophisticated
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = currentHTML;
        
        // Update the text content while preserving structure
        const walker = document.createTreeWalker(
            tempDiv,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let textNode;
        let allText = '';
        const textNodes = [];
        
        while (textNode = walker.nextNode()) {
            textNodes.push(textNode);
            allText += textNode.textContent;
        }
        
        // If the text length matches, we can try to update proportionally
        if (allText.trim() === fieldElement.textContent.trim()) {
            // For now, just replace the first text node
            if (textNodes.length > 0) {
                textNodes[0].textContent = newTextContent;
                // Clear other text nodes
                for (let i = 1; i < textNodes.length; i++) {
                    textNodes[i].textContent = '';
                }
                fieldElement.innerHTML = tempDiv.innerHTML;
            }
        } else {
            // Fallback to simple text replacement
            fieldElement.textContent = newTextContent;
        }
    }
    // Called when CSV data is updated from the grid
    updatePreviewFromCsv(rowIndex, csvField, newValue) {
        if (this.isUpdatingFromPreview) return;
        
        this.isUpdatingFromCsv = true;
        
        try {
            // Find all editable fields for this row and CSV field
            const editableFields = globalState.bibliographyOutputGlobal.querySelectorAll(
                `.editable-field[data-row-index="${rowIndex}"][data-csv-field="${csvField}"], ` +
                `.editable-field[data-entry-index="${rowIndex}"], ` +
                `.sync-enabled[data-row-index="${rowIndex}"][data-csv-field="${csvField}"]`
            );
            
            editableFields.forEach(field => {
                // Check if this field corresponds to the changed CSV field
                const fieldCsvField = field.dataset.csvField || this.mapFieldNameToCsvField(field.dataset.fieldName);
                if (fieldCsvField === csvField) {
                    field.textContent = newValue;
                    if (field.dataset.originalContent !== undefined) {
                        field.dataset.originalContent = newValue;
                    }
                }
            });
            
            console.log('[PREVIEW_SYNC] Updated preview from CSV:', { rowIndex, csvField, newValue });
        } catch (error) {
            console.error('[PREVIEW_SYNC] Error updating preview from CSV:', error);
        } finally {
            setTimeout(() => {
                this.isUpdatingFromCsv = false;
            }, 50);
        }
    }
    
    // Regenerate the entire preview after major changes
    async regeneratePreview() {
        if (this.isUpdatingFromPreview) return;
        
        try {
            const module = await import('./BibliographyGenerator.js');
            const generator = new module.BibliographyGenerator();
            generator.generateBibliography();
            
            // Re-setup listeners after regeneration
            setTimeout(() => {
                this.setupPreviewEditingListeners();
            }, 100);
        } catch (error) {
            console.error('[PREVIEW_SYNC] Error regenerating preview:', error);
        }
    }
}