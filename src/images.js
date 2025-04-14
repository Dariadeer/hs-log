const { createCanvas, Image } = require('canvas');
const fs = require('fs');
const path = require('path');

const stats = require('./reports').stats;

const rsIcon = new Image();
rsIcon.src = fs.readFileSync(path.resolve(__dirname, '../resources/images/red-star.png'));

// Cosmic background (dark space with subtle gradient)
const bgGradient = '#0a0e24'; //ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
// bgGradient.addColorStop(0, '#0a0e24');
// bgGradient.addColorStop(1, '#1a103d');

const tiers = ['S', 'A', 'B', 'C', 'D', 'E'];
const colors = ['#FF0000', '#FFA600', '#FFFF00', '#00FFE1', '#9000FF', '#FF00F7']

async function generateCosmicScoreboard(players, eventNumber, offset, limit, maxValue, stat) {
    // Canvas setup with wider format for better layout

    const canvasWidth = 900;
    const rowHeight = 70;
    const headerHeight = 120;
    const footerHeight = 40;
    const canvasHeight = headerHeight + (limit * rowHeight) + footerHeight;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Cosmic background (dark space with subtle gradient)
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Add starfield effect
    drawStarfield(ctx, canvasWidth, canvasHeight);

    // Futuristic header with glowing effect
    ctx.fillStyle = 'rgba(66,0,0,0.3)';
    ctx.fillRect(0, 0, canvasWidth, headerHeight);

    // Header text with neon effect
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 15;
    ctx.fillText(`RED STAR EVENT #${eventNumber} | TOP ${offset + 1}-${offset + limit}`, canvasWidth/2, headerHeight/2 + 15);

    // Reset shadow
    ctx.shadowColor = 'transparent';

    // Player rows with futuristic design
    const length = Math.min(offset + limit, players.length)
    for(let index = offset; index < length; index++) {
        let player = players[index];
        const y = headerHeight + ((index - offset) * rowHeight);
        const isTop3 = index < 3;

        // Row background with subtle gradient
        ctx.fillStyle = index % 2 === 0 ? '#9772' : '#7552';
        ctx.fillRect(0, y, canvasWidth, rowHeight);

        // Rank indicator (glowing for top 3)
        ctx.fillStyle = isTop3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][index] : '#ffffff';
        if (isTop3) {
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
        }
        ctx.font = isTop3 ? 'bold 24px "Arial", sans-serif' : 'bold 20px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${index + 1}`, 40, y + 45);
        ctx.shadowColor = 'transparent';

        // Player name with futuristic font
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.font = '22px "Arial", sans-serif';
        ctx.fillText(player.name, 80, y + 40);

        // Score (right-aligned)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px "Arial", sans-serif';
        let value = player[stats[stat].name];
        switch(stats[stat].type) {
            case 0:
                let playerScore = (((10 * value) | 0) / 10).toLocaleString();
                if(stat === 3) playerScore += ' min⁻¹'
                let w = ctx.measureText(playerScore).width;
                ctx.fillText(playerScore, canvasWidth - 20, y + 40);
                ctx.drawImage(rsIcon, canvasWidth - 30 - w - 22, y + 21.5, 22, 22);
                break;
            case 2:
                let num = value.toLocaleString();
                ctx.fillText('x' + num, canvasWidth - 30, y + 40);
                break;
            case 1:
                value = value | 0;
                let seconds = value % 60;
                let minutes = (value - seconds) / 60 % 60;
                let hours = (value - minutes * 60 - seconds) / 3600;
                ctx.fillText((hours ? (hours + 'h ') : '') + (minutes ? (minutes + 'm ') : '') + (seconds ? (seconds + 's') : ''), canvasWidth - 30, y + 40);
                break;
        }

        // 🕒
        // const playerTime = new Date((player.total_time_spent - 3600) * 1000);
        // const timeString = playerTime.getHours() + 'h ' + playerTime.getMinutes() + 'm ' + playerTime.getSeconds() + 's';
        // ctx.fillText(timeString, canvasWidth - 200, y + 40);

        // Score bar (dynamic width based on score)
        const scoreWidth = (player[stats[stat].name] / maxValue) * (canvasWidth - 110);

        ctx.strokeStyle = '#0000';
        ctx.fillStyle = 'rgba(91, 105, 242, 0.3)';
        ctx.beginPath();
        ctx.roundRect(80, y + 50, canvasWidth - 110, 8, 5);
        ctx.fill();
        ctx.stroke();

        // const barGradient = ctx.createLinearGradient(0, 0, scoreWidth, 0);
        // barGradient.addColorStop(0, '#f25b5b');
        // barGradient.addColorStop(1, '#f25959');
        ctx.fillStyle = stats[stat].color;
        ctx.beginPath();
        ctx.roundRect(80, y + 50, scoreWidth, 8, 5);
        ctx.fill();
        ctx.stroke();
    }

    // Futuristic footer
    ctx.fillStyle = 'rgba(32, 34, 37, 0.9)';
    ctx.fillRect(0, canvasHeight - 40, canvasWidth, 40);
    ctx.fillStyle = '#ff5a01';
    ctx.font = '14px "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GENERATED BY QUILLIANCE ASSISTANT', canvasWidth/2, canvasHeight - 15);

    return canvas.toBuffer();
}

// Helper function to create starfield background
function drawStarfield(ctx, width, height) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 1.5;
        const opacity = Math.random();

        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function getTier(score, maxValue) {
    return score
}

module.exports = {
    generateScoreboardImage: generateCosmicScoreboard
};