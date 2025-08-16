// js/styles/previewGenerator.js (REPLACE YOUR CURRENT FILE WITH THIS)
import { globalState } from '../state/globalState.js';
import { DEFAULT_STYLE_TEMPLATES } from '../config/constants.js';
import { TextProcessor } from '../utils/textProcessor.js';
import { TemplateProcessor } from '../preview/templateProcessor.js';

// Style preview generation
export class PreviewGenerator {
    updateAllFormatPreviews() {
        if (!globalState.formatPreviewPanel) { 
            console.error("Format preview panel not found"); 
            return; 
        }
        
        globalState.formatPreviewPanel.innerHTML = '';

        const commonExampleBaseData = this.getCommonExampleData();
        const personPreviewSets = this.getPersonPreviewSets();
        const allTypeKeysOrdered = this.getOrderedStyleTypes();

        allTypeKeysOrdered.forEach(typeKey => {
            if (!globalState.styleTemplates.hasOwnProperty(typeKey)) return;
            
            const previewContainer = this.createStylePreviewContainer(typeKey, commonExampleBaseData, personPreviewSets);
            globalState.formatPreviewPanel.appendChild(previewContainer);
        });
    }

    getCommonExampleData() {
        return {
            TITLE: "Sample Research Title", 
            YEAR: new Date().getFullYear().toString(),
            JOURNAL: "International Journal of Studies", 
            VOLUME: "12", 
            PAGES: "345-367",
            PLACE: "New York", 
            PUBLISHER: "Academic Publishing House",
            REVIEWER: "Reviewer, Robert Q.", 
            URL: "http://example.com/article123", 
            DOI: "10.9876/example.doi.2025",
            SERIES: "Studies in Ancient Texts", 
            "SERIES NUMBER": "42",
            "ITEM TYPE": "generic", 
            KEIBI: "Internal Ref. XYZ789",
            CONFER: "; cf. 78:123."
        };
    }

    getPersonPreviewSets() {
        return [
            { 
                label: "1 Person Data (Confer field has value):", 
                persons: [["Doe", "John Samuel"]]
            },
            { 
                label: "2 Persons Data (Confer field is empty):", 
                persons: [["Doe", "John Samuel"], ["Smith", "Mary Anne"]],
                overrideConfer: ""
            },
            { 
                label: "3 Persons Data (Confer field has value):", 
                persons: [["Doe", "John Samuel"], ["Smith", "Mary Anne"], ["Lee", "Chan"]]
            }
        ];
    }

    getOrderedStyleTypes() {
        return Object.keys(globalState.styleTemplates).sort((a, b) => {
            const isADefault = DEFAULT_STYLE_TEMPLATES.hasOwnProperty(a); 
            const isBDefault = DEFAULT_STYLE_TEMPLATES.hasOwnProperty(b);
            if (isADefault && !isBDefault) return -1;
            if (!isADefault && isBDefault) return 1;
            return a.localeCompare(b);
        });
    }

    createStylePreviewContainer(typeKey, commonExampleBaseData, personPreviewSets) {
        const format = globalState.styleTemplates[typeKey];
        
        const stylePreviewContainerDiv = document.createElement('div');
        stylePreviewContainerDiv.className = 'preview-item-container pb-3 mb-3 border-b border-gray-200 last:border-b-0 last:pb-0 last:mb-0';
        
        const typeDisplayName = this.formatDisplayName(typeKey);
        stylePreviewContainerDiv.innerHTML = `<h4 class="text-md font-semibold text-gray-800 mb-1.5">${typeDisplayName} Format Examples:</h4>`;
        
        // Add usage info if needed
        this.addUsageInfo(stylePreviewContainerDiv, format);
        
        // Generate preview examples
        personPreviewSets.forEach(exampleSet => {
            const exampleDiv = this.createPreviewExample(format, commonExampleBaseData, exampleSet, typeKey);
            stylePreviewContainerDiv.appendChild(exampleDiv);
        });
        
        return stylePreviewContainerDiv;
    }

    formatDisplayName(typeKey) {
        let typeDisplayName = typeKey.charAt(0).toUpperCase() + typeKey.slice(1);
        if (!typeKey.includes('_') && !/[A-Z]/.test(typeKey.slice(1))) {
            // All lowercase, no further formatting needed
        } else {
            typeDisplayName = typeDisplayName.replace(/_/g, ' '); 
            typeDisplayName = typeDisplayName.replace(/([A-Z0-9_])/g, (match, p1, offset) => offset > 0 ? ' ' + p1 : p1).trim();
        }
        return typeDisplayName;
    }

