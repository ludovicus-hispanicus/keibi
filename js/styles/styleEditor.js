// js/styles/styleEditor.js
import { globalState } from '../state/globalState.js';
import { DEFAULT_STYLE_TEMPLATES } from '../config/constants.js';

// Style editing interface
export class StyleEditor {
    constructor() {
        // Store reference to style manager if needed
        this.styleManager = null;
    }

    renderAllStyleEditors() {
        if (!globalState.styleEditorsContainer) {
            console.error("Style editors container not found");
            return;
        }
        
        globalState.styleEditorsContainer.innerHTML = '';

        const commonPlaceholders = [
            'LASTNAME', 'NAME', 'NAME_INIT',
            'ED_LASTNAME', 'ED_NAME', 'ED_NAME_INIT',
            'LIST_LASTNAMES', 'LIST_NAMES', 'LIST_INITIALS',
            'ED_LIST_LASTNAMES', 'ED_LIST_NAMES', 'ED_LIST_INITIALS',
            'TITLE', 'YEAR', 'JOURNAL', 'VOLUME', 'PAGES',
            'PUBLISHER', 'PLACE', 'URL', 'DOI', 'ITEM TYPE',
            'SERIES', 'SERIES NUMBER', 'REVIEWER',
            'AKKADIAN', 'DETERMINATIVE', 'KEIBI', 'CONFER'
        ];
        
        const uniquePlaceholders = [...new Set(commonPlaceholders)].sort();
        const allTypeKeysOrdered = this.getOrderedStyleTypes();

        for (const type of allTypeKeysOrdered) {
            if (!globalState.styleTemplates.hasOwnProperty(type)) continue;
            
            const editorElement = this.createStyleEditor(type, uniquePlaceholders);
            globalState.styleEditorsContainer.appendChild(editorElement);
        }
    }

    getOrderedStyleTypes() {
        const defaultTypeKeys = Object.keys(DEFAULT_STYLE_TEMPLATES);
        const customTypeKeys = Object.keys(globalState.styleTemplates)
            .filter(type => !DEFAULT_STYLE_TEMPLATES.hasOwnProperty(type))
            .sort();
        return [...defaultTypeKeys, ...customTypeKeys];
    }

    createStyleEditor(type, placeholders) {
        const format = globalState.styleTemplates[type];
        const editorWrapperDiv = document.createElement('div');
        editorWrapperDiv.className = 'style-template p-4 bg-white rounded-lg shadow';
        
        const titleText = this.formatDisplayName(type);
        const statusText = this.getStatusText(type);

        const headerDiv = this.createHeader(titleText, statusText);
        const contentDiv = this.createContent(type, format, placeholders);
        
        editorWrapperDiv.appendChild(headerDiv);
        editorWrapperDiv.appendChild(contentDiv);
        
        this.setupCollapsibleBehavior(headerDiv, contentDiv);
        
        return editorWrapperDiv;
    }

    formatDisplayName(type) {
        let titleText = type.charAt(0).toUpperCase() + type.slice(1);
        titleText = titleText.replace(/([A-Z])/g, ' $1').trim();
        return titleText;
    }

    getStatusText(type) {
        const isOriginallyDefault = DEFAULT_STYLE_TEMPLATES.hasOwnProperty(type);
        const isCustom = !isOriginallyDefault;
        const isModifiedDefault = isOriginallyDefault && globalState.styleTemplates[type] !== DEFAULT_STYLE_TEMPLATES[type];
        const isUnchangedDefault = isOriginallyDefault && globalState.styleTemplates[type] === DEFAULT_STYLE_TEMPLATES[type];

        if (isCustom) {
            return '<span class="text-xs text-blue-500 ml-2">(Custom)</span>';
        } else if (isUnchangedDefault) {
            return '<span class="text-xs text-gray-500 ml-2">(Default)</span>';
        } else if (isModifiedDefault) {
            return '<span class="text-xs text-yellow-600 ml-2">(Default - Modified)</span>';
        }
        return '';
    }

    createHeader(titleText, statusText) {
        const headerDiv = document.createElement('div');
        headerDiv.className = 'style-header flex justify-between items-center cursor-pointer py-2';
        headerDiv.innerHTML = `
            <h3 class="text-md font-semibold text-emerald-700">${titleText} ${statusText}</h3>
            <span class="toggle-icon text-gray-500 text-sm transform transition-transform duration-200">▼</span>
        `;
        return headerDiv;
    }

