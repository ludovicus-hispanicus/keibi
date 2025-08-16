// js/preview/BibliographyGenerator.js (Production-ready with minimal logs)
import { globalState, updateEntryCount } from '../state/globalState.js';
import { TextProcessor } from '../utils/textProcessor.js';
import { TemplateProcessor } from './templateProcessor.js';

export class BibliographyGenerator {
    generateBibliography() {
        if (!globalState.csvData.length && !globalState.originalCsvData.length) {
            if (globalState.outputDiv) {
                globalState.outputDiv.innerHTML = '<p class="text-gray-500">No CSV data loaded.</p>';
            }
            updateEntryCount(0);
            return 0;
        }

        if (!globalState.outputDiv || !globalState.entryCount) {
            console.error("Core UI elements not ready for generateBibliography.");
            return 0;
        }

        try {
            const processedEntries = this.processEntries();
            globalState.outputDiv.innerHTML = '';
            
            if (processedEntries.length > 0) {
                processedEntries.forEach(processedEntry => {
                    const div = document.createElement('div');
                    div.className = 'entry py-2 border-b border-[var(--non-photo-blue)] last:border-b-0';
                    const isChecked = globalState.proofingStates[processedEntry.originalCsvIndex] || false;
                    const checkbox = `<input type="checkbox" class="proof-checkbox" data-entry-id="${processedEntry.originalCsvIndex}" ${isChecked ? 'checked' : ''}> `;
                    div.innerHTML = `${checkbox}<span>${processedEntry.html}</span>`;
                    div.dataset.entryIndex = processedEntry.originalCsvIndex;
                    globalState.outputDiv.appendChild(div);
                });

                this.setupProofingCheckboxes();

                // Add proofing summary
                const proofedCount = Object.values(globalState.proofingStates).filter(Boolean).length;
                globalState.outputDiv.insertAdjacentHTML('beforeend', `<p class="text-sm text-gray-500 mt-2">${proofedCount} of ${processedEntries.length} entries proofed</p>`);
            } else {
                globalState.outputDiv.innerHTML = '<p class="text-gray-500">No entries found matching the selected criteria.</p>';
            }
            
            updateEntryCount(processedEntries.length);
            return processedEntries.length;
        } catch (error) {
            console.error('Error generating bibliography:', error);
            if (globalState.outputDiv) {
                globalState.outputDiv.innerHTML = `<div class="text-red-500 p-2">Error generating bibliography: ${error.message}</div>`;
            }
            return 0;
        }
    }

