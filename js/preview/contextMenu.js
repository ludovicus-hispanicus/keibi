import { globalState } from '../state/globalState.js';

// Context menu functionality for the preview area
export class PreviewContextMenu {
    constructor() {
        this.customContextMenu = null;
    }

    createContextMenuStructure() {
        if (!document.getElementById('customContextMenu')) {
            this.customContextMenu = document.createElement('div');
            this.customContextMenu.id = 'customContextMenu';
            this.customContextMenu.className = 'custom-context-menu';

            const italicButton = document.createElement('button');
            italicButton.type = 'button';
            italicButton.className = 'context-menu-item';
            italicButton.textContent = 'Cursiv';
            italicButton.addEventListener('click', () => this.applyFormattingStyle('italic'));

            const superscriptButton = document.createElement('button');
            superscriptButton.type = 'button';
            superscriptButton.className = 'context-menu-item';
            superscriptButton.textContent = 'Superscript';
            superscriptButton.addEventListener('click', () => this.applyFormattingStyle('superscript'));

            this.customContextMenu.appendChild(italicButton);
            this.customContextMenu.appendChild(superscriptButton);
            document.body.appendChild(this.customContextMenu);
        } else {
            this.customContextMenu = document.getElementById('customContextMenu');
        }
    }

    showContextMenu(event) {
        event.preventDefault();

        if (!globalState.bibliographyOutputGlobal ||
            !globalState.bibliographyOutputGlobal.contains(event.target) ||
            globalState.bibliographyOutputGlobal.getAttribute('contenteditable') !== 'true') {
            this.hideContextMenu();
            return;
        }

        this.createContextMenuStructure();

        const selection = window.getSelection();
        let hasSelectionText = false;
        if (selection && selection.rangeCount > 0) {
            globalState.savedSelectionRange = selection.getRangeAt(0).cloneRange();
            if (globalState.bibliographyOutputGlobal.contains(globalState.savedSelectionRange.commonAncestorContainer) && selection.toString().length > 0) {
                hasSelectionText = true;
            } else {
                globalState.savedSelectionRange = null;
            }
        } else {
            globalState.savedSelectionRange = null;
        }

        const menuItems = this.customContextMenu.querySelectorAll('.context-menu-item');
        menuItems.forEach(item => {
            if (hasSelectionText) {
                item.removeAttribute('disabled');
            } else {
                item.setAttribute('disabled', 'true');
            }
        });

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

        document.addEventListener('click', this.handleClickOutsideMenu.bind(this), true);
        document.addEventListener('keydown', this.handleEscapeKeyMenu.bind(this), true);
    }

    hideContextMenu() {
        if (this.customContextMenu) {
            this.customContextMenu.style.display = 'none';
        }
        document.removeEventListener('click', this.handleClickOutsideMenu.bind(this), true);
        document.removeEventListener('keydown', this.handleEscapeKeyMenu.bind(this), true);
        globalState.savedSelectionRange = null;
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
        if (!globalState.savedSelectionRange) {
            this.hideContextMenu();
            return;
        }

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(globalState.savedSelectionRange);

        if (globalState.bibliographyOutputGlobal && globalState.bibliographyOutputGlobal.contains(globalState.savedSelectionRange.commonAncestorContainer)) {
            if (style === 'italic') {
                document.execCommand('italic', false, null);
            } else if (style === 'superscript') {
                document.execCommand('superscript', false, null);
            }
        }
        
        this.hideContextMenu();
    }
}