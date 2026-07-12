const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const modeSelect = document.getElementById('mode-select');
const turnIndicator = document.getElementById('turn-indicator');
const restartBtn = document.getElementById('restart-btn');
const undoBtn = document.getElementById('undo-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const boardContainer = document.querySelector('.board-container');

const BOARD_SIZE = 19;
let CANVAS_SIZE = 600; // 将作为动态变量
let MARGIN = 30;
let CELL_SIZE = 0;
let STONE_RADIUS = 0;

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let moveHistory = [];
let currentPlayer = BLACK;
let isGameOver = false;
let gameMode = modeSelect.value; // 'pvp' or 'pve'

// 音效系统 (Web Audio API)
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

function playStoneSound() {
    playTone(400, 'sine', 0.1, 0.5); // 清脆的落子声
    setTimeout(() => playTone(800, 'triangle', 0.05, 0.2), 20); // 细微的余音
}

function playWinSound() {
    playTone(523.25, 'sine', 0.2, 0.5); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.2, 0.5), 150); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.4, 0.5), 300); // G5
    setTimeout(() => playTone(1046.50, 'sine', 0.6, 0.5), 450); // C6
}

// 模态框逻辑
const modal = document.getElementById('game-over-modal');
const winnerText = document.getElementById('winner-text');
const modalRestartBtn = document.getElementById('modal-restart-btn');

function showWinModal(player) {
    winnerText.textContent = `${player === BLACK ? '黑棋' : '白棋'} 获胜！`;
    winnerText.style.color = player === BLACK ? '#34495e' : '#ecf0f1';
    modal.classList.add('show');
    playWinSound();
}

modalRestartBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    resetGame();
});

// 动态调整 Canvas 尺寸以适应容器
function resizeCanvas() {
    // 获取容器的可用宽高
    const rect = boardContainer.getBoundingClientRect();
    // 取宽高中较小的一个作为正方形画布的边长，减去一些 padding 防止溢出
    const maxSize = Math.min(rect.width, rect.height) - 10; 
    
    // 设置合理的最小尺寸
    CANVAS_SIZE = Math.max(300, maxSize);
    
    // 获取设备像素比 (用于解决高清屏模糊问题)
    const dpr = window.devicePixelRatio || 1;
    
    // 设置画布的 CSS 显示尺寸
    canvas.style.width = CANVAS_SIZE + 'px';
    canvas.style.height = CANVAS_SIZE + 'px';

    // 设置画布内部的实际像素尺寸，并根据 dpr 缩放
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    
    // 缩放画布的坐标系，使后续所有的绘图都按 CSS 尺寸来，不需要手动乘 dpr
    ctx.scale(dpr, dpr);
    
    // 边缘留白约为单个格子的宽度，视觉上更协调
    MARGIN = CANVAS_SIZE / (BOARD_SIZE + 1); 
    CELL_SIZE = (CANVAS_SIZE - 2 * MARGIN) / (BOARD_SIZE - 1);
    STONE_RADIUS = CELL_SIZE * 0.45;

    // 重新绘制当前局面
    drawBoard();
    redrawAllStones();
}

// 监听窗口大小变化
window.addEventListener('resize', resizeCanvas);

// 初始化棋盘数据
function initBoardData() {
    board = [];
    moveHistory = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        board[i] = new Array(BOARD_SIZE).fill(EMPTY);
    }
}

// 绘制棋盘背景和网格
function drawBoard() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
        // 横线
        ctx.moveTo(MARGIN, MARGIN + i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE - MARGIN, MARGIN + i * CELL_SIZE);
        // 竖线
        ctx.moveTo(MARGIN + i * CELL_SIZE, MARGIN);
        ctx.lineTo(MARGIN + i * CELL_SIZE, CANVAS_SIZE - MARGIN);
    }
    ctx.stroke();

    // 绘制星位 (19x19 棋盘的标准星位)
    const starPoints = [
        [3, 3], [9, 3], [15, 3],
        [3, 9], [9, 9], [15, 9],
        [3, 15], [9, 15], [15, 15]
    ];

    ctx.fillStyle = '#000';
    starPoints.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(MARGIN + x * CELL_SIZE, MARGIN + y * CELL_SIZE, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
}

