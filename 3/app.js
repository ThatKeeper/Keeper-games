const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const titleEl = document.getElementById('overlay-title');
const copyEl = document.getElementById('overlay-copy');
const startBtn = document.getElementById('start');

const ui = {
    score: document.getElementById('score'),
    lives: document.getElementById('lives'),
    level: document.getElementById('level'),
    sector: document.getElementById('sector'),
    mode: document.getElementById('mode-label'),
    difficulty: document.getElementById('difficulty'),
    difficultyValue: document.getElementById('difficulty-value')
};

const palettes = {
    cyan: {
        accent: '#52e6dc',
        hot: '#ffcf70',
        deep: '#0b2931'
    },
    coral: {
        accent: '#ff786b',
        hot: '#ffd166',
        deep: '#321c29'
    },
    lime: {
        accent: '#c4f56a',
        hot: '#ff9f68',
        deep: '#20311f'
    }
};

const state = {
    level: 1,
    score: 0,
    lives: 3,
    nextLifeScore: 500,
    running: false,
    paused: false,
    won: false,
    difficulty: 2,
    palette: 'cyan',
    speedFactor: 1,
    paddle: {
        x: 0,
        w: 92,
        h: 12
    },
    balls: [],
    blocks: [],
    drops: [],
    lasers: [],
    keys: {
        left: false,
        right: false
    },
    last: 0
};

let width = 720;
let height = 520;
let scale = 1;
let raf = 0;

function css(name) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
}

function resize() {
    const rect = canvas.getBoundingClientRect();

    scale = window.devicePixelRatio || 1;

    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;

    width = rect.width;
    height = rect.height;

    ctx.setTransform(
        scale,
        0,
        0,
        scale,
        0,
        0
    );

    state.paddle.x =
        state.paddle.x || width / 2;

    draw();
}

function difficultyName() {
    return [
        'Calma',
        'Normal',
        'Intensa'
    ][state.difficulty - 1];
}

function updateUI() {
    ui.score.textContent =
        String(state.score).padStart(6, '0');

    ui.lives.textContent =
        String(state.lives).padStart(2, '0');

    ui.level.textContent =
        String(state.level).padStart(2, '0');

    ui.sector.textContent =
        String(state.level).padStart(2, '0');

    ui.difficultyValue.textContent =
        difficultyName();

    ui.mode.textContent =
        state.level === 12
            ? 'BOSS PROTOCOL'
            : 'TRAINING RUN';
}

function ball(
    x = width / 2,
    y = height - 38,
    dx = 3,
    dy = -4
) {
    return {
        x,
        y,
        dx,
        dy,
        r: 6,
        trail: []
    };
}

function buildLevel() {
    state.blocks = [];
    state.drops = [];
    state.lasers = [];
    state.balls = [ball()];

    state.paddle.w =
        state.level === 12
            ? 112
            : 92;

    const cols = 10;

    const rows =
        state.level === 12
            ? 6
            : Math.min(
                3 + Math.floor((state.level - 1) / 2),
                9
            );

    const gap = 6;
    const pad = 24;

    const bw =
        (
            width -
            pad * 2 -
            gap * (cols - 1)
        ) / cols;

    const bh = 17;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const center =
                Math.abs(
                    col - (cols - 1) / 2
                );

            const checker =
                (row + col) % 2 === 0;

            const diamond =
                center <= row + 1;

            const zigzag =
                (col + row * 2) % 4 < 2;

            let present =
                state.level < 4
                    ? true
                    : state.level < 7
                        ? checker || row === 0
                        : state.level < 10
                            ? diamond || zigzag
                            : checker || diamond;

            let type = 'normal';

            if (
                state.level >= 6 &&
                (
                    (
                        col === 0 ||
                        col === cols - 1
                    ) &&
                    row > 0 ||
                    state.level >= 9 &&
                    row === rows - 1 &&
                    !checker
                )
            ) {
                type = 'solid';
            } else if (
                state.level >= 4 &&
                (
                    (
                        state.level < 8 &&
                        row % 3 === 1
                    ) ||
                    (
                        state.level >= 8 &&
                        zigzag
                    )
                )
            ) {
                type = 'reinforced';
            }

            if (state.level === 12) {
                present =
                    diamond || row === 0;

                type =
                    (
                        row === 0 &&
                        col > 1 &&
                        col < 8
                    )
                        ? 'boss'
                        : (
                            col === 0 ||
                            col === 9
                        )
                            ? 'solid'
                            : row % 2
                                ? 'reinforced'
                                : 'normal';
            }

            if (present) {
                state.blocks.push({
                    x: pad + col * (bw + gap),
                    y: 48 + row * (bh + gap),
                    w: bw,
                    h: bh,
                    type,
                    hp:
                        type === 'reinforced'
                            ? 2
                            : type === 'boss'
                                ? 5
                                : 1,
                    hit: 0
                });
            }
        }
    }

    if (state.level === 12) {
        state.blocks = state.blocks.filter(
            block =>
                block.type !== 'boss' ||
                (
                    block.x > width * .15 &&
                    block.x < width * .85
                )
        );

        state.bossHp =
            state.blocks
                .filter(block => block.type === 'boss')
                .reduce(
                    (sum, block) =>
                        sum + block.hp,
                    0
                );
    }
}

