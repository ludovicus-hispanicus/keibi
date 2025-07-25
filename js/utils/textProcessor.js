import { NAME_PARTICLES } from '../config/constants.js';

// Text processing utilities
export class TextProcessor {
    static decodeLatex(text) {
        if (!text) return '';
        const replacements = [
            { pattern: /\\'{e}/g, replacement: 'é' },
            { pattern: /\\"{a}/g, replacement: 'ä' },
            // ... other LaTeX replacements
        ];
        
        let result = text;
        for (const { pattern, replacement } of replacements) {
            result = result.replace(pattern, replacement);
        }
        return result.trim();
    }

    static formatAuthor(authorFieldSource) {
        if (!authorFieldSource) return [];
        
        let plainTextAuthorField;
        if (typeof authorFieldSource === 'string' && 
            (authorFieldSource.includes('<') && authorFieldSource.includes('>'))) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = authorFieldSource;
            plainTextAuthorField = tempDiv.textContent || "";
        } else {
            plainTextAuthorField = String(authorFieldSource);
        }

        let authorsRaw;
        if (plainTextAuthorField.includes(' and ')) {
            authorsRaw = plainTextAuthorField.split(/\s+and\s+/);
        } else if (plainTextAuthorField.includes(';')) {
            authorsRaw = plainTextAuthorField.split(';');
        } else {
            authorsRaw = [plainTextAuthorField];
        }

        return authorsRaw.map(authorStr => {
            const trimmedAuthor = authorStr.trim();
            if (!trimmedAuthor) return null;
            
            const parts = trimmedAuthor.split(',');
            if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
                return [parts[0].trim(), parts[1].trim()];
            } else {
                const names = trimmedAuthor.split(/\s+/);
                if (names.length >= 2) {
                    return [names[names.length - 1], names.slice(0, -1).join(' ')];
                } else if (names.length === 1 && names[0]) {
                    return [names[0], ''];
                }
                return null;
            }
        }).filter(auth => auth !== null && (auth[0] || auth[1]));
    }

    static getInitials(fullNameString) {
        if (!fullNameString || !fullNameString.trim()) return '';

        const nameParts = fullNameString.trim().split(/\s+/);
        const initialLetters = [];
        const collectedParticles = [];

        nameParts.forEach(part => {
            if (part.trim() === '') return;

            if (NAME_PARTICLES.includes(part.toLowerCase())) {
                collectedParticles.push(part.toLowerCase());
            } else {
                initialLetters.push(part[0].toUpperCase() + '.');
            }
        });

        const joinedInitialLetters = initialLetters.join(' ');
        const joinedCollectedParticles = collectedParticles.join(' ');

        let result = joinedInitialLetters;
        if (joinedInitialLetters && joinedCollectedParticles) {
            result += ' ' + joinedCollectedParticles;
        } else if (joinedCollectedParticles) {
            result = joinedCollectedParticles;
        }
        
        return result.trim();
    }

    static formatComplexFirstName(fullNameString) {
        if (!fullNameString || !fullNameString.trim()) return '';

        const nameParts = fullNameString.trim().split(/\s+/);
        
        const processedParts = nameParts.map(part => {
            if (NAME_PARTICLES.includes(part.toLowerCase())) {
                return part.toLowerCase();
            }
            return part;
        });

        return processedParts.join(' ');
    }

    static formatAuthorReview(reviewField) {
        if (!reviewField || !reviewField.trim()) return '';
        
        let reviewers;
        if (String(reviewField).includes(' and ')) {
            reviewers = String(reviewField).split(/\s+and\s+/);
        } else if (String(reviewField).includes(';')) {
            reviewers = String(reviewField).split(';');
        } else {
            reviewers = [String(reviewField)];
        }

        return reviewers.map(author => {
            const parts = author.split(',');
            let lastName, firstName;
            if (parts.length === 2) {
                lastName = this.decodeLatex(parts[0].trim());
                firstName = this.decodeLatex(parts[1].trim());
            } else {
                const names = this.decodeLatex(author.trim()).split(' ');
                lastName = names.pop() || '';
                firstName = names.join(' ');
            }
            const firstInitial = firstName ? (firstName[0] || '') + '.' : '';
            return `${firstInitial} ${lastName}`.trim();
        }).join(' – ');
    }
}