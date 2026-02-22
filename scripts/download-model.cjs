const fs = require('fs');
const https = require('https');
const path = require('path');

const baseURL = 'https://huggingface.co/Xenova/whisper-tiny/resolve/main/';
const files = [
    'config.json',
    'generation_config.json',
    'special_tokens_map.json',
    'tokenizer_config.json',
    'tokenizer.json',
    'vocab.json',
    'preprocessor_config.json',
    'onnx/encoder_model_quantized.onnx',
    'onnx/decoder_model_merged_quantized.onnx'
];

const targetDir = path.join(__dirname, '../static/models/Xenova/whisper-tiny');

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode >= 400) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function main() {
    const onnxDir = path.join(targetDir, 'onnx');
    if (!fs.existsSync(onnxDir)) {
        fs.mkdirSync(onnxDir, { recursive: true });
    }

    for (const file of files) {
        const dest = path.join(targetDir, file);
        if (!fs.existsSync(dest)) {
            console.log(`Downloading ${file}...`);
            try {
                await downloadFile(baseURL + file, dest);
                console.log(`Downloaded ${file}`);
            } catch (err) {
                console.error(`Failed to download ${file}:`, err);
            }
        } else {
            console.log(`Skipping ${file}, already exists.`);
        }
    }
    console.log('All downloads finished!');
}

main().catch(console.error);
