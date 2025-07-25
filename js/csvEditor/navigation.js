import { globalState } from '../state/globalState.js';

// Keyboard navigation and UI enhancements for CSV editor
export class CSVNavigation {
    enhanceCellNavigation() {
        const table = document.getElementById('csvTable');
        if (!table) return;

        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
    }

    handleKeyboardNavigation(e) {
        if (globalState.currentlySelectedCell.rowIndex === -1 || !globalState.currentlySelectedCell.element) {
            return;
        }

        const currentCell = globalState.currentlySelectedCell.element;
        const currentRow = currentCell.parentElement;
        const currentCellIndexInRow = Array.from(currentRow.cells).indexOf(currentCell);

        if (currentCell.classList.contains('editing')) return;

        let nextCell;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (currentRow.previousElementSibling && currentRow.previousElementSibling.cells[currentCellIndexInRow]) {
                    nextCell = currentRow.previousElementSibling.cells[currentCellIndexInRow];
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (currentRow.nextElementSibling && currentRow.nextElementSibling.cells[currentCellIndexInRow]) {
                    nextCell = currentRow.nextElementSibling.cells[currentCellIndexInRow];
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (currentCell.previousElementSibling) {
                    nextCell = currentCell.previousElementSibling;
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (currentCell.nextElementSibling) {
                    nextCell = currentCell.nextElementSibling;
                }
                break;
            case 'Enter':
                if (document.activeElement !== globalState.previewerInputField && !currentCell.classList.contains('editing')) {
                    e.preventDefault();
                    this.startEditing(currentCell);
                }
                return;
        }

        if (nextCell) {
            const newRowIndex = parseInt(nextCell.dataset.rowIndex);
            const newHeader = nextCell.dataset.column;
            
            this.handleCellClick(newRowIndex, newHeader, nextCell);
            
            nextCell.focus({ preventScroll: true });
            nextCell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }

    handleCellClick(rowIndex, headerName, cellElement) {
        // This method would need to be implemented or imported from csvManager
        console.log(`Cell clicked: ${rowIndex}, ${headerName}`);
    }

    startEditing(cellElement) {
        // This method would need to be implemented or imported from csvManager
        console.log('Start editing cell:', cellElement);
    }

    addColumnHoverEffect() {
        const table = document.getElementById('csvTable');
        if (!table) return;
        
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            header.addEventListener('mouseenter', () => {
                const cellsInColumn = table.querySelectorAll(`tbody td:nth-child(${index + 1})`);
                header.classList.add('column-hover-header');
                cellsInColumn.forEach(cell => cell.classList.add('column-hover'));
            });
            
            header.addEventListener('mouseleave', () => {
                const cellsInColumn = table.querySelectorAll(`tbody td:nth-child(${index + 1})`);
                header.classList.remove('column-hover-header');
                cellsInColumn.forEach(cell => cell.classList.remove('column-hover'));
            });
        });
    }

    addRowNumbersColumn() {
        // Optional: Add row numbers to the table
        const table = document.getElementById('csvTable');
        if (!table) return;

        const thead = table.querySelector('thead tr');
        const tbody = table.querySelector('tbody');
        
        if (!thead || !tbody) return;

        // Add header for row numbers
        const rowNumberHeader = document.createElement('th');
        rowNumberHeader.textContent = '#';
        rowNumberHeader.className = 'row-number-header';
        thead.insertBefore(rowNumberHeader, thead.firstChild);

        // Add row numbers to each row
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const rowNumberCell = document.createElement('td');
            rowNumberCell.textContent = index + 1;
            rowNumberCell.className = 'row-number-cell';
            row.insertBefore(rowNumberCell, row.firstChild);
        });
    }
}