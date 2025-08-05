import { globalState } from '../state/globalState.js';

export class WordExporter {
    constructor() {
        this.docx = null;
        console.log('[WordExporter] Constructor called');
    }

    async ensureDocxLoaded() {
        // Check if docx is already available
        if (window.docx) {
            this.docx = window.docx;
            console.log('[WordExporter] docx library found in window');
            return true;
        }

        if (typeof docx !== 'undefined') {
            this.docx = docx;
            console.log('[WordExporter] docx library found globally');
            return true;
        }

        // Try to load docx dynamically
        console.log('[WordExporter] Loading docx library dynamically...');
        try {
            await this.loadDocxScript();
            
            // Wait a bit for the library to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (window.docx) {
                this.docx = window.docx;
                console.log('[WordExporter] docx library loaded successfully');
                return true;
            } else {
                throw new Error('docx library failed to load');
            }
        } catch (error) {
            console.error('[WordExporter] Failed to load docx library:', error);
            return false;
        }
    }

    loadDocxScript() {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            if (document.querySelector('script[src*="docx"]')) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/docx@7.8.2/build/index.js';
            script.onload = () => {
                console.log('[WordExporter] docx script loaded');
                resolve();
            };
            script.onerror = (error) => {
                console.error('[WordExporter] Failed to load docx script:', error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }

    async exportBibliographyAsWord() {
        try {
            console.log('[WordExporter] Starting Word export with German formatting...');
            
            // Ensure docx library is loaded
            const docxLoaded = await this.ensureDocxLoaded();
            if (!docxLoaded) {
                alert('Failed to load Word export library. Please check your internet connection and try again.');
                return;
            }
            
            if (!globalState.bibliographyOutputGlobal || !globalState.bibliographyOutputGlobal.innerHTML.trim()) {
                alert('No bibliography content to export. Please generate the bibliography first.');
                return;
            }

            // Get bibliography entries
            const entries = this.parseBibliographyEntries();
            
            if (entries.length === 0) {
                alert('No bibliography entries found to export.');
                return;
            }

            console.log(`[WordExporter] Creating Word document with ${entries.length} entries...`);

            // Create Word document with German academic formatting
            const doc = this.createWordDocument(entries);
            
            // Generate and save the document
            console.log('[WordExporter] Generating blob...');
            const blob = await this.docx.Packer.toBlob(doc);
            this.saveWordFile(blob);
            
            console.log('[WordExporter] Word document exported successfully');
            
        } catch (error) {
            console.error('[WordExporter] Export failed:', error);
            alert('Word export failed: ' + error.message);
        }
    }

    parseBibliographyEntries() {
        const bibliographyContainer = globalState.bibliographyOutputGlobal;
        const entryElements = bibliographyContainer.querySelectorAll('p, div');
        const entries = [];
        
        entryElements.forEach((element, index) => {
            const text = element.textContent.trim();
            if (text && text.length > 10) { // Filter out empty or very short entries
                entries.push({
                    number: index + 1,
                    html: element.innerHTML,
                    text: text
                });
            }
        });
        
        console.log(`[WordExporter] Parsed ${entries.length} bibliography entries`);
        return entries;
    }

    createWordDocument(entries) {
        // Destructure from this.docx instead of window.docx
        const { Document, Paragraph, TextRun, AlignmentType, TabStopType, TabStopPosition } = this.docx;
        
        console.log('[WordExporter] Available docx components:', {
            Document: !!Document,
            Paragraph: !!Paragraph,
            TextRun: !!TextRun,
            AlignmentType: !!AlignmentType
        });
        
        // FIXED: Simplified document creation for better compatibility
        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: [
                        // Title
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Bibliographie",
                                    bold: true,
                                    size: 28, // 14pt for title
                                    font: "Times New Roman"
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: {
                                after: 480 // 24pt spacing after title
                            }
                        }),
                        
                        // Bibliography entries
                        ...entries.map(entry => this.createBibliographyParagraph(entry))
                    ]
                }
            ]
        });
        
        return doc;
    }

    createBibliographyParagraph(entry) {
        // Destructure from this.docx instead of window.docx
        const { Paragraph, TextRun, AlignmentType } = this.docx;
        
        // Parse HTML content to preserve formatting
        const textRuns = this.parseHTMLToTextRuns(entry.html, entry.number);
        
        return new Paragraph({
            children: textRuns,
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
                line: 240, // 12pt line spacing
                after: 220 // 11pt after paragraph
            }
            // REMOVED: hanging indent since we're not using numbers
        });
    }

    parseHTMLToTextRuns(html, entryNumber) {
        // Destructure from this.docx instead of window.docx
        const { TextRun } = this.docx;
        const textRuns = [];
        
        // REMOVED: Don't add entry number - just process the content as separate paragraphs
        
        // Create a temporary element to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Process the content recursively
        this.processNodeSimple(tempDiv, textRuns);
        
        return textRuns;
    }

    processNodeSimple(node, textRuns) {
        // Simplified node processing to avoid complex nested formatting
        const { TextRun } = this.docx;
        
        // Get all text content and check for formatting
        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            null,
            false
        );
        
        let currentNode;
        while (currentNode = walker.nextNode()) {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                const text = currentNode.textContent;
                if (text.trim()) {
                    // Check parent elements for formatting
                    let isBold = false;
                    let isItalic = false;
                    
                    let parent = currentNode.parentElement;
                    while (parent && parent !== node) {
                        const tagName = parent.tagName.toLowerCase();
                        if (tagName === 'strong' || tagName === 'b') {
                            isBold = true;
                        }
                        if (tagName === 'em' || tagName === 'i') {
                            isItalic = true;
                        }
                        parent = parent.parentElement;
                    }
                    
                    textRuns.push(new TextRun({
                        text: text,
                        font: "Times New Roman",
                        size: 20, // 10pt
                        bold: isBold,
                        italics: isItalic
                    }));
                }
            }
        }
    }

    saveWordFile(blob) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        // Generate filename with current date
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
        const filename = `Bibliographie_${dateStr}.docx`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        console.log(`[WordExporter] File saved as: ${filename}`);
    }
}

// Integration function to add to your existing export manager
export function addWordExportButton() {
    const exportActions = document.querySelector('#mainExportActions');
    if (!exportActions) {
        console.error('Export actions container not found');
        return;
    }
    
    // Check if button already exists
    if (document.getElementById('exportWordBtn')) {
        return;
    }
    
    const wordExportBtn = document.createElement('button');
    wordExportBtn.id = 'exportWordBtn';
    wordExportBtn.type = 'button';
    wordExportBtn.className = 'btn-action padding-condensed';
    wordExportBtn.textContent = 'Export as Word';
    
    // FIXED: Only handle Word export, don't interfere with HTML export
    wordExportBtn.addEventListener('click', async () => {
        const exporter = new WordExporter();
        await exporter.exportBibliographyAsWord();
    });
    
    // Insert after the HTML export button
    const htmlBtn = document.getElementById('exportHTMLBtn');
    if (htmlBtn) {
        htmlBtn.parentNode.insertBefore(wordExportBtn, htmlBtn.nextSibling);
        // REMOVED: Don't override the HTML button - let ExportManager handle it
    } else {
        exportActions.appendChild(wordExportBtn);
    }
    
    console.log('[WordExporter] Word export button added');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addWordExportButton);
} else {
    addWordExportButton();
}