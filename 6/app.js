
"use strict";

/* =========================================================
   CONFIGURACIÓN GENERAL
========================================================= */

const COLS = 10;
const ROWS = 20;

const PIECES = [
    "I",
    "O",
    "T",
    "S",
    "Z",
    "J",
    "L"
];

const COLORS = {

    I: "#21D4FD",
    O: "#FFD166",
    T: "#B66CFF",
    S: "#43E97B",
    Z: "#FF5C7A",
    J: "#4D8DFF",
    L: "#FF9F43"

};

const SHAPES = {

    I: [[1,1,1,1]],

    O: [
        [1,1],
        [1,1]
    ],

    T: [
        [0,1,0],
        [1,1,1]
    ],

    S: [
        [0,1,1],
        [1,1,0]
    ],

    Z: [
        [1,1,0],
        [0,1,1]
    ],

    J: [
        [1,0,0],
        [1,1,1]
    ],

    L: [
        [0,0,1],
        [1,1,1]
    ]

};


/* =========================================================
   CANVAS
========================================================= */

const gameCanvas =
    document.getElementById("gameCanvas");

const ctx =
    gameCanvas.getContext("2d");

const holdCanvas =
    document.getElementById("holdCanvas");

const holdCtx =
    holdCanvas.getContext("2d");

const nextCanvases =
    [...document.querySelectorAll(".next-canvas")];

const boardFrame =
    document.getElementById("boardFrame");

const effectsLayer =
    document.getElementById("effectsLayer");


/* =========================================================
   UI
========================================================= */

const scoreElement =
    document.getElementById("score");

const linesElement =
    document.getElementById("lines");

const levelElement =
    document.getElementById("level");

const highScoreElement =
    document.getElementById("highScore");

const speedElement =
    document.getElementById("speedLabel");

const statusElement =
    document.getElementById("statusLabel");

const overlay =
    document.getElementById("overlay");

const overlayEyebrow =
    document.getElementById("overlayEyebrow");

const overlayTitle =
    document.getElementById("overlayTitle");

const overlayButton =
    document.getElementById("overlayButton");

const pauseButton =
    document.getElementById("pauseButton");

const restartButton =
    document.getElementById("restartButton");

const settingsButton =
    document.getElementById("settingsButton");

const settingsModal =
    document.getElementById("settingsModal");

const closeSettings =
    document.getElementById("closeSettings");

const applySettings =
    document.getElementById("applySettings");

const difficultyInput =
    document.getElementById("difficulty");

const difficultyValue =
    document.getElementById("difficultyValue");

const themeColor =
    document.getElementById("themeColor");

const colorHex =
    document.getElementById("colorHex");

const ghostToggle =
    document.getElementById("ghostToggle");

const gridToggle =
    document.getElementById("gridToggle");

const soundToggle =
    document.getElementById("soundToggle");

const initialsModal =
    document.getElementById("initialsModal");

const initialsInput =
    document.getElementById("initialsInput");

const saveInitials =
    document.getElementById("saveInitials");

const finalScore =
    document.getElementById("finalScore");


/* =========================================================
   ESTADO
========================================================= */

let board;
let currentPiece;

let holdPiece = null;
let canHold = true;

let queue = [];
let bag = [];

let score = 0;
let lines = 0;
let level = 1;

let highScore =
    Number(
        localStorage.getItem("tetrisHighScore") || 0
    );

let paused = false;
let gameOver = false;

let lastTime = 0;
let dropTimer = 0;

let difficulty =
    Number(
        localStorage.getItem("tetrisDifficulty") || 3
    );

let accent =
    localStorage.getItem("tetrisAccent")
    || "#7c5cff";

let ghostEnabled =
    localStorage.getItem("tetrisGhost") !== "false";

let gridEnabled =
    localStorage.getItem("tetrisGrid") !== "false";

let soundEnabled =
    localStorage.getItem("tetrisSound") !== "false";

let audioContext = null;

let combo = -1;
let lastClearTime = 0;

let pendingBinding = null;


/* =========================================================
   CONTROLES
========================================================= */

const defaultControlsAD = {

    left: "a",
    right: "d",
    down: "s",
    rotate: "w",
    drop: " ",
    hold: "c",
    pause: "p"

};

const defaultControlsArrows = {

    left: "arrowleft",
    right: "arrowright",
    down: "arrowdown",
    rotate: "arrowup",
    drop: " ",
    hold: "c",
    pause: "p"

};

let controls =
    JSON.parse(
        localStorage.getItem("tetrisControls")
        || JSON.stringify(defaultControlsAD)
    );


/* =========================================================
   DIFICULTAD
========================================================= */