function resetRun() {
    state.level = 1;
    state.score = 0;
    state.lives = 3;
    state.nextLifeScore = 500;
    state.speedFactor = 1;
    state.running = false;
    state.paused = false;
    state.won = false;
    state.paddle.x = width / 2;

    buildLevel();
    updateUI();

    showOverlay(
        'Rompe la señal',
        'Destruye todos los bloques para abrir el siguiente sector.',
        'Iniciar partida'
    );

    draw();
}

function launch() {
    if (state.running && !state.paused) {
        return;
    }

    if (state.won || state.lives <= 0) {
        resetRun();
    }

    state.running = true;
    state.paused = false;

    hideOverlay();

    state.last = performance.now();

    cancelAnimationFrame(raf);

    raf = requestAnimationFrame(loop);
}

function hideOverlay() {
    overlay.classList.remove('visible');
}

function showOverlay(
    title,
    copy,
    button = 'Continuar'
) {
    titleEl.textContent = title;
    copyEl.textContent = copy;

    startBtn.firstChild.textContent =
        button + ' ';

    overlay.classList.add('visible');
}

function nextLevel() {
    if (state.level >= 12) {
        state.won = true;
        state.running = false;

        showOverlay(
            'Warden neutralizado',
            'Has completado los 12 sectores y cerrado el protocolo.',
            'Jugar de nuevo'
        );

        return;
    }

    state.level++;
    state.speedFactor = 1;
    state.running = false;

    buildLevel();
    updateUI();

    showOverlay(
        'Sector ' +
            String(state.level).padStart(2, '0'),
        'La señal se intensifica. Prepárate para el siguiente patrón.',
        'Continuar'
    );

    draw();
}

function loseLife() {
    state.lives--;
    state.speedFactor = 1;

    updateUI();

    if (!state.lives) {
        state.running = false;

        showOverlay(
            'Run terminada',
            'La señal se ha perdido. Tu puntuacion: ' +
                state.score +
                '.',
            'Reintentar'
        );

        return;
    }

    state.balls = [ball()];
    state.running = false;

    showOverlay(
        'Una vida menos',
        'Alinea la pala y vuelve a entrar en la señal.',
        'Continuar'
    );
}

function spawnDrop(x, y) {
    const types = [
        'wide',
        'multi',
        'laser',
        'life'
    ];

    const type =
        types[
            Math.floor(
                Math.random() * types.length
            )
        ];

    state.drops.push({
        x,
        y,
        type,
        vy: 1.7,
        w: 28,
        h: 15
    });
}

