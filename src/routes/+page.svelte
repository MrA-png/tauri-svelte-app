<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { getCurrentWindow, getAllWindows } from "@tauri-apps/api/window";
    import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
    import { LogicalSize } from "@tauri-apps/api/dpi";
    import { emit, listen } from "@tauri-apps/api/event";
    import Navbar from "$lib/components/Navbar.svelte";
    import AudioSettings from "$lib/components/AudioSettings.svelte";

    import TranscriptDisplay from "$lib/components/TranscriptDisplay.svelte";

    // State
    let isTransparent = $state(false);
    let isRecording = $state(false);
    let language = $state("id-ID"); // 'id-ID' or 'en-US'
    let transcriptText = $state("");
    let interimText = $state("");
    let recognition: any; // Type for SpeechRecognition

    // Audio Visualizer State
    let availableDevices: MediaDeviceInfo[] = $state([]);
    let selectedDeviceId: string = $state("default");

    let showSettings = $state(false);
    let showTranscript = $state(false);
    let noSpeechTimeout: number | undefined;
    let showNoSpeechWarning = $state(false);

    // Initialize Recognition
    function setupRecognition() {
        if (
            "webkitSpeechRecognition" in window ||
            "SpeechRecognition" in window
        ) {
            const SpeechRecognition =
                window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language;

            recognition.onresult = (event: any) => {
                clearTimeout(noSpeechTimeout); // Clear warning timer
                showNoSpeechWarning = false;

                let final = "";
                let interim = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript + " ";
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                transcriptText += final;
                interimText = interim;

                // Sync with transcript window
                emitTranscriptUpdate();
            };

            recognition.onerror = (event: any) => {
                clearTimeout(noSpeechTimeout);
                showNoSpeechWarning = false;
                console.error("Speech recognition error", event.error);
                if (event.error === "not-allowed") {
                    alert(
                        "Microphone access denied. Please check your settings.",
                    );
                    isRecording = false;
                    emitTranscriptUpdate();
                    adjustWindowSize(); // Ensure size is correct if stopped
                }
            };

            recognition.onend = () => {
                clearTimeout(noSpeechTimeout);
                if (isRecording) {
                    // Restart if stopped unexpectedly but state is still recording
                    // slightly delay to prevent crash loops
                    setTimeout(() => {
                        if (isRecording) {
                            recognition.start();
                            startNoSpeechTimer();
                        }
                    }, 500);
                } else {
                    adjustWindowSize();
                }
            };
        } else {
            alert("Web Speech API is not supported in this environment.");
        }
    }

    onMount(async () => {
        setupRecognition();
        await loadAudioDevices();
        // Listen for recording toggle from transcript window
        await listen("toggle-recording", toggleRecordingState);
        // Listen for transcript window hide event
        await listen("transcript-hidden", () => {
            showTranscript = false;
        });
    });

    onDestroy(() => {
        if (recognition) recognition.stop();
    });

    async function loadAudioDevices() {
        try {
            // Request permission first to get labels
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            availableDevices = devices.filter((d) => d.kind === "audioinput");
        } catch (e) {
            console.error("Error loading devices", e);
        }
    }

    // Safe wrapper for Tauri window access
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
        }, 8000); // 8 seconds without speech
    }

    function emitTranscriptUpdate() {
        try {
            emit("transcript-update", {
                transcriptText,
                interimText,
                isRecording,
                showNoSpeechWarning,
            }).catch((e) => console.error("Emit failed", e));
        } catch (e) {
            console.warn("Tauri emit failed", e);
        }
    }

    async function toggleRecordingState() {
        if (isRecording) {
            // Stop logic
            try {
                recognition.stop();
            } catch (e) {
                console.warn("Error stopping recognition:", e);
            }
            isRecording = false;
            clearTimeout(noSpeechTimeout);
            showNoSpeechWarning = false;
        } else {
            // Start logic
            // Ensure window is shown
            if (!showTranscript) {
                try {
                    const transcriptWin =
                        await WebviewWindow.getByLabel("transcript");
                    if (transcriptWin) {
                        await transcriptWin.show();
                        showTranscript = true;
                    }
                } catch (e) {
                    console.error("Failed to show transcript window", e);
                }
            }

            recognition.lang = language;
            try {
                recognition.start();
                isRecording = true;
                showNoSpeechWarning = false;
                startNoSpeechTimer();
            } catch (e: any) {
                console.error("Failed to start recognition:", e);
                // If it's already started (InvalidStateError), we can assume it's recording
                if (
                    e.name === "InvalidStateError" ||
                    e.message?.includes("already started")
                ) {
                    isRecording = true;
                    showNoSpeechWarning = false;
                    startNoSpeechTimer();
                    console.log(
                        "Recognition was already active, synced state.",
                    );
                } else {
                    isRecording = false;
                }
            }
        }
        await adjustWindowSize();
        emitTranscriptUpdate();
    }

    async function handleNavbarToggle() {
        if (showTranscript) {
            // Hide transcript window
            try {
                const transcriptWin =
                    await WebviewWindow.getByLabel("transcript");
                if (transcriptWin) {
                    await transcriptWin.hide();
                }
                showTranscript = false;
            } catch (e) {
                console.error("Failed to hide transcript window", e);
            }
        } else {
            // Show transcript window
            try {
                const transcriptWin =
                    await WebviewWindow.getByLabel("transcript");
                if (transcriptWin) {
                    await transcriptWin.show();
                    showTranscript = true;
                }
            } catch (e) {
                console.error("Failed to show transcript window", e);
            }
        }
        await adjustWindowSize();
    }

    function changeLanguage(newLang: string) {
        language = newLang;
        if (isRecording) {
            recognition.stop();
            recognition.lang = newLang;
        } else {
            recognition.lang = newLang;
        }
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
    /* --- Main Layout --- */
    .main-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background-color: transparent !important; /* Forces transparency */
        padding: 5px; /* Minimal padding */
        box-sizing: border-box;
        overflow: hidden; /* Hide anything outside */
    }

    .floating-panel {
        background-color: #121212;
        border-radius: 12px;
        overflow: visible; /* Allow settings dropdown to show */
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
