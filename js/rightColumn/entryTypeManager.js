// js/rightColumn/entryTypeManager.js
import { globalState } from '../state/globalState.js';
import { DEFAULT_STYLE_TEMPLATES } from '../config/constants.js';

// Entry type selection and filtering
export class EntryTypeManager {
    updateEntryTypesDropdown() {
        if (!globalState.entryTypesContainerEl) {
            console.error("Entry types container element not found.");
            return;
        }
        
        globalState.entryTypesContainerEl.innerHTML = '';

        const allTypeKeysInOrder = this.getAllEntryTypeKeysOrdered();

        if (allTypeKeysInOrder.length === 0) {
            globalState.entryTypesContainerEl.innerHTML = '<p class="text-xs text-gray-500 italic">No entry types defined or found.</p>';
            return;
        }

        allTypeKeysInOrder.forEach((typeKey) => {
            const checkboxContainer = this.createTypeCheckbox(typeKey);
            globalState.entryTypesContainerEl.appendChild(checkboxContainer);
        });

        // Generate bibliography with initial "all selected" state
        if (globalState.csvData.length > 0 || allTypeKeysInOrder.length > 0) {
            this.triggerBibliographyGeneration();
        }
    }

    getAllEntryTypeKeysOrdered() {
        const allKeys = new Set();
        
        // Get types from default styles
        Object.keys(DEFAULT_STYLE_TEMPLATES).forEach(key => allKeys.add(key));
        
        // Get types from current styleTemplates
        Object.keys(globalState.styleTemplates).forEach(key => allKeys.add(key));
        
        // Get types from CSV data's "Item Type" column
        if (globalState.csvData && globalState.csvData.length > 0) {
            globalState.csvData.forEach(entry => {
                const itemTypeField = entry['Item Type'] || 'generic';
                const typeKey = itemTypeField.toLowerCase().replace(/\s+/g, '').trim();
                if (typeKey) {
                    allKeys.add(typeKey);
                }
            });
        }

        // Sort: default types first, then custom/data-derived types alphabetically
        const sortedKeys = Array.from(allKeys).sort((a, b) => {
            const isADefault = DEFAULT_STYLE_TEMPLATES.hasOwnProperty(a);
            const isBDefault = DEFAULT_STYLE_TEMPLATES.hasOwnProperty(b);
            if (isADefault && !isBDefault) return -1;
            if (!isADefault && isBDefault) return 1;
            return a.localeCompare(b);
        });
        
        return sortedKeys;
    }

    createTypeCheckbox(typeKey) {
        const checkboxId = `entry-type-checkbox-${typeKey.replace(/[^a-zA-Z0-9_]/g, '-')}`;

        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'flex items-center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;
        checkbox.value = typeKey;
        checkbox.checked = true; // Default to checked
        checkbox.className = 'h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0';
        
        checkbox.addEventListener('change', () => {
            this.triggerBibliographyGeneration();
        });

        const label = document.createElement('label');
        label.htmlFor = checkboxId;
        label.textContent = this.formatDisplayName(typeKey);
        label.className = 'ml-2 block text-sm text-gray-900 cursor-pointer';

        wrapperDiv.appendChild(checkbox);
        wrapperDiv.appendChild(label);
        
        return wrapperDiv;
    }

    formatDisplayName(typeKey) {
        let displayName = typeKey.charAt(0).toUpperCase() + typeKey.slice(1);
        displayName = displayName.replace(/([A-Z])/g, ' $1').trim();
        displayName = displayName.replace(/_/g, ' ');
        return displayName;
    }

    async triggerBibliographyGeneration() {
        try {
            const module = await import('../preview/BibliographyGenerator.js');
            const generator = new module.BibliographyGenerator();
            generator.generateBibliography();
        } catch (error) {
            console.error('Error generating bibliography from EntryTypeManager:', error);
        }
    }
}