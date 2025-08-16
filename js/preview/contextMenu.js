// js/preview/contextMenu.js (Enhanced version)
import { globalState } from '../state/globalState.js';

export class PreviewContextMenu {
    constructor() {
        this.customContextMenu = null;
        this.currentField = null;
        this.currentContext = null; // 'preview' or 'csv'
        this.setupKeyboardShortcuts();
        this.setupCsvContextMenu();
    }

    setupCsvContextMenu() {
        // Add context menu support to CSV grid
        document.addEventListener('contextmenu', (e) => {
            // Check if we're in the CSV editor tab and in a cell being edited
            const csvTab = document.querySelector('.tab-content#csv-editor-tab');
            const isCSVTabActive = csvTab && csvTab.style.display !== 'none';
            
            if (isCSVTabActive) {
                // Check if we're in an AG-Grid cell editor
                const cellEditor = e.target.closest('.ag-cell-editor');
                const textInput = e.target.closest('input[type="text"], textarea');
                
                if (cellEditor || textInput) {
                    e.preventDefault();
                    this.currentContext = 'csv';
                    this.currentField = e.target;
                    this.showContextMenu(e);
                }
            }
            // Check if we're in the preview tab
            else if (globalState.bibliographyOutputGlobal && 
                     globalState.bibliographyOutputGlobal.contains(e.target)) {
                this.currentContext = 'preview';
                this.showContextMenu(e);
            }
        });
    }