    addUsageInfo(container, format) {
        const usesAuthorLists = (format.includes("[LIST_LASTNAMES") && (format.includes("[LIST_NAMES") || format.includes("[LIST_INITIALS")));
        const usesEditorLists = (format.includes("[ED_LIST_LASTNAMES") && (format.includes("[ED_LIST_NAMES") || format.includes("[ED_LIST_INITIALS")));
        
        if (usesAuthorLists || usesEditorLists) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'bg-yellow-50 p-2 border-l-4 border-yellow-400 mb-2 text-xs';
            
            let patternExplanation = "";
            if (usesAuthorLists) {
                patternExplanation += `This style may use <code>[LIST_LASTNAMES]</code> with <code>[LIST_NAMES]</code> or <code>[LIST_INITIALS]</code>. `;
            }
            if (usesEditorLists) {
                patternExplanation += `This style may use <code>[ED_LIST_LASTNAMES]</code> with <code>[ED_LIST_NAMES]</code> or <code>[ED_LIST_INITIALS]</code>. `;
            }
            
            infoDiv.innerHTML = `<p>${patternExplanation}</p> <p>These patterns format each person with their lastname and firstname/initials paired together.</p>`;
            container.appendChild(infoDiv);
        }
    }

    createPreviewExample(format, commonExampleBaseData, exampleSet, typeKey) {
        let specificExampleData = { ...commonExampleBaseData };
        specificExampleData["ITEM TYPE"] = typeKey.toUpperCase().replace(/\s+/g, '_'); 

        const parsedPersons = exampleSet.persons;
        this.processPersonsForPreview(parsedPersons, specificExampleData);

        // Handle CONFER override
        if (exampleSet.hasOwnProperty('overrideConfer')) {
            specificExampleData.CONFER = exampleSet.overrideConfer;
        }

        // Try to process template, fallback if TemplateProcessor doesn't exist yet
        let previewHTML;
        try {
            previewHTML = TemplateProcessor.processFormatTemplate(format, specificExampleData, -1);
        } catch (error) {
            console.warn('TemplateProcessor not available, using basic template processing:', error);
            previewHTML = this.basicTemplateProcess(format, specificExampleData);
        }
        
        const exampleDiv = document.createElement('div');
        exampleDiv.className = 'preview-text-group mb-1.5';
        exampleDiv.innerHTML = `
            <h5 class="text-xs font-medium text-gray-600 mb-0.5">${exampleSet.label}</h5>
            <div class="preview-text p-2 border-l-2 border-emerald-400 bg-gray-50 text-xs">
                ${previewHTML || "<i>(No output or error)</i>"}
            </div>
        `;
        
        return exampleDiv;
    }

    // Basic template processing fallback
    basicTemplateProcess(template, data) {
        let result = template;
        const placeholderRegex = /\[([\w\s.-]+)(?::(\w+))?\]/g;
        
        result = result.replace(placeholderRegex, (match, placeholderKey, styleSuffix) => {
            const key = placeholderKey.trim().toUpperCase();
            const value = data.hasOwnProperty(key) ? (data[key] || '') : '';
            
            if (styleSuffix) {
                const sfx = styleSuffix.toLowerCase();
                if (sfx === 'bold') return `<strong>${value}</strong>`;
                if (sfx === 'italic') return `<i>${value}</i>`;
                if (sfx === 'superscript') return `<sup>${value}</sup>`;
            }
            return value;
        });
        
        return result;
    }

    processPersonsForPreview(parsedPersons, specificExampleData) {
        // Process first person
        if (parsedPersons.length > 0) {
            const firstP = parsedPersons[0];
            specificExampleData.LASTNAME = firstP[0];
            specificExampleData.ED_LASTNAME = firstP[0]; 
            const firstFullName = firstP[1];
            
            // Try to use TextProcessor, fallback if not available
            try {
                specificExampleData.NAME = TextProcessor.formatComplexFirstName(firstFullName);
                specificExampleData.ED_NAME = TextProcessor.formatComplexFirstName(firstFullName); 
                specificExampleData.NAME_INIT = TextProcessor.getInitials(firstFullName);
                specificExampleData.ED_NAME_INIT = TextProcessor.getInitials(firstFullName);
            } catch (error) {
                console.warn('TextProcessor not available, using basic name processing:', error);
                specificExampleData.NAME = firstFullName;
                specificExampleData.ED_NAME = firstFullName; 
                specificExampleData.NAME_INIT = firstFullName ? firstFullName[0] + '.' : '';
                specificExampleData.ED_NAME_INIT = firstFullName ? firstFullName[0] + '.' : '';
            }
        } else {
            ['LASTNAME', 'NAME', 'NAME_INIT', 'ED_LASTNAME', 'ED_NAME', 'ED_NAME_INIT'].forEach(k => specificExampleData[k] = '');
        }

        // Process all persons for lists
        const authorLNames = [], authorFNames = [], authorInits = [];
        parsedPersons.forEach(p => {
            const lName = p[0] || '';
            const fName = p[1] || '';
            if (lName) {
                authorLNames.push(lName);
                try {
                    authorFNames.push(TextProcessor.formatComplexFirstName(fName));
                    authorInits.push(TextProcessor.getInitials(fName));
                } catch (error) {
                    authorFNames.push(fName);
                    authorInits.push(fName ? fName[0] + '.' : '');
                }
            } else if (fName) { 
                try {
                    authorFNames.push(TextProcessor.formatComplexFirstName(fName));
                    authorInits.push(TextProcessor.getInitials(fName));
                } catch (error) {
                    authorFNames.push(fName);
                    authorInits.push(fName ? fName[0] + '.' : '');
                }
                authorLNames.push(''); 
            }
        });

        specificExampleData.LIST_LASTNAMES = authorLNames.join(' – ');
        specificExampleData.LIST_NAMES = authorFNames.join(' – ');
        specificExampleData.LIST_INITIALS = authorInits.join(' – ');
        specificExampleData.ED_LIST_LASTNAMES = authorLNames.join(' – '); 
        specificExampleData.ED_LIST_NAMES = authorFNames.join(' – ');
        specificExampleData.ED_LIST_INITIALS = authorInits.join(' – ');
        
        // Process reviewer field
        try {
            specificExampleData.REVIEWER = TextProcessor.formatAuthorReview(specificExampleData.REVIEWER);
        } catch (error) {
            // Keep original value if TextProcessor not available
            console.warn('TextProcessor not available for reviewer formatting:', error);
        }
    }
}