const difficultyNames = [
    "FÁCIL",
    "TRANQUILA",
    "NORMAL",
    "DIFÍCIL",
    "EXTREMA"
];

const difficultyMultipliers = [
    1.35,
    1.12,
    1,
    .82,
    .65
];


/* =========================================================
   PALETAS
========================================================= */

const palettes = [

    {
        accent: "#7c5cff",
        background: "#070a12",
        board: "#080d18"
    },

    {
        accent: "#00d4ff",
        background: "#061018",
        board: "#07131d"
    },

    {
        accent: "#ff3cac",
        background: "#120711",
        board: "#170914"
    },

    {
        accent: "#20e3b2",
        background: "#06120f",
        board: "#071713"
    },

    {
        accent: "#ffb000",
        background: "#120e05",
        board: "#181207"
    },

    {
        accent: "#ff5577",
        background: "#120609",
        board: "#17090c"
    }

];

let activePalette =
    Number(
        localStorage.getItem("tetrisPalette") || 0
    );


/* =========================================================
   TEMA
========================================================= */

function applyTheme() {

    const palette =
        palettes[
            Math.min(
                activePalette,
                palettes.length-1
            )
        ];

    document.documentElement
        .style
        .setProperty(
            "--accent",
            accent
        );

    document.documentElement
        .style
        .setProperty(
            "--accent-light",
            lightenColor(accent,.28)
        );

    document.documentElement
        .style
        .setProperty(
            "--background",
            palette.background
        );

    document.documentElement
        .style
        .setProperty(
            "--board",
            palette.board
        );

    themeColor.value = accent;

    colorHex.textContent =
        accent.toUpperCase();

}


/* =========================================================
   COLOR
========================================================= */

function lightenColor(hex,amount) {

    const number =
        parseInt(
            hex.replace("#",""),
            16
        );

    const r =
        number >> 16;

    const g =
        (number >> 8) & 255;

    const b =
        number & 255;

    const mix =
        value =>
            Math.round(
                value +
                (255-value)*amount
            );

    return `rgb(
        ${mix(r)},
        ${mix(g)},
        ${mix(b)}
    )`;

}


/* =========================================================
   PALETA POR NIVEL
========================================================= */

function updateLevelPalette() {

    const nextPalette =
        Math.floor(
            (level-1)/5
        ) %
        palettes.length;

    if(
        nextPalette === activePalette
    ) {
        return;
    }

    activePalette =
        nextPalette;

    accent =
        palettes[
            activePalette
        ].accent;

    applyTheme();

    saveSettings();

    showPointSplash(
        `LEVEL ${level}`,
        "combo"
    );

}


/* =========================================================
   BOARD
========================================================= */

function createBoard() {

    return Array.from(
        {length:ROWS},
        () => Array(COLS).fill(null)
    );

}


/* =========================================================
   PIEZAS
========================================================= */

function cloneShape(shape) {

    return shape.map(
        row => row.slice()
    );

}


function createPiece(type) {

    const shape =
        cloneShape(
            SHAPES[type]
        );

    return {

        type,

        shape,

        x:
            Math.floor(
                (COLS-shape[0].length)/2
            ),

        y: -1

    };

}


/* =========================================================
   7 BAG
========================================================= */

function shuffle(array) {

    for (
        let i=array.length-1;
        i>0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random()*(i+1)
            );

        [
            array[i],
            array[j]
        ] =
        [
            array[j],
            array[i]
        ];

    }

    return array;

}


function refillBag() {

    bag =
        shuffle(
            PIECES.slice()
        );

}


function getNextPieceType() {

    if(!bag.length) {

        refillBag();

    }

    return bag.pop();

}


function fillQueue() {

    while(queue.length<5) {

        queue.push(
            getNextPieceType()
        );

    }

}


/* =========================================================
   COLISIÓN
========================================================= */

function collides(piece) {

    for(
        let y=0;
        y<piece.shape.length;
        y++
    ) {

        for(
            let x=0;
            x<piece.shape[y].length;
            x++
        ) {

            if(
                !piece.shape[y][x]
            ) continue;

            const boardX =
                piece.x+x;

            const boardY =
                piece.y+y;

            if(
                boardX<0 ||
                boardX>=COLS ||
                boardY>=ROWS
            ) {

                return true;

            }

            if(
                boardY>=0 &&
                board[boardY][boardX]
            ) {

                return true;

            }

        }

    }

    return false;

}


/* =========================================================
   SPAWN
========================================================= */

function spawnPiece() {

    fillQueue();

    currentPiece =
        createPiece(
            queue.shift()
        );

    fillQueue();

    canHold = true;

    if(
        collides(currentPiece)
    ) {

        endGame();

    }

}


