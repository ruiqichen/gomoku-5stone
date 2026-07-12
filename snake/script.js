const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const modal = document.getElementById('game-over-modal');
const finalScoreElement = document.getElementById('final-score');
const modalRestartBtn = document.getElementById('modal-restart-btn');

const gridSize = 20;

let snake = [];
let dx = 0;
let dy = 0;
let foodX;
let foodY;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
highScoreElement.textContent = highScore;

let gameLoop;
let isPlaying = false;

// 音效系统
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    if (type === 'eat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
    osc.connect(gain);
    gain.connect(audioCtx.destination);
}

// 调整 Canvas 适应屏幕
function resizeCanvas() {
    const containerWidth = document.querySelector('.app-container').clientWidth - 40;
    const size = Math.min(600, containerWidth);
    
    // HDPI 支持
    const dpr = window.devicePixelRatio || 1;
    const cssSize = Math.floor(size / gridSize) * gridSize;
    
    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';
    
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    ctx.scale(dpr, dpr);
    
    if (!isPlaying && snake.length > 0) {
        drawGame();
    } else if (!isPlaying) {
        drawInitialScreen();
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    dx = 0;
    dy = -1;
    score = 0;
    scoreElement.textContent = score;
    modal.classList.remove('show');
    spawnFood();
}

function spawnFood() {
    // 使用 CSS 尺寸计算格子数
    const tilesX = parseInt(canvas.style.width) / gridSize;
    const tilesY = parseInt(canvas.style.height) / gridSize;
    
    foodX = Math.floor(Math.random() * tilesX);
    foodY = Math.floor(Math.random() * tilesY);
    
    for (let part of snake) {
        if (part.x === foodX && part.y === foodY) {
            spawnFood();
            return;
        }
    }
}

function drawBackground() {
    const w = parseInt(canvas.style.width);
    const h = parseInt(canvas.style.height);
    
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);
    
    // 绘制暗色网格线
    ctx.strokeStyle = 'rgba(11, 232, 129, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= w; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let j = 0; j <= h; j += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
    }
}

function drawGame() {
    drawBackground();

    if (!isPlaying) return;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    if (head.x === foodX && head.y === foodY) {
        score += 10;
        scoreElement.textContent = score;
        playSound('eat');
        spawnFood();
    } else {
        snake.pop();
    }

    // 画发光的食物
    const fx = foodX * gridSize + gridSize / 2;
    const fy = foodY * gridSize + gridSize / 2;
    ctx.beginPath();
    ctx.arc(fx, fy, gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4757';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff4757';
    ctx.fill();
    ctx.shadowBlur = 0;

    // 画蛇
    snake.forEach((part, index) => {
        const px = part.x * gridSize;
        const py = part.y * gridSize;
        
        ctx.fillStyle = index === 0 ? '#0be881' : 'rgba(11, 232, 129, 0.8)';
        // 稍微画小一点增加间隙感
        ctx.fillRect(px + 1, py + 1, gridSize - 2, gridSize - 2);
        
        // 给蛇头画眼睛
        if (index === 0) {
            ctx.fillStyle = '#000';
            let eye1X, eye1Y, eye2X, eye2Y;
            if (dx === 1) { // 右
                eye1X = px + 12; eye1Y = py + 5; eye2X = px + 12; eye2Y = py + 13;
            } else if (dx === -1) { // 左
                eye1X = px + 6; eye1Y = py + 5; eye2X = px + 6; eye2Y = py + 13;
            } else if (dy === -1) { // 上
                eye1X = px + 5; eye1Y = py + 6; eye2X = px + 13; eye2Y = py + 6;
            } else { // 下
                eye1X = px + 5; eye1Y = py + 12; eye2X = px + 13; eye2Y = py + 12;
            }
            ctx.fillRect(eye1X, eye1Y, 3, 3);
            ctx.fillRect(eye2X, eye2Y, 3, 3);
        }
    });

    checkGameOver();
}

function checkGameOver() {
    const head = snake[0];
    const tilesX = parseInt(canvas.style.width) / gridSize;
    const tilesY = parseInt(canvas.style.height) / gridSize;

    if (head.x < 0 || head.x >= tilesX || head.y < 0 || head.y >= tilesY) {
        gameOver();
        return;
    }

    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }
}

function gameOver() {
    clearInterval(gameLoop);
    isPlaying = false;
    startBtn.textContent = 'START GAME';
    playSound('die');
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }

    finalScoreElement.textContent = score;
    modal.classList.add('show');
}

function startGame() {
    if (isPlaying) return;
    initGame();
    isPlaying = true;
    startBtn.textContent = 'PLAYING...';
    gameLoop = setInterval(drawGame, 120); // 调整了一点速度
}

// 键盘控制
window.addEventListener('keydown', e => {
    // 阻止方向键滚动页面
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code) > -1) {
        e.preventDefault();
    }
    
    if (!isPlaying) return;
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (dy !== 1) { dx = 0; dy = -1; }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (dy !== -1) { dx = 0; dy = 1; }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (dx !== 1) { dx = -1; dy = 0; }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (dx !== -1) { dx = 1; dy = 0; }
            break;
    }
});

document.getElementById('btn-up').addEventListener('click', () => { if (dy !== 1 && isPlaying) { dx = 0; dy = -1; } });
document.getElementById('btn-down').addEventListener('click', () => { if (dy !== -1 && isPlaying) { dx = 0; dy = 1; } });
document.getElementById('btn-left').addEventListener('click', () => { if (dx !== 1 && isPlaying) { dx = -1; dy = 0; } });
document.getElementById('btn-right').addEventListener('click', () => { if (dx !== -1 && isPlaying) { dx = 1; dy = 0; } });

startBtn.addEventListener('click', startGame);
modalRestartBtn.addEventListener('click', startGame);

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`全屏请求失败: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

function drawInitialScreen() {
    drawBackground();
    const w = parseInt(canvas.style.width);
    const h = parseInt(canvas.style.height);
    ctx.fillStyle = 'rgba(11, 232, 129, 0.8)';
    ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#0be881';
    ctx.fillText('CLICK START TO PLAY', w / 2, h / 2);
    ctx.shadowBlur = 0;
}