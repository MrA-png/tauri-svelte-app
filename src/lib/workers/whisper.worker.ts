/**
 * Whisper Web Worker
 * Menjalankan model Whisper (whisper-tiny / whisper-tiny.en) via @xenova/transformers
 * secara in-browser menggunakan WebAssembly.
 *
 * Komunikasi dengan main thread:
 *   -> { type: 'transcribe', audio: Float32Array, language: string }
 *   <- { type: 'result', text: string }
 *   <- { type: 'ready' }
 *   <- { type: 'error', message: string }
 *   <- { type: 'loading', progress: number }
 */

import { pipeline, env } from '@xenova/transformers';

// Paksa penggunaan WASM (tidak pakai native di worker context)
env.backends.onnx.wasm.proxy = false;

// Instruksikan transformers untuk MEMBACA model dari file lokal (offline) saja
env.allowRemoteModels = false;
env.localModelPath = '/models/';

// Pastikan WASM files juga diambil dari server lokal untuk 100% offline
env.backends.onnx.wasm.wasmPaths = '/wasm/';

// Gunakan model multilingual yang support Bahasa Indonesia
const MODEL_NAME = 'Xenova/whisper-tiny';

let transcriber: any = null;
let isLoading = false;

async function loadModel() {
    if (transcriber) return transcriber;
    if (isLoading) return null;

    isLoading = true;
    self.postMessage({ type: 'loading', progress: 0 });

    try {
        transcriber = await pipeline('automatic-speech-recognition', MODEL_NAME, {
            quantized: true, // Gunakan model 8-bit quantized (~40MB, bukan 150MB)
            progress_callback: (progress: any) => {
                if (progress.status === 'progress') {
                    const pct = Math.round((progress.loaded / progress.total) * 100);
                    self.postMessage({ type: 'loading', progress: pct });
                } else if (progress.status === 'done') {
                    self.postMessage({ type: 'loading', progress: 100 });
                }
            },
        });

        self.postMessage({ type: 'ready' });
        return transcriber;
    } catch (e: any) {
        self.postMessage({ type: 'error', message: `Failed to load model: ${e.message}` });
        isLoading = false;
        transcriber = null;
        return null;
    }
}

// Load model segera saat worker dibuat
loadModel();

self.addEventListener('message', async (event: MessageEvent) => {
    const { type, audio, language, sampleRate } = event.data;

    if (type !== 'transcribe') return;
    if (!audio || audio.length === 0) return;

    const model = transcriber ?? await loadModel();
    if (!model) {
        self.postMessage({ type: 'error', message: 'Model not loaded yet' });
        return;
    }

    try {
        // Whisper expects Float32Array at 16kHz
        // Audio yang masuk mungkin dari sampleRate lain, perlu resample
        let audioData: Float32Array = audio;

        const durationSec = (audio.length / (sampleRate || 16000)).toFixed(2);
        console.log(`[Worker] Received audio: ${audio.length} samples, sampleRate=${sampleRate}Hz, duration~${durationSec}s`);

        if (sampleRate && sampleRate !== 16000) {
            console.log(`[Worker] Resampling from ${sampleRate}Hz to 16000Hz...`);
            audioData = resampleTo16k(audio, sampleRate);
            console.log(`[Worker] After resample: ${audioData.length} samples`);
        } else {
            console.log('[Worker] Sample rate is 16000Hz, no resampling needed.');
        }

        const result = await model(audioData, {
            language: language?.startsWith('id') ? 'indonesian' : 'english',
            task: 'transcribe',
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: false,
        });

        const text: string = (result.text || '').trim();
        console.log(`[Worker] Raw transcription result: "${text}"`);

        if (text) {
            self.postMessage({ type: 'result', text });
        } else {
            console.warn('[Worker] Transcription returned empty text. The audio may be silent or too short.');
        }
    } catch (e: any) {
        console.error('[Worker] Transcription exception:', e.message);
        self.postMessage({ type: 'error', message: `Transcription error: ${e.message}` });
    }
});

/**
 * Simple linear resampler: downsample dari sampleRate ke 16000 Hz
 * Hanya dipakai jika AudioContext sampleRate != 16000
 */
function resampleTo16k(audioData: Float32Array, fromRate: number): Float32Array {
    const targetRate = 16000;
    if (fromRate === targetRate) return audioData;

    const ratio = fromRate / targetRate;
    const outputLength = Math.floor(audioData.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
        const srcIdx = i * ratio;
        const srcIdxFloor = Math.floor(srcIdx);
        const srcIdxCeil = Math.min(srcIdxFloor + 1, audioData.length - 1);
        const t = srcIdx - srcIdxFloor;
        output[i] = audioData[srcIdxFloor] * (1 - t) + audioData[srcIdxCeil] * t;
    }

    return output;
}