/* =========================================================
   MOVIMIENTO
========================================================= */

function movePiece(direction) {

    if(
        paused ||
        gameOver
    ) return;

    currentPiece.x += direction;

    if(
        collides(currentPiece)
    ) {

        currentPiece.x -= direction;

    } else {

        beep(
            150,
            .018,
            "square"
        );

    }

}


/* =========================================================
   ROTACIÓN
========================================================= */

function rotateMatrix(matrix) {

    const height =
        matrix.length;

    const width =
        matrix[0].length;

    const rotated =
        Array.from(
            {length:width},
            () => Array(height).fill(0)
        );

    for(
        let y=0;
        y<height;
        y++
    ) {

        for(
            let x=0;
            x<width;
            x++
        ) {

            rotated[x][height-1-y] =
                matrix[y][x];

        }

    }

    return rotated;

}


function rotatePiece() {

    if(
        paused ||
        gameOver
    ) return;

    const oldShape =
        currentPiece.shape;

    const oldX =
        currentPiece.x;

    currentPiece.shape =
        rotateMatrix(
            oldShape
        );

    const kicks = [
        0,
        -1,
        1,
        -2,
        2
    ];

    let success = false;

    for(
        const kick of kicks
    ) {

        currentPiece.x =
            oldX+kick;

        if(
            !collides(
                currentPiece
            )
        ) {

            success = true;
            break;

        }

    }

    if(!success) {

        currentPiece.shape =
            oldShape;

        currentPiece.x =
            oldX;

    } else {

        beep(
            420,
            .035,
            "square"
        );

    }

}


/* =========================================================
   DROP
========================================================= */

function softDrop() {

    if(
        paused ||
        gameOver
    ) return;

    currentPiece.y++;

    if(
        collides(currentPiece)
    ) {

        currentPiece.y--;

        lockPiece();

        return;

    }

    score++;

    updateUI();

}


function hardDrop() {

    if(
        paused ||
        gameOver
    ) return;

    const startY =
        currentPiece.y;

    let distance = 0;

    while(true) {

        currentPiece.y++;

        if(
            collides(currentPiece)
        ) {

            currentPiece.y--;

            break;

        }

        distance++;

    }

    score +=
        distance*2;

    createDropStars(
        currentPiece,
        distance
    );

    boardFrame.classList.remove(
        "impact"
    );

    void boardFrame.offsetWidth;

    boardFrame.classList.add(
        "impact"
    );

    beep(
        80,
        .08,
        "sawtooth"
    );

    lockPiece();

}


/* =========================================================
   GHOST
========================================================= */

function getGhostY() {

    let y =
        currentPiece.y;

    while(true) {

        const testPiece = {
            ...currentPiece,
            y:y+1
        };

        if(
            collides(testPiece)
        ) {

            return y;

        }

        y++;

    }

}


/* =========================================================
   MERGE
========================================================= */

function mergePiece() {

    currentPiece.shape.forEach(
        (row,y) => {

            row.forEach(
                (value,x) => {

                    if(
                        value &&
                        currentPiece.y+y>=0
                    ) {

                        board[
                            currentPiece.y+y
                        ][
                            currentPiece.x+x
                        ] =
                            currentPiece.type;

                    }

                }
            );

        }
    );

}


/* =========================================================
   LOCK
========================================================= */

function lockPiece() {

    mergePiece();

    beep(
        70,
        .045,
        "square"
    );

    clearLines();

    spawnPiece();

    dropTimer = 0;

    updateUI();

}


/* =========================================================
   LÍNEAS
========================================================= */

function clearLines() {

    let cleared = 0;
    const clearedRows = [];

    board =
        board.filter(
            (row,index) => {

                if(
                    row.every(
                        cell => cell !== null
                    )
                ) {

                    cleared++;
                    clearedRows.push(index);

                    return false;

                }

                return true;

            }
        );

    while(
        board.length<ROWS
    ) {

        board.unshift(
            Array(COLS).fill(null)
        );

    }

    if(cleared>0) {

        const rewards = [
            0,
            100,
            300,
            500,
            800
        ];

        const reward =
            rewards[cleared] *
            level *
            difficulty;

        score += reward;

        lines += cleared;

        level =
            Math.floor(
                lines/10
            )+1;

        updateLevelPalette();

        const now =
            performance.now();

        if(
            now-lastClearTime<1800
        ) {

            combo++;

        } else {

            combo = 0;

        }

        lastClearTime = now;

        createLineEffects(
            clearedRows
        );

        let text =
            `+${reward}`;

        let className =
            "small";

        if(cleared===2) {
            text =
                `+${reward}  DOUBLE`;
            className =
                "big";
        }

        if(cleared===3) {
            text =
                `+${reward}  TRIPLE`;
            className =
                "big";
        }

        if(cleared===4) {
            text =
                `+${reward}  TETRIS`;
            className =
                "huge";
        }

        showPointSplash(
            text,
            className
        );

        if(combo>0) {

            setTimeout(
                () => {

                    showPointSplash(
                        `COMBO ×${combo+1}`,
                        "combo"
                    );

                },
                100
            );

        }

        beep(
            520,
            .06,
            "triangle"
        );

        setTimeout(
            () =>
                beep(
                    700,
                    .07,
                    "triangle"
                ),
            60
        );

    }

}


