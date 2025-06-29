// Fonctions utilitaires pour la manipulation des expressions mathématiques
const utils = {
    // Charger et parser le fichier CSV
    formatMathContent(text) {
        // Si le texte est undefined ou vide, retourner une chaîne vide
        if (!text) {
            return '';
        }
        // Si le texte est déjà entre \[ \], le laisser tel quel
        if (text.startsWith('\\[') && text.endsWith('\\]')) {
            return text;
        }
        // Sinon, c'est du texte normal
        return text;
    },

    async loadFunctions() {
        try {
            console.log('Chargement du fichier CSV...');
            const response = await fetch('fonctions.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            console.log('Contenu CSV:', text);
            if (!text || text.trim() === '') {
                throw new Error('Le fichier CSV est vide');
            }

            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                throw new Error('Aucune ligne valide dans le CSV');
            }

            return lines.map(line => {
                const parts = line.split(';').map(s => s.trim());
                if (parts.length < 5) {
                    console.warn('Ligne CSV invalide:', line);
                    return null;
                }
                const [id, expr, limits, continuity, derivative] = parts;
                const func = {
                    id,
                    expression: expr || '',
                    limits: this.formatMathContent(limits),
                    continuity: this.formatMathContent(continuity),
                    derivative: this.formatMathContent(derivative)
                };
                console.log('Fonction chargée:', func);
                return func;
            }).filter(func => func !== null);
        } catch (error) {
            console.error('Erreur lors du chargement des fonctions:', error);
            throw error;
        }
    },

    // Générer des valeurs x pour le graphique
    generateXValues(start, end, count) {
        const step = (end - start) / (count - 1);
        return Array.from({length: count}, (_, i) => start + step * i);
    },

    // Évaluer une fonction mathématique
    evaluateFunction(expression, x) {
        try {
            // Enlever f(x) = si présent
            let mathExpr = expression.replace('f(x) =', '').trim();

            // Cas avec cases
            if (mathExpr.includes('\\begin{cases}')) {
                const cases = mathExpr.split('\\begin{cases}')[1].split('\\end{cases}')[0].trim();
                const conditions = cases.split('\\\\').map(c => c.trim());
                
                for (const condition of conditions) {
                    const [expr, cond] = condition.split('&').map(s => s.trim());
                    
                    if (!cond || eval(cond.replace('x', x))) {
                        mathExpr = expr;
                        break;
                    }
                }
            }

            // Nettoyer l'expression pour math.js
            mathExpr = mathExpr
                .replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1)/($2)')
                .replace(/\\sin\\left\(([^)]+)\\right\)/g, 'sin($1)')
                .replace(/\\sin/g, 'sin')
                .replace(/\\cdot/g, '*')
                .replace(/\\left/g, '')
                .replace(/\\right/g, '')
                .replace(/\\abs{([^}]+)}/g, 'abs($1)')
                .replace(/[{}]/g, '');

            // Remplacer x par sa valeur
            mathExpr = mathExpr.replace(/x/g, `(${x})`);

            return math.evaluate(mathExpr);
        } catch (e) {
            console.error('Expression:', expression);
            console.error('Math expr:', mathExpr);
            console.error('Erreur:', e);
            return NaN;
        }
    }
};

