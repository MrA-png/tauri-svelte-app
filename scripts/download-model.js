import fs from 'fs';
import path from 'path';
import https from 'https';

const MODEL_NAME = 'Xenova/whisper-tiny';
const BASE_URL = `https://huggingface.co/${MODEL_NAME}/resolve/main/`;
const LOCAL_DIR = path.join(process.cwd(), 'static', 'models', MODEL_NAME);

const FILES = [
    'config.json',
    'generation_config.json',
    'preprocessor_config.json',
    'special_tokens_map.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'vocab.json',
    'onnx/decoder_model_merged_quantized.onnx',
    'onnx/encoder_model_quantized.onnx'
];

async function downloadFile(filename) {
    const localPath = path.join(LOCAL_DIR, filename);
    const dir = path.dirname(localPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        if (stats.size > 1000) { // bypass simple stub files
            console.log(`[SKIP] ${filename} already exists.`);
            return;
        }
    }

    const url = BASE_URL + filename;
    console.log(`[DOWNLOADING] ${filename} ...`);

    return new Promise((resolve, reject) => {
        const fetchFile = (fetchUrl) => {
            https.get(fetchUrl, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    // Follow redirect
                    let redirectUrl = res.headers.location;
                    if (!redirectUrl.startsWith('http')) {
                        redirectUrl = 'https://huggingface.co' + redirectUrl;
                    }
                    console.log(`  -> Redirecting to: ${redirectUrl.substring(0, 50)}...`);
                    return fetchFile(redirectUrl);
                }
                if (res.statusCode !== 200) {
                    return reject(new Error(`Failed to download: ${res.statusCode}`));
                }

                const fileStream = fs.createWriteStream(localPath);

                let downloaded = 0;
                res.on('data', chunk => {
                    downloaded += chunk.length;
                    // Optionally log progress here
                });

                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`[DONE] ${filename} (${(downloaded / 1024 / 1024).toFixed(2)} MB)`);
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(localPath, () => reject(err));
            });
        };
        fetchFile(url);
    });
}

async function main() {
    console.log('Memulai proses unduhan file model secara manual...');
    for (const file of FILES) {
        try {
            await downloadFile(file);
        } catch (e) {
            console.error(`Error pada ${file}:`, e.message);
            process.exit(1);
        }
    }

    console.log('\n[WASM] Menyalin file ONNX runtime WebAssembly (agar 100% Offline)...');
    const wasmDir = path.join(process.cwd(), 'node_modules', '@xenova', 'transformers', 'dist');
    const localWasmDir = path.join(process.cwd(), 'static', 'wasm');
    if (!fs.existsSync(localWasmDir)) {
        fs.mkdirSync(localWasmDir, { recursive: true });
    }

    if (fs.existsSync(wasmDir)) {
        const wasmFiles = fs.readdirSync(wasmDir).filter(f => f.endsWith('.wasm'));
        for (const wf of wasmFiles) {
            fs.copyFileSync(path.join(wasmDir, wf), path.join(localWasmDir, wf));
            console.log(`  -> Tersalin: ${wf}`);
        }
    }

    console.log('\n✅ Semua file model dan WASM berhasil diunduh/disalin ke proyek Anda!');
    console.log('Aplikasi Anda kini siap berjalan 100% Offline.');
}

main();