/* =========================================================
   EFECTOS DE LÍNEA
========================================================= */

function createLineEffects(rows) {

    const cellHeight =
        effectsLayer.clientHeight / ROWS;

    rows.forEach(
        row => {

            const flash =
                document.createElement("div");

            flash.className =
                "line-flash";

            flash.style.top =
                `${row*cellHeight}px`;

            effectsLayer.appendChild(
                flash
            );

            setTimeout(
                () => flash.remove(),
                300
            );

        }
    );

}


/* =========================================================
   ESTRELLAS HARD DROP
========================================================= */

function createDropStars(piece,distance) {

    if(distance<2)
        return;

    const size =
        gameCanvas.clientWidth /
        COLS;

    const corners = [

        [0,0],
        [
            piece.shape[0].length-1,
            0
        ],
        [
            0,
            piece.shape.length-1
        ],
        [
            piece.shape[0].length-1,
            piece.shape.length-1
        ]

    ];

    const amount =
        Math.min(
            12,
            4+
            Math.floor(
                distance/3
            )
        );

    for(
        let i=0;
        i<amount;
        i++
    ) {

        const corner =
            corners[
                i%corners.length
            ];

        const star =
            document.createElement("span");

        star.className =
            "drop-star";

        const x =
            (
                piece.x+
                corner[0]+.5
            ) *
            (
                effectsLayer.clientWidth /
                COLS
            );

        const y =
            (
                piece.y+
                corner[1]+.5
            ) *
            (
                effectsLayer.clientHeight /
                ROWS
            );

        const angle =
            Math.random() *
            Math.PI *
            2;

        const spread =
            14+
            Math.min(
                distance*1.5,
                35
            );

        star.style.left =
            `${x}px`;

        star.style.top =
            `${y}px`;

        star.style.setProperty(
            "--dx",
            `${Math.cos(angle)*spread}px`
        );

        star.style.setProperty(
            "--dy",
            `${Math.sin(angle)*spread}px`
        );

        effectsLayer.appendChild(
            star
        );

        setTimeout(
            () => star.remove(),
            500
        );

    }

}


/* =========================================================
   SPLASH DE PUNTOS
========================================================= */

function showPointSplash(
    text,
    className=""
) {

    const splash =
        document.createElement("div");

    splash.className =
        `point-splash ${className}`;

    splash.textContent =
        text;

    effectsLayer.appendChild(
        splash
    );

    setTimeout(
        () => splash.remove(),
        800
    );

}


/* =========================================================
   HOLD
========================================================= */

function holdCurrentPiece() {

    if(
        paused ||
        gameOver ||
        !canHold
    ) return;

    const currentType =
        currentPiece.type;

    if(holdPiece) {

        currentPiece =
            createPiece(
                holdPiece
            );

        holdPiece =
            currentType;

        if(
            collides(currentPiece)
        ) {

            endGame();

        }

    } else {

        holdPiece =
            currentType;

        spawnPiece();

    }

    canHold = false;

    beep(
        250,
        .04,
        "sine"
    );

    draw();

}


/* =========================================================
   VELOCIDAD
========================================================= */

function getDropInterval() {

    const base =
        800 *
        Math.pow(
            .84,
            level-1
        );

    return Math.max(
        55,
        base *
        difficultyMultipliers[
            difficulty-1
        ]
    );

}


/* =========================================================
   GAME OVER
========================================================= */

function endGame() {

    gameOver = true;
    paused = false;

    if(
        score>highScore
    ) {

        highScore =
            score;

        localStorage.setItem(
            "tetrisHighScore",
            String(highScore)
        );

    }

    saveSettings();

    statusElement.textContent =
        "TERMINADO";

    finalScore.textContent =
        score.toLocaleString(
            "es-DO"
        );

    initialsInput.value = "";

    initialsModal.classList.remove(
        "hidden"
    );

    setTimeout(
        () => initialsInput.focus(),
        100
    );

    beep(
        110,
        .18,
        "sawtooth"
    );

}


