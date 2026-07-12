const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const turnIndicator = document.getElementById('turn-indicator');
const undoBtn = document.getElementById('undo-btn');
const restartBtn = document.getElementById('restart-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const boardContainer = document.querySelector('.board-container');

// 音效系统
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playTone(freq, type, duration, vol) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}
function playSelectSound() { playTone(600, 'sine', 0.1, 0.3); }
function playMoveSound() {
    playTone(300, 'triangle', 0.1, 0.5);
    setTimeout(() => playTone(150, 'square', 0.1, 0.3), 50);
}
function playCaptureSound() {
    playTone(200, 'sawtooth', 0.15, 0.6);
    setTimeout(() => playTone(100, 'square', 0.2, 0.4), 50);
}
function playWinSound() {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'sine', 0.3, 0.5), i * 150);
    });
}

// 象棋常量
const ROWS = 10;
const COLS = 9;
const RED = 'r';
const BLACK = 'b';

let CANVAS_WIDTH = 0;
let CANVAS_HEIGHT = 0;
let CELL_SIZE = 0;
let MARGIN_X = 0;
let MARGIN_Y = 0;
let PIECE_RADIUS = 0;

let board = []; // 10x9 数组
let currentPlayer = RED;
let selectedPiece = null; // {r, c}
let moveHistory = [];
let isGameOver = false;

// 初始化棋盘
function initBoard() {
    board = Array.from({length: ROWS}, () => new Array(COLS).fill(null));
    const setup = [
        ['R','H','E','A','K','A','E','H','R'],
        [null,null,null,null,null,null,null,null,null],
        [null,'C',null,null,null,null,null,'C',null],
        ['P',null,'P',null,'P',null,'P',null,'P'],
        [null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null],
        ['p',null,'p',null,'p',null,'p',null,'p'],
        [null,'c',null,null,null,null,null,'c',null],
        [null,null,null,null,null,null,null,null,null],
        ['r','h','e','a','k','a','e','h','r']
    ];
    
    const typeMap = {
        'k': '帅', 'K': '将', 'a': '仕', 'A': '士', 'e': '相', 'E': '象',
        'h': '马', 'H': '马', 'r': '车', 'R': '车', 'c': '炮', 'C': '炮',
        'p': '兵', 'P': '卒'
    };
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const char = setup[r][c];
            if (char) {
                const color = (char === char.toLowerCase()) ? RED : BLACK;
                board[r][c] = { type: char.toLowerCase(), color: color, text: typeMap[char] };
            }
        }
    }
    currentPlayer = RED;
    selectedPiece = null;
    moveHistory = [];
    isGameOver = false;
    updateUI();
}

function resizeCanvas() {
    const rect = boardContainer.getBoundingClientRect();
    // 象棋棋盘比例大约是 9:10
    let w = rect.width - 20;
    let h = rect.height - 20;
    
    if (w / 9 * 10 > h) {
        w = h / 10 * 9;
    } else {
        h = w / 9 * 10;
    }
    
    CANVAS_WIDTH = Math.max(300, w);
    CANVAS_HEIGHT = CANVAS_WIDTH / 9 * 10;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = CANVAS_WIDTH + 'px';
    canvas.style.height = CANVAS_HEIGHT + 'px';
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);
    
    CELL_SIZE = CANVAS_WIDTH / 10;
    MARGIN_X = CELL_SIZE;
    MARGIN_Y = CELL_SIZE;
    PIECE_RADIUS = CELL_SIZE * 0.42;

    draw();
}
window.addEventListener('resize', resizeCanvas);

function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBoardLines();
    drawPieces();
}

