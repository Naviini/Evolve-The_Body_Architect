/**
 * Makes flat black / near-black background transparent (writes real PNG).
 * Current asset `fitbot.png` may actually be JPEG on disk — handled automatically.
 * Run from calorie-tracker: node scripts/fitbot-transparent-bg.js
 */
const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const input = path.join(__dirname, '..', 'assets', 'images', 'fitbot.png');
const tmp = path.join(__dirname, '..', 'assets', 'images', 'fitbot.tmp.png');

/** Very dark neutral pixels only — keeps colored shadows and UI */
const threshold = 22;

/** pngjs rejects trailing bytes after IEND */
function truncatePngAtIend(buf) {
    if (buf.length < 24 || buf[0] !== 137 || buf[1] !== 80 || buf[2] !== 78 || buf[3] !== 71) return buf;
    let off = 8;
    while (off + 12 <= buf.length) {
        const len = buf.readUInt32BE(off);
        const type = buf.toString('ascii', off + 4, off + 8);
        const chunkLen = 12 + len;
        if (off + chunkLen > buf.length) break;
        if (type === 'IEND') return Buffer.from(buf.subarray(0, off + chunkLen));
        off += chunkLen;
    }
    return buf;
}

/** @returns {Buffer} RGBA8888 length width*height*4 */
function decodeInput(buf) {
    if (buf[0] === 0xff && buf[1] === 0xd8) {
        const dec = jpeg.decode(buf, { useTArray: true });
        const { width, height, data } = dec;
        const expected = width * height * 4;
        let rgba;
        if (data.length === expected) {
            rgba = Buffer.from(data);
        } else if (data.length === width * height * 3) {
            rgba = Buffer.alloc(expected);
            for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
                rgba[j] = data[i];
                rgba[j + 1] = data[i + 1];
                rgba[j + 2] = data[i + 2];
                rgba[j + 3] = 255;
            }
        } else {
            throw new Error(`Unexpected JPEG decode size ${data.length} for ${width}x${height}`);
        }
        return { width, height, rgba };
    }

    const trimmed = truncatePngAtIend(buf);
    const pngIn = PNG.sync.read(trimmed);
    const rgba = Buffer.alloc(pngIn.width * pngIn.height * 4);
    pngIn.data.copy(rgba);
    return { width: pngIn.width, height: pngIn.height, rgba };
}

const rawIn = fs.readFileSync(input);
const { width, height, rgba } = decodeInput(rawIn);

for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    if (r <= threshold && g <= threshold && b <= threshold) {
        rgba[i + 3] = 0;
    }
}

const pngOut = new PNG({ width, height });
rgba.copy(pngOut.data);
const encoded = PNG.sync.write(pngOut);
fs.writeFileSync(tmp, encoded);
fs.renameSync(tmp, input);
console.log('Wrote transparent PNG:', input, `${width}x${height}`);
