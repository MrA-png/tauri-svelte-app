<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { getCurrentWindow, getAllWindows } from "@tauri-apps/api/window";
    import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
    import { LogicalSize } from "@tauri-apps/api/dpi";
    import { emit, listen } from "@tauri-apps/api/event";
    import Navbar from "$lib/components/Navbar.svelte";
    import AudioSettings from "$lib/components/AudioSettings.svelte";
    import TranscriptDisplay from "$lib/components/TranscriptDisplay.svelte";
    import { initLogger } from "$lib/logger";

    // ── State ─────────────────────────────────────────────────────────────
    let isTransparent = $state(false);
    let isRecording = $state(false);
    let language = $state("id-ID");
    let transcriptText = $state("");
    let interimText = $state("");

    // Audio Visualizer / Device State
    let availableDevices: MediaDeviceInfo[] = $state([]);
    let selectedDeviceId: string = $state("default");

    let showSettings = $state(false);
    let showTranscript = $state(false);
    let showNoSpeechWarning = $state(false);
    let noSpeechTimeout: ReturnType<typeof setTimeout> | undefined;

    // Whisper / MediaRecorder state
    let whisperWorker: Worker | null = null;
    let mediaRecorder: MediaRecorder | null = null;
    let recordingStream: MediaStream | null = null;
    let audioChunks: Blob[] = [];
    let chunkInterval: number | undefined;

    // ── Whisper Worker ────────────────────────────────────────────────────
    function initWhisperWorker() {
        if (whisperWorker) return;

        whisperWorker = new Worker(
            new URL("$lib/workers/whisper.worker.ts", import.meta.url),
            { type: "module" },
        );

        whisperWorker.onmessage = (e: MessageEvent) => {
            const { type, text, progress, message } = e.data;

            if (type === "ready") {
                console.log("[Whisper] Model ready!");
            } else if (type === "result") {
                if (text) {
                    console.log("[Transcript] Success. Text:", text);
                    clearTimeout(noSpeechTimeout);
                    showNoSpeechWarning = false;

                    // Tambahkan ke transcript (final)
                    transcriptText += text + " ";
                    interimText = "";
                    emitTranscriptUpdate();

                    // Reset no-speech timer
                    startNoSpeechTimer();
                }
            } else if (type === "error") {
                console.error("[Whisper Worker Error]", message);
            }
        };
    }

    // ── Recording ─────────────────────────────────────────────────────────

    async function startRecording() {
        stopRecording();

        try {
            const selectedDevice = availableDevices.find(
                (d) => d.deviceId === selectedDeviceId,
            );
            const isBlackHole = selectedDevice?.label
                ?.toLowerCase()
                .includes("blackhole");

            // Ambil stream langsung dari device yang dipilih (BlackHole atau Mic)
            const constraints: MediaStreamConstraints = {
                audio: {
                    deviceId:
                        selectedDeviceId !== "default"
                            ? { exact: selectedDeviceId }
                            : undefined,
                    echoCancellation: !isBlackHole,
                    noiseSuppression: !isBlackHole,
                    autoGainControl: !isBlackHole,
                    sampleRate: 16000, // Whisper natively expects 16kHz
                },
            };

            recordingStream =
                await navigator.mediaDevices.getUserMedia(constraints);

            console.log(
                "[Audio] Recording started using device:",
                selectedDevice?.label || "default",
            );
            console.log(
                "[Audio] Stream tracks:",
                recordingStream.getAudioTracks().length,
            );

            // Tentukan format yang didukung
            const mimeType = getSupportedMimeType();

            console.log("[Audio] MediaRecorder using mimeType:", mimeType);

            mediaRecorder = new MediaRecorder(recordingStream, {
                mimeType,
                audioBitsPerSecond: 128000,
            });

            audioChunks = [];

            mediaRecorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) {
                    console.log(`[Audio] Chunk received: ${e.data.size} bytes`);
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (audioChunks.length === 0) {
                    console.warn(
                        "[Audio] MediaRecorder stopped but no audio chunks recorded.",
                    );
                    return;
                }

                const blob = new Blob(audioChunks, { type: mimeType });
                audioChunks = [];

                console.log(
                    `[Audio] Processing recorded blob, size: ${blob.size} bytes`,
                );

                // Decode blob ke Float32Array via AudioContext lalu kirim ke worker
                await transcribeBlob(blob);
            };

            // Rekam dalam chunks (setiap 4 detik kirim ke Whisper)
            mediaRecorder.start();

            chunkInterval = setInterval(() => {
                if (
                    mediaRecorder &&
                    mediaRecorder.state === "recording" &&
                    isRecording
                ) {
                    mediaRecorder.stop();
                    // Restart langsung untuk rekam chunk berikutnya
                    setTimeout(() => {
                        if (isRecording && recordingStream) {
                            audioChunks = [];
                            mediaRecorder?.start();
                        }
                    }, 100);
                }
            }, 4000) as unknown as number;
        } catch (e: any) {
            console.error(
                "[Audio Error] Failed to connect to audio device or start recording:",
                e.message || e,
            );
            if (
                e.name === "NotAllowedError" ||
                e.name === "PermissionDeniedError"
            ) {
                console.warn(
                    "[Audio Error] Microphone permission was denied by the OS or Browser.",
                );
            } else if (
                e.name === "NotFoundError" ||
                e.name === "DevicesNotFoundError"
            ) {
                console.warn(
                    "[Audio Error] No recording device was found on the system.",
                );
            } else if (
                e.name === "NotReadableError" ||
                e.name === "TrackStartError"
            ) {
                console.warn(
                    "[Audio Error] Audio device is already in use by another application.",
                );
            }
        }
    }

    function stopRecording() {
        clearInterval(chunkInterval);

        try {
            if (mediaRecorder && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }
        } catch (_) {}

        try {
            recordingStream?.getTracks().forEach((t) => t.stop());
        } catch (_) {}

        recordingStream = null;
        mediaRecorder = null;
        audioChunks = [];
    }

    async function transcribeBlob(blob: Blob) {
        if (!whisperWorker) return;

        try {
            console.log("[Audio] Transcribing blob...");
            // Decode audio blob menggunakan AudioContext
            const arrayBuffer = await blob.arrayBuffer();
            const audioCtx = new AudioContext(); // macOS ignores constructor sampleRate, use native rate
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            // Ambil channel pertama (mono) sebagai Float32Array
            const float32 = audioBuffer.getChannelData(0);
            const sampleRate = audioBuffer.sampleRate;

            console.log(
                `[Audio] Native sample rate from AudioContext: ${sampleRate}Hz`,
            );
            console.log(
                `[Audio] Audio length: ${float32.length} samples (~${(float32.length / sampleRate).toFixed(2)}s)`,
            );
            if (sampleRate !== 16000) {
                console.warn(
                    `[Audio] ⚠️ sampleRate is ${sampleRate}Hz (not 16kHz). Worker will resample.`,
                );
            }

            audioCtx.close();

            // Kirim ke worker untuk ditranskripsi
            console.log("[Transcript] Sending audio data to Whisper worker");
            whisperWorker.postMessage(
                { type: "transcribe", audio: float32, language, sampleRate },
                [float32.buffer],
            );
        } catch (e) {
            console.error("[Transcribe Error] transcribeBlob error:", e);
        }
    }

    function getSupportedMimeType(): string {
        const candidates = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/ogg;codecs=opus",
            "audio/ogg",
            "audio/mp4",
        ];
        for (const mime of candidates) {
            if (MediaRecorder.isTypeSupported(mime)) return mime;
        }
        return "";
    }

    // ── Window / Tauri helpers ────────────────────────────────────────────

    function getTauriWindow() {
        try {
            return getCurrentWindow();
        } catch (e) {
            console.warn("Tauri window access failed", e);
            return null;
        }
    }

    async function adjustWindowSize() {
        const win = getTauriWindow();
        if (!win) return;
        try {
            if (showSettings) {
                await win.setSize(new LogicalSize(500, 500));
            } else {
                await win.setSize(new LogicalSize(500, 130));
            }
        } catch (e) {
            console.error("Failed to resize window", e);
        }
    }

    async function toggleSettings() {
        showSettings = !showSettings;
        adjustWindowSize();
    }

    function startNoSpeechTimer() {
        clearTimeout(noSpeechTimeout);
        noSpeechTimeout = setTimeout(() => {
            if (isRecording && !transcriptText && !interimText) {
                showNoSpeechWarning = true;
                emitTranscriptUpdate();
            }
        }, 10000);
    }

    function emitTranscriptUpdate() {
        try {
            const selectedDevice = availableDevices.find(
                (d) => d.deviceId === selectedDeviceId,
            );
            const isBlackHole = selectedDevice?.label
                ?.toLowerCase()
                .includes("blackhole");
            const boostGain = isBlackHole ? 4.0 : 1.0;

            emit("transcript-update", {
                transcriptText,
                interimText,
                isRecording,
                showNoSpeechWarning,
                selectedDeviceId,
                boostGain,
            }).catch((e) => console.error("Emit failed", e));
        } catch (e) {
            console.warn("Tauri emit failed", e);
        }
    }

    async function toggleRecordingState() {
        if (isRecording) {
            console.log("[Recording] User stopped recording.");
            stopRecording();
            isRecording = false;
            clearTimeout(noSpeechTimeout);
            showNoSpeechWarning = false;
        } else {
            console.log("[Recording] User started recording.");
            // Pastikan transcript window tampil
            if (!showTranscript) {
                try {
                    const transcriptWin =
                        await WebviewWindow.getByLabel("transcript");
                    if (transcriptWin) {
                        await transcriptWin.show();
                        showTranscript = true;
                        console.log(
                            "[UI] Transcript window shown automatically.",
                        );
                    }
                } catch (e) {
                    console.error("Failed to show transcript window", e);
                }
            }

            isRecording = true;
            showNoSpeechWarning = false;
            await startRecording();
            startNoSpeechTimer();
        }
        await adjustWindowSize();
        emitTranscriptUpdate();
    }

    async function handleNavbarToggle() {
        try {
            const windows = await getAllWindows();
            const transcriptWin = windows.find((w) => w.label === "transcript");

            if (!transcriptWin) {
                showTranscript = false;
                return;
            }

            if (showTranscript) {
                await transcriptWin.hide();
                showTranscript = false;
            } else {
                await transcriptWin.show();
                showTranscript = true;
            }
        } catch (e) {
            console.error("Failed to toggle transcript window", e);
        }
        await adjustWindowSize();
    }

    function changeLanguage(newLang: string) {
        console.log(`[UI] Transcription language set to: ${newLang}`);
        language = newLang;
    }

    function toggleTransparency() {
        isTransparent = !isTransparent;
    }

    async function clearText() {
        transcriptText = "";
        interimText = "";
        emitTranscriptUpdate();
        await adjustWindowSize();
    }

    async function loadAudioDevices() {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            availableDevices = devices.filter((d) => d.kind === "audioinput");
            console.log(
                `[Audio] ${availableDevices.length} audio input device(s) found:`,
                availableDevices.map((d) => d.label || d.deviceId),
            );
        } catch (e: any) {
            console.error(
                "[Audio Error] Error loading audio devices. Cannot probe microphone list:",
                e.message || e,
            );
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────

    onMount(async () => {
        // Inisialisasi logger terlebih dahulu agar semua log masuk ke system.log
        initLogger();

        // Inisialisasi Whisper worker segera (agar model mulai download)
        initWhisperWorker();

        await loadAudioDevices();

        try {
            await listen("toggle-recording", () => toggleRecordingState());
            await listen("transcript-hidden", () => {
                showTranscript = false;
            });
        } catch (e) {
            console.warn("Tauri event listeners setup failed:", e);
        }
    });

    onDestroy(() => {
        stopRecording();
        clearTimeout(noSpeechTimeout);
        whisperWorker?.terminate();
    });
</script>

<!-- Main Application Layer (Navbar Only) -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="main-container" class:transparent-mode={isTransparent}>
    <!-- Navbar Panel -->
    <div class="floating-panel navbar-panel">
        <Navbar
            {isRecording}
            {isTransparent}
            {language}
            {showSettings}
            {showTranscript}
            onToggleTranscript={handleNavbarToggle}
            onToggleTransparency={toggleTransparency}
            onClearText={clearText}
            onToggleSettings={toggleSettings}
            onChangeLanguage={changeLanguage}
        />
        {#if showSettings}
            <div class="settings-dropdown">
                <AudioSettings {availableDevices} bind:selectedDeviceId />
            </div>
        {/if}
    </div>
</div>

<style>
    .main-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background-color: transparent !important;
        padding: 5px;
        box-sizing: border-box;
        overflow: hidden;
    }

    .floating-panel {
        background-color: #121212;
        border-radius: 12px;
        overflow: visible;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition:
            background-color 0.3s ease,
            border-color 0.3s ease;
        position: relative;
    }

    .navbar-panel {
        flex-shrink: 0;
    }

    .transparent-mode .floating-panel {
        background-color: rgba(20, 20, 20, 0.65);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .settings-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 8px;
        background-color: #1a1a1a;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 8px;
        z-index: 100;
    }
</style>
