<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { getCurrentWindow, Window } from "@tauri-apps/api/window";
    import { emit } from "@tauri-apps/api/event";
    import Navbar from "$lib/components/Navbar.svelte";
    import AudioSettings from "$lib/components/AudioSettings.svelte";

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
                }
            };
        } else {
            alert("Web Speech API is not supported in this environment.");
        }
    }

    onMount(async () => {
        setupRecognition();
        await loadAudioDevices();
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

    function toggleSettings() {
        showSettings = !showSettings;
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
        emit("transcript-update", {
            transcriptText,
            interimText,
            isRecording,
            showNoSpeechWarning,
        });
    }

    async function toggleRecording() {
        if (isRecording) {
            recognition.stop();
            isRecording = false;
            clearTimeout(noSpeechTimeout);
            showNoSpeechWarning = false;
        } else {
            try {
                // Check / Open Transcript Window
                const transcriptWin = await Window.getByLabel("transcript");
                if (transcriptWin) {
                    console.log("Showing transcript window");
                    await transcriptWin.show();
                    await transcriptWin.setFocus();
                } else {
                    console.error("Transcript window not found");
                }
            } catch (err) {
                console.error("Error accessing transcript window:", err);
            }

            // Update language before starting
            recognition.lang = language;
            recognition.start();
            isRecording = true;
            showNoSpeechWarning = false;
            startNoSpeechTimer();
        }
        emitTranscriptUpdate();
    }

    function changeLanguage(newLang: string) {
        language = newLang;
        if (isRecording) {
            recognition.stop();
            // Will restart automatically in onend, but we should make sure we update lang
            recognition.lang = newLang;
        } else {
            recognition.lang = newLang;
        }
    }

    function toggleTransparency() {
        isTransparent = !isTransparent;
    }

    function clearText() {
        transcriptText = "";
        interimText = "";
        emitTranscriptUpdate();
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
            onToggleRecording={toggleRecording}
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
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
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
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }
</style>
