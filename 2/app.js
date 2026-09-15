const canvas = document.querySelector('#board');
const ctx = canvas.getContext('2d');

const state = {
    size: 3,
    win: 3,
    mode: 'robot',
    cells: [],
    turn: 'X',
    over: false,
    line: [],
    round: 1,
    scores: {
        X: 0,
        O: 0
    },
    xColor: '#ff6b4a',
    oColor: '#39d6c5'
};

const themes = {
    ember: ['#ff6b4a', '#ffad8e'],
    mint: ['#39d6c5', '#96f1e4'],
    violet: ['#a78bfa', '#d6cbff'],
    sun: ['#f3c969', '#ffe4a0']
};

const get = id => document.getElementById(id);

function updateLabels() {
    get('size-value').textContent =
        state.size + ' × ' + state.size;

    get('win-value').textContent =
        state.win + ' en línea';

    get('win').max =
        state.size;

    get('win').value =
        state.win;

    get('config').textContent =
        state.size +
        ' × ' +
        state.size +
        ' · conecta ' +
        state.win;

    get('round').textContent =
        String(state.round).padStart(2, '0');

    get('score-x').textContent =
        state.scores.X + ' victorias';

    get('score-o').textContent =
        state.scores.O + ' victorias';

    get('rival-name').textContent =
        state.mode === 'robot'
            ? 'Robot'
            : 'Jugador 2';
}

function resize() {
    const side = Math.min(
        canvas.clientWidth,
        canvas.clientHeight
    );

    const ratio =
        window.devicePixelRatio || 1;

    canvas.width =
        side * ratio;

    canvas.height =
        side * ratio;

    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );

    draw();
}

function reset() {
    state.cells =
        Array(state.size * state.size).fill('');

    state.turn = 'X';
    state.over = false;
    state.line = [];

    get('result').hidden = true;

    updateTurn();
    resize();
}

function directions() {
    return [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
    ];
}

function getLine(
    index,
    mark,
    cells = state.cells
) {
    const x =
        index % state.size;

    const y =
        Math.floor(index / state.size);

    for (const [dx, dy] of directions()) {

        const line = [index];

        for (const sign of [1, -1]) {

            let cx =
                x + dx * sign;

            let cy =
                y + dy * sign;

            while (
                cx >= 0 &&
                cy >= 0 &&
                cx < state.size &&
                cy < state.size &&
                cells[
                    cy * state.size + cx
                ] === mark
            ) {
                line.push(
                    cy * state.size + cx
                );

                cx += dx * sign;
                cy += dy * sign;
            }
        }

        if (line.length >= state.win) {
            return line;
        }
    }

    return [];
}

function testMove(index, mark) {
    const cells =
        state.cells.slice();

    cells[index] = mark;

    return getLine(
        index,
        mark,
        cells
    );
}

function draw() {
    if (!canvas.width) {
        return;
    }

    const side =
        canvas.clientWidth;

    const cell =
        side / state.size;

    ctx.clearRect(
        0,
        0,
        side,
        side
    );

    ctx.fillStyle =
        getComputedStyle(
            document.documentElement
        )
            .getPropertyValue('--board')
            .trim();

    ctx.fillRect(
        0,
        0,
        side,
        side
    );

    ctx.strokeStyle =
        getComputedStyle(
            document.documentElement
        )
            .getPropertyValue('--board-line')
            .trim();

    ctx.lineWidth =
        Math.max(
            1,
            cell * .012
        );

    for (
        let i = 1;
        i < state.size;
        i++
    ) {
        ctx.beginPath();

        ctx.moveTo(
            i * cell,
            0
        );

        ctx.lineTo(
            i * cell,
            side
        );

        ctx.moveTo(
            0,
            i * cell
        );

        ctx.lineTo(
            side,
            i * cell
        );

        ctx.stroke();
    }

    state.cells.forEach(
        (mark, index) => {
            if (!mark) {
                return;
            }

            const x =
                (
                    index % state.size +
                    .5
                ) * cell;

            const y =
                (
                    Math.floor(
                        index / state.size
                    ) + .5
                ) * cell;

            const r =
                cell * .27;

            ctx.strokeStyle =
                mark === 'X'
                    ? state.xColor
                    : state.oColor;

            ctx.lineWidth =
                Math.max(
                    3,
                    cell * .085
                );

            ctx.lineCap = 'round';

            ctx.beginPath();

            if (mark === 'X') {
                ctx.moveTo(
                    x - r,
                    y - r
                );

                ctx.lineTo(
                    x + r,
                    y + r
                );

                ctx.moveTo(
                    x + r,
                    y - r
                );

                ctx.lineTo(
                    x - r,
                    y + r
                );
            } else {
                ctx.arc(
                    x,
                    y,
                    r,
                    0,
                    Math.PI * 2
                );
            }

            ctx.stroke();
        }
    );

    if (state.line.length) {
        const first =
            state.line[0];

        const last =
            state.line[
                state.line.length - 1
            ];

        ctx.strokeStyle = '#fff';

        ctx.lineWidth =
            Math.max(
                3,
                cell * .05
            );

        ctx.beginPath();

        ctx.moveTo(
            (
                first % state.size +
                .5
            ) * cell,
            (
                Math.floor(
                    first / state.size
                ) + .5
            ) * cell
        );

        ctx.lineTo(
            (
                last % state.size +
                .5
            ) * cell,
            (
                Math.floor(
                    last / state.size
                ) + .5
            ) * cell
        );

        ctx.stroke();
    }
}