function drawBoardLines() {
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // 横线
    for (let r = 0; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(MARGIN_X, MARGIN_Y + r * CELL_SIZE);
        ctx.lineTo(MARGIN_X + 8 * CELL_SIZE, MARGIN_Y + r * CELL_SIZE);
        ctx.stroke();
    }
    
    // 竖线 (分两段，中间楚河汉界)
    for (let c = 0; c < COLS; c++) {
        if (c === 0 || c === 8) {
            ctx.beginPath();
            ctx.moveTo(MARGIN_X + c * CELL_SIZE, MARGIN_Y);
            ctx.lineTo(MARGIN_X + c * CELL_SIZE, MARGIN_Y + 9 * CELL_SIZE);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(MARGIN_X + c * CELL_SIZE, MARGIN_Y);
            ctx.lineTo(MARGIN_X + c * CELL_SIZE, MARGIN_Y + 4 * CELL_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(MARGIN_X + c * CELL_SIZE, MARGIN_Y + 5 * CELL_SIZE);
            ctx.lineTo(MARGIN_X + c * CELL_SIZE, MARGIN_Y + 9 * CELL_SIZE);
            ctx.stroke();
        }
    }

    // 九宫格斜线
    ctx.beginPath();
    ctx.moveTo(MARGIN_X + 3 * CELL_SIZE, MARGIN_Y); ctx.lineTo(MARGIN_X + 5 * CELL_SIZE, MARGIN_Y + 2 * CELL_SIZE);
    ctx.moveTo(MARGIN_X + 5 * CELL_SIZE, MARGIN_Y); ctx.lineTo(MARGIN_X + 3 * CELL_SIZE, MARGIN_Y + 2 * CELL_SIZE);
    ctx.moveTo(MARGIN_X + 3 * CELL_SIZE, MARGIN_Y + 7 * CELL_SIZE); ctx.lineTo(MARGIN_X + 5 * CELL_SIZE, MARGIN_Y + 9 * CELL_SIZE);
    ctx.moveTo(MARGIN_X + 5 * CELL_SIZE, MARGIN_Y + 7 * CELL_SIZE); ctx.lineTo(MARGIN_X + 3 * CELL_SIZE, MARGIN_Y + 9 * CELL_SIZE);
    ctx.stroke();

    // 楚河汉界文字
    ctx.fillStyle = '#3e2723';
    ctx.font = `bold ${CELL_SIZE * 0.6}px "KaiTi", "STKaiti", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("楚 河", MARGIN_X + 2 * CELL_SIZE, MARGIN_Y + 4.5 * CELL_SIZE);
    ctx.fillText("汉 界", MARGIN_X + 6 * CELL_SIZE, MARGIN_Y + 4.5 * CELL_SIZE);
    
    // 炮和兵的十字标记略，为保持代码简洁
}

function drawPieces() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const piece = board[r][c];
            if (piece) {
                const cx = MARGIN_X + c * CELL_SIZE;
                const cy = MARGIN_Y + r * CELL_SIZE;
                
                // 选中高亮底色
                if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, PIECE_RADIUS + 4, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(46, 204, 113, 0.5)';
                    ctx.fill();
                }

                // 棋子立体背景
                ctx.beginPath();
                ctx.arc(cx, cy, PIECE_RADIUS, 0, Math.PI * 2);
                ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
                ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(0,0,0,0.5)';
                const grad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, PIECE_RADIUS);
                grad.addColorStop(0, '#f5deb3');
                grad.addColorStop(1, '#d2b48c');
                ctx.fillStyle = grad;
                ctx.fill();
                
                // 棋子内圈
                ctx.shadowColor = 'transparent';
                ctx.beginPath();
                ctx.arc(cx, cy, PIECE_RADIUS * 0.8, 0, Math.PI * 2);
                ctx.strokeStyle = piece.color === RED ? 'rgba(192, 57, 43, 0.5)' : 'rgba(44, 62, 80, 0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // 文字
                ctx.fillStyle = piece.color === RED ? '#c0392b' : '#2c3e50';
                ctx.font = `bold ${PIECE_RADIUS * 1.1}px "KaiTi", "STKaiti", serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // 微调文字视觉居中
                ctx.fillText(piece.text, cx, cy + 2);
            }
        }
    }
    
    // 如果有选中的棋子，画出可移动的合法位置圆点提示
    if (selectedPiece) {
        ctx.fillStyle = 'rgba(46, 204, 113, 0.6)';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (isValidMove(selectedPiece.r, selectedPiece.c, r, c, board, currentPlayer)) {
                    const cx = MARGIN_X + c * CELL_SIZE;
                    const cy = MARGIN_Y + r * CELL_SIZE;
                    ctx.beginPath();
                    ctx.arc(cx, cy, CELL_SIZE * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
}

// 核心规则验证
function isValidMove(sr, sc, tr, tc, state, player) {
    if (sr === tr && sc === tc) return false;
    const target = state[tr][tc];
    if (target && target.color === player) return false; // 不能吃自己

    const piece = state[sr][sc].type;
    const dr = tr - sr;
    const dc = tc - sc;

    switch (piece) {
        case 'k': // 将帅
            if (Math.abs(dr) + Math.abs(dc) !== 1) return false;
            if (tc < 3 || tc > 5) return false;
            if (player === RED && tr < 7) return false;
            if (player === BLACK && tr > 2) return false;
            return true;
        case 'a': // 士仕
            if (Math.abs(dr) !== 1 || Math.abs(dc) !== 1) return false;
            if (tc < 3 || tc > 5) return false;
            if (player === RED && tr < 7) return false;
            if (player === BLACK && tr > 2) return false;
            return true;
        case 'e': // 象相
            if (Math.abs(dr) !== 2 || Math.abs(dc) !== 2) return false;
            if (player === RED && tr < 5) return false; // 不能过河
            if (player === BLACK && tr > 4) return false;
            if (state[sr + dr/2][sc + dc/2]) return false; // 塞象眼
            return true;
        case 'h': // 马
            if (Math.abs(dr) === 2 && Math.abs(dc) === 1) {
                if (state[sr + dr/2][sc]) return false; // 蹩马腿
                return true;
            } else if (Math.abs(dr) === 1 && Math.abs(dc) === 2) {
                if (state[sr][sc + dc/2]) return false;
                return true;
            }
            return false;
        case 'r': // 车
            if (dr !== 0 && dc !== 0) return false;
            let stepR = dr === 0 ? 0 : Math.sign(dr);
            let stepC = dc === 0 ? 0 : Math.sign(dc);
            let r = sr + stepR, c = sc + stepC;
            while (r !== tr || c !== tc) {
                if (state[r][c]) return false;
                r += stepR; c += stepC;
            }
            return true;
        case 'c': // 炮
            if (dr !== 0 && dc !== 0) return false;
            let pStepR = dr === 0 ? 0 : Math.sign(dr);
            let pStepC = dc === 0 ? 0 : Math.sign(dc);
            let pr = sr + pStepR, pc = sc + pStepC;
            let count = 0;
            while (pr !== tr || pc !== tc) {
                if (state[pr][pc]) count++;
                pr += pStepR; pc += pStepC;
            }
            if (target) return count === 1; // 吃子必须隔一个
            return count === 0; // 不吃子不能隔
        case 'p': // 兵卒
            if (player === RED) {
                if (dr > 0) return false; // 不能后退
                if (sr >= 5) { // 没过河
                    return dr === -1 && dc === 0;
                } else { // 过河
                    return (dr === -1 && dc === 0) || (dr === 0 && Math.abs(dc) === 1);
                }
            } else {
                if (dr < 0) return false;
                if (sr <= 4) {
                    return dr === 1 && dc === 0;
                } else {
                    return (dr === 1 && dc === 0) || (dr === 0 && Math.abs(dc) === 1);
                }
            }
    }
    return false;
}

// 飞将检测 (将帅是否直接照面)
function isFlyingGeneral(state) {
    let kr = -1, kc = -1, Kr = -1, Kc = -1;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (state[r][c] && state[r][c].type === 'k') {
                if (state[r][c].color === RED) { kr = r; kc = c; }
                else { Kr = r; Kc = c; }
            }
        }
    }
    if (kc !== Kc) return false;
    let start = Math.min(kr, Kr) + 1;
    let end = Math.max(kr, Kr);
    for (let i = start; i < end; i++) {
        if (state[i][kc]) return false; // 有遮挡
    }
    return true;
}