function hitBlock(b) {
    if (b.type === 'solid' || b.pending) {
        return false;
    }

    b.hp--;
    b.hit = 1;

    if (b.hp <= 0) {
        const remaining =
            state.blocks.some(
                other =>
                    other !== b &&
                    other.type !== 'solid' &&
                    !other.broken
            );

        b.pending = remaining;
        b.broken = !remaining;
        b.removeAt = performance.now() + 90;

        state.score +=
            b.type === 'boss'
                ? 250
                : b.type === 'reinforced'
                    ? 30
                    : 10;

        if (state.score >= state.nextLifeScore) {
            state.lives++;
            state.nextLifeScore += 500;

            updateUI();
        }

        if (Math.random() < .12) {
            spawnDrop(
                b.x + b.w / 2,
                b.y + b.h / 2
            );
        }

        return true;
    }

    return false;
}

function collideBall(b, block) {
    return (
        b.x + b.r > block.x &&
        b.x - b.r < block.x + block.w &&
        b.y + b.r > block.y &&
        b.y - b.r < block.y + block.h
    );
}

function update(dt) {
    const speed =
        330 +
        (state.difficulty - 2) * 55;

    if (state.keys.left) {
        state.paddle.x -= speed * dt;
    }

    if (state.keys.right) {
        state.paddle.x += speed * dt;
    }

    state.paddle.x = Math.max(
        state.paddle.w / 2,
        Math.min(
            width - state.paddle.w / 2,
            state.paddle.x
        )
    );

    for (const laser of state.lasers) {
        laser.y -= 520 * dt;
    }

    state.lasers =
        state.lasers.filter(
            l => l.y > -10
        );

    for (const drop of state.drops) {
        drop.y += drop.vy * 60 * dt;
    }

    state.drops =
        state.drops.filter(drop => {
            if (drop.y > height) {
                return false;
            }

            if (
                drop.y + drop.h > height - 35 &&
                drop.x >
                    state.paddle.x -
                    state.paddle.w / 2 &&
                drop.x <
                    state.paddle.x +
                    state.paddle.w / 2
            ) {
                activate(drop.type);
                return false;
            }

            return true;
        });

    for (const b of state.balls) {
        b.trail.unshift({
            x: b.x,
            y: b.y
        });

        b.trail = b.trail.slice(0, 5);

        const velocity =
            (
                1 +
                (state.difficulty - 2) * .08
            ) *
            state.speedFactor;

        const moveX =
            b.dx *
            velocity *
            dt *
            60;

        const moveY =
            b.dy *
            velocity *
            dt *
            60;

        const steps =
            Math.max(
                1,
                Math.ceil(
                    Math.max(
                        Math.abs(moveX),
                        Math.abs(moveY)
                    ) / 7
                )
            );

        for (let step = 0; step < steps; step++) {
            const previousX = b.x;
            const previousY = b.y;

            b.x += moveX / steps;
            b.y += moveY / steps;

            if (
                b.x - b.r < 0 ||
                b.x + b.r > width
            ) {
                b.dx *= -1;

                b.x = Math.max(
                    b.r,
                    Math.min(
                        width - b.r,
                        b.x
                    )
                );
            }

            if (b.y - b.r < 0) {
                b.dy = Math.abs(b.dy);
                b.y = b.r;
            }

            if (
                b.y + b.r > height - 34 &&
                b.y < height - 15 &&
                b.x >
                    state.paddle.x -
                    state.paddle.w / 2 &&
                b.x <
                    state.paddle.x +
                    state.paddle.w / 2 &&
                b.dy > 0
            ) {
                const offset =
                    (
                        b.x -
                        state.paddle.x
                    ) /
                    (state.paddle.w / 2);

                state.speedFactor *= 1.08;

                b.dx += offset * 2.2;
                b.dy = -Math.abs(b.dy);
                b.y = height - 35;

                const magnitude =
                    Math.hypot(
                        b.dx,
                        b.dy
                    );

                b.dx =
                    b.dx /
                    magnitude *
                    4.2;

                b.dy =
                    b.dy /
                    magnitude *
                    4.2;
            }

            for (const block of state.blocks) {
                if (
                    block.broken ||
                    block.pending ||
                    !collideBall(b, block)
                ) {
                    continue;
                }

                const fromLeft =
                    previousX + b.r <= block.x;

                const fromRight =
                    previousX - b.r >=
                    block.x + block.w;

                if (fromLeft || fromRight) {
                    b.dx *= -1;

                    b.x =
                        fromLeft
                            ? block.x - b.r
                            : block.x +
                                block.w +
                                b.r;
                } else {
                    b.dy *= -1;

                    b.y =
                        b.dy > 0
                            ? block.y - b.r
                            : block.y +
                                block.h +
                                b.r;
                }

                hitBlock(block);
                break;
            }
        }
    }

    const now = performance.now();

    state.blocks.forEach(block => {
        if (
            block.pending &&
            now >= block.removeAt
        ) {
            block.broken = true;
        }
    });

    state.blocks =
        state.blocks.filter(
            block =>
                !block.broken ||
                block.type === 'solid'
        );

    for (const laser of state.lasers) {
        for (const block of state.blocks) {
            if (
                !block.broken &&
                !block.pending &&
                laser.x > block.x &&
                laser.x <
                    block.x + block.w &&
                laser.y > block.y &&
                laser.y <
                    block.y + block.h
            ) {
                hitBlock(block);
                laser.y = -20;
                break;
            }
        }
    }

    state.blocks =
        state.blocks.filter(
            block =>
                !block.broken ||
                block.type === 'solid'
        );

    if (state.level === 12) {
        state.bossHp =
            state.blocks
                .filter(
                    b =>
                        b.type === 'boss' &&
                        !b.broken
                )
                .reduce(
                    (sum, b) =>
                        sum + b.hp,
                    0
                );

        if (state.bossHp <= 0) {
            return nextLevel();
        }
    }

    if (
        !state.blocks.some(
            b =>
                b.type !== 'solid' &&
                !b.broken &&
                !b.pending
        )
    ) {
        return nextLevel();
    }

    if (
        !state.balls.some(
            b => b.y < height + 15
        )
    ) {
        loseLife();
    }
}