    setupProofingCheckboxes() {
        const checkboxes = globalState.outputDiv.querySelectorAll('.proof-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const entryId = e.target.dataset.entryId;
                globalState.proofingStates[entryId] = e.target.checked;
                try {
                    localStorage.setItem('proofingStates', JSON.stringify(globalState.proofingStates));
                } catch (error) {
                    console.error('Error saving to localStorage:', error);
                }
                
                // Update proofing summary
                const processedEntries = this.processEntries();
                const proofedCount = Object.values(globalState.proofingStates).filter(Boolean).length;
                const summary = globalState.outputDiv.querySelector('.text-sm.text-gray-500');
                if (summary) {
                    summary.textContent = `${proofedCount} of ${processedEntries.length} entries proofed`;
                }
            });
        });
    }

    processEntries() {
        if (!globalState.entryTypesContainerEl) {
            console.warn("Entry types container not found in processEntries.");
        }

        const selectedTypes = [];
        const checkboxes = globalState.entryTypesContainerEl ? 
            globalState.entryTypesContainerEl.querySelectorAll('input[type="checkbox"]') : [];
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedTypes.push(checkbox.value);
            }
        });

        const indexedCsvData = globalState.csvData.map((entry, index) => ({
            ...entry,
            originalCsvIndex: index
        }));

        let filt;
        if (checkboxes.length === 0) {
            filt = globalState.csvData.length > 0 ? indexedCsvData : [];
        } else if (selectedTypes.length === 0) {
            filt = [];
        } else {
            filt = indexedCsvData.filter(e => {
                const itemTypeKey = (e['Item Type'] || 'generic').toLowerCase().replace(/\s+/g, '').trim();
                return itemTypeKey ? selectedTypes.includes(itemTypeKey) : selectedTypes.includes('generic');
            });
        }

        const sortOptEl = document.getElementById('sortOption');
        const sortOpt = sortOptEl ? sortOptEl.value : 'author';

        filt.sort((a, b) => {
            try {
                if (sortOpt === 'author') {
                    const tempDivA = document.createElement('div'); 
                    tempDivA.innerHTML = a.Author || a.Editor || '';
                    const plainAuthorA = tempDivA.textContent || '';
                    const tempDivB = document.createElement('div'); 
                    tempDivB.innerHTML = b.Author || b.Editor || '';
                    const plainAuthorB = tempDivB.textContent || '';
                    const aAuthPrimary = TextProcessor.formatAuthor(plainAuthorA)[0] || ['\uffff'];
                    const bAuthPrimary = TextProcessor.formatAuthor(plainAuthorB)[0] || ['\uffff'];
                    return (aAuthPrimary[0] || '\uffff').toLowerCase().localeCompare((bAuthPrimary[0] || '\uffff').toLowerCase());
                }
                if (sortOpt === 'title') {
                    const tempDivA = document.createElement('div'); 
                    tempDivA.innerHTML = a.Title || '';
                    const plainTitleA = tempDivA.textContent || '';
                    const tempDivB = document.createElement('div'); 
                    tempDivB.innerHTML = b.Title || '';
                    const plainTitleB = tempDivB.textContent || '';
                    return plainTitleA.toLowerCase().localeCompare(plainTitleB.toLowerCase());
                }
                if (sortOpt === 'year') return (parseInt(b['Publication Year'] || '0') - parseInt(a['Publication Year'] || '0'));
                if (sortOpt === 'yearReverse') return (parseInt(a['Publication Year'] || '0') - parseInt(b['Publication Year'] || '0'));
            } catch (e) { 
                console.warn("Sort error", e); 
            }
            return 0;
        });
        
        return this.formatBibEntries(filt);
    }

    formatBibEntries(bibEntriesWithOriginalIndex) {
        const resultObjects = [];

        bibEntriesWithOriginalIndex.forEach((entryWrapper) => {
            const entry = entryWrapper; 
            const originalCsvIndex = entryWrapper.originalCsvIndex;
            const entryTypeKeyInStyleTemplates = (entry['Item Type'] || 'generic').toLowerCase().replace(/\s+/g, '').trim();
            
            const template = globalState.styleTemplates[entryTypeKeyInStyleTemplates] || 
                             globalState.styleTemplates['book'] || 
                             "[LASTNAME], [NAME_INIT], [TITLE] ([YEAR])"; 

            let entryDataForTemplate = {};
            for (const keyInEntry in entry) {
                if (Object.prototype.hasOwnProperty.call(entry, keyInEntry)) {
                    if (keyInEntry !== 'originalCsvIndex') {
                         entryDataForTemplate[keyInEntry.toUpperCase()] = entry[keyInEntry] || '';
                    }
                }
            }

            this.processAuthorsAndEditors(entry, template, entryDataForTemplate);
            this.processOtherFields(entry, entryDataForTemplate);

            let formattedEntryString = TemplateProcessor.processFormatTemplateWithSync(template, entryDataForTemplate, originalCsvIndex);
            
            const tags = (entry['Manual Tags'] || entry.Tags || entry['manual tags'] || entry.tags || '').trim();
            if (tags) {
                formattedEntryString += ` <span class="tag text-xs text-gray-500 italic">${tags.split(/[;,]/).map(tag => `#${tag.trim()}`).join(' ')}</span>`;
            }
            
            resultObjects.push({ html: formattedEntryString, originalCsvIndex: originalCsvIndex });
        });
        return resultObjects;
    }

    processAuthorsAndEditors(entry, template, entryDataForTemplate) {
        let authorSourceString = entry.Author || '';
        if (!authorSourceString && (
            template.toUpperCase().includes('LASTNAME') ||
            template.toUpperCase().includes('NAME') || 
            template.toUpperCase().includes('LIST_LASTNAMES') ||
            template.toUpperCase().includes('LIST_NAMES') ||
            template.toUpperCase().includes('LIST_INITIALS')
            ) && !template.toUpperCase().includes('ED_LIST_LASTNAMES') && !template.toUpperCase().includes('ED_LASTNAME') 
        ) {
            authorSourceString = entry.Editor || ''; 
        }
        
        let plainAuthorText = '';
        if (authorSourceString) {
            const tempDivAuth = document.createElement('div');
            tempDivAuth.innerHTML = authorSourceString;
            plainAuthorText = tempDivAuth.textContent || "";
        }
        
        const parsedAuthors = TextProcessor.formatAuthor(plainAuthorText);

        if (parsedAuthors.length > 0 && parsedAuthors[0]) {
            const firstAuthorLastName = (parsedAuthors[0][0] || '').trim();
            const firstAuthorFullFirstName = (parsedAuthors[0][1] || '').trim();
            entryDataForTemplate.LASTNAME = firstAuthorLastName;
            entryDataForTemplate.NAME = TextProcessor.formatComplexFirstName(firstAuthorFullFirstName);
            entryDataForTemplate.NAME_INIT = TextProcessor.getInitials(firstAuthorFullFirstName);
        } else {
            entryDataForTemplate.LASTNAME = entryDataForTemplate.LASTNAME || ''; 
            entryDataForTemplate.NAME = entryDataForTemplate.NAME || '';
            entryDataForTemplate.NAME_INIT = entryDataForTemplate.NAME_INIT || '';
        }

        const authorLastNames = [];
        const authorComplexFirstNames = [];
        const authorAllInitials = [];
        parsedAuthors.forEach(authorParts => {
            const lastName = (authorParts[0] || '').trim();
            const fullFirstName = (authorParts[1] || '').trim();
            if (lastName) { 
                authorLastNames.push(lastName);
                authorComplexFirstNames.push(TextProcessor.formatComplexFirstName(fullFirstName)); 
                authorAllInitials.push(TextProcessor.getInitials(fullFirstName));             
            } else if (fullFirstName) { 
                authorComplexFirstNames.push(TextProcessor.formatComplexFirstName(fullFirstName));
                authorAllInitials.push(TextProcessor.getInitials(fullFirstName));
                authorLastNames.push(''); 
            }
        });
        entryDataForTemplate.LIST_LASTNAMES = authorLastNames.join(' – ');
        entryDataForTemplate.LIST_NAMES = authorComplexFirstNames.join(' – ');
        entryDataForTemplate.LIST_INITIALS = authorAllInitials.join(' – ');

        const editorSourceString = entry.Editor || '';
        let plainEditorText = '';
        if (editorSourceString) {
            const tempDivEd = document.createElement('div');
            tempDivEd.innerHTML = editorSourceString;
            plainEditorText = tempDivEd.textContent || "";
        }
        const parsedEditors = TextProcessor.formatAuthor(plainEditorText);

        if (parsedEditors.length > 0 && parsedEditors[0]) {
            const firstEditorLastName = (parsedEditors[0][0] || '').trim();
            const firstEditorFullFirstName = (parsedEditors[0][1] || '').trim();
            entryDataForTemplate.ED_LASTNAME = firstEditorLastName;
            entryDataForTemplate.ED_NAME = TextProcessor.formatComplexFirstName(firstEditorFullFirstName);
            entryDataForTemplate.ED_NAME_INIT = TextProcessor.getInitials(firstEditorFullFirstName);
        } else {
            entryDataForTemplate.ED_LASTNAME = entryDataForTemplate.ED_LASTNAME || ''; 
            entryDataForTemplate.ED_NAME = entryDataForTemplate.ED_NAME || '';
            entryDataForTemplate.ED_NAME_INIT = entryDataForTemplate.ED_NAME_INIT || '';
        }
        
        const editorLastNames = [];
        const editorComplexFirstNames = [];
        const editorAllInitials = [];
        parsedEditors.forEach(editorParts => {
            const lastName = (editorParts[0] || '').trim();
            const fullFirstName = (editorParts[1] || '').trim();
            if (lastName) {
                editorLastNames.push(lastName);
                editorComplexFirstNames.push(TextProcessor.formatComplexFirstName(fullFirstName));
                editorAllInitials.push(TextProcessor.getInitials(fullFirstName));
            } else if (fullFirstName) {
                editorComplexFirstNames.push(TextProcessor.formatComplexFirstName(fullFirstName));
                editorAllInitials.push(TextProcessor.getInitials(fullFirstName));
                editorLastNames.push(''); 
            }
        });
        entryDataForTemplate.ED_LIST_LASTNAMES = editorLastNames.join(' – ');
        entryDataForTemplate.ED_LIST_NAMES = editorComplexFirstNames.join(' – ');
        entryDataForTemplate.ED_LIST_INITIALS = editorAllInitials.join(' – ');
    }

    processOtherFields(entry, entryDataForTemplate) {
        entryDataForTemplate.TITLE = entry.Title || entry.title || entryDataForTemplate.TITLE || '';
        entryDataForTemplate.YEAR = entry['Publication Year'] || entry.Year || entry['publication year'] || entry.year || entryDataForTemplate.YEAR || '';
        entryDataForTemplate.JOURNAL = entry['Publication Title'] || entry.Journal || entry['publication title'] || entry.journal || entryDataForTemplate.JOURNAL || '';
        entryDataForTemplate.VOLUME = entry.Volume || entry.volume || entryDataForTemplate.VOLUME || '';
        entryDataForTemplate.PAGES = entry.Pages || entry.pages || entry['Page Range'] || entry['page range'] || entryDataForTemplate.PAGES || '';
        entryDataForTemplate.PLACE = entry.Place || entry.place || entry['Publication Place'] || entry['publication place'] || entryDataForTemplate.PLACE || '';
        entryDataForTemplate.PUBLISHER = entry.Publisher || entry.publisher || entryDataForTemplate.PUBLISHER || '';
        entryDataForTemplate.URL = entry.URL || entry.url || entryDataForTemplate.URL || '';
        entryDataForTemplate.DOI = entry.DOI || entry.doi || entryDataForTemplate.DOI || '';
        entryDataForTemplate['ITEM TYPE'] = entry['Item Type'] || entry['item type'] || entryDataForTemplate['ITEM TYPE'] || ''; 
        entryDataForTemplate.SERIES = entry.Series || entry.series || entryDataForTemplate.SERIES || '';
        entryDataForTemplate['SERIES NUMBER'] = entry['Series Number'] || entry['series number'] || entry['SeriesNumber'] || entryDataForTemplate['SERIES NUMBER'] || '';
        entryDataForTemplate.REVIEWER = TextProcessor.formatAuthorReview(entry['author review'] || entry['Author Review'] || entryDataForTemplate.REVIEWER || '');
        entryDataForTemplate.AKKADIAN = entry.Akkadian || entry.akkadian || entryDataForTemplate.AKKADIAN || '';
        entryDataForTemplate.DETERMINATIVE = entry.Determinative || entry.determinative || entryDataForTemplate.DETERMINATIVE || '';
        entryDataForTemplate.KEIBI = entry.related || entryDataForTemplate.RELATED || ''; 
        entryDataForTemplate.CONFER = entryDataForTemplate.CONFER || '';
    }
}