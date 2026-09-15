const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const get = id => document.getElementById(id);

const state = {
    mode: 'robot',
    difficulty: 2,
    target: 7,
    round: 1,
    over: false,
    paused: false,
    scores: {
        player: 0,
        rival: 0
    },
    playerColor: '#ff6b4a',
    rivalColor: '#39d6c5',
    keys: {
        up: false,
        down: false
    },
    last: 0,
    ball: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        r: 7
    },
    player: {
        x: 0,
        y: 0,
        w: 12,
        h: 92
    },
    rival: {
        x: 0,
        y: 0,
        w: 12,
        h: 92
    }
};

const themes = {
    ember: ['#ff6b4a', '#ffad8e'],
    mint: ['#39d6c5', '#96f1e4'],
    violet: ['#a78bfa', '#d6cbff'],
    sun: ['#f3c969', '#ffe4a0']
};

let width = 0;
let height = 0;
let raf = 0;

function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    width = rect.width;
    height = rect.height;

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    state.player.x = 24;
    state.rival.x = width - 36;
    state.player.y = height / 2 - 46;
    state.rival.y = height / 2 - 46;

    draw();
}

function resetBall(direction = Math.random() < 0.5 ? -1 : 1) {
    const errorRange = [82, 42, 12][state.difficulty - 1];

    state.aiError = (Math.random() * 2 - 1) * errorRange;

    state.ball = {
        x: width / 2,
        y: height / 2,
        vx: direction * 300,
        vy: (Math.random() - 0.5) * 220,
        r: 7
    };
}

function reset() {
    state.scores.player = 0;
    state.scores.rival = 0;
    state.over = false;
    state.paused = false;

    get('result').hidden = true;

    resize();
    resetBall();
    updateLabels();

    state.last = performance.now();

    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
}

function updateLabels() {
    get('score-player').textContent = state.scores.player + ' puntos';
    get('score-rival').textContent = state.scores.rival + ' puntos';

    get('target-label').textContent = state.target;
    get('target-value').textContent = state.target + ' puntos';

    get('difficulty-value').textContent =
        ['Calma', 'Normal', 'Intensa'][state.difficulty - 1];

    get('rival-name').textContent =
        state.mode === 'robot' ? 'Robot' : 'Jugador 2';

    get('status-label').textContent =
        state.over
            ? 'PARTIDA TERMINADA'
            : state.mode === 'robot'
                ? 'PRIMERA SAQUE'
                : 'DOS JUGADORES';

    get('status-text').textContent =
        state.over
            ? 'Pulsa para volver a jugar'
            : state.mode === 'robot'
                ? 'Tú empiezas'
                : 'Jugador 1 empieza';
}

function clampPaddles() {
    state.player.y = Math.max(
        12,
        Math.min(height - 12 - state.player.h, state.player.y)
    );

    state.rival.y = Math.max(
        12,
        Math.min(height - 12 - state.rival.h, state.rival.y)
    );
}

function hitPaddle(paddle) {
    return (
        state.ball.x - state.ball.r < paddle.x + paddle.w &&
        state.ball.x + state.ball.r > paddle.x &&
        state.ball.y + state.ball.r > paddle.y &&
        state.ball.y - state.ball.r < paddle.y + paddle.h
    );
}

function score(side) {
    state.scores[side]++;
    updateLabels();

    if (state.scores[side] >= state.target) {
        finish(side);
        return;
    }

    resetBall(side === 'player' ? -1 : 1);
}

function finish(side) {
    state.over = true;

    cancelAnimationFrame(raf);

    get('result-label').textContent =
        side === 'player'
            ? 'Has dominado la sala'
            : 'El rival se lleva la ronda';

    get('result-text').textContent =
        side === 'player'
            ? '¡Victoria!'
            : 'Buen intento';

    get('result').hidden = false;

    updateLabels();
    draw();
}

