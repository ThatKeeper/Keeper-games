const canvas = document.getElementById('tablero');
const ctx = canvas.getContext('2d');

const estado = document.getElementById('estado');
const puntosTexto = document.getElementById('puntos');
const recordTexto = document.getElementById('record');

const tamano = 20;

let serpiente;
let comida;
let direccion;
let siguienteDireccion;
let puntos;
let intervalo;
let avanzando;
let pausado;
let partidaTerminada;

let record =
    Number(
        localStorage.getItem('snake-record') || 0
    );

const iniciales = {
    fondo: '#121a2a',
    grid: '#1d2940',
    serpiente: '#b8e34a',
    manzana: '#ff9d5c'
};

const colores =
    JSON.parse(
        localStorage.getItem('snake-colores') || 'null'
    ) || {
        ...iniciales
    };

recordTexto.textContent = record;

function ajustarCanvas() {
    const lado =
        Math.min(
            canvas.clientWidth,
            canvas.clientHeight
        );

    const escala =
        devicePixelRatio || 1;

    canvas.width =
        lado * escala;

    canvas.height =
        lado * escala;

    ctx.setTransform(
        escala * lado / (tamano * tamano),
        0,
        0,
        escala * lado / (tamano * tamano),
        0,
        0
    );

    dibujar();
}

function nuevaComida() {
    do {
        comida = {
            x: Math.floor(
                Math.random() * tamano
            ),
            y: Math.floor(
                Math.random() * tamano
            )
        };
    } while (
        serpiente.some(
            p =>
                p.x === comida.x &&
                p.y === comida.y
        )
    );
}

function iniciar() {
    serpiente = [
        {
            x: 10,
            y: 10
        },
        {
            x: 9,
            y: 10
        },
        {
            x: 8,
            y: 10
        }
    ];

    direccion = {
        x: 1,
        y: 0
    };

    siguienteDireccion = direccion;

    puntos = 0;
    avanzando = false;
    pausado = false;
    partidaTerminada = false;

    puntosTexto.textContent = 0;

    nuevaComida();

    estado.hidden = false;

    estado.innerHTML =
        '<div><strong>Snake</strong><span>Pulsa una flecha para comenzar</span></div>';

    clearInterval(intervalo);

    dibujar();
}

function comenzar() {
    if (!avanzando) {
        avanzando = true;
        estado.hidden = true;

        intervalo =
            setInterval(
                actualizar,
                125
            );
    }
}

function cambiarDireccion(nombre) {
    const ds = {
        arriba: {
            x: 0,
            y: -1
        },

        abajo: {
            x: 0,
            y: 1
        },

        izquierda: {
            x: -1,
            y: 0
        },

        derecha: {
            x: 1,
            y: 0
        }
    };

    const nueva = ds[nombre];

    if (!nueva) {
        return;
    }

    if (partidaTerminada) {
        iniciar();
    }

    if (
        nueva.x === -direccion.x &&
        nueva.y === -direccion.y
    ) {
        return;
    }

    siguienteDireccion = nueva;

    comenzar();
}

function actualizar() {
    if (pausado) {
        return;
    }

    direccion = siguienteDireccion;

    const cabeza = {
        x:
            serpiente[0].x +
            direccion.x,

        y:
            serpiente[0].y +
            direccion.y
    };

    const choca =
        cabeza.x < 0 ||
        cabeza.x >= tamano ||
        cabeza.y < 0 ||
        cabeza.y >= tamano ||
        serpiente.some(
            p =>
                p.x === cabeza.x &&
                p.y === cabeza.y
        );

    if (choca) {
        return terminar();
    }

    serpiente.unshift(cabeza);

    if (
        cabeza.x === comida.x &&
        cabeza.y === comida.y
    ) {
        puntos++;

        puntosTexto.textContent =
            puntos;

        if (puntos > record) {
            record = puntos;

            recordTexto.textContent =
                record;

            localStorage.setItem(
                'snake-record',
                record
            );
        }

        nuevaComida();
    } else {
        serpiente.pop();
    }

    dibujar();
}

