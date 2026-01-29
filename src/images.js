const { createCanvas, Image } = require('canvas');
const fs = require('fs');
const path = require('path');
const utils = require('./utils')

const stats = require('./reports').stats;

const goal = 1500000

const rsIcon = new Image();
rsIcon.src = fs.readFileSync(path.resolve(__dirname, '../resources/images/red-star.png'));

// Cosmic background (dark space with subtle gradient)
const bgGradient = '#0a0e24';

function getGoalValue() {
    return goal;
}

function generateScoreHeaderImage(score, eventNumber) {
    const { createCanvas } = require('canvas');
    const canvasWidth = 900;
    const canvasHeight = 220;

    const endTime = utils.getEventTimeframe(eventNumber)[1];

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // === Background ===
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#0a0e24');
    gradient.addColorStop(1, '#1a0f2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    drawStarfield(ctx, canvasWidth, canvasHeight);

    // === Title Text ===
    ctx.shadowColor = '#ff2020';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px "Arial", sans-serif';
    ctx.fillText(`RED STAR EVENT #${eventNumber}`, canvasWidth / 2, 65);
    ctx.shadowBlur = 0;

    // === Progress Bar ===
    const barX = 100;
    const barY = 110;
    const barWidth = canvasWidth - barX * 2;
    const barHeight = 10;
    const progress = Math.min(score / getGoalValue(), 1);

    // Bar background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 10);
    ctx.fill();

    // Bar fill color (dynamic)
    const progGrad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    if (progress < 0.5) {
        progGrad.addColorStop(0, '#ff3333');
        progGrad.addColorStop(1, '#ff7700');
    } else if (progress < 0.85) {
        progGrad.addColorStop(0, '#ff7700');
        progGrad.addColorStop(1, '#ffd200');
    } else {
        progGrad.addColorStop(0, '#00ff99');
        progGrad.addColorStop(1, '#00ffaa');
    }

    ctx.fillStyle = progGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, 10);
    ctx.fill();

    // Score text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${parseInt(score).toLocaleString()} / ${getGoalValue().toLocaleString()} (${(progress * 100).toFixed(1)}%)`, canvasWidth / 2, barY + barHeight + 25);

    // === Time Remaining ===
    const now = new Date();
    const remaining = Math.max(0, endTime - now);
    const hrs = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);

    let timeText = `ENDS IN ${hrs}H ${mins}M`;
    let timeColor = '#ffffff';
    if (remaining < 6 * 3600000) timeColor = '#ff4444';
    else if (remaining < 24 * 3600000) timeColor = '#ff9900';

    ctx.fillStyle = timeColor;
    ctx.font = 'bold 22px "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(timeText, canvasWidth / 2, canvasHeight - 20);

    return canvas.toBuffer('image/png');
}

function generateCosmicScoreboard(players, eventNumber, offset, limit, maxValue, stat) {
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
                ctx.drawImage(rsIcon, canvasWidth - 25 - w - 22, y + 21.5, 22, 22);
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

    return canvas.toBuffer('image/png');
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
    generateScoreboardImage: generateCosmicScoreboard,
    generateScoreHeaderImage
};