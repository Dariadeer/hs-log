const { commandsRaw } = require('./bot-slash');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const width = 800, height = 800;

function generateImage() {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = '#0000';

    ctx.fillStyle = 'rgb(50, 50, 80)';
    ctx.font = 'bold 38px "IBM Plex Sans"';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgb(107, 107, 216)';
    ctx.textAlign = 'center';
    ctx.fillText('Quilliance Assistant\'s Commands', width / 2, 50);

    let x = 0, y = 50;
    for(let command of commandsRaw) {
        const name = command.aliases[0];

        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgb(52, 207, 148)';
        ctx.font = 'bold 30px "IBM Plex Sans"';
        ctx.fillText('/' + name, x + 10, y + 40);

        let paramOffset = 105;
        let paramId = 1;
        const paramNameOffset = 200;
        const descriptionOffset = 350;

        ctx.font = 'bold 25px "IBM Plex Sans"';
        ctx.fillStyle = 'rgb(178, 103, 212)';
        ctx.fillText('description', x + 25, y + 80);
        ctx.font = '20px "IBM Plex Sans"';
        ctx.fillStyle = '#ddf';
        const descriptionRows = breakIntoLines(command.description, 600, ctx);
        let rowId = 0;
        for(let row of descriptionRows) {
            ctx.fillText(row, x + paramNameOffset, y + 80 + rowId * 25);
            rowId++;
            paramOffset += 25;
        }

        if(!command.options) {
            y += paramOffset;
            continue;
        }
       
        for(let param of command.options) {

            ctx.font = 'bold 25px "IBM Plex Sans"';

            ctx.fillText('param ' + paramId, x + 25, y + paramOffset);

            ctx.fillStyle = 'rgb(48, 32, 70)'
            ctx.beginPath();
            ctx.roundRect(x + paramNameOffset - 5, y + paramOffset - 26, ctx.measureText(param.name).width + 10, 34, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ddf';
            ctx.fillText(param.name, x + paramNameOffset, y + paramOffset);

            ctx.font = '20px "IBM Plex Sans"';
            ctx.fillText(param.description, x + descriptionOffset, y + paramOffset);

            paramOffset += 50;
            paramId++;
        }

        y += paramOffset;


    }

    fs.writeFileSync(path.resolve(__dirname, '../resources/images/help.png'), canvas.toBuffer('image/png'));

    console.log('Generated /help message successfully');
}

function breakIntoLines(str, lineWidth, ctx) {
    const words = str.split(' ').map(w => ' ' + w);
    words[0] = words[0].trim();

    const rows = [''];
    let rowId = 0;

    for(let word of words) {
        const rowSize = ctx.measureText(rows[rowId] + word);
        if(rowSize.width > lineWidth) {
            rowId++;
            rows[rowId] = word;
        } else {
            rows[rowId] += word;
        }
    }

    return rows;

}

generateImage();

module.exports = generateImage;