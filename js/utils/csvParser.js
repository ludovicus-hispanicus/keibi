// js/utils/csvParser.js (Fixed version)
export class CSVParser {
    static parseCSV(csvText) {
        if (!csvText || !csvText.trim()) {
            return { headers: [], entries: [] };
        }

        try {
            // Use Papa Parse for robust CSV parsing
            const result = Papa.parse(csvText, {
                header: true,                // First row is headers
                dynamicTyping: false,        // Keep all values as strings for editing compatibility
                skipEmptyLines: true,        // Skip empty rows
                trimHeaders: true,           // Remove whitespace from headers
                delimiter: '',               // Auto-detect delimiter (comma, semicolon, tab)
                delimitersToGuess: [',', '\t', ';', '|'], // Try these delimiters
                transformHeader: function(header) {
                    // Clean up headers: remove quotes, trim whitespace
                    return header.trim().replace(/^["']|["']$/g, '');
                },
                transform: function(value, field) {
                    // Handle null/undefined values and ensure strings
                    if (value === null || value === undefined) {
                        return '';
                    }
                    // Convert to string and trim for consistent editing
                    return String(value).trim();
                },
                error: function(error) {
                    console.error('Papa Parse error:', error);
                }
            });

            if (result.errors && result.errors.length > 0) {
                console.warn('CSV parsing warnings:', result.errors);
                // Filter out non-critical errors
                const criticalErrors = result.errors.filter(error => 
                    error.type === 'Delimiter' || error.type === 'Quotes'
                );
                if (criticalErrors.length > 0) {
                    throw new Error(`CSV parsing failed: ${criticalErrors[0].message}`);
                }
            }

            // Get headers from Papa Parse
            const headers = result.meta.fields || [];
            
            // Get data entries - all values are now strings
            const entries = result.data;

            console.log(`Papa Parse successfully parsed CSV: ${headers.length} columns, ${entries.length} rows`);
            
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
            console.error('Error parsing CSV with Papa Parse:', error);
            throw new Error(`CSV parsing failed: ${error.message}`);
        }
    }

    static generateCSV(headers, data, options = {}) {
        try {
            // Use Papa Parse to generate CSV
            const csvString = Papa.unparse({
                fields: headers,
                data: data
            }, {
                quotes: false,          // Only quote when necessary
                quoteChar: '"',
                escapeChar: '"',
                delimiter: ',',
                header: true,
                newline: '\r\n',        // Windows-compatible line endings
                skipEmptyLines: false,
                columns: headers,
                ...options              // Allow custom options
            });

            return csvString;
        } catch (error) {
            console.error('Error generating CSV with Papa Parse:', error);
            throw new Error(`CSV generation failed: ${error.message}`);
        }
    }

    // Helper method to detect CSV delimiter
    static detectDelimiter(csvText) {
        const sample = csvText.split('\n').slice(0, 5).join('\n'); // Use first 5 lines
        const result = Papa.parse(sample, {
            delimitersToGuess: [',', '\t', ';', '|'],
            header: false
        });
        return result.meta.delimiter;
    }

    // Helper method to validate CSV structure
    static validateCSV(csvText) {
        try {
            const result = Papa.parse(csvText, {
                header: true,
                preview: 5,  // Only parse first 5 rows for validation
                skipEmptyLines: true,
                dynamicTyping: false  // Keep as strings for validation
            });

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

    // Helper method for safe string operations
    static safeStringOperation(value, operation = 'trim') {
        if (value === null || value === undefined) {
            return '';
        }
        
        const stringValue = String(value);
        
        switch (operation) {
            case 'trim':
                return stringValue.trim();
            case 'toLowerCase':
                return stringValue.toLowerCase();
            case 'toUpperCase':
                return stringValue.toUpperCase();
            default:
                return stringValue;
        }
    }
}