<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import Navbar from "$lib/components/Navbar.svelte";
    import TranscriptDisplay from "$lib/components/TranscriptDisplay.svelte";
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
        // stopVisualizer checked in AudioSettings logic or self-contained there
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
            }
        }, 8000); // 8 seconds without speech
    }

    function toggleRecording() {
        if (isRecording) {
            recognition.stop();
            isRecording = false;
            clearTimeout(noSpeechTimeout);
            showNoSpeechWarning = false;
        } else {
            // Update language before starting
            recognition.lang = language;
            recognition.start();
            isRecording = true;
            showNoSpeechWarning = false;
            startNoSpeechTimer();
        }
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
    }
</script>

<!-- Main Application Layer -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="app-layout" class:transparent-mode={isTransparent}>
    <!-- Navbar -->
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

    <!-- Main Content Area -->
    <main class="content">
        <TranscriptDisplay
            {transcriptText}
            {interimText}
            {isRecording}
            {showNoSpeechWarning}
            {showSettings}
        >
            <!-- Slot content correctly passed as snippet prop if using default slot or similar mechanism (Svelte 5 snippet) -->
            <!-- However, in the TranscriptDisplay component, I used {@render topElement?.()} which expects a snippet prop named topElement -->
            <!-- Let's pass the snippet properly -->
            {#snippet topElement()}
                <AudioSettings {availableDevices} bind:selectedDeviceId />
            {/snippet}
        </TranscriptDisplay>
    </main>
</div>

<style>
    /* --- Main Layout --- */
    .app-layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background-color: #121212; /* Fallback solid color */
        color: #e0e0e0;
        transition: background-color 0.3s ease;
        overflow: hidden;
        border-radius: 8px; /* Slight rounding if OS supports it */
    }

    .transparent-mode {
        /* Glassmorphism */
        background-color: rgba(20, 20, 20, 0.45);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* --- Content --- */
    .content {
        flex: 1;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
</style>
