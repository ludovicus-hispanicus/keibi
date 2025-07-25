// js/styles/styleManager.js
import { globalState } from '../state/globalState.js';
import { DEFAULT_STYLE_TEMPLATES } from '../config/constants.js';

// Style template management
export class StyleManager {
    async loadSavedStyles() {
        const savedStylesString = localStorage.getItem('bibliographyStyles');
        globalState.styleTemplates = { ...DEFAULT_STYLE_TEMPLATES };

        if (savedStylesString) {
            try {
                const loadedCustomOrModifiedStyles = JSON.parse(savedStylesString);
                for (const type in loadedCustomOrModifiedStyles) {
                    globalState.styleTemplates[type] = loadedCustomOrModifiedStyles[type];
                }
                console.log('Loaded and merged styles from localStorage:', globalState.styleTemplates);
            } catch (error) {
                console.error('Error loading saved styles:', error);
            }
        }

        // Update UI components
        await this.updateAllComponents();
    }

    persistAllStylesToStorage() {
        const stylesToSave = {};
        for (const type in globalState.styleTemplates) {
            if (!DEFAULT_STYLE_TEMPLATES.hasOwnProperty(type) ||
                (DEFAULT_STYLE_TEMPLATES.hasOwnProperty(type) && 
                 globalState.styleTemplates[type] !== DEFAULT_STYLE_TEMPLATES[type])) {
                stylesToSave[type] = globalState.styleTemplates[type];
            }
        }
        localStorage.setItem('bibliographyStyles', JSON.stringify(stylesToSave));
        console.log('Persisted styles to localStorage:', stylesToSave);
    }

    async saveSingleStyle(typeKey) {
        if (!globalState.styleTemplates.hasOwnProperty(typeKey)) {
            console.error(`Attempted to save non-existent style type: ${typeKey}`);
            alert(`Error: Style type "${typeKey}" not found.`);
            return;
        }
        
        this.persistAllStylesToStorage();
        alert(`Style '${typeKey}' and any other pending changes have been saved!`);
        await this.updateAllComponents();
        
        if (globalState.csvData.length > 0) {
            // Trigger bibliography regeneration
            try {
                const module = await import('../preview/bibliographyGenerator.js');
                const generator = new module.BibliographyGenerator();
                generator.generateBibliography();
            } catch (error) {
                console.error('Error generating bibliography after style save:', error);
            }
        }
    }

    async resetStyles() {
        if (confirm('Are you sure you want to reset ALL style templates to defaults? This will remove any custom styles and revert changes to default styles.')) {
            globalState.styleTemplates = { ...DEFAULT_STYLE_TEMPLATES };
            localStorage.removeItem('bibliographyStyles');
            await this.updateAllComponents();
            alert('Style templates have been reset to defaults. Custom styles removed.');
        }
    }

    async deleteCustomStyle(typeKey) {
        const typeDisplayName = typeKey.charAt(0).toUpperCase() + typeKey.slice(1).replace(/([A-Z])/g, ' $1');
        if (confirm(`Are you sure you want to delete the custom style "${typeDisplayName}"? This action cannot be undone.`)) {
            if (globalState.styleTemplates.hasOwnProperty(typeKey) && !DEFAULT_STYLE_TEMPLATES.hasOwnProperty(typeKey)) {
                delete globalState.styleTemplates[typeKey];
                this.persistAllStylesToStorage();
                await this.updateAllComponents();
                alert(`Custom style "${typeDisplayName}" has been deleted.`);
            } else {
                alert(`Error: Could not delete style "${typeDisplayName}". It might be a default style or not found.`);
            }
        }
    }

    addCustomStyle(newName, newFormat) {
        const normalizedName = newName.toLowerCase().replace(/\s+/g, '');
        
        if (!newName || !newFormat) {
            alert('Please provide a name and format string.');
            return false;
        }
        
        if (!/^[a-zA-Z0-9]+$/.test(normalizedName)) {
            alert('Style type name should ideally be simple (letters and numbers, spaces will be removed).');
            return false;
        }
        
        if (globalState.styleTemplates.hasOwnProperty(normalizedName)) {
            alert(`Style type "${newName}" (normalized to "${normalizedName}") already exists.`);
            return false;
        }

        globalState.styleTemplates[normalizedName] = newFormat;
        this.persistAllStylesToStorage();
        this.updateAllComponents();
        alert(`Custom style "${newName}" added and saved!`);
        return true;
    }

    async updateAllComponents() {
        try {
            // Import and update related components
            const [editorModule, previewModule, entryTypeModule] = await Promise.all([
                import('./styleEditor.js'),
                import('./previewGenerator.js'),
                import('../rightColumn/entryTypeManager.js')
            ]);
            
            // Check if the modules and their exports exist
            if (editorModule.StyleEditor) {
                const editor = new editorModule.StyleEditor();
                editor.renderAllStyleEditors();
            } else {
                console.warn('StyleEditor not found in styleEditor.js, skipping style editor rendering');
            }
            
            if (previewModule.PreviewGenerator) {
                const preview = new previewModule.PreviewGenerator();
                preview.updateAllFormatPreviews();
            } else {
                console.warn('PreviewGenerator not found in previewGenerator.js, skipping preview updates');
            }
            
            if (entryTypeModule.EntryTypeManager) {
                const manager = new entryTypeModule.EntryTypeManager();
                manager.updateEntryTypesDropdown();
            } else {
                console.warn('EntryTypeManager not found in entryTypeManager.js, skipping entry type updates');
            }
        } catch (error) {
            console.error('Error updating style components:', error);
        }
    }
}