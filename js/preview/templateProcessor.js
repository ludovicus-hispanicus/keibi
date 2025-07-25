// js/preview/templateProcessor.js
// Template processing and formatting
export class TemplateProcessor {
    static processFormatTemplate(template, data, entryIndexForMapping) {
        let result = this.processAuthorListsInTemplate(template, data, entryIndexForMapping);
        
        const placeholderRegex = /\[([\w\s.-]+)(?::(\w+))?\]/g;
        
        result = result.replace(placeholderRegex, (match, placeholderKey, styleSuffix) => {
            const key = placeholderKey.trim().toUpperCase();

            if (key === 'CONFER') {
                return this.processConferField(data, key, styleSuffix, entryIndexForMapping);
            } else {
                return this.processGenericField(data, key, styleSuffix, entryIndexForMapping);
            }
        });
        
        return result;
    }

    static processConferField(data, key, styleSuffix, entryIndexForMapping) {
        const rawConferValue = data.hasOwnProperty(key) ? (data[key] || '') : '';

        if (rawConferValue.trim() !== '') {
            const editableValue = entryIndexForMapping >= 0 ? 
                `<span class="editable-field" data-entry-index="${entryIndexForMapping}" data-field-name="${key}">${rawConferValue.trim()}</span>` :
                rawConferValue.trim();
            let styledPart = "cf. " + editableValue;

            if (styleSuffix) {
                const sfx = styleSuffix.toLowerCase();
                if (sfx === 'italic') {
                    styledPart = `<span class="italic">${styledPart}</span>`;
                } else if (sfx === 'bold') {
                    styledPart = `<span class="font-bold">${styledPart}</span>`;
                } else if (sfx === 'superscript') {
                    styledPart = `<sup>${styledPart}</sup>`;
                }
            }
            return "; " + styledPart;
        } else {
            return "";
        }
    }

    static processGenericField(data, key, styleSuffix, entryIndexForMapping) {
        let fieldValue = data.hasOwnProperty(key) ? (data[key] || '') : '';
        
        let editableContentHTML = entryIndexForMapping >= 0 ?
            `<span class="editable-field" data-entry-index="${entryIndexForMapping}" data-field-name="${key}">${fieldValue}</span>` :
            fieldValue;

        if (styleSuffix) {
            const sfx = styleSuffix.toLowerCase();
            if (sfx === 'bold') return `<span class="font-bold">${editableContentHTML}</span>`;
            if (sfx === 'italic') return `<span class="italic">${editableContentHTML}</span>`;
            if (sfx === 'superscript') return `<sup>${editableContentHTML}</sup>`;
            return editableContentHTML; 
        }
        return editableContentHTML;
    }