function executeMove(sr, sc, tr, tc) {
    const target = board[tr][tc];
    const piece = board[sr][sc];
    
    // 模拟落子，检查是否导致飞将
    board[tr][tc] = piece;
    board[sr][sc] = null;
    if (isFlyingGeneral(board)) {
        // 回退
        board[sr][sc] = piece;
        board[tr][tc] = target;
        alert("不能送将/飞将！");
        return;
    }
    
    if (target) {
        playCaptureSound();
        if (target.type === 'k') {
            isGameOver = true;
            setTimeout(() => {
                document.getElementById('winner-text').innerHTML = `<span style="color:${currentPlayer === RED ? '#e74c3c' : '#2c3e50'}">${currentPlayer === RED ? '红方' : '黑方'} 获胜！</span>`;
                document.getElementById('game-over-modal').classList.add('show');
                playWinSound();
            }, 100);
        }
    } else {
        playMoveSound();
    }

    moveHistory.push({ sr, sc, tr, tc, piece, target });
    
    if (!isGameOver) {
        currentPlayer = currentPlayer === RED ? BLACK : RED;
        updateUI();
    }
    selectedPiece = null;
    draw();
}

canvas.addEventListener('click', (e) => {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 转换为行列索引
    const c = Math.round((x - MARGIN_X) / CELL_SIZE);
    const r = Math.round((y - MARGIN_Y) / CELL_SIZE);

    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

    const clickedPiece = board[r][c];

    if (selectedPiece) {
        if (selectedPiece.r === r && selectedPiece.c === c) {
            // 点击自己，取消选择
            selectedPiece = null;
            draw();
        } else if (clickedPiece && clickedPiece.color === currentPlayer) {
            // 点击自己的其他棋子，切换选择
            selectedPiece = { r, c };
            playSelectSound();
            draw();
        } else {
            // 尝试移动
            if (isValidMove(selectedPiece.r, selectedPiece.c, r, c, board, currentPlayer)) {
                executeMove(selectedPiece.r, selectedPiece.c, r, c);
            } else {
                selectedPiece = null;
                draw();
            }
        }
    } else {
        if (clickedPiece && clickedPiece.color === currentPlayer) {
            selectedPiece = { r, c };
            playSelectSound();
            draw();
        }
    }
});

function updateUI() {
    turnIndicator.innerHTML = `当前回合: <b style="color: ${currentPlayer === RED ? '#e74c3c' : '#2c3e50'}">${currentPlayer === RED ? '红方' : '黑方'}</b>`;
}

undoBtn.addEventListener('click', () => {
    if (moveHistory.length === 0 || isGameOver) return;
    const lastMove = moveHistory.pop();
    board[lastMove.sr][lastMove.sc] = lastMove.piece;
    board[lastMove.tr][lastMove.tc] = lastMove.target;
    currentPlayer = lastMove.piece.color;
    selectedPiece = null;
    updateUI();
    draw();
});

document.getElementById('modal-restart-btn').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.remove('show');
    initBoard();
    resizeCanvas();
});

restartBtn.addEventListener('click', () => { initBoard(); resizeCanvas(); });

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => alert(err.message));
    } else { document.exitFullscreen(); }
});

document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.textContent = document.fullscreenElement ? '退出全屏' : '全屏模式';
    setTimeout(resizeCanvas, 100);
});

// 启动
initBoard();
resizeCanvas();