    createContent(type, format, placeholders) {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'style-content-collapsible space-y-2 pt-2';
        contentDiv.style.display = 'none';

        contentDiv.innerHTML = `
            <div>
                <textarea id="${type}Format" 
                    class="format-editor w-full p-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-emerald-500 focus:border-emerald-500" 
                    rows="3" 
                    data-style-type="${type}">${format}</textarea>
            </div>
            <div class="format-description bg-gray-100 p-2 rounded-md">
                <p class="text-xs font-semibold text-gray-600 mb-1">Placeholders:</p>
                <div class="placeholders-grid text-xs">
                    ${placeholders.map(p => `<span><code>[${p.toUpperCase()}]</code></span>`).join('')}
                </div>
            </div>
        `;
        
        const buttonsContainer = this.createButtons(type);
        contentDiv.appendChild(buttonsContainer);
        
        this.setupContentEventListeners(contentDiv, type);
        
        return contentDiv;
    }

    createButtons(type) {
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'mt-2 flex space-x-2';
        
        const saveButton = document.createElement('button');
        saveButton.className = 'save-single-style-btn flex-1 bg-teal-500 hover:bg-teal-600 text-white text-xs py-2 px-3 rounded-md shadow-sm';
        saveButton.textContent = 'Save This Style';
        saveButton.dataset.styleType = type;
        buttonsContainer.appendChild(saveButton);

        const isCustom = !DEFAULT_STYLE_TEMPLATES.hasOwnProperty(type);
        if (isCustom) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-custom-style-btn flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-2 px-3 rounded-md shadow-sm';
            deleteButton.textContent = 'Delete Custom';
            deleteButton.dataset.styleType = type;
            buttonsContainer.appendChild(deleteButton);
            
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteCustomStyle(type);
            });
        }
        
        saveButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.saveSingleStyle(type);
        });
        
        return buttonsContainer;
    }

    setupContentEventListeners(contentDiv, type) {
        const textarea = contentDiv.querySelector(`#${type}Format`);
        
        textarea.addEventListener('input', (e) => {
            globalState.styleTemplates[type] = e.target.value;
            this.updateStatusDisplay(contentDiv, type);
            
            // Update previews
            this.updatePreviews();
        });
        
        textarea.addEventListener('change', () => {
            if (globalState.csvData.length > 0) {
                this.generateBibliography();
            }
        });
    }

    async updatePreviews() {
        try {
            const module = await import('./previewGenerator.js');
            const preview = new module.PreviewGenerator();
            preview.updateAllFormatPreviews();
        } catch (error) {
            console.error('Error updating previews:', error);
        }
    }

    async generateBibliography() {
        try {
            const module = await import('../preview/BibliographyGenerator.js');
            const generator = new module.BibliographyGenerator();
            generator.generateBibliography();
        } catch (error) {
            console.error('Error generating bibliography:', error);
        }
    }

    async saveSingleStyle(type) {
        try {
            const module = await import('./styleManager.js');
            const manager = new module.StyleManager();
            await manager.saveSingleStyle(type);
        } catch (error) {
            console.error('Error saving style:', error);
        }
    }

    async deleteCustomStyle(type) {
        try {
            const module = await import('./styleManager.js');
            const manager = new module.StyleManager();
            await manager.deleteCustomStyle(type);
        } catch (error) {
            console.error('Error deleting style:', error);
        }
    }

    updateStatusDisplay(contentDiv, type) {
        const headerDiv = contentDiv.previousElementSibling;
        const h3 = headerDiv.querySelector('h3');
        const titleText = this.formatDisplayName(type);
        const statusText = this.getStatusText(type);
        h3.innerHTML = `${titleText} ${statusText}`;
    }

    setupCollapsibleBehavior(headerDiv, contentDiv) {
        headerDiv.addEventListener('click', () => {
            const isExpanded = contentDiv.style.display === 'block';
            contentDiv.style.display = isExpanded ? 'none' : 'block';
            headerDiv.classList.toggle('expanded', !isExpanded);
            
            const icon = headerDiv.querySelector('.toggle-icon');
            if (icon) {
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        });
    }
}