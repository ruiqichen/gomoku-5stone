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

// 动态调整 Canvas 尺寸以适应容器
function resizeCanvas() {
    // 获取容器的可用宽高
    const rect = boardContainer.getBoundingClientRect();
    // 取宽高中较小的一个作为正方形画布的边长，减去一些 padding 防止溢出
    const maxSize = Math.min(rect.width, rect.height) - 10; 
    
    // 设置合理的最小尺寸
    CANVAS_SIZE = Math.max(300, maxSize);
    
    // 动态计算棋盘参数
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    
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
                // 不画中心红点，只在当前落子画，这里简化为重画普通棋子
                const cx = MARGIN + i * CELL_SIZE;
                const cy = MARGIN + j * CELL_SIZE;
                ctx.beginPath();
                ctx.arc(cx, cy, STONE_RADIUS, 0, 2 * Math.PI);
                const gradient = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, STONE_RADIUS);
                if (board[i][j] === BLACK) {
                    gradient.addColorStop(0, '#666');
                    gradient.addColorStop(1, '#000');
                } else {
                    gradient.addColorStop(0, '#fff');
                    gradient.addColorStop(1, '#ccc');
                }
                ctx.fillStyle = gradient;
                ctx.fill();
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

// AI 逻辑 (极简启发式评估)
function aiMove() {
    if (isGameOver || gameMode !== 'pve' || currentPlayer !== WHITE) return;
    
    let bestScore = -1;
    let bestMoves = [];

    // 评估每个空位的得分
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === EMPTY) {
                // 进攻分（白棋自己）和 防守分（黑棋）
                let score = evaluatePosition(i, j, WHITE) + evaluatePosition(i, j, BLACK) * 0.8;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMoves = [[i, j]];
                } else if (score === bestScore) {
                    bestMoves.push([i, j]);
                }
            }
        }
    }

    // 随机选择一个最高分的落子点，增加变化
    if (bestMoves.length > 0) {
        const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        placeStone(move[0], move[1]);
    }
}

// 评估某个位置对某个玩家的价值 (简化版评分规则)
function evaluatePosition(x, y, player) {
    let totalScore = 0;
    const directions = [ [1, 0], [0, 1], [1, 1], [1, -1] ];

    for (let dir of directions) {
        let consecutive = 1;
        let blocked = 0;
        const [dx, dy] = dir;

        // 正向
        let i = x + dx;
        let j = y + dy;
        while (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE && board[i][j] === player) {
            consecutive++;
            i += dx;
            j += dy;
        }
        if (i < 0 || i >= BOARD_SIZE || j < 0 || j >= BOARD_SIZE || board[i][j] !== EMPTY) {
            blocked++;
        }

        // 反向
        i = x - dx;
        j = y - dy;
        while (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE && board[i][j] === player) {
            consecutive++;
            i -= dx;
            j -= dy;
        }
        if (i < 0 || i >= BOARD_SIZE || j < 0 || j >= BOARD_SIZE || board[i][j] !== EMPTY) {
            blocked++;
        }

        // 评分规则
        if (consecutive >= 5) {
            totalScore += 100000;
        } else if (consecutive === 4) {
            if (blocked === 0) totalScore += 10000;
            else if (blocked === 1) totalScore += 1000;
        } else if (consecutive === 3) {
            if (blocked === 0) totalScore += 1000;
            else if (blocked === 1) totalScore += 100;
        } else if (consecutive === 2) {
            if (blocked === 0) totalScore += 100;
            else if (blocked === 1) totalScore += 10;
        }
    }
    
    // 给中心点一些基础分数，让AI初期尽量往中间下
    const centerDist = Math.abs(x - 9) + Math.abs(y - 9);
    totalScore += (18 - centerDist);

    return totalScore;
}

// 放置棋子
function placeStone(i, j) {
    if (isGameOver || board[i][j] !== EMPTY) return;

    moveHistory.push({ i, j, player: currentPlayer });
    board[i][j] = currentPlayer;
    drawBoard(); // 重画棋盘以去除之前的最新落子标记
    redrawAllStones();
    
    // 给当前落子加个红点标记
    const cx = MARGIN + i * CELL_SIZE;
    const cy = MARGIN + j * CELL_SIZE;
    ctx.beginPath();
    ctx.arc(cx, cy, STONE_RADIUS * 0.3, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();

    if (checkWin(i, j, currentPlayer)) {
        setTimeout(() => alert(`${currentPlayer === BLACK ? '黑棋' : '白棋'} 获胜！`), 100);
        isGameOver = true;
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
    
    // 计算缩放比例 (实际显示的尺寸 vs 画布内在的像素尺寸)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // 获取相对于 Canvas 内部的精确坐标
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

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
        ctx.fillStyle = 'red';
        ctx.fill();
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