/* =========================================================
   RÉCORDS
========================================================= */

function getHighScores() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "tetrisHighScores"
            ) || "[]"
        );

    } catch {

        return [];

    }

}


function saveHighScore(initials) {

    const scores =
        getHighScores();

    scores.push({

        initials:
            initials
                .toUpperCase()
                .slice(0,3),

        score,

        level,

        lines,

        date:
            Date.now()

    });

    scores.sort(
        (a,b) =>
            b.score-a.score
    );

    localStorage.setItem(
        "tetrisHighScores",
        JSON.stringify(
            scores.slice(0,10)
        )
    );

}


function submitInitials() {

    let initials =
        initialsInput.value
            .toUpperCase()
            .replace(
                /[^A-Z0-9]/g,
                ""
            )
            .slice(0,3);

    if(!initials)
        initials = "AAA";

    while(
        initials.length<3
    ) {

        initials += "A";

    }

    saveHighScore(
        initials
    );

    initialsModal.classList.add(
        "hidden"
    );

    showOverlay(
        "FIN DE LA PARTIDA",
        "GAME OVER",
        "REINICIAR"
    );

    draw();

}


/* =========================================================
   PAUSA
========================================================= */

function togglePause() {

    if(gameOver)
        return;

    paused =
        !paused;

    if(paused) {

        statusElement.textContent =
            "PAUSADO";

        showOverlay(
            "JUEGO PAUSADO",
            "PAUSA",
            "CONTINUAR"
        );

    } else {

        statusElement.textContent =
            "JUGANDO";

        hideOverlay();

    }

}


/* =========================================================
   OVERLAY
========================================================= */

function showOverlay(
    eyebrow,
    title,
    button
) {

    overlayEyebrow.textContent =
        eyebrow;

    overlayTitle.textContent =
        title;

    overlayButton.textContent =
        button;

    overlay.classList.remove(
        "hidden"
    );

}


function hideOverlay() {

    overlay.classList.add(
        "hidden"
    );

}


/* =========================================================
   REINICIAR
========================================================= */

function restartGame() {

    initialsModal.classList.add(
        "hidden"
    );

    board =
        createBoard();

    currentPiece =
        null;

    holdPiece =
        null;

    canHold =
        true;

    queue =
        [];

    bag =
        [];

    score =
        0;

    lines =
        0;

    level =
        1;

    combo =
        -1;

    paused =
        false;

    gameOver =
        false;

    dropTimer =
        0;

    activePalette = 0;

    fillQueue();

    spawnPiece();

    hideOverlay();

    statusElement.textContent =
        "JUGANDO";

    updateUI();

    lastTime =
        performance.now();

}


/* =========================================================
   UI
========================================================= */

function formatKey(key) {

    const names = {

        " ": "ESPACIO",

        "arrowleft": "←",
        "arrowright": "→",
        "arrowup": "↑",
        "arrowdown": "↓",

        "escape": "ESC",

        "enter": "ENTER",

        "shift": "SHIFT",

        "control": "CTRL",

        "alt": "ALT",

        "tab": "TAB"

    };

    if(
        names[key]
    )
        return names[key];

    return key.length===1
        ? key.toUpperCase()
        : key.toUpperCase();

}


function updateControlLabels() {

    document.getElementById(
        "moveKeysLabel"
    ).textContent =
        `${formatKey(controls.left)} / ${formatKey(controls.right)}`;

    document.getElementById(
        "rotateKeyLabel"
    ).textContent =
        formatKey(controls.rotate);

    document.getElementById(
        "downKeyLabel"
    ).textContent =
        formatKey(controls.down);

    document.getElementById(
        "dropKeyLabel"
    ).textContent =
        formatKey(controls.drop);

    document.getElementById(
        "holdKeyLabel"
    ).textContent =
        formatKey(controls.hold);

    document.getElementById(
        "pauseKeyLabel"
    ).textContent =
        formatKey(controls.pause);

}


function updateUI() {

    scoreElement.textContent =
        score.toLocaleString(
            "es-DO"
        );

    linesElement.textContent =
        lines;

    levelElement.textContent =
        level;

    highScoreElement.textContent =
        highScore.toLocaleString(
            "es-DO"
        );

    const speedNames = [
        "LENTA",
        "TRANQUILA",
        "NORMAL",
        "RÁPIDA",
        "EXTREMA"
    ];

    speedElement.textContent =
        speedNames[
            difficulty-1
        ];

    updateControlLabels();

    draw();

}


/* =========================================================
   DIBUJADO
========================================================= */