function terminar() {
    clearInterval(intervalo);

    avanzando = false;
    partidaTerminada = true;

    estado.hidden = false;

    estado.innerHTML =
        '<div><strong>Fin de la partida</strong><span>Has conseguido ' +
        puntos +
        ' puntos · pulsa una flecha para volver a jugar</span></div>';
}

function dibujar() {
    if (
        !canvas.width ||
        !comida ||
        !serpiente
    ) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        tamano * tamano,
        tamano * tamano
    );

    ctx.fillStyle =
        colores.manzana;

    ctx.beginPath();

    ctx.arc(
        comida.x * tamano + 10,
        comida.y * tamano + 10,
        6,
        0,
        Math.PI * 2
    );

    ctx.fill();

    serpiente.forEach(
        (p, i) => {
            ctx.fillStyle =
                i === 0
                    ? aclarar(colores.serpiente)
                    : colores.serpiente;

            ctx.fillRect(
                p.x * tamano + 2,
                p.y * tamano + 2,
                16,
                16
            );
        }
    );
}

function aclarar(hex) {
    const rgb =
        hex
            .slice(1)
            .match(/.{2}/g)
            .map(
                v =>
                    parseInt(v, 16)
            );

    return (
        'rgb(' +
        rgb
            .map(
                v =>
                    Math.min(
                        255,
                        v + 35
                    )
            )
            .join(',') +
        ')'
    );
}

function actualizarColor(control, color) {
    colores[
        control.dataset.colorControl
    ] = color;

    document.documentElement.style.setProperty(
        '--board-bg',
        colores.fondo
    );

    document.documentElement.style.setProperty(
        '--grid-color',
        colores.grid
    );

    localStorage.setItem(
        'snake-colores',
        JSON.stringify(colores)
    );

    dibujar();
}

function configurarColor(control) {
    const picker =
        control.querySelector(
            '.color-picker'
        );

    const hex =
        control.querySelector(
            '.hex-input'
        );

    const aplicar = color => {
        picker.value = color;
        hex.value =
            color.toUpperCase();

        actualizarColor(
            control,
            color
        );
    };

    picker.addEventListener(
        'input',
        () => aplicar(picker.value)
    );

    hex.addEventListener(
        'change',
        () =>
            /^#[0-9a-f]{6}$/i.test(
                hex.value.trim()
            )
                ? aplicar(
                    hex.value.toLowerCase()
                )
                : hex.value =
                    picker.value.toUpperCase()
    );

    control
        .querySelectorAll(
            '[data-preset]'
        )
        .forEach(
            b =>
                b.addEventListener(
                    'click',
                    () =>
                        aplicar(
                            b.dataset.preset
                        )
                )
        );

    aplicar(
        colores[
            control.dataset.colorControl
        ]
    );
}

document
    .querySelectorAll(
        '[data-color-control]'
    )
    .forEach(configurarColor);

document
    .getElementById(
        'restaurar-colores'
    )
    .addEventListener(
        'click',
        () => {
            localStorage.setItem(
                'snake-colores',
                JSON.stringify(iniciales)
            );

            location.reload();
        }
    );

document.addEventListener(
    'keydown',
    e => {
        const t = {
            ArrowUp: 'arriba',
            w: 'arriba',
            ArrowDown: 'abajo',
            s: 'abajo',
            ArrowLeft: 'izquierda',
            a: 'izquierda',
            ArrowRight: 'derecha',
            d: 'derecha'
        };

        if (t[e.key]) {
            e.preventDefault();

            cambiarDireccion(
                t[e.key]
            );
        }

        if (
            e.code === 'Space' &&
            avanzando
        ) {
            pausado = !pausado;

            estado.hidden =
                !pausado;

            estado.innerHTML =
                '<div><strong>Pausa</strong><span>Pulsa espacio para continuar</span></div>';
        }
    }
);

document
    .querySelectorAll(
        '[data-direccion]'
    )
    .forEach(
        b =>
            b.addEventListener(
                'click',
                () =>
                    cambiarDireccion(
                        b.dataset.direccion
                    )
            )
    );

document
    .getElementById('reiniciar')
    .addEventListener(
        'click',
        iniciar
    );

addEventListener(
    'resize',
    ajustarCanvas
);

iniciar();
ajustarCanvas();