    setupKeyboardShortcuts() {
        console.log('[CONTEXT_MENU] Setting up international keyboard shortcuts');
        
        document.addEventListener('keydown', (e) => {
            // Determine context: preview editable field or CSV cell editor
            const activeElement = document.activeElement;
            let isValidContext = false;
            let contextType = null;
            
            // Check if we're in a preview editable field
            if (activeElement && activeElement.classList.contains('editable-field')) {
                isValidContext = true;
                contextType = 'preview';
            }
            // Check if we're in a CSV cell editor
            else if (activeElement && (
                activeElement.classList.contains('ag-cell-editor') ||
                activeElement.closest('.ag-cell-editor') ||
                (activeElement.tagName === 'INPUT' && activeElement.closest('#csvGrid'))
            )) {
                isValidContext = true;
                contextType = 'csv';
            }
            
            if (!isValidContext) return;

            // Check for Ctrl/Cmd modifier
            const isModifierPressed = e.ctrlKey || e.metaKey;
            if (!isModifierPressed) return;

            let formatAction = null;
            let preventDefault = false;

            // Italic: Ctrl+I / Cmd+I
            if (e.key === 'i' || e.key === 'I') {
                formatAction = 'italic';
                preventDefault = true;
            }
            // Superscript: Ctrl+Shift+= / Cmd+Shift+=
            else if (e.key === '+' && e.shiftKey) {
                formatAction = 'superscript';
                preventDefault = true;
            }
            // Subscript: Ctrl+= / Cmd+=
            else if (e.key === '=' && !e.shiftKey) {
                formatAction = 'subscript';
                preventDefault = true;
            }
            // Clear formatting: Ctrl+Shift+C / Cmd+Shift+C
            else if ((e.key === 'c' || e.key === 'C') && e.shiftKey) {
                formatAction = 'clear';
                preventDefault = true;
            }
            // Alternative clear formatting: Ctrl+0 / Cmd+0
            else if (e.key === '0' && !e.shiftKey) {
                formatAction = 'clear';
                preventDefault = true;
            }

            if (formatAction && preventDefault) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('[CONTEXT_MENU] Keyboard shortcut triggered:', formatAction, 'in', contextType);
                this.currentContext = contextType;
                this.currentField = activeElement;
                this.applyFormattingToActiveField(formatAction, activeElement);
            }
        });
    }

    applyFormattingToActiveField(formatAction, fieldElement) {
        // Set the current field for the formatting system
        this.currentField = fieldElement;
        
        // Get the current selection
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            globalState.savedSelectionRange = selection.getRangeAt(0).cloneRange();
        }
        
        // Apply the formatting
        this.applyFormattingStyle(formatAction);
    }


    createContextMenuStructure() {
        if (!document.getElementById('customContextMenu')) {
            this.customContextMenu = document.createElement('div');
            this.customContextMenu.id = 'customContextMenu';
            this.customContextMenu.className = 'custom-context-menu';
            this.customContextMenu.style.cssText = `
                position: absolute;
                background: white;
                border: 1px solid #ccc;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 4px 0;
                z-index: 10000;
                display: none;
                min-width: 180px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;

            // Create menu items - they'll adapt based on context
            const italicButton = this.createMenuItem('Cursiv', 'italic', 'Ctrl+I');
            const superscriptButton = this.createMenuItem('Superscript', 'superscript', 'Ctrl+Shift+=');
            const subscriptButton = this.createMenuItem('Subscript', 'subscript', 'Ctrl+=');
            const clearFormattingButton = this.createMenuItem('Clear Formatting', 'clear', 'Ctrl+Shift+C');

            this.customContextMenu.appendChild(italicButton);
            this.customContextMenu.appendChild(superscriptButton);
            this.customContextMenu.appendChild(subscriptButton);
            this.customContextMenu.appendChild(document.createElement('hr'));
            this.customContextMenu.appendChild(clearFormattingButton);
            
            // Add a context indicator
            const contextIndicator = document.createElement('div');
            contextIndicator.id = 'context-indicator';
            contextIndicator.style.cssText = `
                padding: 4px 12px;
                font-size: 10px;
                color: #666;
                border-bottom: 1px solid #eee;
                font-style: italic;
            `;
            this.customContextMenu.insertBefore(contextIndicator, this.customContextMenu.firstChild);
            
            document.body.appendChild(this.customContextMenu);
        } else {
            this.customContextMenu = document.getElementById('customContextMenu');
        }
    }

    createMenuItem(text, action, shortcut) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'context-menu-item';
        
        // Map shortcuts to international versions
        const shortcuts = {
            'italic': 'Ctrl+I',
            'superscript': 'Ctrl+Shift+=',
            'subscript': 'Ctrl+=',
            'clear': 'Ctrl+Shift+C'
        };
        
        const displayShortcut = shortcuts[action] || shortcut;
        
        // Create the menu item with shortcut
        button.innerHTML = `
            <span style="flex: 1;">${text}</span>
            <span style="color: #666; font-size: 11px; margin-left: 16px;">${displayShortcut}</span>
        `;
        
        button.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: none;
            background: none;
            text-align: left;
            cursor: pointer;
            font-size: 14px;
            color: #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#f0f0f0';
        });
        
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = 'transparent';
        });
        
        button.addEventListener('click', () => this.applyFormattingStyle(action));
        return button;
    }


    showContextMenu(event) {
        event.preventDefault();

        // Check if we're in the bibliography output area
        if (!globalState.bibliographyOutputGlobal ||
            !globalState.bibliographyOutputGlobal.contains(event.target)) {
            this.hideContextMenu();
            return;
        }

        // Find the editable field we're in
        this.currentField = event.target.closest('.editable-field');
        if (!this.currentField) {
            this.hideContextMenu();
            return;
        }

        this.createContextMenuStructure();

        const selection = window.getSelection();
        let hasSelectionText = false;
        
        if (selection && selection.rangeCount > 0) {
            globalState.savedSelectionRange = selection.getRangeAt(0).cloneRange();
            
            // Check if selection is within our editable field
            if (this.currentField.contains(globalState.savedSelectionRange.commonAncestorContainer) && 
                selection.toString().length > 0) {
                hasSelectionText = true;
            } else {
                globalState.savedSelectionRange = null;
            }
        } else {
            globalState.savedSelectionRange = null;
        }

        // Enable/disable menu items based on selection
        const menuItems = this.customContextMenu.querySelectorAll('.context-menu-item');
        menuItems.forEach(item => {
            if (hasSelectionText || item.textContent === 'Clear Formatting') {
                item.removeAttribute('disabled');
                item.style.opacity = '1';
                item.style.pointerEvents = 'auto';
            } else {
                item.setAttribute('disabled', 'true');
                item.style.opacity = '0.5';
                item.style.pointerEvents = 'none';
            }
        });

        // Position the menu
        this.positionMenu(event);

        // Setup event listeners
        document.addEventListener('click', this.handleClickOutsideMenu.bind(this), true);
        document.addEventListener('keydown', this.handleEscapeKeyMenu.bind(this), true);
    }

    handleSelection() {
        const selection = window.getSelection();
        let hasSelectionText = false;
        
        if (this.currentContext === 'csv') {
            // For CSV context, check if there's selected text in the input
            if (this.currentField && (this.currentField.selectionStart !== this.currentField.selectionEnd)) {
                hasSelectionText = true;
                // Store selection for CSV input
                globalState.csvSelectionStart = this.currentField.selectionStart;
                globalState.csvSelectionEnd = this.currentField.selectionEnd;
                globalState.csvSelectedText = this.currentField.value.substring(
                    this.currentField.selectionStart, 
                    this.currentField.selectionEnd
                );
            }
        } else {
            // For preview context, use the existing selection logic
            if (selection && selection.rangeCount > 0) {
                globalState.savedSelectionRange = selection.getRangeAt(0).cloneRange();
                if (globalState.bibliographyOutputGlobal.contains(globalState.savedSelectionRange.commonAncestorContainer) && 
                    selection.toString().length > 0) {
                    hasSelectionText = true;
                } else {
                    globalState.savedSelectionRange = null;
                }
            } else {
                globalState.savedSelectionRange = null;
            }
        }

        // Enable/disable menu items based on selection
        const menuItems = this.customContextMenu.querySelectorAll('.context-menu-item');
        menuItems.forEach(item => {
            if (hasSelectionText || item.textContent.includes('Clear')) {
                item.removeAttribute('disabled');
                item.style.opacity = '1';
                item.style.pointerEvents = 'auto';
            } else {
                item.setAttribute('disabled', 'true');
                item.style.opacity = '0.5';
                item.style.pointerEvents = 'none';
            }
        });
    }

    positionMenu(event) {
        const { clientX: mouseX, clientY: mouseY } = event;
        
        this.customContextMenu.style.display = 'block';
        const menuWidth = this.customContextMenu.offsetWidth;
        const menuHeight = this.customContextMenu.offsetHeight;
        const bodyWidth = document.body.clientWidth;
        const bodyHeight = document.body.clientHeight;

        let top = mouseY;
        let left = mouseX;

        if (mouseX + menuWidth > bodyWidth) {
            left = mouseX - menuWidth;
        }
        if (mouseY + menuHeight > bodyHeight) {
            top = mouseY - menuHeight;
        }
        if (top < 0) top = 0;
        if (left < 0) left = 0;
        
        this.customContextMenu.style.top = `${top}px`;
        this.customContextMenu.style.left = `${left}px`;
    }

    hideContextMenu() {
        if (this.customContextMenu) {
            this.customContextMenu.style.display = 'none';
        }
        document.removeEventListener('click', this.handleClickOutsideMenu.bind(this), true);
        document.removeEventListener('keydown', this.handleEscapeKeyMenu.bind(this), true);
        globalState.savedSelectionRange = null;
        this.currentField = null;
    }

    handleClickOutsideMenu(event) {
        if (this.customContextMenu && !this.customContextMenu.contains(event.target)) {
            this.hideContextMenu();
        }
    }

    handleEscapeKeyMenu(event) {
        if (event.key === 'Escape') {
            this.hideContextMenu();
        }
    }

    applyFormattingStyle(style) {
        if (!this.currentField) {
            this.hideContextMenu();
            return;
        }

        if (this.currentContext === 'csv') {
            this.applyCsvMarkup(style);
        } else {
            this.applyPreviewFormatting(style);
        }
        
        this.hideContextMenu();
    }

    applyCsvMarkup(style) {
        if (!this.currentField) return;
        
        const input = this.currentField;
        const start = globalState.csvSelectionStart || input.selectionStart;
        const end = globalState.csvSelectionEnd || input.selectionEnd;
        const selectedText = input.value.substring(start, end);
        
        if (!selectedText && style !== 'clear') {
            console.log('[CONTEXT_MENU] No text selected for markup in CSV');
            return;
        }

        let newText = '';
        
        if (style === 'clear') {
            // Remove all markup tags from the entire field
            newText = input.value
                .replace(/<\/?i>/g, '')
                .replace(/<\/?em>/g, '')
                .replace(/<\/?sup>/g, '')
                .replace(/<\/?sub>/g, '');
            input.value = newText;
            input.focus();
        } else {
            // Add markup tags around selected text
            const beforeText = input.value.substring(0, start);
            const afterText = input.value.substring(end);
            
            switch (style) {
                case 'italic':
                    newText = beforeText + '<i>' + selectedText + '</i>' + afterText;
                    break;
                case 'superscript':
                    newText = beforeText + '<sup>' + selectedText + '</sup>' + afterText;
                    break;
                case 'subscript':
                    newText = beforeText + '<sub>' + selectedText + '</sub>' + afterText;
                    break;
            }
            
            input.value = newText;
            input.focus();
            
            // Set cursor position after the inserted tags
            const newCursorPos = start + selectedText.length + (style === 'italic' ? 7 : 11); // <i></i> = 7, <sup></sup> = 11
            input.setSelectionRange(newCursorPos, newCursorPos);
        }
        
        // Trigger input event to update the grid
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('[CONTEXT_MENU] Applied CSV markup:', style, 'to text:', selectedText);
    }

    applyPreviewFormatting(style) {
        // Your existing preview formatting logic
        if (style === 'clear') {
            this.clearFormatting();
        } else if (style === 'subscript') {
            this.applySubscript();
        } else if (globalState.savedSelectionRange) {
            this.applyStyleToSelection(style);
        }
        
        // Trigger sync after formatting
        this.triggerFieldSync();
    }

    applyStyleToSelection(style) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(globalState.savedSelectionRange);

        if (this.currentField.contains(globalState.savedSelectionRange.commonAncestorContainer)) {
            if (style === 'italic') {
                document.execCommand('italic', false, null);
            } else if (style === 'superscript') {
                document.execCommand('superscript', false, null);
            }
        }
    }

    clearFormatting() {
        if (!this.currentField) return;

        // If there's a selection, clear formatting for selection only
        if (globalState.savedSelectionRange) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(globalState.savedSelectionRange);
            document.execCommand('removeFormat', false, null);
        } else {
            // Clear all formatting in the field
            const plainText = this.currentField.textContent;
            this.currentField.innerHTML = plainText;
        }
    }


    applySubscript() {
        // Handle subscript separately since it's not in the original implementation
        const selection = window.getSelection();
        if (globalState.savedSelectionRange) {
            selection.removeAllRanges();
            selection.addRange(globalState.savedSelectionRange);
            
            if (this.currentField.contains(globalState.savedSelectionRange.commonAncestorContainer)) {
                document.execCommand('subscript', false, null);
            }
        }
    }

    async triggerFieldSync() {
        console.log('[CONTEXT_MENU] triggerFieldSync called');
        
        if (!this.currentField) {
            console.warn('[CONTEXT_MENU] triggerFieldSync: no currentField');
            return;
        }

        // Check if the field still exists and is valid
        if (!document.body.contains(this.currentField)) {
            console.warn('[CONTEXT_MENU] currentField no longer in DOM');
            this.currentField = null;
            return;
        }

        if (!this.currentField.dataset) {
            console.warn('[CONTEXT_MENU] currentField has no dataset');
            this.currentField = null;
            return;
        }

        try {
            // Import and use the sync manager
            const module = await import('./previewSyncManager.js');
            const syncManager = globalState.previewSyncManager || new module.PreviewSyncManager();
            
            // Double-check the field is still valid before syncing
            if (this.currentField && document.body.contains(this.currentField) && this.currentField.dataset) {
                syncManager.syncFieldToCsv(this.currentField);
            } else {
                console.warn('[CONTEXT_MENU] currentField became invalid during sync attempt');
            }
        } catch (error) {
            console.error('[CONTEXT_MENU] Error triggering field sync:', error);
        } finally {
            // Clear the current field reference to prevent future issues
            this.currentField = null;
        }
    }
}