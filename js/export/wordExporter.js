// js/export/wordExporter.js (Fixed version with proper spacing)
import { globalState } from '../state/globalState.js';

export class WordExporter {
    constructor() {
        this.docx = null;
    }

    async ensureDocxLoaded() {
        if (window.docx) {
            this.docx = window.docx;
            return true;
        }
        if (typeof docx !== 'undefined') {
            this.docx = docx;
            return true;
        }
        try {
            await this.loadDocxScript();
            await new Promise(resolve => setTimeout(resolve, 500));
            if (window.docx) {
                this.docx = window.docx;
                return true;
            }
            throw new Error('docx library failed to load');
        } catch (error) {
            console.error('Failed to load docx library:', error);
            return false;
        }
    }

    loadDocxScript() {
        return new Promise((resolve, reject) => {
            if (document.querySelector('script[src*="docx"]')) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/docx@7.8.2/build/index.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async exportBibliographyAsWord() {
        try {
            const docxLoaded = await this.ensureDocxLoaded();
            if (!docxLoaded) {
                alert('Failed to load Word export library. Please check your internet connection and try again.');
                return;
            }

            if (!globalState.bibliographyOutputGlobal || !globalState.bibliographyOutputGlobal.innerHTML.trim()) {
                alert('No bibliography content to export. Please generate the bibliography first.');
                return;
            }

            const entries = this.parseBibliographyEntries();
            if (entries.length === 0) {
                alert('No bibliography entries found to export.');
                return;
            }

            const doc = this.createWordDocument(entries);
            const blob = await this.docx.Packer.toBlob(doc);
            this.saveWordFile(blob);
        } catch (error) {
            console.error('Word export failed:', error);
            alert('Word export failed: ' + error.message);
        }
    }

    parseBibliographyEntries() {
        const bibliographyContainer = globalState.bibliographyOutputGlobal;
        const entryElements = bibliographyContainer.querySelectorAll('.entry');
        const entries = [];

        entryElements.forEach((element, index) => {
            const checkbox = element.querySelector('.proof-checkbox');
            const isChecked = checkbox && checkbox.checked;
            const text = element.textContent.trim();
            if (text && text.length > 10) {
                entries.push({
                    number: index + 1,
                    html: element.querySelector('span').innerHTML,
                    text: text,
                    isChecked: isChecked
                });
            }
        });

        return entries;
    }

    createWordDocument(entries) {
        const { Document, Paragraph, TextRun, AlignmentType } = this.docx;

        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Bibliographie",
                                    bold: true,
                                    size: 28,
                                    font: "SemiramisUnicode"
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 480 }
                        }),
                        ...entries.map(entry => this.createBibliographyParagraph(entry))
                    ]
                }
            ]
        });

        return doc;
    }

    createBibliographyParagraph(entry) {
        const { Paragraph, TextRun, AlignmentType } = this.docx;
        const textRuns = this.parseHTMLToTextRuns(entry.html, entry.number, entry.isChecked);

        return new Paragraph({
            children: textRuns,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 240, after: 220 }
        });
    }

    parseHTMLToTextRuns(html, entryNumber, isChecked) {
        const { TextRun } = this.docx;
        const textRuns = [];

        if (isChecked) {
            textRuns.push(new TextRun({
                text: "[✓] ",
                font: "SemiramisUnicode",
                size: 20
            }));
        }

        // Clean up the HTML to ensure proper spacing
        const cleanedHtml = this.preprocessHTML(html);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanedHtml;
        this.processNodeWithFormatting(tempDiv, textRuns, { bold: false, italic: false, superscript: false });

        return textRuns;
    }

    preprocessHTML(html) {
        // Fix spacing issues in the HTML before processing
        let cleaned = html;
        
        // Ensure spaces after closing italic/bold tags that are followed by text/numbers
        cleaned = cleaned.replace(/<\/(em|i|strong|b)>(\S)/g, '</$1> $2');
        
        // Ensure spaces before opening tags that follow text without whitespace
        cleaned = cleaned.replace(/(\S)<(em|i|strong|b)>/g, '$1 <$2>');
        
        // Handle asterisk-style italics (common in bibliography formatting)
        cleaned = cleaned.replace(/\*([^*]+)\*(\S)/g, '<i>$1</i> $2');
        
        // Ensure proper spacing around colons and periods followed by years
        cleaned = cleaned.replace(/:(\d{4})/g, ': $1');
        cleaned = cleaned.replace(/\.(\d{4})/g, '. $1');
        
        // Fix missing spaces between journal names and years
        cleaned = cleaned.replace(/>([^<\s])(\d{4})/g, '>$1 $2');
        cleaned = cleaned.replace(/([a-zA-Z])(\d{4})/g, '$1 $2');
        
        return cleaned;
    }

    processNodeWithFormatting(node, textRuns, currentFormatting) {
        const { TextRun } = this.docx;

        for (const child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent;
                if (text) { // Process all text, even if just whitespace
                    textRuns.push(new TextRun({
                        text: text,
                        font: "SemiramisUnicode",
                        size: 20,
                        bold: currentFormatting.bold,
                        italics: currentFormatting.italic,
                        superScript: currentFormatting.superscript
                    }));
                }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const newFormatting = this.getFormattingFromElement(child, currentFormatting);
                this.processNodeWithFormatting(child, textRuns, newFormatting);
            }
        }
    }

    getFormattingFromElement(element, parentFormatting) {
        const formatting = { ...parentFormatting };
        const tagName = element.tagName.toLowerCase();
        const className = element.className || '';

        if (tagName === 'strong' || tagName === 'b' || className.includes('font-bold') || className.includes('bold')) {
            formatting.bold = true;
        }
        if (tagName === 'em' || tagName === 'i' || className.includes('italic')) {
            formatting.italic = true;
        }
        if (tagName === 'sup' || className.includes('superscript')) {
            formatting.superscript = true;
        }

        return formatting;
    }

    saveWordFile(blob) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Bibliographie_${dateStr}.docx`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}

export function addWordExportButton() {
    const exportContainers = [
        document.querySelector('#mainExportActions'),
        document.querySelector('#csvExportActions')
    ];

    exportContainers.forEach((exportActions, index) => {
        if (!exportActions) {
            console.error(`Export actions container ${index + 1} not found`);
            return;
        }

        const buttonId = index === 0 ? 'exportWordBtn' : 'exportWordBtn2';
        if (document.getElementById(buttonId)) {
            return;
        }

        const wordExportBtn = document.createElement('button');
        wordExportBtn.id = buttonId;
        wordExportBtn.type = 'button';
        wordExportBtn.className = 'btn-action padding-condensed';
        wordExportBtn.textContent = 'Export as Word';

        wordExportBtn.addEventListener('click', async () => {
            const exporter = new WordExporter();
            await exporter.exportBibliographyAsWord();
        });

        const htmlBtn = exportActions.querySelector('#exportHTMLBtn');
        if (htmlBtn) {
            htmlBtn.parentNode.insertBefore(wordExportBtn, htmlBtn.nextSibling);
        } else {
            exportActions.appendChild(wordExportBtn);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addWordExportButton);
} else {
    addWordExportButton();
}