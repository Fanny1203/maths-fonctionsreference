let currentFunction = null;
let calculator = null;

// Récupérer l'ID de la fonction depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const functionId = urlParams.get('id');

// Charger les données de la fonction
async function loadFunctionData() {
    const functions = await utils.loadFunctions();
    currentFunction = functions.find(f => f.id === functionId);
    
    if (!currentFunction) {
        console.error('Function not found');
        return;
    }

    // Mettre à jour le titre
    document.getElementById('function-title').innerHTML = `\\[${currentFunction.expression}\\]`;
    
    // Mettre à jour les tooltips
    document.querySelector('#limit-info .tooltip-text').innerHTML = `\[${currentFunction.limits}\]`;
    document.querySelector('#continuity-info .tooltip-text').innerHTML = `\[${currentFunction.continuity}\]`;
    document.querySelector('#derivative-info .tooltip-text').innerHTML = `\[${currentFunction.derivative}\]`;

    // Rafraîchir MathJax
    MathJax.typesetPromise().then(() => {
        // Initialiser le graphique Desmos
        initializeGraph();
    });
}

// Initialiser le graphique Desmos
function initializeGraph() {
    const elt = document.getElementById('graph');
    calculator = Desmos.GraphingCalculator(elt, {
        keypad: false,
        expressions: false,
        settingsMenu: false,
        zoomButtons: true,
        showGrid: true,
        showXAxis: true,
        showYAxis: true,
        xAxisLabel: '',
        yAxisLabel: '',
        xAxisStep: 1,
        yAxisStep: 1,
        xAxisArrowMode: Desmos.AxisArrowModes.POSITIVE,
        yAxisArrowMode: Desmos.AxisArrowModes.POSITIVE,
        fontSize: Desmos.FontSizes.MEDIUM
    });

    // Définir les bornes du graphique
    calculator.setMathBounds({
        left: -10,
        right: 10,
        bottom: -10,
        top: 10
    });

    // Fonction par morceaux avec cases
    if (currentFunction.expression.includes('\\begin{cases}')) {
        const cases = currentFunction.expression.split('\\begin{cases}')[1].split('\\end{cases}')[0];
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
        const expr = currentFunction.expression.replace('f(x) =', '');
        
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

    // Ajouter l'événement de clic pour afficher les coordonnées
    calculator.observe('mouseDown', function(event) {
        if (event.type === 'point') {
            const x = event.point.x;
            const y = event.point.y;
            alert(`Coordonnées du point :\nx = ${x.toFixed(4)}\ny = ${y.toFixed(4)}`);
        }
    });
}

// Gestionnaire pour le calcul de f(x)
function calculate() {
    const x = parseFloat(document.getElementById('x-input').value);
    if (!isNaN(x)) {
        const y = utils.evaluateFunction(currentFunction.expression, x);
        document.getElementById('result').textContent = `f(${x}) = ${y.toFixed(4)}`;
        
        // Mettre en évidence le point sur le graphique
        calculator.setExpression({
            id: 'evaluation-point',
            latex: `(${x}, ${y})`,
            color: '#e74c3c',
            pointStyle: Desmos.Styles.POINT,
            label: `f(${x})`
        });
    } else {
        document.getElementById('result').textContent = 'Valeur x invalide';
    }
}

// Event listeners
document.getElementById('calculate-btn').addEventListener('click', calculate);
document.getElementById('x-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        calculate();
    }
});

// Charger les données au chargement de la page
loadFunctionData();
