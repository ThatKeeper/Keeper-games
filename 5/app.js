(function () {
  const PRESETS = {
    beginner:     { rows: 9,  cols: 9,  mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert:       { rows: 16, cols: 30, mines: 99 }
  };

  const INFINITE_UNLOCK_KEY =
    'buscaminas-infinite-unlocked';

  const INFINITE_SEEN_RULES_KEY =
    'buscaminas-infinite-seen-rules';

  const INFINITE_PROGRESS_KEY =
    'buscaminas-infinite-progress';

  const INFINITE_RECORD_KEY =
    'buscaminas-infinite-record';

  const INFINITE_RULES = [
    { level: 5,  name: 'Patrones bloqueados' },
    { level: 10, name: 'Números inciertos' },
    { level: 15, name: 'Minas agrupadas' },
    { level: 20, name: 'Banderas limitadas' },
    { level: 25, name: 'Terreno fragmentado' },
    { level: 35, name: 'Sin banderas' }
  ];

  const boardEl =
    document.getElementById('board');

  const mineCounterEl =
    document.getElementById('mine-counter');

  const timerEl =
    document.getElementById('timer');

  const statusEl =
    document.getElementById('status');

  const resetBtn =
    document.getElementById('reset-btn');

  const lampIcon =
    document.getElementById('lamp-icon');

  const segEl =
    document.getElementById('difficulty-seg');

  const customFields =
    document.getElementById('custom-fields');

  const inRows =
    document.getElementById('in-rows');

  const inCols =
    document.getElementById('in-cols');

  const inMines =
    document.getElementById('in-mines');

  const minesHint =
    document.getElementById('mines-hint');

  const modeToggle =
    document.getElementById('mode-toggle');

  const infiniteBtn =
    document.getElementById('infinite-btn');

  const infiniteReadout =
    document.getElementById('infinite-readout');

  const infiniteLevelEl =
    document.getElementById('infinite-level');

  const infiniteRecordEl =
    document.getElementById('infinite-record');

  const infiniteRulesEl =
    document.getElementById('infinite-rules');

  const secretModal =
    document.getElementById('secret-modal');

  const konamiSequenceEl =
    document.getElementById('konami-sequence');

  const infiniteUnlockEffect =
    document.getElementById(
      'infinite-unlock-effect'
    );

  const levelRulesEl =
    document.getElementById('level-rules');

  const levelRulesListEl =
    document.getElementById('level-rules-list');

  let rows;
  let cols;
  let mineTotal;

  let grid = [];

  let revealedCount = 0;
  let flagsPlaced = 0;

  let gameOver = false;
  let firstClickDone = false;

  let timerHandle = null;
  let elapsed = 0;

  let currentPreset = 'beginner';
  let tapMode = 'reveal';

  let infiniteUnlocked =
    localStorage.getItem(
      INFINITE_UNLOCK_KEY
    ) === 'true';

  let seenInfiniteRules = [];

  try {
    const savedRules =
      JSON.parse(
        localStorage.getItem(
          INFINITE_SEEN_RULES_KEY
        ) || '[]'
      );

    if (Array.isArray(savedRules)) {
      seenInfiniteRules =
        savedRules
          .map(Number)
          .filter(Number.isFinite);
    }
  } catch (error) {
    seenInfiniteRules = [];
  }

  let infiniteSavedLevel =
    Math.max(
      1,
      parseInt(
        localStorage.getItem(
          INFINITE_PROGRESS_KEY
        )
      ) || 1
    );

  let infiniteRecord =
    Math.max(
      1,
      parseInt(
        localStorage.getItem(
          INFINITE_RECORD_KEY
        )
      ) || 1
    );

  let infiniteLevel = 1;
  let infiniteAdvanceHandle = null;

  let resetSecretCount = 0;
  let resetSecretWindow = 0;

  let konamiArmed = false;
  let konamiIndex = 0;

  let mobileKonamiIndex = 0;

  let resetPointerIsTouch = false;

  const KONAMI_CODE = [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'b',
    'a'
  ];

  const BLOCK_PATTERNS = [
    'cross',
    'x',
    'diamond',
    'corners',
    'line'
  ];

  function clamp(n, min, max) {
    return Math.max(
      min,
      Math.min(max, n)
    );
  }

  function idx(r, c) {
    return r * cols + c;
  }

  function neighbors(r, c) {
    const out = [];

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (
          dr === 0 &&
          dc === 0
        ) {
          continue;
        }

        const nr = r + dr;
        const nc = c + dc;

        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols
        ) {
          out.push([
            nr,
            nc
          ]);
        }
      }
    }

    return out;
  }

  function shuffle(array) {
    for (
      let i = array.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      [
        array[i],
        array[j]
      ] = [
        array[j],
        array[i]
      ];
    }

    return array;
  }

  function applyBasePalette() {
    const root =
      document.documentElement;

    const base = {
      '--bg': '#1b1815',
      '--bg-contour': '#211d19',
      '--panel': '#242019',
      '--panel-raised': '#2d2820',
      '--line': '#3c352a',
      '--text': '#ece4d4',
      '--text-dim': '#a9998692',
      '--text-dim-solid': '#a89a84',
      '--brass': '#c9a24b',
      '--brass-bright': '#e6c473',
      '--danger': '#c0584a',
      '--flag': '#5a9484',
      '--cell-a': '#3c3427',
      '--cell-b': '#332c21',
      '--cell-revealed': '#211d18',
      '--n1': '#7fb0d8',
      '--n2': '#85b47f',
      '--n3': '#cf7e6d',
      '--n4': '#9683c9',
      '--n5': '#c2903f',
      '--n6': '#63b3ad',
      '--n7': '#ded7c6',
      '--n8': '#8f8575'
    };

    Object.entries(base)
      .forEach(([key, value]) => {
        root.style.setProperty(
          key,
          value
        );
      });
  }

  function applyInfinitePalette(level) {
    const root =
      document.documentElement;

    const hue =
      (level * 37) % 360;

    const bgHue =
      (hue + 220) % 360;

    const numberHue =
      (hue + 150) % 360;

    root.style.setProperty(
      '--bg',
      `hsl(${bgHue} 15% 9%)`
    );

    root.style.setProperty(
      '--bg-contour',
      `hsl(${bgHue} 16% 12%)`
    );

    root.style.setProperty(
      '--panel',
      `hsl(${bgHue} 16% 14%)`
    );

    root.style.setProperty(
      '--panel-raised',
      `hsl(${bgHue} 17% 18%)`
    );

    root.style.setProperty(
      '--line',
      `hsl(${bgHue} 15% 25%)`
    );

    root.style.setProperty(
      '--text',
      `hsl(${(hue + 35) % 360} 28% 91%)`
    );

    root.style.setProperty(
      '--text-dim-solid',
      `hsl(${(hue + 30) % 360} 15% 62%)`
    );

    root.style.setProperty(
      '--brass',
      `hsl(${hue} 58% 56%)`
    );

    root.style.setProperty(
      '--brass-bright',
      `hsl(${hue} 72% 72%)`
    );

    root.style.setProperty(
      '--danger',
      `hsl(${(hue + 345) % 360} 55% 58%)`
    );

    root.style.setProperty(
      '--flag',
      `hsl(${(hue + 150) % 360} 42% 55%)`
    );

    root.style.setProperty(
      '--cell-a',
      `hsl(${bgHue} 18% 22%)`
    );

    root.style.setProperty(
      '--cell-b',
      `hsl(${bgHue} 19% 19%)`
    );

    root.style.setProperty(
      '--cell-revealed',
      `hsl(${bgHue} 17% 12%)`
    );

    root.style.setProperty(
      '--n1',
      `hsl(${numberHue} 62% 70%)`
    );

    root.style.setProperty(
      '--n2',
      `hsl(${(numberHue + 40) % 360} 55% 67%)`
    );

    root.style.setProperty(
      '--n3',
      `hsl(${(numberHue + 80) % 360} 60% 68%)`
    );

    root.style.setProperty(
      '--n4',
      `hsl(${(numberHue + 120) % 360} 58% 70%)`
    );

    root.style.setProperty(
      '--n5',
      `hsl(${(numberHue + 160) % 360} 62% 65%)`
    );

    root.style.setProperty(
      '--n6',
      `hsl(${(numberHue + 200) % 360} 58% 66%)`
    );

    root.style.setProperty(
      '--n7',
      `hsl(${(numberHue + 240) % 360} 25% 84%)`
    );

    root.style.setProperty(
      '--n8',
      `hsl(${(numberHue + 280) % 360} 20% 64%)`
    );
  }

  function updateInfiniteVisibility() {
    if (!infiniteUnlocked) {
      infiniteBtn.hidden = true;
      infiniteReadout.hidden = true;
      infiniteRulesEl.hidden = true;
      levelRulesEl.hidden = true;

      return;
    }

    infiniteBtn.hidden = false;

    if (
      currentPreset === 'infinite'
    ) {
      infiniteReadout.hidden = false;
      infiniteRulesEl.hidden = false;
    } else {
      infiniteReadout.hidden = true;
      infiniteRulesEl.hidden = true;
      levelRulesEl.hidden = true;
    }
  }

  function showInfiniteUnlockEffect() {
    infiniteUnlockEffect.hidden = false;

    setTimeout(() => {
      infiniteUnlockEffect.hidden = true;
    }, 2900);
  }

  function unlockInfinite() {
    infiniteUnlocked = true;

    localStorage.setItem(
      INFINITE_UNLOCK_KEY,
      'true'
    );

    if (secretModal) {
      secretModal.hidden = true;
    }

    updateInfiniteVisibility();

    showInfiniteUnlockEffect();

    setStatus(
      'Hay algo nuevo disponible.',
      'secret'
    );
  }

  function getActiveInfiniteRules() {
    return INFINITE_RULES.filter(
      rule =>
        infiniteLevel >= rule.level
    );
  }

  function updateInfiniteRuleDisplay() {
    if (
      !infiniteUnlocked ||
      currentPreset !== 'infinite'
    ) {
      infiniteRulesEl.hidden = true;
      return;
    }

    infiniteRulesEl.hidden = false;

    const activeRules =
      getActiveInfiniteRules();

    if (
      !activeRules.length
    ) {
      infiniteRulesEl.textContent =
        'Reglas base.';

      return;
    }

    infiniteRulesEl.textContent =
      'Reglas activas: ' +
      activeRules
        .map(rule => rule.name)
        .join(' · ');
  }

  function saveSeenInfiniteRules() {
    localStorage.setItem(
      INFINITE_SEEN_RULES_KEY,
      JSON.stringify(
        seenInfiniteRules
      )
    );
  }

  function markInfiniteRulesAsSeen() {
    const activeRules =
      getActiveInfiniteRules();

    let changed = false;

    activeRules.forEach(rule => {
      if (
        !seenInfiniteRules.includes(
          rule.level
        )
      ) {
        seenInfiniteRules.push(
          rule.level
        );

        changed = true;
      }
    });

    if (changed) {
      saveSeenInfiniteRules();
    }
  }

  function updateKnownRulesPanel() {
    if (
      !infiniteUnlocked ||
      currentPreset !== 'infinite'
    ) {
      levelRulesEl.hidden = true;
      return;
    }

    const activeRules =
      getActiveInfiniteRules();

    const knownRules =
      activeRules.filter(rule =>
        seenInfiniteRules.includes(
          rule.level
        )
      );

    if (
      knownRules.length === 0
    ) {
      levelRulesEl.hidden = true;
      return;
    }

    levelRulesEl.hidden = false;

    levelRulesListEl.innerHTML =
      knownRules
        .map(
          rule =>
            '<div class="level-rules-item">' +
            rule.name +
            '</div>'
        )
        .join('');
  }

  function saveInfiniteProgress() {
    if (
      !infiniteUnlocked ||
      currentPreset !== 'infinite'
    ) {
      return;
    }

    infiniteSavedLevel =
      Math.max(
        1,
        infiniteLevel
      );

    localStorage.setItem(
      INFINITE_PROGRESS_KEY,
      String(infiniteSavedLevel)
    );
  }

  function updateInfiniteRecord() {
    if (
      infiniteLevel >
      infiniteRecord
    ) {
      infiniteRecord =
        infiniteLevel;

      localStorage.setItem(
        INFINITE_RECORD_KEY,
        String(infiniteRecord)
      );
    }

    if (infiniteRecordEl) {
      infiniteRecordEl.textContent =
        String(
          infiniteRecord
        ).padStart(
          2,
          '0'
        );
    }
  }

  function resetInfiniteProgress() {
    infiniteSavedLevel = 1;

    localStorage.setItem(
      INFINITE_PROGRESS_KEY,
      '1'
    );
  }

  function getFlagLimit() {
    if (
      currentPreset !== 'infinite'
    ) {
      return Infinity;
    }

    if (
      infiniteLevel >= 35
    ) {
      return 0;
    }

    if (
      infiniteLevel >= 20
    ) {
      return Math.max(
        1,
        Math.floor(
          mineTotal * 0.85
        )
      );
    }

    return Infinity;
  }

  function addBlocked(
    blocked,
    r,
    c,
    excludeR,
    excludeC
  ) {
    if (
      r < 0 ||
      r >= rows ||
      c < 0 ||
      c >= cols
    ) {
      return;
    }

    if (
      r === excludeR &&
      c === excludeC
    ) {
      return;
    }

    blocked.add(
      idx(r, c)
    );
  }

  function addPattern(
    blocked,
    type,
    centerR,
    centerC,
    excludeR,
    excludeC
  ) {
    if (type === 'cross') {
      const cells = [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ];

      cells.forEach(
        ([dr, dc]) => {
          addBlocked(
            blocked,
            centerR + dr,
            centerC + dc,
            excludeR,
            excludeC
          );
        }
      );

      return;
    }

    if (type === 'x') {
      const cells = [
        [0, 0],
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ];

      cells.forEach(
        ([dr, dc]) => {
          addBlocked(
            blocked,
            centerR + dr,
            centerC + dc,
            excludeR,
            excludeC
          );
        }
      );

      return;
    }

    if (type === 'diamond') {
      for (
        let dr = -2;
        dr <= 2;
        dr++
      ) {
        for (
          let dc = -2;
          dc <= 2;
          dc++
        ) {
          if (
            Math.abs(dr) +
              Math.abs(dc) <=
            2
          ) {
            addBlocked(
              blocked,
              centerR + dr,
              centerC + dc,
              excludeR,
              excludeC
            );
          }
        }
      }

      return;
    }

    if (type === 'corners') {
      const cells = [
        [-1, -1],
        [-1, 0],
        [0, -1],
        [1, 1],
        [1, 0],
        [0, 1]
      ];

      cells.forEach(
        ([dr, dc]) => {
          addBlocked(
            blocked,
            centerR + dr,
            centerC + dc,
            excludeR,
            excludeC
          );
        }
      );

      return;
    }

    if (type === 'line') {
      const horizontal =
        Math.random() < 0.5;

      for (
        let i = -3;
        i <= 3;
        i++
      ) {
        addBlocked(
          blocked,
          horizontal
            ? centerR
            : centerR + i,
          horizontal
            ? centerC + i
            : centerC,
          excludeR,
          excludeC
        );
      }
    }
  }

  function createBlockedPattern(
    excludeR,
    excludeC
  ) {
    const blocked =
      new Set();

    if (
      currentPreset !== 'infinite' ||
      infiniteLevel < 5
    ) {
      return blocked;
    }

    const patternChance =
      Math.min(
        0.90,
        0.55 +
          Math.max(
            0,
            infiniteLevel - 5
          ) *
            0.006
      );

    if (
      Math.random() >
      patternChance
    ) {
      return blocked;
    }

    const type =
      BLOCK_PATTERNS[
        Math.floor(
          Math.random() *
            BLOCK_PATTERNS.length
        )
      ];

    const centerR =
      Math.floor(
        Math.random() * rows
      );

    const centerC =
      Math.floor(
        Math.random() * cols
      );

    addPattern(
      blocked,
      type,
      centerR,
      centerC,
      excludeR,
      excludeC
    );

    if (
      infiniteLevel >= 25 &&
      Math.random() < 0.55
    ) {
      const secondType =
        BLOCK_PATTERNS[
          Math.floor(
            Math.random() *
              BLOCK_PATTERNS.length
          )
        ];

      const secondR =
        Math.floor(
          Math.random() * rows
        );

      const secondC =
        Math.floor(
          Math.random() * cols
        );

      addPattern(
        blocked,
        secondType,
        secondR,
        secondC,
        excludeR,
        excludeC
      );
    }

    const maxBlocked =
      Math.max(
        3,
        Math.floor(
          rows *
            cols *
            (
              infiniteLevel >= 25
                ? 0.10
                : 0.07
            )
        )
      );

    const limited =
      Array.from(
        blocked
      ).slice(
        0,
        maxBlocked
      );

    return new Set(
      limited
    );
  }

  function updateMinesHintAndClamp() {
    const r =
      clamp(
        parseInt(
          inRows.value
        ) || 5,
        5,
        24
      );

    const c =
      clamp(
        parseInt(
          inCols.value
        ) || 5,
        5,
        24
      );

    const maxMines =
      r * c - 9;

    inMines.max =
      maxMines;

    minesHint.textContent =
      'Máximo ' +
      maxMines +
      ' minas para una cuadrícula de ' +
      r +
      ' × ' +
      c +
      '.';

    if (
      (parseInt(
        inMines.value
      ) || 0) >
      maxMines
    ) {
      inMines.value =
        maxMines;
    }

    if (
      (parseInt(
        inMines.value
      ) || 0) < 1
    ) {
      inMines.value = 1;
    }
  }

  function readCustomConfig() {
    updateMinesHintAndClamp();

    const r =
      clamp(
        parseInt(
          inRows.value
        ) || 9,
        5,
        24
      );

    const c =
      clamp(
        parseInt(
          inCols.value
        ) || 9,
        5,
        24
      );

    return {
      rows: r,
      cols: c,
      mines: clamp(
        parseInt(
          inMines.value
        ) || 10,
        1,
        r * c - 9
      )
    };
  }

  function computeCellSize() {
    const shell =
      document.querySelector(
        '.board-shell'
      );

    const availW =
      shell.clientWidth - 24;

    const availH =
      window.innerHeight * 0.5;

    let size =
      Math.floor(
        Math.min(
          availW / cols,
          availH / rows
        )
      );

    size =
      clamp(
        size,
        16,
        40
      );

    document.documentElement.style
      .setProperty(
        '--cell-size',
        size + 'px'
      );
  }

  function mineSvg() {
    return (
      '<svg viewBox="0 0 24 24">' +
      '<circle cx="12" cy="12" r="6" fill="#efe6d4"/>' +
      '<g stroke="#efe6d4" stroke-width="1.6">' +
      '<line x1="12" y1="2" x2="12" y2="6"/>' +
      '<line x1="12" y1="18" x2="12" y2="22"/>' +
      '<line x1="2" y1="12" x2="6" y2="12"/>' +
      '<line x1="18" y1="12" x2="22" y2="12"/>' +
      '<line x1="4.9" y1="4.9" x2="7.5" y2="7.5"/>' +
      '<line x1="16.5" y1="16.5" x2="19.1" y2="19.1"/>' +
      '<line x1="19.1" y1="4.9" x2="16.5" y2="7.5"/>' +
      '<line x1="7.5" y1="16.5" x2="4.9" y2="19.1"/>' +
      '</g>' +
      '</svg>'
    );
  }

  function flagSvg() {
    return (
      '<svg viewBox="0 0 24 24">' +
      '<line x1="7" y1="3" x2="7" y2="21" ' +
      'stroke="var(--flag)" stroke-width="1.8"/>' +
      '<path d="M7 4 L18 8 L7 12 Z" ' +
      'fill="var(--flag)"/>' +
      '</svg>'
    );
  }

  function buildGrid(
    excludeR,
    excludeC
  ) {
    grid = [];

    for (
      let r = 0;
      r < rows;
      r++
    ) {
      const row = [];

      for (
        let c = 0;
        c < cols;
        c++
      ) {
        row.push({
          mine: false,
          revealed: false,
          flagged: false,
          blocked: false,
          adj: 0,
          fake: null
        });
      }

      grid.push(row);
    }

    const blocked =
      createBlockedPattern(
        excludeR,
        excludeC
      );

    blocked.forEach(
      position => {
        const r =
          Math.floor(
            position / cols
          );

        const c =
          position % cols;

        grid[r][c].blocked =
          true;
      }
    );

    const excluded =
      new Set();

    excluded.add(
      idx(
        excludeR,
        excludeC
      )
    );

    neighbors(
      excludeR,
      excludeC
    ).forEach(
      ([r, c]) => {
        excluded.add(
          idx(r, c)
        );
      }
    );

    blocked.forEach(
      position => {
        excluded.add(
          position
        );
      }
    );

    let candidates = [];

    for (
      let r = 0;
      r < rows;
      r++
    ) {
      for (
        let c = 0;
        c < cols;
        c++
      ) {
        const position =
          idx(r, c);

        if (
          !excluded.has(
            position
          )
        ) {
          candidates.push([
            r,
            c
          ]);
        }
      }
    }

    if (
      candidates.length <
      mineTotal
    ) {
      candidates = [];

      for (
        let r = 0;
        r < rows;
        r++
      ) {
        for (
          let c = 0;
          c < cols;
          c++
        ) {
          const position =
            idx(r, c);

          if (
            !blocked.has(
              position
            ) &&
            position !==
              idx(
                excludeR,
                excludeC
              )
          ) {
            candidates.push([
              r,
              c
            ]);
          }
        }
      }
    }

    shuffle(
      candidates
    );

    for (
      let i = 0;
      i < mineTotal;
      i++
    ) {
      if (
        !candidates.length
      ) {
        break;
      }

      let candidateIndex;

      if (
        currentPreset ===
          'infinite' &&
        infiniteLevel >= 15 &&
        i > 0
      ) {
        const scored =
          candidates.map(
            ([r, c], index) => {
              const nearbyMines =
                neighbors(r, c)
                  .filter(
                    ([nr, nc]) =>
                      grid[nr][nc].mine
                  )
                  .length;

              return {
                index,
                score:
                  nearbyMines * 4 +
                  Math.random() * 3
              };
            }
          );

        scored.sort(
          (a, b) =>
            b.score -
            a.score
        );

        const pool =
          scored.slice(
            0,
            Math.min(
              5,
              scored.length
            )
          );

        const selected =
          pool[
            Math.floor(
              Math.random() *
                pool.length
            )
          ];

        candidateIndex =
          selected.index;
      } else {
        candidateIndex = 0;
      }

      const [
        r,
        c
      ] =
        candidates.splice(
          candidateIndex,
          1
        )[0];

      grid[r][c].mine =
        true;
    }

    for (
      let r = 0;
      r < rows;
      r++
    ) {
      for (
        let c = 0;
        c < cols;
        c++
      ) {
        if (
          grid[r][c].mine ||
          grid[r][c].blocked
        ) {
          continue;
        }

        grid[r][c].adj =
          neighbors(r, c)
            .filter(
              ([nr, nc]) =>
                grid[nr][nc].mine
            )
            .length;
      }
    }

    if (
      currentPreset ===
        'infinite' &&
      infiniteLevel >= 10
    ) {
      const questionChance =
        Math.min(
          0.085,
          0.04 +
            (
              infiniteLevel - 10
            ) *
              0.001
        );

      const falseNineChance =
        Math.min(
          0.018,
          0.008 +
            (
              infiniteLevel - 10
            ) *
              0.0003
        );

      for (
        let r = 0;
        r < rows;
        r++
      ) {
        for (
          let c = 0;
          c < cols;
          c++
        ) {
          const cell =
            grid[r][c];

          if (
            cell.mine ||
            cell.blocked ||
            cell.adj <= 0
          ) {
            continue;
          }

          if (
            Math.random() <
            falseNineChance
          ) {
            cell.fake =
              'nine';
          } else if (
            Math.random() <
            questionChance
          ) {
            cell.fake =
              'question';
          }
        }
      }
    }
  }

  function renderBoardSkeleton() {
    boardEl.innerHTML = '';

    boardEl.style.gridTemplateColumns =
      'repeat(' +
      cols +
      ', var(--cell-size))';

    for (
      let r = 0;
      r < rows;
      r++
    ) {
      for (
        let c = 0;
        c < cols;
        c++
      ) {
        const cell =
          document.createElement(
            'div'
          );

        const cellData =
          grid[r][c];

        cell.className =
          'cell hidden' +
          (
            (r + c) % 2 === 1
              ? ' b'
              : ''
          );

        if (
          cellData.blocked
        ) {
          cell.classList.add(
            'blocked'
          );
        }

        cell.dataset.r = r;
        cell.dataset.c = c;

        cell.setAttribute(
          'role',
          'gridcell'
        );

        cell.setAttribute(
          'tabindex',
          '-1'
        );

        attachCellEvents(
          cell
        );

        boardEl.appendChild(
          cell
        );
      }
    }
  }

  let longPressTimer = null;
  let longPressFired = false;

  function attachCellEvents(cell) {
    cell.addEventListener(
      'contextmenu',
      e => {
        e.preventDefault();

        const r =
          +cell.dataset.r;

        const c =
          +cell.dataset.c;

        handleFlagAction(
          r,
          c
        );
      }
    );

    cell.addEventListener(
      'pointerdown',
      e => {
        if (gameOver) {
          return;
        }

        const r =
          +cell.dataset.r;

        const c =
          +cell.dataset.c;

        longPressFired =
          false;

        if (
          e.pointerType ===
          'touch'
        ) {
          longPressTimer =
            setTimeout(
              () => {
                longPressFired =
                  true;

                handleFlagAction(
                  r,
                  c
                );

                if (
                  navigator.vibrate
                ) {
                  navigator.vibrate(
                    12
                  );
                }
              },
              450
            );
        }
      }
    );

    cell.addEventListener(
      'pointerup',
      e => {
        clearTimeout(
          longPressTimer
        );

        if (gameOver) {
          return;
        }

        if (e.button === 2) {
          return;
        }

        const r =
          +cell.dataset.r;

        const c =
          +cell.dataset.c;

        if (
          e.pointerType ===
          'touch'
        ) {
          if (
            longPressFired
          ) {
            return;
          }

          if (
            tapMode === 'flag'
          ) {
            handleFlagAction(
              r,
              c
            );
          } else {
            handleRevealAction(
              r,
              c
            );
          }
        } else {
          handleRevealAction(
            r,
            c
          );
        }
      }
    );

    cell.addEventListener(
      'pointerleave',
      () => {
        clearTimeout(
          longPressTimer
        );
      }
    );
  }

  function handleRevealAction(
    r,
    c
  ) {
    const cellData =
      grid[r]
        ? grid[r][c]
        : null;

    if (
      !cellData ||
      cellData.flagged ||
      cellData.revealed
    ) {
      return;
    }

    if (
      firstClickDone &&
      cellData.blocked
    ) {
      return;
    }

    if (
      !firstClickDone
    ) {
      buildGrid(
        r,
        c
      );

      firstClickDone =
        true;

      startTimer();

      renderBoardSkeleton();
    }

    if (
      grid[r][c].blocked
    ) {
      return;
    }

    revealCell(
      r,
      c
    );

    checkOutcome();
  }

  function handleFlagAction(
    r,
    c
  ) {
    if (
      !firstClickDone
    ) {
      return;
    }

    const cellData =
      grid[r][c];

    if (
      cellData.revealed ||
      cellData.blocked
    ) {
      return;
    }

    const flagLimit =
      getFlagLimit();

    if (
      !cellData.flagged &&
      flagLimit === 0
    ) {
      setStatus(
        'Las banderas están deshabilitadas en este nivel.',
        ''
      );

      return;
    }

    if (
      !cellData.flagged &&
      flagsPlaced >=
        flagLimit
    ) {
      setStatus(
        'Has alcanzado el límite de banderas.',
        ''
      );

      return;
    }

    cellData.flagged =
      !cellData.flagged;

    flagsPlaced +=
      cellData.flagged
        ? 1
        : -1;

    updateCellVisual(
      r,
      c
    );

    updateMineCounter();
  }

  function revealCell(
    startR,
    startC
  ) {
    const stack = [
      [
        startR,
        startC
      ]
    ];

    while (
      stack.length
    ) {
      const [
        r,
        c
      ] =
        stack.pop();

      const cellData =
        grid[r][c];

      if (
        cellData.revealed ||
        cellData.flagged ||
        cellData.blocked
      ) {
        continue;
      }

      cellData.revealed =
        true;

      revealedCount++;

      updateCellVisual(
        r,
        c
      );

      if (
        cellData.mine
      ) {
        triggerLoss(
          r,
          c
        );

        return;
      }

      if (
        cellData.adj === 0
      ) {
        neighbors(
          r,
          c
        ).forEach(
          ([nr, nc]) => {
            const neighbor =
              grid[nr][nc];

            if (
              !neighbor.revealed &&
              !neighbor.flagged &&
              !neighbor.blocked
            ) {
              stack.push([
                nr,
                nc
              ]);
            }
          }
        );
      }
    }
  }

  function updateCellVisual(
    r,
    c
  ) {
    const cell =
      boardEl.children[
        idx(r, c)
      ];

    const cellData =
      grid[r][c];

    cell.classList.remove(
      'flag',
      'blocked',
      'revealed'
    );

    cell.innerHTML = '';

    delete cell.dataset.n;
    delete cell.dataset.fake;

    if (
      cellData.blocked
    ) {
      cell.classList.add(
        'blocked'
      );

      return;
    }

    if (
      cellData.flagged &&
      !cellData.revealed
    ) {
      cell.classList.add(
        'flag'
      );

      cell.classList.remove(
        'revealed'
      );

      cell.classList.add(
        'hidden'
      );

      cell.innerHTML =
        flagSvg();

      return;
    }

    if (
      !cellData.revealed
    ) {
      cell.classList.add(
        'hidden'
      );

      cell.classList.remove(
        'revealed'
      );

      return;
    }

    cell.classList.remove(
      'hidden'
    );

    cell.classList.add(
      'revealed'
    );

    if (
      cellData.mine
    ) {
      cell.innerHTML =
        mineSvg();
    } else if (
      cellData.adj > 0
    ) {
      if (
        cellData.fake ===
        'question'
      ) {
        cell.textContent =
          '?';

        cell.dataset.fake =
          'question';
      } else if (
        cellData.fake ===
        'nine'
      ) {
        cell.textContent =
          '9';

        cell.dataset.fake =
          'nine';
      } else {
        cell.textContent =
          cellData.adj;

        cell.dataset.n =
          cellData.adj;
      }
    }
  }

  function triggerLoss(
    hitR,
    hitC
  ) {
    gameOver = true;

    stopTimer();

    for (
      let r = 0;
      r < rows;
      r++
    ) {
      for (
        let c = 0;
        c < cols;
        c++
      ) {
        const cellData =
          grid[r][c];

        if (
          cellData.mine &&
          !cellData.revealed
        ) {
          cellData.revealed =
            true;

          updateCellVisual(
            r,
            c
          );
        }
      }
    }

    const hitCell =
      boardEl.children[
        idx(hitR, hitC)
      ];

    hitCell.classList.add(
      'mine-hit'
    );

    if (
      currentPreset ===
      'infinite'
    ) {
      updateInfiniteRecord();

      resetInfiniteProgress();

      setStatus(
        'Nivel ' +
          infiniteLevel +
          ' perdido. Récord: ' +
          infiniteRecord +
          '. Reiniciando...',
        'lose'
      );

      setLampMood(
        'lose'
      );

      clearTimeout(
        infiniteAdvanceHandle
      );

      infiniteAdvanceHandle =
        setTimeout(
          () => {
            infiniteLevel = 1;

            startInfiniteLevel(
              1
            );
          },
          1200
        );

      return;
    }

    setStatus(
      'Detonaste una carga. Inténtalo de nuevo.',
      'lose'
    );

    setLampMood(
      'lose'
    );
  }

  function checkOutcome() {
    if (gameOver) {
      return;
    }

    const blockedTotal =
      grid.flat()
        .filter(
          cell =>
            cell.blocked
        )
        .length;

    const totalSafe =
      rows *
        cols -
      mineTotal -
      blockedTotal;

    if (
      revealedCount >=
      totalSafe
    ) {
      gameOver = true;

      stopTimer();

      for (
        let r = 0;
        r < rows;
        r++
      ) {
        for (
          let c = 0;
          c < cols;
          c++
        ) {
          const cellData =
            grid[r][c];

          if (
            cellData.mine &&
            !cellData.flagged
          ) {
            cellData.flagged =
              true;

            updateCellVisual(
              r,
              c
            );
          }
        }
      }

      flagsPlaced =
        mineTotal;

      updateMineCounter();

      if (
        currentPreset ===
        'infinite'
      ) {
        setStatus(
          'Nivel ' +
            infiniteLevel +
            ' superado en ' +
            elapsed +
            ' s.',
          'win'
        );

        setLampMood(
          'win'
        );

        markInfiniteRulesAsSeen();

        updateKnownRulesPanel();

        clearTimeout(
          infiniteAdvanceHandle
        );

        infiniteAdvanceHandle =
          setTimeout(
            () => {
              infiniteLevel++;

              startInfiniteLevel(
                infiniteLevel
              );
            },
            900
          );

        return;
      }

      setStatus(
        'Yacimiento despejado en ' +
          elapsed +
          ' s.',
        'win'
      );

      setLampMood(
        'win'
      );
    }
  }

  function updateMineCounter() {
    const remaining =
      mineTotal -
      flagsPlaced;

    mineCounterEl.textContent =
      (
        remaining < 0
          ? '-'
          : ''
      ) +
      String(
        Math.abs(
          remaining
        )
      ).padStart(
        remaining < 0
          ? 2
          : 3,
        '0'
      );

    mineCounterEl.classList.toggle(
      'danger',
      remaining < 0
    );
  }

  function startTimer() {
    elapsed = 0;

    timerEl.textContent =
      '000';

    timerHandle =
      setInterval(
        () => {
          elapsed =
            Math.min(
              999,
              elapsed + 1
            );

          timerEl.textContent =
            String(
              elapsed
            ).padStart(
              3,
              '0'
            );
        },
        1000
      );
  }

  function stopTimer() {
    clearInterval(
      timerHandle
    );

    timerHandle = null;
  }

  function setStatus(
    msg,
    kind
  ) {
    statusEl.textContent =
      msg;

    statusEl.className =
      'status' +
      (
        kind
          ? ' ' + kind
          : ''
      );
  }

  function setLampMood(
    mood
  ) {
    const gem =
      lampIcon.querySelector(
        'circle:last-child'
      );

    if (
      mood === 'win'
    ) {
      gem.setAttribute(
        'fill',
        '#bfe6c9'
      );
    } else if (
      mood === 'lose'
    ) {
      gem.setAttribute(
        'fill',
        '#e6a89c'
      );
    } else {
      gem.setAttribute(
        'fill',
        '#fff3d6'
      );
    }
  }

  function newGame() {
    stopTimer();

    clearTimeout(
      infiniteAdvanceHandle
    );

    infiniteAdvanceHandle =
      null;

    gameOver = false;
    firstClickDone = false;

    revealedCount = 0;
    flagsPlaced = 0;

    elapsed = 0;

    timerEl.textContent =
      '000';

    setStatus('');
    setLampMood(
      'idle'
    );

    updateMineCounter();

    grid = [];

    for (
      let r = 0;
      r < rows;
      r++
    ) {
      const row = [];

      for (
        let c = 0;
        c < cols;
        c++
      ) {
        row.push({
          mine: false,
          revealed: false,
          flagged: false,
          blocked: false,
          adj: 0,
          fake: null
        });
      }

      grid.push(row);
    }

    computeCellSize();

    renderBoardSkeleton();
  }

  function applyConfig(
    cfg
  ) {
    rows = cfg.rows;
    cols = cfg.cols;
    mineTotal = cfg.mines;

    applyBasePalette();

    updateInfiniteVisibility();

    newGame();
  }

  function calculateInfiniteConfig(
    level
  ) {
    const sizeSteps =
      Math.floor(
        (level + 1) / 2
      );

    const infiniteRows =
      Math.min(
        30,
        8 + sizeSteps
      );

    const infiniteCols =
      Math.min(
        30,
        8 + sizeSteps
      );

    const mineIncrease =
      Math.floor(
        level / 2
      ) * 5;

    const theoreticalMines =
      10 + mineIncrease;

    const maxMines =
      Math.floor(
        infiniteRows *
          infiniteCols *
          0.42
      );

    const infiniteMines =
      Math.min(
        theoreticalMines,
        maxMines
      );

    return {
      rows: infiniteRows,
      cols: infiniteCols,
      mines: Math.max(
        1,
        infiniteMines
      )
    };
  }

  function startInfiniteLevel(
    level
  ) {
    if (
      !infiniteUnlocked
    ) {
      return;
    }

    currentPreset =
      'infinite';

    infiniteLevel =
      Math.max(
        1,
        level
      );

    updateInfiniteRecord();
    saveInfiniteProgress();

    const cfg =
      calculateInfiniteConfig(
        infiniteLevel
      );

    rows = cfg.rows;
    cols = cfg.cols;
    mineTotal = cfg.mines;

    infiniteLevelEl.textContent =
      String(
        infiniteLevel
      ).padStart(
        2,
        '0'
      );

    if (infiniteRecordEl) {
      infiniteRecordEl.textContent =
        String(
          infiniteRecord
        ).padStart(
          2,
          '0'
        );
    }

    applyInfinitePalette(
      infiniteLevel
    );

    infiniteReadout.hidden =
      false;

    infiniteRulesEl.hidden =
      false;

    updateInfiniteRuleDisplay();

    updateKnownRulesPanel();

    newGame();

    updateInfiniteVisibility();

    updateKnownRulesPanel();

    if (
      infiniteLevel === 1
    ) {
      setStatus(
        'El descenso comienza.',
        'secret'
      );
    }
  }

  function processDesktopKonami(
    key
  ) {
    if (
      !konamiArmed ||
      infiniteUnlocked
    ) {
      return;
    }

    const expected =
      KONAMI_CODE[
        konamiIndex
      ];

    if (
      key === expected
    ) {
      konamiIndex++;

      if (
        konamiIndex >=
        KONAMI_CODE.length
      ) {
        unlockInfinite();

        konamiArmed = false;
        konamiIndex = 0;
      }

      return;
    }

    konamiIndex = 0;

    if (
      key ===
      KONAMI_CODE[0]
    ) {
      konamiIndex = 1;
    }
  }

  function resetMobileKonami() {
    mobileKonamiIndex = 0;

    if (
      !konamiSequenceEl
    ) {
      return;
    }

    konamiSequenceEl
      .querySelectorAll(
        'span'
      )
      .forEach(
        span => {
          span.classList.remove(
            'current',
            'done'
          );
        }
      );

    updateMobileKonamiVisual();
  }

  function updateMobileKonamiVisual() {
    if (
      !konamiSequenceEl
    ) {
      return;
    }

    const sequence =
      konamiSequenceEl
        .querySelectorAll(
          'span'
        );

    sequence.forEach(
      (
        span,
        index
      ) => {
        span.classList.toggle(
          'done',
          index <
            mobileKonamiIndex
        );

        span.classList.toggle(
          'current',
          index ===
            mobileKonamiIndex
        );
      }
    );
  }

  function processMobileKonami(
    key
  ) {
    if (
      infiniteUnlocked
    ) {
      return;
    }

    const expected =
      KONAMI_CODE[
        mobileKonamiIndex
      ];

    if (
      key === expected
    ) {
      mobileKonamiIndex++;

      updateMobileKonamiVisual();

      if (
        mobileKonamiIndex >=
        KONAMI_CODE.length
      ) {
        unlockInfinite();

        mobileKonamiIndex = 0;
      }

      return;
    }

    resetMobileKonami();

    if (
      navigator.vibrate
    ) {
      navigator.vibrate(
        20
      );
    }
  }

  function openSecretModal() {
    if (
      infiniteUnlocked ||
      !secretModal
    ) {
      return;
    }

    resetMobileKonami();

    secretModal.hidden =
      false;
  }

  function registerSecretReset(
    isTouch
  ) {
    if (
      infiniteUnlocked
    ) {
      return;
    }

    const now =
      Date.now();

    if (
      now -
        resetSecretWindow >
      2000
    ) {
      resetSecretCount = 0;
    }

    resetSecretWindow =
      now;

    resetSecretCount++;

    if (
      resetSecretCount >= 5
    ) {
      resetSecretCount = 0;

      if (isTouch) {
        openSecretModal();
      } else {
        konamiArmed = true;
        konamiIndex = 0;

        setStatus(
          '...',
          'secret'
        );
      }
    }
  }

  resetBtn.addEventListener(
    'pointerdown',
    event => {
      resetPointerIsTouch =
        event.pointerType ===
        'touch';
    }
  );

  resetBtn.addEventListener(
    'click',
    () => {
      const isTouch =
        resetPointerIsTouch;

      registerSecretReset(
        isTouch
      );

      resetPointerIsTouch =
        false;

      if (
        currentPreset ===
        'infinite'
      ) {
        startInfiniteLevel(
          infiniteLevel
        );

        return;
      }

      if (
        currentPreset ===
        'custom'
      ) {
        applyConfig(
          readCustomConfig()
        );
      } else {
        applyConfig(
          PRESETS[
            currentPreset
          ]
        );
      }
    }
  );

  if (
    secretModal
  ) {
    document
      .querySelectorAll(
        '[data-secret-key]'
      )
      .forEach(
        button => {
          button.addEventListener(
            'click',
            () => {
              processMobileKonami(
                button.dataset
                  .secretKey
              );
            }
          );
        }
      );
  }

  segEl
    .querySelectorAll(
      'button'
    )
    .forEach(
      btn => {
        btn.addEventListener(
          'click',
          () => {
            if (
              btn.dataset
                .preset ===
                'infinite' &&
              !infiniteUnlocked
            ) {
              return;
            }

            segEl
              .querySelectorAll(
                'button'
              )
              .forEach(
                b =>
                  b.classList.remove(
                    'active'
                  )
              );

            btn.classList.add(
              'active'
            );

            currentPreset =
              btn.dataset
                .preset;

            if (
              currentPreset ===
              'infinite'
            ) {
              customFields.classList
                .remove(
                  'show'
                );

              startInfiniteLevel(
                infiniteSavedLevel
              );

              updateInfiniteVisibility();

              return;
            }

            infiniteLevel = 1;

            customFields.classList
              .toggle(
                'show',
                currentPreset ===
                  'custom'
              );

            updateInfiniteVisibility();

            if (
              currentPreset ===
              'custom'
            ) {
              applyConfig(
                readCustomConfig()
              );
            } else {
              applyConfig(
                PRESETS[
                  currentPreset
                ]
              );
            }
          }
        );
      }
    );

  [
    inRows,
    inCols,
    inMines
  ].forEach(
    input => {
      input.addEventListener(
        'change',
        () => {
          if (
            currentPreset ===
            'custom'
          ) {
            applyConfig(
              readCustomConfig()
            );
          }
        }
      );
    }
  );

  modeToggle
    .querySelectorAll(
      'button'
    )
    .forEach(
      btn => {
        btn.addEventListener(
          'click',
          () => {
            modeToggle
              .querySelectorAll(
                'button'
              )
              .forEach(
                b =>
                  b.classList.remove(
                    'active'
                  )
              );

            btn.classList.add(
              'active'
            );

            tapMode =
              btn.dataset
                .mode;
          }
        );
      }
    );

  window.addEventListener(
    'keydown',
    event => {
      let key =
        event.key;

      if (
        key.length === 1
      ) {
        key =
          key.toLowerCase();
      }

      processDesktopKonami(
        key
      );
    }
  );

  window.addEventListener(
    'resize',
    () => {
      if (
        rows &&
        cols
      ) {
        computeCellSize();
      }
    }
  );

  window.addEventListener(
    'beforeunload',
    () => {
      saveInfiniteProgress();
    }
  );

  updateMinesHintAndClamp();

  applyBasePalette();

  updateInfiniteVisibility();

  if (infiniteUnlocked) {
    infiniteSavedLevel =
      Math.max(
        1,
        parseInt(
          localStorage.getItem(
            INFINITE_PROGRESS_KEY
          )
        ) || 1
      );

    infiniteRecord =
      Math.max(
        1,
        parseInt(
          localStorage.getItem(
            INFINITE_RECORD_KEY
          )
        ) || 1
      );

    if (infiniteRecordEl) {
      infiniteRecordEl.textContent =
        String(
          infiniteRecord
        ).padStart(
          2,
          '0'
        );
    }
  }

  applyConfig(
    PRESETS.beginner
  );
})();