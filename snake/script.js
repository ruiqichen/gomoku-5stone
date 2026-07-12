const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

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

// 调整 Canvas 适应屏幕
function resizeCanvas() {
    const containerWidth = document.querySelector('.app-container').clientWidth - 40;
    const size = Math.min(600, containerWidth);
    // 保持 gridSize 比例
    canvas.width = Math.floor(size / gridSize) * gridSize;
    canvas.height = canvas.width;
    if (!isPlaying && snake.length > 0) {
        drawGame();
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
    spawnFood();
}

function spawnFood() {
    const tilesX = canvas.width / gridSize;
    const tilesY = canvas.height / gridSize;
    
    foodX = Math.floor(Math.random() * tilesX);
    foodY = Math.floor(Math.random() * tilesY);
    
    // 确保食物不生成在蛇身上
    for (let part of snake) {
        if (part.x === foodX && part.y === foodY) {
            spawnFood();
            return;
        }
    }
}

function drawGame() {
    // 清除画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isPlaying) return;

    // 移动蛇
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    // 吃食物
    if (head.x === foodX && head.y === foodY) {
        score += 10;
        scoreElement.textContent = score;
        spawnFood();
    } else {
        snake.pop();
    }

    // 画食物
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(foodX * gridSize, foodY * gridSize, gridSize - 2, gridSize - 2);

    // 画蛇
    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? '#2ed573' : '#7bed9f';
        ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 2, gridSize - 2);
    });

    checkGameOver();
}

function checkGameOver() {
    const head = snake[0];
    const tilesX = canvas.width / gridSize;
    const tilesY = canvas.height / gridSize;

    // 撞墙
    if (head.x < 0 || head.x >= tilesX || head.y < 0 || head.y >= tilesY) {
        gameOver();
    }

    // 撞自己
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
        }
    }
}

function gameOver() {
    clearInterval(gameLoop);
    isPlaying = false;
    startBtn.textContent = '重新开始';
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束!', canvas.width / 2, canvas.height / 2);
    ctx.font = '20px Arial';
    ctx.fillText(`得分: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
}

function startGame() {
    if (isPlaying) return;
    initGame();
    isPlaying = true;
    startBtn.textContent = '游戏中...';
    gameLoop = setInterval(drawGame, 150); // 速度
}

// 键盘控制
window.addEventListener('keydown', e => {
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

// 屏幕按键控制
document.getElementById('btn-up').addEventListener('click', () => { if (dy !== 1 && isPlaying) { dx = 0; dy = -1; } });
document.getElementById('btn-down').addEventListener('click', () => { if (dy !== -1 && isPlaying) { dx = 0; dy = 1; } });
document.getElementById('btn-left').addEventListener('click', () => { if (dx !== 1 && isPlaying) { dx = -1; dy = 0; } });
document.getElementById('btn-right').addEventListener('click', () => { if (dx !== -1 && isPlaying) { dx = 1; dy = 0; } });

startBtn.addEventListener('click', startGame);

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`全屏请求失败: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// 初始画面
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = 'white';
ctx.font = '20px Arial';
ctx.textAlign = 'center';
ctx.fillText('点击开始游戏', canvas.width / 2, canvas.height / 2);