// 重新绘制所有棋子
function redrawAllStones() {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) {
                const cx = MARGIN + i * CELL_SIZE;
                const cy = MARGIN + j * CELL_SIZE;
                
                ctx.beginPath();
                ctx.arc(cx, cy, STONE_RADIUS, 0, 2 * Math.PI);
                
                // 增加阴影，增强立体悬浮感
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';

                // 更逼真的高光渐变 (光源从左上角照来)
                const gradient = ctx.createRadialGradient(
                    cx - STONE_RADIUS * 0.3, cy - STONE_RADIUS * 0.3, 1, 
                    cx, cy, STONE_RADIUS
                );
                
                if (board[i][j] === BLACK) {
                    gradient.addColorStop(0, '#666');   // 高光点
                    gradient.addColorStop(0.3, '#222'); // 过渡
                    gradient.addColorStop(1, '#050505'); // 边缘暗部
                } else {
                    gradient.addColorStop(0, '#fff');   // 高光点
                    gradient.addColorStop(0.5, '#f0f0f0'); // 过渡
                    gradient.addColorStop(1, '#ccc');   // 边缘暗部
                }
                
                ctx.fillStyle = gradient;
                ctx.fill();
                
                // 重置阴影，避免影响后续其他元素的绘制
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.shadowBlur = 0;
            }
        }
    }
}

// 更新UI
function updateUI() {
    turnIndicator.innerHTML = `当前回合: <b>${currentPlayer === BLACK ? '黑棋' : '白棋'}</b>`;
}

// 判断胜负
function checkWin(x, y, player) {
    const directions = [
        [1, 0],  // 水平
        [0, 1],  // 垂直
        [1, 1],  // 右下斜
        [1, -1]  // 右上斜
    ];

    for (let dir of directions) {
        let count = 1;
        const [dx, dy] = dir;

        // 正向查找
        let i = x + dx;
        let j = y + dy;
        while (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE && board[i][j] === player) {
            count++;
            i += dx;
            j += dy;
        }

        // 反向查找
        i = x - dx;
        j = y - dy;
        while (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE && board[i][j] === player) {
            count++;
            i -= dx;
            j -= dy;
        }

        if (count >= 5) {
            return true;
        }
    }
    return false;
}

// --- 进阶 AI 逻辑 ---
function aiMove() {
    if (isGameOver || gameMode !== 'pve' || currentPlayer !== WHITE) return;
    
    const diffSelect = document.getElementById('diff-select');
    const difficulty = diffSelect ? diffSelect.value : 'medium';

    let bestMove;
    if (difficulty === 'easy') {
        bestMove = calculateHeuristicMove(true); // 带极大噪音的新手模式
    } else if (difficulty === 'medium') {
        bestMove = calculateHeuristicMove(false); // 纯粹的形状匹配启发式
    } else {
        bestMove = calculateHardMove(); // 深度为2的极小极大搜索
    }

    if (bestMove) {
        placeStone(bestMove[0], bestMove[1]);
    }
}

// 获取候选落子点 (仅搜索已有棋子周围半径 2 格内的空位，大幅提升性能)
function getCandidateMoves(testBoard) {
    let candidates = [];
    let hasStone = false;
    let visited = Array.from({length: BOARD_SIZE}, () => new Array(BOARD_SIZE).fill(false));
    
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (testBoard[i][j] !== EMPTY) {
                hasStone = true;
                for(let di = -2; di <= 2; di++){
                    for(let dj = -2; dj <= 2; dj++){
                        let ni = i + di, nj = j + dj;
                        if(ni >= 0 && ni < BOARD_SIZE && nj >= 0 && nj < BOARD_SIZE && testBoard[ni][nj] === EMPTY && !visited[ni][nj]){
                            visited[ni][nj] = true;
                            candidates.push({i: ni, j: nj});
                        }
                    }
                }
            }
        }
    }
    if (!hasStone) return [{i: 9, j: 9}]; // 第一手下天元
    return candidates;
}