function update(dt) {
    if (state.keys.up) {
        state.player.y -= 390 * dt;
    }

    if (state.keys.down) {
        state.player.y += 390 * dt;
    }

    if (state.mode === 'player') {
        if (keyState.rivalUp) {
            state.rival.y -= 390 * dt;
        }

        if (keyState.rivalDown) {
            state.rival.y += 390 * dt;
        }
    } else {
        const center = state.rival.y + state.rival.h / 2;
        const diff = state.ball.y + state.aiError - center;

        state.rival.y +=
            Math.sign(diff) *
            Math.min(
                Math.abs(diff),
                180 * state.difficulty * dt
            );
    }

    clampPaddles();

    const ball = state.ball;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (
        ball.y - ball.r < 8 ||
        ball.y + ball.r > height - 8
    ) {
        ball.vy *= -1;

        ball.y = Math.max(
            8 + ball.r,
            Math.min(height - 8 - ball.r, ball.y)
        );
    }

    if (hitPaddle(state.player) && ball.vx < 0) {
        ball.vx = Math.abs(ball.vx) * 1.04;

        ball.vy +=
            (ball.y - (state.player.y + state.player.h / 2)) /
            state.player.h *
            170;

        ball.x = state.player.x + state.player.w + ball.r;
    }

    if (hitPaddle(state.rival) && ball.vx > 0) {
        ball.vx = -Math.abs(ball.vx) * 1.04;

        ball.vy +=
            (ball.y - (state.rival.y + state.rival.h / 2)) /
            state.rival.h *
            170;

        ball.x = state.rival.x - ball.r;
    }

    if (ball.x < 0) {
        score('rival');
    }

    if (ball.x > width) {
        score('player');
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);

    const styles = getComputedStyle(document.documentElement);

    ctx.fillStyle = styles
        .getPropertyValue('--board')
        .trim();

    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = styles
        .getPropertyValue('--board-line')
        .trim();

    ctx.setLineDash([8, 14]);
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(width / 2, 8);
    ctx.lineTo(width / 2, height - 8);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.strokeRect(8, 8, width - 16, height - 16);

    ctx.fillStyle = state.playerColor;
    ctx.shadowColor = state.playerColor;
    ctx.shadowBlur = 18;

    ctx.fillRect(
        state.player.x,
        state.player.y,
        state.player.w,
        state.player.h
    );

    ctx.fillStyle = state.rivalColor;
    ctx.shadowColor = state.rivalColor;

    ctx.fillRect(
        state.rival.x,
        state.rival.y,
        state.rival.w,
        state.rival.h
    );

    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';

    ctx.beginPath();
    ctx.arc(
        state.ball.x,
        state.ball.y,
        state.ball.r,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.shadowBlur = 0;
}

function loop(time) {
    if (state.over) {
        return;
    }

    const dt = Math.min(
        (time - state.last) / 1000,
        0.03
    );

    state.last = time;

    if (!state.paused) {
        update(dt);
    }

    draw();

    raf = requestAnimationFrame(loop);
}

const keyState = {
    rivalUp: false,
    rivalDown: false
};

window.addEventListener('keydown', event => {
    if (['ArrowUp', 'w', 'W'].includes(event.key)) {
        if (event.key === 'ArrowUp' && state.mode === 'player') {
            keyState.rivalUp = true;
        } else {
            state.keys.up = true;
        }
    }

    if (['ArrowDown', 's', 'S'].includes(event.key)) {
        if (event.key === 'ArrowDown' && state.mode === 'player') {
            keyState.rivalDown = true;
        } else {
            state.keys.down = true;
        }
    }

    if (event.key === ' ') {
        state.paused = !state.paused;

        get('status-text').textContent =
            state.paused
                ? 'Partida pausada'
                : 'En juego';
    }
});

window.addEventListener('keyup', event => {
    if (['ArrowUp'].includes(event.key)) {
        keyState.rivalUp = false;
    }

    if (['ArrowDown'].includes(event.key)) {
        keyState.rivalDown = false;
    }

    if (['w', 'W'].includes(event.key)) {
        state.keys.up = false;
    }

    if (['s', 'S'].includes(event.key)) {
        state.keys.down = false;
    }
});

document
    .querySelectorAll('.touch-controls button')
    .forEach(button => {
        button.addEventListener('pointerdown', () => {
            state.keys[button.dataset.key] = true;
        });

        button.addEventListener('pointerup', () => {
            state.keys[button.dataset.key] = false;
        });

        button.addEventListener('pointerleave', () => {
            state.keys[button.dataset.key] = false;
        });
    });

get('new').onclick =
get('top-new').onclick =
get('again').onclick = () => {
    state.round++;

    get('round').textContent =
        String(state.round).padStart(2, '0');

    reset();
};

get('difficulty').oninput = event => {
    state.difficulty = Number(event.target.value);
    updateLabels();
};

get('target').oninput = event => {
    state.target = Number(event.target.value);
    updateLabels();
};

get('player-color').oninput = event => {
    state.playerColor = event.target.value;
    draw();
};

get('rival-color').oninput = event => {
    state.rivalColor = event.target.value;
    draw();
};

document
    .querySelectorAll('.mode')
    .forEach(button => {
        button.onclick = () => {
            state.mode = button.dataset.mode;

            document
                .querySelectorAll('.mode')
                .forEach(item => {
                    item.classList.toggle(
                        'active',
                        item === button
                    );
                });

            reset();
        };
    });

document
    .querySelectorAll('.theme')
    .forEach(button => {
        button.onclick = () => {
            const palette = themes[button.dataset.theme];

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
                .forEach(item => {
                    item.classList.toggle(
                        'active',
                        item === button
                    );
                });
        };
    });

get('restore').onclick = () => {
    state.mode = 'robot';
    state.difficulty = 2;
    state.target = 7;
    state.playerColor = '#ff6b4a';
    state.rivalColor = '#39d6c5';

    get('difficulty').value = 2;
    get('target').value = 7;
    get('player-color').value = state.playerColor;
    get('rival-color').value = state.rivalColor;

    document
        .querySelector('[data-mode="robot"]')
        .click();
};

window.addEventListener('resize', resize);

updateLabels();
reset();