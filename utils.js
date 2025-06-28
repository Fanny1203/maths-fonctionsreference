// Fonctions utilitaires pour la manipulation des expressions mathématiques
const utils = {
    // Charger et parser le fichier CSV
    async loadFunctions() {
        const response = await fetch('fonctions.csv');
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        return lines.map(line => {
            const [id, expr, limits, continuity, derivative] = line.split(';').map(s => s.trim());
            return {
                id,
                expression: expr,
                limits,
                continuity,
                derivative
            };
        });
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

