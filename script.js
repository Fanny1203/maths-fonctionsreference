// Créer une carte pour chaque fonction
function createFunctionCard(func) {
    const card = document.createElement('div');
    card.className = 'function-card';
    const expr = func.expression;
    card.innerHTML = `
        <div class="math-expression">\\[${expr}\\]</div>
        <div class="mini-plot" id="plot-${func.id}"></div>
    `;
    
    card.addEventListener('click', () => {
        window.location.href = `function-detail.html?id=${func.id}`;
    });
    return card;
}

// Afficher le graphique miniature avec Desmos
function plotMiniFunction(func, elementId) {
    const elt = document.getElementById(elementId);
    const calculator = Desmos.GraphingCalculator(elt, {
        keypad: false,
        expressions: false,
        settingsMenu: false,
        zoomButtons: false,
        showGrid: false,
        showXAxis: true,
        showYAxis: true,
        xAxisLabel: '',
        yAxisLabel: '',
        xAxisStep: 1,
        yAxisStep: 1,
        xAxisArrowMode: Desmos.AxisArrowModes.NONE,
        yAxisArrowMode: Desmos.AxisArrowModes.NONE,
        fontSize: Desmos.FontSizes.SMALL,
        expressionsCollapsed: true,
        lockViewport: true
    });

    // Définir les bornes du graphique
    calculator.setMathBounds({
        left: -5,
        right: 5,
        bottom: -5,
        top: 5
    });

    // Fonction par morceaux avec cases
    if (func.expression.includes('\\begin{cases}')) {
        const cases = func.expression.split('\\begin{cases}')[1].split('\\end{cases}')[0];
        const conditions = cases.split('\\\\').map(c => c.trim());
        
        // Vérifier si la première partie est une fraction qui se simplifie
        const firstPart = conditions[0].split('&')[0].trim();
        let hasHole = false;
        let holeX = null;
        let holeY = null;
        
        if (firstPart.includes('\\frac')) {
            const [num, den] = firstPart.split('\\frac')[1].split('}{').map(s => s.replace('{', '').replace('}', ''));
            if (den.includes('x - ')) {
                holeX = parseFloat(den.split('x - ')[1]);
                if (!isNaN(holeX) && num.includes('x^2')) {
                    const a = holeX * holeX;
                    const b = num.includes('- 1') ? -1 : (num.includes('+ 1') ? 1 : 0);
                    hasHole = (a + b === 0);
                    if (hasHole) {
                        holeY = holeX + 1; // La fonction simplifiée est x + 1
                    }
                }
            }
        }
        
        // Tracer chaque partie de la fonction
        conditions.forEach(condition => {
            const [expr, cond] = condition.split('&').map(s => s.trim());
            if (cond && cond.includes('x = ')) {
                // Point isolé
                const x = parseFloat(cond.split('x = ')[1]);
                if (!isNaN(x)) {
                    calculator.setExpression({
                        latex: `(${x}, ${expr})`,
                        color: '#3498db',
                        pointStyle: Desmos.Styles.POINT
                    });
                }
            } else if (cond && cond.includes('x \\neq')) {
                // Cas x ≠ a
                const x = parseFloat(cond.split('x \\neq')[1]);
                if (!isNaN(x)) {
                    calculator.setExpression({
                        latex: `${expr}\\{x<${x}\\}`,
                        color: '#3498db'
                    });
                    calculator.setExpression({
                        latex: `${expr}\\{x>${x}\\}`,
                        color: '#3498db'
                    });
                    
                    // Si on a détecté un trou, l'ajouter
                    if (hasHole && x === holeX) {
                        calculator.setExpression({
                            latex: `(${holeX}, ${holeY})`,
                            color: '#3498db',
                            pointStyle: Desmos.Styles.OPEN
                        });
                    }
                }
            } else {
                // Autres conditions (x < a, x ≥ b, etc.)
                calculator.setExpression({
                    latex: `${expr}\\{${cond}\\}`,
                    color: '#3498db'
                });
            }
        });
    } else {
        // Fonction simple
        const expr = func.expression.replace('f(x) =', '');
        
        // Détecter les fractions rationnelles et leurs trous
        if (expr.includes('\\frac')) {
            const [num, den] = expr.split('\\frac')[1].split('}{').map(s => s.replace('{', '').replace('}', ''));
            
            // Trouver les zéros du dénominateur
            if (den.includes('x')) {
                let x = null;
                if (den.includes('x - ')) {
                    x = parseFloat(den.split('x - ')[1]);
                } else if (den.includes('x + ')) {
                    x = -parseFloat(den.split('x + ')[1]);
                } else if (den === 'x') {
                    x = 0;
                }
                
                if (x !== null) {
                    // Vérifier si le numérateur s'annule aussi (simplification)
                    let hasHole = false;
                    if (num.includes('x^2')) {
                        const a = x * x;
                        const b = num.includes('- 1') ? -1 : (num.includes('+ 1') ? 1 : 0);
                        hasHole = (a + b === 0);
                    }
                    
                    // Tracer la fonction
                    if (hasHole) {
                        // Cas avec trou (simplification)
                        calculator.setExpression({
                            latex: `${expr}\\{x<${x}\\}`,
                            color: '#3498db'
                        });
                        calculator.setExpression({
                            latex: `${expr}\\{x>${x}\\}`,
                            color: '#3498db'
                        });
                        
                        // Ajouter le trou
                        calculator.setExpression({
                            latex: `(${x}, ${x + 1})`,
                            color: '#3498db',
                            pointStyle: Desmos.Styles.OPEN
                        });
                    } else {
                        // Cas sans trou (asymptote verticale)
                        calculator.setExpression({
                            latex: `${expr}`,
                            color: '#3498db'
                        });
                    }
                    return;
                }
            }
        }
        
        // Si ce n'est pas une fraction avec trou, tracer normalement
        calculator.setExpression({
            latex: `y = ${expr}`,
            color: '#3498db'
        });
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    const functions = await utils.loadFunctions();
    const grid = document.getElementById('functions-grid');

    functions.forEach(func => {
        const card = createFunctionCard(func);
        grid.appendChild(card);
        MathJax.typesetPromise([card]).then(() => {
            plotMiniFunction(func, `plot-${func.id}`);
        });
    });
});