// 启发式评估搜索
function calculateHeuristicMove(addNoise) {
    let bestScore = -Infinity;
    let bestMoves = [];
    let candidates = getCandidateMoves(board);
    
    for (let c of candidates) {
        let score = evaluatePosition(board, c.i, c.j, WHITE) + evaluatePosition(board, c.i, c.j, BLACK) * 0.9;
        if (addNoise) score += Math.random() * 5000; // 给新手模式加巨大的噪音
        
        if (score > bestScore) {
            bestScore = score;
            bestMoves = [[c.i, c.j]];
        } else if (score === bestScore) {
            bestMoves.push([c.i, c.j]);
        }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// 困难模式: 深度为 2 的迷你 Max 搜索 (我方下一步 -> 敌方应对 -> 评估)
function calculateHardMove() {
    let candidates = getCandidateMoves(board);
    if (candidates.length === 0) return [9, 9];
    
    // 1. 初步剪枝：给候选点打基础分并排序
    for (let c of candidates) {
        c.score = evaluatePosition(board, c.i, c.j, WHITE) + evaluatePosition(board, c.i, c.j, BLACK) * 1.1; // 困难模式防御权重略高
        // 若能直接赢或必须堵死，直接返回
        if (c.score >= 500000) return [c.i, c.j]; 
    }
    
    // 只取前 12 个最优解进行深度搜索，防止 JS 线程卡死
    candidates.sort((a, b) => b.score - a.score);
    let bestCands = candidates.slice(0, 12);
    
    let bestMove = bestCands[0];
    let maxScore = -Infinity;
    
    // 模拟我方的每一种可能走法
    for (let myMove of bestCands) {
        board[myMove.i][myMove.j] = WHITE;
        
        let enemyCandidates = getCandidateMoves(board);
        let minScore = Infinity;
        
        // 快速评估敌方应对
        for(let ec of enemyCandidates) {
            ec.score = evaluatePosition(board, ec.i, ec.j, BLACK) + evaluatePosition(board, ec.i, ec.j, WHITE) * 1.1;
        }
        enemyCandidates.sort((a,b) => b.score - a.score);
        let bestEnemyCands = enemyCandidates.slice(0, 5); // 考虑敌方的 5 种最强反击
        
        for (let enemyMove of bestEnemyCands) {
            board[enemyMove.i][enemyMove.j] = BLACK;
            
            // 评估在这条分支下的局面总分 (我的优势减去敌方优势)
            // 这里为了性能，简化为：我刚才那一手的得分 - 敌方反击的得分
            let currentScore = myMove.score - enemyMove.score * 1.5; 
            
            board[enemyMove.i][enemyMove.j] = EMPTY;
            
            if (currentScore < minScore) {
                minScore = currentScore; // 敌方会选择让我得分最低的走法
            }
        }
        
        board[myMove.i][myMove.j] = EMPTY;
        
        if (minScore > maxScore) {
            maxScore = minScore; // 我方要在敌方最优反击下，选一个最不坏的结果
            bestMove = myMove;
        }
    }
    
    return [bestMove.i, bestMove.j];
}

// 核心形状匹配打分引擎
function evaluatePosition(testBoard, x, y, player) {
    let totalScore = 0;
    const directions = [ [1, 0], [0, 1], [1, 1], [1, -1] ];
    
    for (let dir of directions) {
        let line = [];
        const [dx, dy] = dir;
        
        // 获取前后共 9 个位置的棋子状态
        for (let step = -4; step <= 4; step++) {
            if (step === 0) {
                line.push(player);
                continue;
            }
            let nx = x + dx * step;
            let ny = y + dy * step;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                line.push(testBoard[nx][ny]);
            } else {
                line.push(-1); // 墙壁边界
            }
        }
        
        // 转换为字符串进行强力模式匹配: P=自己, E=空, O=对手/墙壁
        let str = line.map(p => p === player ? 'P' : p === EMPTY ? 'E' : 'O').join('');
        
        // 核心评分逻辑
        if (str.includes('PPPPP')) totalScore += 1000000; // 连五
        else if (str.includes('EPPPPE')) totalScore += 100000; // 活四
        else if (str.includes('EPPPPO') || str.includes('OPPPPE') || str.includes('EPPEPPE') || str.includes('EPPPEPE')) totalScore += 10000; // 冲四 (含跳四)
        else if (str.includes('EPPPE')) totalScore += 5000; // 活三
        else if (str.includes('EPPEPE') || str.includes('EPEPPE')) totalScore += 4500; // 跳活三
        else if (str.includes('OPPPE') || str.includes('EPPPO') || str.includes('OPPEPE') || str.includes('EPEPPO')) totalScore += 500; // 眠三
        else if (str.includes('EPPE')) totalScore += 100; // 活二
        else if (str.includes('EPEPE')) totalScore += 80; // 跳二
        else if (str.includes('EPE')) totalScore += 10; // 单子潜力
    }
    
    // 增加中心距离权重，鼓励往中间下
    const centerDist = Math.abs(x - 9) + Math.abs(y - 9);
    totalScore += (18 - centerDist);
    return totalScore;
}

// 放置棋子
function placeStone(i, j) {
    if (isGameOver || board[i][j] !== EMPTY) return;

    moveHistory.push({ i, j, player: currentPlayer });
    board[i][j] = currentPlayer;
    
    playStoneSound(); // 播放落子音效

    drawBoard(); // 重画棋盘以去除之前的最新落子标记
    redrawAllStones();
    
    // 给当前落子加个红点标记，使其更加醒目
    const cx = MARGIN + i * CELL_SIZE;
    const cy = MARGIN + j * CELL_SIZE;
    ctx.beginPath();
    ctx.arc(cx, cy, STONE_RADIUS * 0.3, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff4757'; // 更鲜艳的红色
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.shadowBlur = 4; ctx.shadowColor = '#ff4757';
    ctx.fill();
    ctx.shadowBlur = 0; // 重置阴影

    if (checkWin(i, j, currentPlayer)) {
        isGameOver = true;
        setTimeout(() => showWinModal(currentPlayer), 100);
        return;
    }

    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    updateUI();

    // 如果是人机模式，并且轮到白棋(AI)
    if (!isGameOver && gameMode === 'pve' && currentPlayer === WHITE) {
        // 稍微延迟一下，显得AI在思考
        setTimeout(aiMove, 200);
    }
}

// 处理点击事件
canvas.addEventListener('click', (e) => {
    if (isGameOver) return;
    if (gameMode === 'pve' && currentPlayer === WHITE) return; // 玩家不能替AI下

    const rect = canvas.getBoundingClientRect();
    
    // 获取相对于 Canvas 内部的精确坐标 (HDPI下画布坐标系已经等同于 CSS 尺寸)
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 计算点击的是哪个交叉点
    const i = Math.round((x - MARGIN) / CELL_SIZE);
    const j = Math.round((y - MARGIN) / CELL_SIZE);

    if (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE) {
        placeStone(i, j);
    }
});

// 重置游戏
function resetGame() {
    initBoardData();
    resizeCanvas(); // 初始化时也触发一次尺寸计算
    currentPlayer = BLACK;
    isGameOver = false;
    gameMode = modeSelect.value;
    
    const diffSelect = document.getElementById('diff-select');
    if (diffSelect) {
        diffSelect.style.display = gameMode === 'pve' ? 'inline-block' : 'none';
    }
    
    updateUI();
}

// 悔棋逻辑
function undoMove() {
    if (moveHistory.length === 0) return;

    let stepsToUndo = 1;
    if (gameMode === 'pve' && !isGameOver && currentPlayer === BLACK) {
        stepsToUndo = 2; // 人机模式下，轮到玩家时（机器刚下完），需撤回两步
    } else if (gameMode === 'pve' && isGameOver) {
        const lastMove = moveHistory[moveHistory.length - 1];
        if (lastMove.player === WHITE) {
             stepsToUndo = 2; // 机器赢了，退两步回到玩家下棋前
        }
    }
    
    stepsToUndo = Math.min(stepsToUndo, moveHistory.length);

    for (let step = 0; step < stepsToUndo; step++) {
        const lastMove = moveHistory.pop();
        board[lastMove.i][lastMove.j] = EMPTY;
        currentPlayer = lastMove.player;
    }

    isGameOver = false; // 悔棋后恢复游戏状态
    updateUI();
    
    drawBoard();
    redrawAllStones();
    
    // 如果还有历史记录，重新标记最新的落子
    if (moveHistory.length > 0) {
        const last = moveHistory[moveHistory.length - 1];
        const cx = MARGIN + last.i * CELL_SIZE;
        const cy = MARGIN + last.j * CELL_SIZE;
        ctx.beginPath();
        ctx.arc(cx, cy, STONE_RADIUS * 0.3, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff4757';
        ctx.shadowBlur = 4; ctx.shadowColor = '#ff4757';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

undoBtn.addEventListener('click', undoMove);
restartBtn.addEventListener('click', resetGame);
modeSelect.addEventListener('change', resetGame);

// 全屏控制逻辑
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`全屏请求失败: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// 监听全屏状态变化，更新按钮文字
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        fullscreenBtn.textContent = '退出全屏';
    } else {
        fullscreenBtn.textContent = '全屏模式';
    }
    // 延迟一下重绘，确保浏览器完成布局渲染
    setTimeout(resizeCanvas, 100);
});

// 初始化
resetGame();