function updateTurn() {
    get('turn-label').textContent =
        state.turn === 'X'
            ? 'TU TURNO'
            : (
                state.mode === 'robot'
                    ? 'EL ROBOT PIENSA'
                    : 'TURNO DEL JUGADOR 2'
            );

    get('turn-text').textContent =
        'Juega con ' +
        state.turn;
}

function finish(mark, line) {
    state.over = true;
    state.line = line || [];

    if (mark) {
        state.scores[mark]++;
    }

    get('result-label').textContent =
        mark
            ? mark + ' domina la sala'
            : 'Tablero completo';

    get('result-text').textContent =
        mark
            ? '¡Gana ' + mark + '!'
            : 'Empate elegante';

    get('result').hidden = false;

    updateLabels();
    draw();
}

function play(index) {
    if (
        state.over ||
        state.cells[index] ||
        (
            state.mode === 'robot' &&
            state.turn === 'O'
        )
    ) {
        return;
    }

    const mark =
        state.turn;

    state.cells[index] =
        mark;

    const line =
        testMove(
            index,
            mark
        );

    if (line.length) {
        return finish(
            mark,
            line
        );
    }

    if (state.cells.every(Boolean)) {
        return finish('');
    }

    state.turn =
        mark === 'X'
            ? 'O'
            : 'X';

    updateTurn();
    draw();

    if (state.mode === 'robot') {
        setTimeout(
            robot,
            260
        );
    }
}

function robot() {
    if (state.over) {
        return;
    }

    let choice =
        state.cells.findIndex(
            (value, index) =>
                !value &&
                testMove(
                    index,
                    'O'
                ).length
        );

    if (choice < 0) {
        choice =
            state.cells.findIndex(
                (value, index) =>
                    !value &&
                    testMove(
                        index,
                        'X'
                    ).length
            );
    }

    if (choice < 0) {
        const middle =
            Math.floor(
                state.size / 2
            ) *
                state.size +
            Math.floor(
                state.size / 2
            );

        choice =
            state.cells[middle]
                ? -1
                : middle;
    }

    if (choice < 0) {
        const empty =
            state.cells
                .map(
                    (value, index) =>
                        value
                            ? -1
                            : index
                )
                .filter(
                    index => index >= 0
                );

        choice =
            empty[
                Math.floor(
                    Math.random() *
                    empty.length
                )
            ];
    }

    state.cells[choice] = 'O';

    const line =
        testMove(
            choice,
            'O'
        );

    if (line.length) {
        finish(
            'O',
            line
        );
    } else if (
        state.cells.every(Boolean)
    ) {
        finish('');
    } else {
        state.turn = 'X';

        updateTurn();
        draw();
    }
}

function newGame() {
    state.round++;

    reset();
}

canvas.addEventListener(
    'click',
    event => {
        const rect =
            canvas.getBoundingClientRect();

        const x =
            Math.floor(
                (
                    event.clientX -
                    rect.left
                ) /
                (
                    rect.width /
                    state.size
                )
            );

        const y =
            Math.floor(
                (
                    event.clientY -
                    rect.top
                ) /
                (
                    rect.height /
                    state.size
                )
            );

        play(
            y * state.size + x
        );
    }
);

get('new').onclick =
    get('top-new').onclick =
    get('again').onclick =
        newGame;

document
    .querySelectorAll('.mode')
    .forEach(
        button =>
            button.addEventListener(
                'click',
                () => {
                    state.mode =
                        button.dataset.mode;

                    document
                        .querySelectorAll('.mode')
                        .forEach(item =>
                            item.classList.toggle(
                                'active',
                                item === button
                            )
                        );

                    newGame();
                }
            )
    );

get('size').addEventListener(
    'input',
    event => {
        state.size =
            Number(event.target.value);

        state.win =
            Math.min(
                state.win,
                state.size
            );

        updateLabels();
        reset();
    }
);

get('win').addEventListener(
    'input',
    event => {
        state.win =
            Number(event.target.value);

        updateLabels();
        reset();
    }
);

get('x-color').addEventListener(
    'input',
    event => {
        state.xColor =
            event.target.value;

        draw();
    }
);

get('o-color').addEventListener(
    'input',
    event => {
        state.oColor =
            event.target.value;

        draw();
    }
);

document
    .querySelectorAll('.theme')
    .forEach(
        button =>
            button.addEventListener(
                'click',
                () => {
                    const palette =
                        themes[
                            button.dataset.theme
                        ];

                    document.documentElement.style.setProperty(
                        '--accent',
                        palette[0]
                    );

                    document.documentElement.style.setProperty(
                        '--soft',
                        palette[1]
                    );

                    document
                        .querySelectorAll('.theme')
                        .forEach(item =>
                            item.classList.toggle(
                                'active',
                                item === button
                            )
                        );
                }
            )
    );

get('restore').onclick = () => {
    state.size = 3;
    state.win = 3;
    state.mode = 'robot';
    state.xColor = '#ff6b4a';
    state.oColor = '#39d6c5';

    get('x-color').value =
        state.xColor;

    get('o-color').value =
        state.oColor;

    document
        .querySelector(
            '[data-mode="robot"]'
        )
        .click();
};

window.addEventListener(
    'resize',
    resize
);

updateLabels();
reset();