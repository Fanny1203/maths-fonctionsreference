// Stockage des calculatrices Desmos
const calculators = new Map();

// Créer une carte recto
function createRecto(func) {
    const card = document.createElement('div');
    card.className = 'card recto';
    card.innerHTML = `
        <div class="card-content">
            <div class="expression">\\[${func.expression}\\]</div>
            <div class="graph" id="graph-${func.id}"></div>
        </div>
    `;
    return card;
}

// Créer une carte verso
function createVerso(func) {
    const card = document.createElement('div');
    card.className = 'card verso';
    card.innerHTML = `
        <div class="card-content">
            <div class="info">
                <div class="info-section">
                    <div class="info-title">Limites :</div>
                    <div>${func.limits}</div>
                </div>
                <div class="info-section">
                    <div class="info-title">Continuité :</div>
                    <div>${func.continuity}</div>
                </div>
                <div class="info-section">
                    <div class="info-title">Dérivabilité :</div>
                    <div>${func.derivative}</div>
                </div>
            </div>
        </div>
    `;
    return card;
}

// Initialiser un graphique Desmos
function initializeGraph(element, func) {
    const calculator = Desmos.GraphingCalculator(element, {
        keypad: false,
        expressions: false,
        settingsMenu: false,
        zoomButtons: false,
        border: false,
        showGrid: true,
        showXAxis: true,
        showYAxis: true,
        xAxisLabel: '',
        yAxisLabel: '',
        xAxisStep: 1,
        yAxisStep: 1,
        fontSize: Desmos.FontSizes.SMALL,
        backgroundColor: '#ffffff',
        textColor: '#333333',
        gridColor: '#dddddd',
        xAxisMinorSubdivisions: 0,
        yAxisMinorSubdivisions: 0,
        squareAxes: true,
        aspectRatio: 1,
        autosize: false
    });

    // Définir les bornes et le ratio
    calculator.setMathBounds({
        left: -5,
        right: 5,
        bottom: -5,
        top: 5
    });
    
    // Forcer le ratio 1:1 pour éviter la déformation
    calculator.updateSettings({
        squareAxes: true,
        aspectRatio: 1
    });

    // Tracer la fonction
    const expr = func.expression.replace('f(x) =', '').trim();

    // Fonction par morceaux avec cases
    if (expr.includes('\\begin{cases}')) {
        const cases = expr.split('\\begin{cases}')[1].split('\\end{cases}')[0];
        const conditions = cases.split('\\\\').map(c => c.trim());
        
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
                }
            } else {
                // Cas normal avec condition
                if (cond) {
                    calculator.setExpression({
                        latex: `${expr}\\{${cond}\\}`,
                        color: '#3498db'
                    });
                } else {
                    calculator.setExpression({
                        latex: expr,
                        color: '#3498db'
                    });
                }
            }
        });
    } else if (expr.includes('|')) {
        // Gérer les valeurs absolues
        const content = expr.split('|').filter((_, i) => i % 2 === 1)[0]; // Récupérer le contenu entre | |
        if (content) {
            calculator.setExpression({
                latex: `\\left|${content}\\right|`,
                color: '#3498db'
            });
        }
    } else {
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
                    let holeY = null;
                    if (num.includes('x^2')) {
                        const a = x * x;
                        const b = num.includes('- 1') ? -1 : (num.includes('+ 1') ? 1 : 0);
                        hasHole = (a + b === 0);
                        if (hasHole) {
                            holeY = x + 1; // La fonction simplifiée est x + 1
                        }
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
                            latex: `(${x}, ${holeY})`,
                            color: '#3498db',
                            pointStyle: Desmos.Styles.OPEN
                        });
                    } else {
                        // Cas sans trou (asymptote verticale)
                        calculator.setExpression({
                            latex: expr,
                            color: '#3498db'
                        });
                    }
                    return;
                }
            }
        }
        
        // Si ce n'est pas une fraction avec trou, tracer normalement
        calculator.setExpression({
            latex: expr,
            color: '#3498db'
        });
    }

    return calculator;
}

// Créer une page avec 4 cartes
function createPage(rectos, versos) {
    const page = document.createElement('div');
    page.className = 'page';

    // Ajouter les cartes dans l'ordre spécifié
    const cards = [
        rectos[0], rectos[1],  // Recto 1, Recto 2
        rectos[2], rectos[3],  // Recto 3, Recto 4
    ];

    cards.forEach(card => page.appendChild(card));

    return page;
}

// Créer une page verso avec 4 cartes
function createVersoPage(versos) {
    const page = document.createElement('div');
    page.className = 'page';

    // Ajouter les versos dans l'ordre spécifié pour l'impression recto-verso
    const cards = [
        versos[1], versos[0],  // Verso 2, Verso 1
        versos[3], versos[2]   // Verso 4, Verso 3
    ];

    cards.forEach(card => page.appendChild(card));

    return page;
}

// Initialiser les pages
async function initializePages() {
    try {
        console.log('Initialisation des pages...');
        const functions = await utils.loadFunctions();
        console.log('Fonctions chargées:', functions);
        const pagesContainer = document.getElementById('pages');
        if (!pagesContainer) {
            throw new Error("Container 'pages' non trouvé");
        }

        // Créer les pages par groupes de 4 fonctions
        for (let i = 0; i < functions.length; i += 4) {
            const pageFunctions = functions.slice(i, i + 4);
            const pageNumber = Math.floor(i / 4) + 1;

            // Créer les cartes recto et verso
            const rectos = pageFunctions.map(func => createRecto(func));
            const versos = pageFunctions.map(func => createVerso(func));

            // Ajouter la page recto
            const rectoPage = createPage(rectos, versos);
            pagesContainer.appendChild(rectoPage);

            // Ajouter la page verso
            const versoPage = createVersoPage(versos);
            pagesContainer.appendChild(versoPage);

            // Initialiser les graphiques après que MathJax ait fini
            MathJax.typesetPromise().then(() => {
                pageFunctions.forEach(func => {
                    const graphElement = document.getElementById(`graph-${func.id}`);
                    if (graphElement) {
                        const calculator = initializeGraph(graphElement, func);
                        calculators.set(func.id, calculator);
                    }
                });
            });
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des pages:', error);
    }
}

// Démarrer l'initialisation quand la page est chargée
document.addEventListener('DOMContentLoaded', initializePages);
