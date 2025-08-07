// js/utils/csvParser.js (Production-ready with minimal logs)
export class CSVParser {
    static parseCSV(csvText) {
        if (!csvText || !csvText.trim()) {
            return { headers: [], entries: [] };
        }

        try {
            const result = Papa.parse(csvText, {
                header: true,
                dynamicTyping: false,
                skipEmptyLines: true,
                trimHeaders: true,
                delimiter: '',
                delimitersToGuess: [',', '\t', ';', '|'],
                transformHeader: header => header.trim().replace(/^["']|["']$/g, ''),
                transform: (value, field) => value === null || value === undefined ? '' : String(value).trim()
            });

            if (result.errors && result.errors.length > 0) {
                const criticalErrors = result.errors.filter(error => 
                    error.type === 'Delimiter' || error.type === 'Quotes'
                );
                if (criticalErrors.length > 0) {
                    throw new Error(`CSV parsing failed: ${criticalErrors[0].message}`);
                }
            }

            const headers = result.meta.fields || [];
            const entries = result.data.map(row => {
                const newRow = {};
                headers.forEach(header => {
                    newRow[header] = row[header] || '';
                });
                return newRow;
            });

            return {
                headers: headers,
                entries: entries,
                meta: {
                    delimiter: result.meta.delimiter,
                    linebreak: result.meta.linebreak,
                    aborted: result.meta.aborted,
                    truncated: result.meta.truncated,
                    cursor: result.meta.cursor
                }
            };
        } catch (error) {
            console.error('Error parsing CSV:', error);
            throw new Error(`CSV parsing failed: ${error.message}`);
        }
    }

    static generateCSV(headers, data, options = {}) {
        try {
            const csvString = Papa.unparse({
                fields: headers,
                data: data.map(row => {
                    const newRow = {};
                    headers.forEach(header => {
                        newRow[header] = row[header] || '';
                    });
                    return newRow;
                })
            }, {
                quotes: false,
                quoteChar: '"',
                escapeChar: '"',
                delimiter: ',',
                header: true,
                newline: '\r\n',
                skipEmptyLines: false,
                columns: headers,
                ...options
            });

            return csvString;
        } catch (error) {
            console.error('Error generating CSV:', error);
            throw new Error(`CSV generation failed: ${error.message}`);
        }
    }

    static detectDelimiter(csvText) {
        const sample = csvText.split('\n').slice(0, 5).join('\n');
        const result = Papa.parse(sample, { delimitersToGuess: [',', '\t', ';', '|'], header: false });
        return result.meta.delimiter;
    }

    static validateCSV(csvText) {
        try {
            const result = Papa.parse(csvText, { header: true, preview: 5, skipEmptyLines: true, dynamicTyping: false });

            const validation = {
                isValid: true,
                errors: [],
                warnings: [],
                headers: result.meta.fields || [],
                rowCount: result.data.length,
                delimiter: result.meta.delimiter
            };

            if (result.errors && result.errors.length > 0) {
                validation.errors = result.errors;
                const criticalErrors = result.errors.filter(error => 
                    error.type === 'Delimiter' || error.type === 'Quotes'
                );
                if (criticalErrors.length > 0) {
                    validation.isValid = false;
                }
            }

            if (validation.headers.length === 0) {
                validation.isValid = false;
                validation.errors.push({ message: 'No headers detected' });
            }

            return validation;
        } catch (error) {
            return {
                isValid: false,
                errors: [{ message: error.message }],
                warnings: [],
                headers: [],
                rowCount: 0,
                delimiter: ','
            };
        }
    }

    static safeStringOperation(value, operation = 'trim') {
        if (value === null || value === undefined) {
            return '';
        }
        const stringValue = String(value);
        switch (operation) {
            case 'trim': return stringValue.trim();
            case 'toLowerCase': return stringValue.toLowerCase();
            case 'toUpperCase': return stringValue.toUpperCase();
            default: return stringValue;
        }
    }
}