function drawCell(
    context,
    x,
    y,
    size,
    color,
    alpha=1
) {

    context.save();

    context.globalAlpha =
        alpha;

    const px =
        x*size+1;

    const py =
        y*size+1;

    const width =
        size-2;

    const height =
        size-2;

    context.fillStyle =
        color;

    context.beginPath();

    context.roundRect(
        px,
        py,
        width,
        height,
        4
    );

    context.fill();

    context.fillStyle =
        "rgba(255,255,255,.18)";

    context.beginPath();

    context.roundRect(
        px+2,
        py+2,
        width-4,
        Math.max(
            2,
            size*.11
        ),
        2
    );

    context.fill();

    context.restore();

}


function drawBoard() {

    const size =
        gameCanvas.width /
        COLS;

    ctx.clearRect(
        0,
        0,
        gameCanvas.width,
        gameCanvas.height
    );

    ctx.fillStyle =
        getComputedStyle(
            document.documentElement
        )
        .getPropertyValue(
            "--board"
        );

    ctx.fillRect(
        0,
        0,
        gameCanvas.width,
        gameCanvas.height
    );

    if(gridEnabled) {

        ctx.strokeStyle =
            "rgba(255,255,255,.035)";

        ctx.lineWidth = 1;

        for(
            let x=0;
            x<=COLS;
            x++
        ) {

            ctx.beginPath();

            ctx.moveTo(
                x*size,
                0
            );

            ctx.lineTo(
                x*size,
                gameCanvas.height
            );

            ctx.stroke();

        }

        for(
            let y=0;
            y<=ROWS;
            y++
        ) {

            ctx.beginPath();

            ctx.moveTo(
                0,
                y*size
            );

            ctx.lineTo(
                gameCanvas.width,
                y*size
            );

            ctx.stroke();

        }

    }

    board.forEach(
        (row,y) => {

            row.forEach(
                (type,x) => {

                    if(type) {

                        drawCell(
                            ctx,
                            x,
                            y,
                            size,
                            COLORS[type]
                        );

                    }

                }
            );

        }
    );

    if(!currentPiece)
        return;

    if(ghostEnabled) {

        const ghostY =
            getGhostY();

        currentPiece.shape.forEach(
            (row,y) => {

                row.forEach(
                    (value,x) => {

                        if(
                            value &&
                            ghostY+y>=0
                        ) {

                            drawCell(
                                ctx,
                                currentPiece.x+x,
                                ghostY+y,
                                size,
                                COLORS[
                                    currentPiece.type
                                ],
                                .17
                            );

                        }

                    }
                );

            }
        );

    }

    currentPiece.shape.forEach(
        (row,y) => {

            row.forEach(
                (value,x) => {

                    if(
                        value &&
                        currentPiece.y+y>=0
                    ) {

                        drawCell(
                            ctx,
                            currentPiece.x+x,
                            currentPiece.y+y,
                            size,
                            COLORS[
                                currentPiece.type
                            ]
                        );

                    }

                }
            );

        }
    );

}


/* =========================================================
   MINI PIEZAS
========================================================= */

function drawMiniPiece(
    context,
    type
) {

    const width =
        context.canvas.width;

    const height =
        context.canvas.height;

    context.clearRect(
        0,
        0,
        width,
        height
    );

    context.fillStyle =
        "#0a1020";

    context.fillRect(
        0,
        0,
        width,
        height
    );

    if(!type)
        return;

    const shape =
        SHAPES[type];

    const size =
        Math.min(
            25,
            Math.floor(
                Math.min(
                    width/
                    (
                        shape[0].length+2
                    ),

                    height/
                    (
                        shape.length+1
                    )
                )
            )
        );

    const offsetX =
        (
            width -
            shape[0].length*size
        )/2;

    const offsetY =
        (
            height -
            shape.length*size
        )/2;

    shape.forEach(
        (row,y) => {

            row.forEach(
                (value,x) => {

                    if(value) {

                        context.fillStyle =
                            COLORS[type];

                        context.beginPath();

                        context.roundRect(
                            offsetX+
                            x*size+1,

                            offsetY+
                            y*size+1,

                            size-2,
                            size-2,
                            4
                        );

                        context.fill();

                    }

                }
            );

        }
    );

}


function drawHold() {

    drawMiniPiece(
        holdCtx,
        holdPiece
    );

}


function drawNext() {

    nextCanvases.forEach(
        (canvas,index) => {

            drawMiniPiece(
                canvas.getContext("2d"),
                queue[index]
            );

        }
    );

}


function draw() {

    drawBoard();

    drawHold();

    drawNext();

}


/* =========================================================
   SONIDO
========================================================= */