function activate(type) {
    if (type === 'wide') {
        state.paddle.w = 150;

        setTimeout(
            () => {
                state.paddle.w =
                    state.level === 12
                        ? 112
                        : 92;
            },
            7000
        );
    }

    if (
        type === 'multi' &&
        state.balls.length < 4
    ) {
        const source =
            state.balls[0] || ball();

        state.balls.push(
            ball(
                source.x,
                source.y,
                -source.dx,
                source.dy
            )
        );
    }

    if (type === 'laser') {
        state.laserUntil =
            performance.now() + 7000;
    }

    if (type === 'life') {
        state.lives++;
        updateUI();
    }
}

function draw() {
    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    const colors =
        palettes[state.palette];

    const glow =
        ctx.createRadialGradient(
            width * .5,
            height * .15,
            20,
            width * .5,
            height * .5,
            height
        );

    glow.addColorStop(
        0,
        colors.deep
    );

    glow.addColorStop(
        1,
        '#081017'
    );

    ctx.fillStyle = glow;
    ctx.fillRect(
        0,
        0,
        width,
        height
    );

    ctx.strokeStyle =
        'rgba(255,255,255,.05)';

    ctx.lineWidth = 1;

    for (
        let x = 0;
        x < width;
        x += 36
    ) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    for (
        let y = 0;
        y < height;
        y += 36
    ) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    for (const block of state.blocks) {
        drawBlock(block, colors);
    }

    if (state.level === 12) {
        drawBossBar(colors);
    }

    for (const drop of state.drops) {
        ctx.fillStyle = colors.hot;
        ctx.shadowColor = colors.hot;
        ctx.shadowBlur = 12;

        ctx.fillRect(
            drop.x - drop.w / 2,
            drop.y - drop.h / 2,
            drop.w,
            drop.h
        );

        ctx.shadowBlur = 0;

        ctx.fillStyle = '#081017';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';

        ctx.fillText(
            drop.type === 'wide'
                ? '↔'
                : drop.type === 'multi'
                    ? '2X'
                    : '⌁',
            drop.x,
            drop.y + 4
        );
    }

    ctx.fillStyle = colors.accent;
    ctx.shadowColor = colors.accent;
    ctx.shadowBlur = 18;

    ctx.fillRect(
        state.paddle.x -
            state.paddle.w / 2,
        height - 30,
        state.paddle.w,
        state.paddle.h
    );

    ctx.shadowBlur = 0;

    for (const b of state.balls) {
        for (
            let i = b.trail.length - 1;
            i >= 0;
            i--
        ) {
            ctx.globalAlpha =
                (5 - i) / 30;

            ctx.fillStyle =
                colors.accent;

            ctx.beginPath();

            ctx.arc(
                b.trail[i].x,
                b.trail[i].y,
                b.r,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.shadowColor = colors.accent;
        ctx.shadowBlur = 16;

        ctx.beginPath();

        ctx.arc(
            b.x,
            b.y,
            b.r,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.shadowBlur = 0;
    }

    if (
        state.laserUntil >
        performance.now()
    ) {
        for (
            const x of [
                state.paddle.x -
                    state.paddle.w / 2 +
                    9,
                state.paddle.x +
                    state.paddle.w / 2 -
                    9
            ]
        ) {
            ctx.fillStyle = colors.hot;

            ctx.fillRect(
                x - 2,
                height - 48,
                4,
                18
            );
        }
    }
}

function drawBlock(b, colors) {
    if (b.type === 'solid') {
        ctx.fillStyle =
            'rgba(124,151,168,.2)';

        ctx.strokeStyle =
            'rgba(170,200,210,.42)';
    } else if (b.type === 'reinforced') {
        ctx.fillStyle = colors.hot;
        ctx.strokeStyle = '#fff0b0';
    } else if (b.type === 'boss') {
        ctx.fillStyle = '#ec5d77';
        ctx.strokeStyle = '#ffb3bd';
    } else {
        ctx.fillStyle = colors.accent;
        ctx.strokeStyle = '#c5fff5';
    }

    ctx.globalAlpha =
        b.pending?.28:
        b.hit?.45:
        1;

    ctx.shadowColor = ctx.fillStyle;

    ctx.shadowBlur =
        b.type === 'solid'
            ? 0
            : 9;

    ctx.fillRect(
        b.x,
        b.y,
        b.w,
        b.h
    );

    ctx.shadowBlur = 0;

    ctx.strokeRect(
        b.x + .5,
        b.y + .5,
        b.w - 1,
        b.h - 1
    );

    if (
        b.type === 'reinforced' ||
        b.type === 'boss'
    ) {
        ctx.strokeStyle =
            'rgba(8,16,23,.55)';

        ctx.strokeRect(
            b.x + 4,
            b.y + 4,
            b.w - 8,
            b.h - 8
        );
    }

    ctx.globalAlpha = 1;

    b.hit =
        Math.max(
            0,
            b.hit - .08
        );
}

function drawBossBar(colors) {
    const total = 40;
    const hp = state.bossHp || total;

    ctx.fillStyle =
        'rgba(255,255,255,.12)';

    ctx.fillRect(
        24,
        19,
        width - 48,
        5
    );

    ctx.fillStyle = '#ec5d77';

    ctx.fillRect(
        24,
        19,
        (width - 48) * hp / total,
        5
    );

    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';

    ctx.fillText(
        'WARDEN CORE ' +
            hp +
            '/' +
            total,
        width - 24,
        14
    );
}

function loop(time) {
    if (!state.running) {
        return;
    }

    const dt =
        Math.min(
            (time - state.last) / 1000,
            .03
        );

    state.last = time;

    if (!state.paused) {
        update(dt);
        draw();
    }

    raf = requestAnimationFrame(loop);
}

function togglePause() {
    if (!state.running) {
        return;
    }

    state.paused = !state.paused;

    if (state.paused) {
        showOverlay(
            'Pausa tactica',
            'La señal queda congelada.',
            'Continuar'
        );
    } else {
        hideOverlay();
    }
}

function shoot() {
    if (
        state.laserUntil >
        performance.now()
    ) {
        state.lasers.push({
            x:
                state.paddle.x -
                state.paddle.w / 2 +
                9,
            y: height - 48
        });

        state.lasers.push({
            x:
                state.paddle.x +
                state.paddle.w / 2 -
                9,
            y: height - 48
        });
    }
}

window.addEventListener(
    'keydown',
    e => {
        if (
            [
                'ArrowLeft',
                'a',
                'A'
            ].includes(e.key)
        ) {
            state.keys.left = true;
        }

        if (
            [
                'ArrowRight',
                'd',
                'D'
            ].includes(e.key)
        ) {
            state.keys.right = true;
        }

        if (e.key === ' ') {
            togglePause();
        }

        if (e.key === 'Enter') {
            launch();
        }

        if (
            e.key === 'c' ||
            e.key === 'C'
        ) {
            shoot();
        }
    }
);

window.addEventListener(
    'keyup',
    e => {
        if (
            [
                'ArrowLeft',
                'a',
                'A'
            ].includes(e.key)
        ) {
            state.keys.left = false;
        }

        if (
            [
                'ArrowRight',
                'd',
                'D'
            ].includes(e.key)
        ) {
            state.keys.right = false;
        }
    }
);

canvas.addEventListener(
    'click',
    shoot
);

startBtn.onclick = launch;

document.getElementById(
    'new-run'
).onclick = resetRun;

ui.difficulty.oninput = e => {
    state.difficulty =
        Number(e.target.value);

    updateUI();
};

document
    .querySelectorAll('.palette')
    .forEach(
        button =>
            button.onclick = () => {
                state.palette =
                    button.dataset.palette;

                const selected =
                    palettes[state.palette];

                document.documentElement.style.setProperty(
                    '--accent',
                    selected.accent
                );

                document.documentElement.style.setProperty(
                    '--hot',
                    selected.hot
                );

                document
                    .querySelectorAll('.palette')
                    .forEach(item => {
                        item.classList.toggle(
                            'active',
                            item === button
                        );
                    });

                draw();
            }
    );

document
    .querySelectorAll('.touch-controls button')
    .forEach(button => {
        button.addEventListener(
            'pointerdown',
            () =>
                state.keys[
                    button.dataset.key
                ] = true
        );

        button.addEventListener(
            'pointerup',
            () =>
                state.keys[
                    button.dataset.key
                ] = false
        );

        button.addEventListener(
            'pointerleave',
            () =>
                state.keys[
                    button.dataset.key
                ] = false
        );
    });

window.addEventListener(
    'resize',
    resize
);

resize();
resetRun();


function stableUpdate(dt) {
    const speed =
        (
            330 +
            (state.difficulty - 2) * 55
        ) *
        (
            1 +
            (state.speedFactor - 1) * .55
        );

    if (state.keys.left) {
        state.paddle.x -= speed * dt;
    }

    if (state.keys.right) {
        state.paddle.x += speed * dt;
    }

    state.paddle.x = Math.max(
        state.paddle.w / 2,
        Math.min(
            width - state.paddle.w / 2,
            state.paddle.x
        )
    );

    for (const laser of state.lasers) {
        laser.y -= 520 * dt;
    }

    state.lasers =
        state.lasers.filter(
            laser => laser.y > -10
        );

    for (const drop of state.drops) {
        drop.y += drop.vy * 60 * dt;
    }

    state.drops =
        state.drops.filter(drop => {
            if (drop.y > height) {
                return false;
            }

            if (
                drop.y + drop.h > height - 35 &&
                drop.x >
                    state.paddle.x -
                    state.paddle.w / 2 &&
                drop.x <
                    state.paddle.x +
                    state.paddle.w / 2
            ) {
                activate(drop.type);
                return false;
            }

            return true;
        });

    for (const b of state.balls) {
        b.trail.unshift({
            x: b.x,
            y: b.y
        });

        b.trail =
            b.trail.slice(0, 5);

        const factor =
            (
                1 +
                (state.difficulty - 2) * .08
            ) *
            state.speedFactor;

        const baseMoveX =
            b.dx *
            factor *
            dt *
            60;

        const baseMoveY =
            b.dy *
            factor *
            dt *
            60;

        const steps =
            Math.max(
                1,
                Math.ceil(
                    Math.max(
                        Math.abs(baseMoveX),
                        Math.abs(baseMoveY)
                    ) / 4
                )
            );

        for (
            let step = 0;
            step < steps;
            step++
        ) {
            const previousX = b.x;
            const previousY = b.y;

            const stepX =
                b.dx *
                factor *
                dt *
                60 /
                steps;

            const stepY =
                b.dy *
                factor *
                dt *
                60 /
                steps;

            b.x += stepX;
            b.y += stepY;

            if (
                b.x - b.r < 0 ||
                b.x + b.r > width
            ) {
                b.dx = -b.dx;

                b.x = Math.max(
                    b.r,
                    Math.min(
                        width - b.r,
                        b.x
                    )
                );
            }

            if (b.y - b.r < 0) {
                b.dy = Math.abs(b.dy);
                b.y = b.r;
            }

            if (
                b.y + b.r > height - 34 &&
                b.y < height - 15 &&
                b.x >
                    state.paddle.x -
                    state.paddle.w / 2 &&
                b.x <
                    state.paddle.x +
                    state.paddle.w / 2 &&
                b.dy > 0
            ) {
                const offset =
                    (
                        b.x -
                        state.paddle.x
                    ) /
                    (state.paddle.w / 2);

                state.speedFactor *= 1.08;

                b.dx += offset * 2.2;
                b.dy = -Math.abs(b.dy);
                b.y = height - 35;

                const magnitude =
                    Math.hypot(
                        b.dx,
                        b.dy
                    );

                b.dx =
                    b.dx /
                    magnitude *
                    4.2;

                b.dy =
                    b.dy /
                    magnitude *
                    4.2;
            }

            for (const block of state.blocks) {
                if (
                    block.broken ||
                    block.pending ||
                    !collideBall(b, block)
                ) {
                    continue;
                }

                const enteredHorizontally =
                    previousX + b.r <= block.x ||
                    previousX - b.r >=
                        block.x + block.w;

                if (enteredHorizontally) {
                    b.dx = -b.dx;

                    b.x =
                        stepX > 0
                            ? block.x - b.r
                            : block.x +
                                block.w +
                                b.r;
                } else {
                    b.dy = -b.dy;

                    b.y =
                        stepY > 0
                            ? block.y - b.r
                            : block.y +
                                block.h +
                                b.r;
                }

                hitBlock(block);
                break;
            }
        }
    }

    const now = performance.now();

    state.blocks.forEach(block => {
        if (
            block.pending &&
            now >= block.removeAt
        ) {
            block.broken = true;
        }
    });

    state.blocks =
        state.blocks.filter(
            block =>
                !block.broken ||
                block.type === 'solid'
        );

    for (const laser of state.lasers) {
        for (const block of state.blocks) {
            if (
                !block.broken &&
                !block.pending &&
                laser.x > block.x &&
                laser.x <
                    block.x + block.w &&
                laser.y > block.y &&
                laser.y <
                    block.y + block.h
            ) {
                hitBlock(block);
                laser.y = -20;
                break;
            }
        }
    }

    state.blocks =
        state.blocks.filter(
            block =>
                !block.broken ||
                block.type === 'solid'
        );

    if (state.level === 12) {
        state.bossHp =
            state.blocks
                .filter(
                    block =>
                        block.type === 'boss' &&
                        !block.broken
                )
                .reduce(
                    (sum, block) =>
                        sum + block.hp,
                    0
                );

        if (state.bossHp <= 0) {
            return nextLevel();
        }
    }

    if (
        !state.blocks.some(
            block =>
                block.type !== 'solid' &&
                !block.broken
        )
    ) {
        return nextLevel();
    }

    if (
        !state.balls.some(
            ball =>
                ball.y < height + 15
        )
    ) {
        loseLife();
    }
}

update = stableUpdate;