import { globalState } from '../state/globalState.js';

// Export functionality (HTML, CSV)
export class ExportManager {
    exportBibliographyAsHTML() {
        if (!globalState.outputDiv || globalState.outputDiv.querySelectorAll('.entry').length === 0) {
            alert('No bibliography content to export.');
            return;
        }

        try {
            const htmlContent = this.generateHTMLContent();
            this.downloadHTML(htmlContent);
            
            console.log('HTML file generated and download triggered');
            alert('Bibliography exported to HTML successfully! You can open this file in Word or other word processors.');
        } catch (error) {
            console.error('Error generating HTML:', error);
            alert('Error generating HTML file: ' + error.message);
            
            if (confirm('Would you like to copy the bibliography to clipboard instead?')) {
                this.copyBibliographyAsPlainText();
            }
        }
    }

    generateHTMLContent() {
        let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bibliography Export</title>
    <style>
        body {
            font-family: "Times New Roman", Times, serif;
            font-size: 10pt;
            line-height: 1.5;
            margin: 1in;
        }
        h1 {
            text-align: center;
            font-size: 14pt;
            margin-bottom: 24pt;
        }
        .bibliography-entry {
            text-indent: -0.5in;
            padding-left: 0.5in;
            margin-bottom: 12pt;
            text-align: justify;
        }
        .bold {
            font-weight: bold;
        }
        .italic {
            font-style: italic;
        }
        .tag {
            color: #666;
            font-size: 10pt;
        }
    </style>
</head>
<body>
    <h1>Bibliography</h1>
    <div class="bibliography-container">
`;

        const entries = globalState.outputDiv.querySelectorAll('.entry');
        console.log(`Found ${entries.length} entries to process for HTML export`);
        
        entries.forEach((entryNode) => {
            let entryHTML = entryNode.innerHTML
                .replace(/<span class="editable-field"[^>]*>(.*?)<\/span>/gi, '$1')
                .replace(/<span class="font-bold">(.*?)<\/span>/gi, '<strong>$1</strong>')
                .replace(/<span class="italic">(.*?)<\/span>/gi, '<em>$1</em>')
                .replace(/<span class="tag[^"]*">(.*?)<\/span>/gi, '<span class="tag">$1</span>');
            
            htmlContent += `    <div class="bibliography-entry">${entryHTML}</div>\n`;
        });
        
        htmlContent += `</div>
</body>
</html>`;

        return htmlContent;
    }

    downloadHTML(htmlContent) {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'bibliography.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    copyBibliographyAsPlainText() {
        const plainText = Array.from(globalState.outputDiv.querySelectorAll('.entry')).map(el => {
            let t = el.innerHTML
                .replace(/<span class="font-bold">(.*?)<\/span>/gi, '$1')
                .replace(/<span class="italic">(.*?)<\/span>/gi, '$1')
                .replace(/<span class="tag.*?">(.*?)<\/span>/gi, ' $1')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]+>/g, '');
            return t.trim();
        }).join('\n\n');
        
        if (!plainText) {
            alert('No bibliography entries to copy.');
            return;
        }
        
        navigator.clipboard.writeText(plainText)
            .then(() => alert('Copied to clipboard! You can now paste into your document.'))
            .catch(err => {
                console.error('Copy failed:', err);
                alert('Copy to clipboard failed. Please select and copy the content manually.');
            });
    }

    async saveCSVChanges() {
        globalState.csvData = JSON.parse(JSON.stringify(globalState.editedCsvData)); 
        globalState.originalCsvData = JSON.parse(JSON.stringify(globalState.editedCsvData));
        alert('CSV data changes saved locally!');
        
        // Trigger bibliography regeneration
        try {
            const module = await import('../preview/BibliographyGenerator.js');
            const generator = new module.BibliographyGenerator();
            generator.generateBibliography();
        } catch (error) {
            console.error('Error generating bibliography after CSV save:', error);
        }
        
        // Update cell previewer if needed
        if (globalState.currentlySelectedCell.rowIndex !== -1 && globalState.csvCellDetailPreviewer) {
            try {
                const module = await import('../csvEditor/cellEditor.js');
                const editor = new module.CellEditor();
                editor.showCellContentInPreviewer(
                    globalState.currentlySelectedCell.rowIndex, 
                    globalState.currentlySelectedCell.header
                );
            } catch (error) {
                console.error('Error updating cell previewer:', error);
            }
        }
        
        // Switch to preview tab after saving
        const previewTabButton = document.querySelector('.tab-button[data-tab="preview"]');
        if (previewTabButton) previewTabButton.click();
    }

    exportCSV() {
        if (!globalState.editedCsvData.length) { 
            alert('No CSV data to export.'); 
            return; 
        }
        
        if (!globalState.csvHeaders || globalState.csvHeaders.length === 0) {
            const allH = new Set(); 
            globalState.editedCsvData.forEach(e => Object.keys(e).forEach(k => allH.add(k))); 
            globalState.csvHeaders = Array.from(allH);
            if (!globalState.csvHeaders.length) { 
                alert('CSV headers undetermined.'); 
                return; 
            }
        }
        
        let csvContent = globalState.csvHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
        
        globalState.editedCsvData.forEach(row => {
            csvContent += globalState.csvHeaders.map(h => { 
                let v = String(row[h] || ''); 
                return (v.includes(',') || v.includes('"') || v.includes('\n')) ? `"${v.replace(/"/g, '""')}"` : v; 
            }).join(',') + '\n';
        });
        
        const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' }); // Added BOM
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = 'edited_bibliography.csv';
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a); 
        URL.revokeObjectURL(url);
    }
}