function beep(
    frequency,
    duration,
    wave
) {

    if(!soundEnabled)
        return;

    try {

        audioContext ||=
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

        const oscillator =
            audioContext
                .createOscillator();

        const gain =
            audioContext
                .createGain();

        oscillator.type =
            wave;

        oscillator.frequency.value =
            frequency;

        gain.gain.setValueAtTime(
            .025,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            .001,
            audioContext.currentTime+
            duration
        );

        oscillator.connect(gain);

        gain.connect(
            audioContext.destination
        );

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime+
            duration
        );

    } catch {}

}


/* =========================================================
   STORAGE
========================================================= */

function saveSettings() {

    localStorage.setItem(
        "tetrisHighScore",
        String(highScore)
    );

    localStorage.setItem(
        "tetrisDifficulty",
        String(difficulty)
    );

    localStorage.setItem(
        "tetrisAccent",
        accent
    );

    localStorage.setItem(
        "tetrisGhost",
        String(ghostEnabled)
    );

    localStorage.setItem(
        "tetrisGrid",
        String(gridEnabled)
    );

    localStorage.setItem(
        "tetrisSound",
        String(soundEnabled)
    );

    localStorage.setItem(
        "tetrisControls",
        JSON.stringify(controls)
    );

    localStorage.setItem(
        "tetrisPalette",
        String(activePalette)
    );

}


/* =========================================================
   TECLADO
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        const key =
            event.key.toLowerCase();

        /*
           Si estamos esperando una nueva tecla
           para configurar un control.
        */

        if(pendingBinding) {

            event.preventDefault();

            if(
                key==="escape"
            ) {

                cancelBinding();

                return;

            }

            assignBinding(
                pendingBinding,
                key
            );

            return;

        }

        /*
           Controles alternativos clásicos.
        */

        const isLeft =
            key==="arrowleft" ||
            key===controls.left;

        const isRight =
            key==="arrowright" ||
            key===controls.right;

        const isDown =
            key==="arrowdown" ||
            key===controls.down;

        const isRotate =
            key==="arrowup" ||
            key==="x" ||
            key===controls.rotate;

        const isDrop =
            key===" " ||
            key===controls.drop;

        const isHold =
            key==="c" ||
            key===controls.hold;

        const isPause =
            key==="p" ||
            key===controls.pause;

        if(
            isLeft ||
            isRight ||
            isDown ||
            isRotate ||
            isDrop ||
            isHold ||
            isPause
        ) {

            event.preventDefault();

        }

        if(isLeft) {

            movePiece(-1);

        }

        else if(isRight) {

            movePiece(1);

        }

        else if(isDown) {

            softDrop();

        }

        else if(isRotate) {

            rotatePiece();

        }

        else if(isDrop) {

            hardDrop();

        }

        else if(isHold) {

            holdCurrentPiece();

        }

        else if(isPause) {

            togglePause();

        }

    }
);


/* =========================================================
   CONFIGURACIÓN DE CONTROLES
========================================================= */

const keybindButtons =
    [
        ...document.querySelectorAll(
            ".keybind-button"
        )
    ];


function updateKeybindButtons() {

    keybindButtons.forEach(
        button => {

            const action =
                button.dataset.bind;

            button.textContent =
                formatKey(
                    controls[action]
                );

        }
    );

}


function startBinding(action) {

    cancelBinding();

    pendingBinding =
        action;

    const button =
        keybindButtons.find(
            element =>
                element.dataset.bind===
                action
        );

    if(button) {

        button.classList.add(
            "waiting"
        );

        button.textContent =
            "PULSA TECLA";

    }

}


function cancelBinding() {

    if(!pendingBinding)
        return;

    const button =
        keybindButtons.find(
            element =>
                element.dataset.bind===
                pendingBinding
        );

    if(button) {

        button.classList.remove(
            "waiting"
        );

    }

    pendingBinding =
        null;

    updateKeybindButtons();

}


function assignBinding(
    action,
    key
) {

    /*
       No permitimos la misma tecla
       para dos acciones.
    */

    const conflict =
        Object.entries(
            controls
        ).find(
            ([name,value]) =>
                name!==action &&
                value===key
        );

    if(conflict) {

        showPointSplash(
            "TECLA EN USO",
            "small"
        );

        beep(
            130,
            .08,
            "square"
        );

        cancelBinding();

        return;

    }

    controls[action] =
        key;

    localStorage.setItem(
        "tetrisControls",
        JSON.stringify(controls)
    );

    cancelBinding();

    updateControlLabels();

}


function setControlPreset(
    preset
) {

    controls =
        {
            ...preset
        };

    updateKeybindButtons();
    updateControlLabels();

}


keybindButtons.forEach(
    button => {

        button.onclick =
            () => {

                startBinding(
                    button.dataset.bind
                );

            };

    }
);