    static processAuthorListsInTemplate(template, data, entryIndexForMapping) {
        let result = template;

        // Process [LIST_LASTNAMES], [LIST_NAMES] pattern
        const authorListFullNamePattern = /\[LIST_LASTNAMES(?::(\w+))?\](?:,\s*)?\[LIST_NAMES(?::(\w+))?\]/g;
        result = result.replace(authorListFullNamePattern, (match, lastnameStyleSuffix, firstnameStyleSuffix) => {
            const lastnames = data.LIST_LASTNAMES ? data.LIST_LASTNAMES.split(' – ') : [];
            const firstnames = data.LIST_NAMES ? data.LIST_NAMES.split(' – ') : [];
            const count = Math.max(lastnames.length, firstnames.length);

            if (count === 0) return '';

            const authorEntries = [];
            for (let i = 0; i < count; i++) {
                const lastname = lastnames[i] || '';
                const firstname = firstnames[i] || '';

                let lastnameSpan = entryIndexForMapping >= 0 ?
                    `<span class="editable-field" data-entry-index="${entryIndexForMapping}" data-field-name="LASTNAME_${i}">${lastname}</span>` :
                    lastname;
                let firstnameSpan = entryIndexForMapping >= 0 ?
                    `<span class="editable-field" data-entry-index="${entryIndexForMapping}" data-field-name="FIRSTNAME_${i}">${firstname}</span>` :
                    firstname;

                if (lastnameStyleSuffix) {
                    const sfx = lastnameStyleSuffix.toLowerCase();
                    if (sfx === 'bold') lastnameSpan = `<span class="font-bold">${lastnameSpan}</span>`;
                    else if (sfx === 'italic') lastnameSpan = `<span class="italic">${lastnameSpan}</span>`;
                    else if (sfx === 'superscript') lastnameSpan = `<sup>${lastnameSpan}</sup>`;
                }
                if (firstnameStyleSuffix) {
                    const sfx = firstnameStyleSuffix.toLowerCase();
                    if (sfx === 'bold') firstnameSpan = `<span class="font-bold">${firstnameSpan}</span>`;
                    else if (sfx === 'italic') firstnameSpan = `<span class="italic">${firstnameSpan}</span>`;
                    else if (sfx === 'superscript') firstnameSpan = `<sup>${firstnameSpan}</sup>`;
                }
                
                const authorEntry = lastname || firstname ? `${lastnameSpan}, ${firstnameSpan}`.trim() : '';
                if (authorEntry) authorEntries.push(authorEntry);
            }
            return authorEntries.join(' – ');
        });

        // Process [ED_LIST_LASTNAMES], [ED_LIST_NAMES] pattern
        const editorListFullNamePattern = /\[ED_LIST_LASTNAMES(?::(\w+))?\](?:,\s*)?\[ED_LIST_NAMES(?::(\w+))?\]/g;
        result = result.replace(editorListFullNamePattern, (match, lastnameStyleSuffix, firstnameStyleSuffix) => {
            const lastnames = data.ED_LIST_LASTNAMES ? data.ED_LIST_LASTNAMES.split(' – ') : [];
            const firstnames = data.ED_LIST_NAMES ? data.ED_LIST_NAMES.split(' – ') : [];
            const count = Math.max(lastnames.length, firstnames.length);

            if (count === 0) return '';
            
            const editorEntries = [];
            for (let i = 0; i < count; i++) {
                const lastname = lastnames[i] || '';
                const firstname = firstnames[i] || '';

                let lastnameSpan = entryIndexForMapping >= 0 ?
                    `<span class="editable-field" data-entry-index="${entryIndexForMapping}" data-field-name="ED_LASTNAME_${i}">${lastname}</span>` :
                    lastname;
                let firstnameSpan = entryIndexForMapping >= 0 ?
                    `<span class="editable-field" data-entry-index="${entryIndexForMapping}" data-field-name="ED_FIRSTNAME_${i}">${firstname}</span>` :
                    firstname;
                
                if (lastnameStyleSuffix) {
                    const sfx = lastnameStyleSuffix.toLowerCase();
                    if (sfx === 'bold') lastnameSpan = `<span class="font-bold">${lastnameSpan}</span>`;
                    else if (sfx === 'italic') lastnameSpan = `<span class="italic">${lastnameSpan}</span>`;
                    else if (sfx === 'superscript') lastnameSpan = `<sup>${lastnameSpan}</sup>`;
                }
                if (firstnameStyleSuffix) {
                    const sfx = firstnameStyleSuffix.toLowerCase();
                    if (sfx === 'bold') firstnameSpan = `<span class="font-bold">${firstnameSpan}</span>`;
                    else if (sfx === 'italic') firstnameSpan = `<span class="italic">${firstnameSpan}</span>`;
                    else if (sfx === 'superscript') firstnameSpan = `<sup>${firstnameSpan}</sup>`;
                }

                const editorEntry = lastname || firstname ? `${lastnameSpan}, ${firstnameSpan}`.trim() : '';
                if (editorEntry) editorEntries.push(editorEntry);
            }
            return editorEntries.join(' – ');
        });

        // Process [LIST_LASTNAMES], [LIST_INITIALS] pattern
        const authorListInitialsPattern = /\[LIST_LASTNAMES(?::(\w+))?\](?:,\s*)?\[LIST_INITIALS(?::(\w+))?\]/g;
        result = result.replace(authorListInitialsPattern, (match, lastnameStyleSuffix, initialStyleSuffix) => {
            const lastnames = data.LIST_LASTNAMES ? data.LIST_LASTNAMES.split(' – ') : [];
            const initials = data.LIST_INITIALS ? data.LIST_INITIALS.split(' – ') : [];
            const count = Math.max(lastnames.length, initials.length);

            if (count === 0) return '';

            const authorEntries = [];
            for (let i = 0; i < count; i++) {
                const lastname = lastnames[i] || '';
                const initial = initials[i] || '';

                let lastnameSpan = entryIndexForMapping >= 0 ?
                    `<span class="editable-field" data-entry-index="${entryIndexForMapping}" data-field-name="LASTNAME_${i}">${lastname}</span>` :
                    lastname;
                let initialSpan = entryIndexForMapping >= 0 ?
                    `<span class="editable-field" data-entry-index="${entryIndexForMapping}" data-field-name="FIRSTNAME_${i}">${initial}</span>` :
                    initial;

                if (lastnameStyleSuffix) {
                    const sfx = lastnameStyleSuffix.toLowerCase();
                    if (sfx === 'bold') lastnameSpan = `<span class="font-bold">${lastnameSpan}</span>`;
                    else if (sfx === 'italic') lastnameSpan = `<span class="italic">${lastnameSpan}</span>`;
                    else if (sfx === 'superscript') lastnameSpan = `<sup>${lastnameSpan}</sup>`;
                }
                if (initialStyleSuffix) {
                    const sfx = initialStyleSuffix.toLowerCase();
                    if (sfx === 'bold') initialSpan = `<span class="font-bold">${initialSpan}</span>`;
                    else if (sfx === 'italic') initialSpan = `<span class="italic">${initialSpan}</span>`;
                    else if (sfx === 'superscript') initialSpan = `<sup>${initialSpan}</sup>`;
                }
                
                const authorEntry = lastname || initial ? `${lastnameSpan}, ${initialSpan}`.trim() : '';
                if (authorEntry) authorEntries.push(authorEntry);
            }
            return authorEntries.join(' – ');
        });

        // Process [ED_LIST_LASTNAMES], [ED_LIST_INITIALS] pattern
        const editorListInitialsPattern = /\[ED_LIST_LASTNAMES(?::(\w+))?\](?:,\s*)?\[ED_LIST_INITIALS(?::(\w+))?\]/g;
        result = result.replace(editorListInitialsPattern, (match, lastnameStyleSuffix, initialStyleSuffix) => {
            const lastnames = data.ED_LIST_LASTNAMES ? data.ED_LIST_LASTNAMES.split(' – ') : [];
            const initials = data.ED_LIST_INITIALS ? data.ED_LIST_INITIALS.split(' – ') : [];
            const count = Math.max(lastnames.length, initials.length);

            if (count === 0) return '';
            
            const editorEntries = [];
            for (let i = 0; i < count; i++) {
                const lastname = lastnames[i] || '';
                const initial = initials[i] || '';

                let lastnameSpan = entryIndexForMapping >= 0 ?
                    `<span class="editable-field" data-entry-index="${entryIndexForMapping}" data-field-name="ED_LASTNAME_${i}">${lastname}</span>` :
                    lastname;
                let initialSpan = entryIndexForMapping >= 0 ?
                    `<span class="editable-field" data-entry-index="${entryIndexForMapping}" data-field-name="ED_FIRSTNAME_${i}">${initial}</span>` :
                    initial;
                
                if (lastnameStyleSuffix) {
                    const sfx = lastnameStyleSuffix.toLowerCase();
                    if (sfx === 'bold') lastnameSpan = `<span class="font-bold">${lastnameSpan}</span>`;
                    else if (sfx === 'italic') lastnameSpan = `<span class="italic">${lastnameSpan}</span>`;
                    else if (sfx === 'superscript') lastnameSpan = `<sup>${lastnameSpan}</sup>`;
                }
                if (initialStyleSuffix) {
                    const sfx = initialStyleSuffix.toLowerCase();
                    if (sfx === 'bold') initialSpan = `<span class="font-bold">${initialSpan}</span>`;
                    else if (sfx === 'italic') initialSpan = `<span class="italic">${initialSpan}</span>`;
                    else if (sfx === 'superscript') initialSpan = `<sup>${initialSpan}</sup>`;
                }

                const editorEntry = lastname || initial ? `${lastnameSpan}, ${initialSpan}`.trim() : '';
                if (editorEntry) editorEntries.push(editorEntry);
            }
            return editorEntries.join(' – ');
        });

        return result;
    }
}