document.getElementById(
    "presetAD"
).onclick =
    () => {

        setControlPreset(
            defaultControlsAD
        );

    };


document.getElementById(
    "presetArrows"
).onclick =
    () => {

        setControlPreset(
            defaultControlsArrows
        );

    };


document.getElementById(
    "resetControls"
).onclick =
    () => {

        setControlPreset(
            defaultControlsAD
        );

    };


/* =========================================================
   CONTROLES MÓVILES
========================================================= */

document
    .querySelectorAll(".mobile-key")
    .forEach(
        button => {

            button.addEventListener(
                "pointerdown",
                event => {

                    event.preventDefault();

                    const action =
                        button.dataset.action;

                    if(
                        action==="left"
                    )
                        movePiece(-1);

                    if(
                        action==="right"
                    )
                        movePiece(1);

                    if(
                        action==="down"
                    )
                        softDrop();

                    if(
                        action==="rotate"
                    )
                        rotatePiece();

                    if(
                        action==="drop"
                    )
                        hardDrop();

                    if(
                        action==="hold"
                    )
                        holdCurrentPiece();

                }
            );

        }
    );


/* =========================================================
   BOTONES
========================================================= */

pauseButton.onclick =
    togglePause;

restartButton.onclick =
    restartGame;

overlayButton.onclick =
    () => {

        if(gameOver)
            restartGame();
        else
            togglePause();

    };


saveInitials.onclick =
    submitInitials;


initialsInput.addEventListener(
    "input",
    () => {

        initialsInput.value =
            initialsInput.value
                .toUpperCase()
                .replace(
                    /[^A-Z0-9]/g,
                    ""
                )
                .slice(0,3);

    }
);


initialsInput.addEventListener(
    "keydown",
    event => {

        if(
            event.key==="Enter"
        ) {

            event.preventDefault();

            submitInitials();

        }

    }
);


/* =========================================================
   CONFIGURACIÓN
========================================================= */

settingsButton.onclick =
    () => {

        difficultyInput.value =
            difficulty;

        difficultyValue.textContent =
            difficultyNames[
                difficulty-1
            ];

        themeColor.value =
            accent;

        colorHex.textContent =
            accent.toUpperCase();

        ghostToggle.checked =
            ghostEnabled;

        gridToggle.checked =
            gridEnabled;

        soundToggle.checked =
            soundEnabled;

        updateKeybindButtons();

        settingsModal.classList.remove(
            "hidden"
        );

    };


closeSettings.onclick =
    () => {

        cancelBinding();

        settingsModal.classList.add(
            "hidden"
        );

    };


settingsModal.addEventListener(
    "click",
    event => {

        if(
            event.target===
            settingsModal
        ) {

            cancelBinding();

            settingsModal.classList.add(
                "hidden"
            );

        }

    }
);


difficultyInput.oninput =
    () => {

        difficultyValue.textContent =
            difficultyNames[
                Number(
                    difficultyInput.value
                )-1
            ];

    };


themeColor.oninput =
    () => {

        colorHex.textContent =
            themeColor.value
                .toUpperCase();

    };


document
    .querySelectorAll(".swatch")
    .forEach(
        button => {

            button.onclick =
                () => {

                    themeColor.value =
                        button.dataset.color;

                    colorHex.textContent =
                        button.dataset.color
                            .toUpperCase();

                };

        }
    );


applySettings.onclick =
    () => {

        cancelBinding();

        difficulty =
            Number(
                difficultyInput.value
            );

        accent =
            themeColor.value;

        ghostEnabled =
            ghostToggle.checked;

        gridEnabled =
            gridToggle.checked;

        soundEnabled =
            soundToggle.checked;

        activePalette = 0;

        applyTheme();

        saveSettings();

        settingsModal.classList.add(
            "hidden"
        );

        restartGame();

    };


/* =========================================================
   GAME LOOP
========================================================= */

function gameLoop(time) {

    if(!lastTime)
        lastTime = time;

    const delta =
        time-lastTime;

    lastTime = time;

    if(
        !paused &&
        !gameOver
    ) {

        dropTimer += delta;

        if(
            dropTimer >=
            getDropInterval()
        ) {

            dropTimer = 0;

            currentPiece.y++;

            if(
                collides(
                    currentPiece
                )
            ) {

                currentPiece.y--;

                lockPiece();

            }

        }

    }

    draw();

    requestAnimationFrame(
        gameLoop
    );

}


/* =========================================================
   INICIO
========================================================= */

applyTheme();

updateKeybindButtons();

updateControlLabels();

restartGame();

requestAnimationFrame(
    gameLoop
);