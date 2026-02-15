<script lang="ts">
    import { onMount } from "svelte";
    import { listen, emit } from "@tauri-apps/api/event";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import TranscriptDisplay from "$lib/components/TranscriptDisplay.svelte";
    import IconEye from "$lib/icons/IconEye.svelte";
    import IconEyeOff from "$lib/icons/IconEyeOff.svelte";

    let transcriptText = $state("");
    let interimText = $state("");
    let isRecording = $state(false);
    let showNoSpeechWarning = $state(false);
    let showSettings = $state(false);
    let isTransparent = $state(false);

    // Visualizer state
    let selectedDeviceId = $state("default");
    let boostGain = $state(1.0);

    function handleToggleRecording() {
        emit("toggle-recording");
    }

    onMount(async () => {
        // Listen for updates from main window
        await listen("transcript-update", (event: any) => {
            const payload = event.payload;
            transcriptText = payload.transcriptText;
            interimText = payload.interimText;
            isRecording = payload.isRecording;
            showNoSpeechWarning = payload.showNoSpeechWarning;

            // Update visualizer settings
            if (payload.selectedDeviceId)
                selectedDeviceId = payload.selectedDeviceId;
            if (payload.boostGain) boostGain = payload.boostGain;
        });

        // Window visibility is managed by the main window
    });

    function closeWindow() {
        // Just hide instead of closing to keep state/listeners active
        emit("transcript-hidden");
        getCurrentWindow().hide();
    }

    function minimizeWindow() {
        getCurrentWindow().minimize();
    }

    function toggleTransparency() {
        isTransparent = !isTransparent;
    }
</script>

<div class="transcript-window" class:transparent-mode={isTransparent}>
    <!-- Enhanced drag region -->
    <div class="window-header" data-tauri-drag-region>
        <div class="drag-handle" data-tauri-drag-region></div>
        <div class="window-controls">
            <button
                type="button"
                class="control-btn record-btn"
                class:recording={isRecording}
                onclick={handleToggleRecording}
                title={isRecording ? "Stop Recording" : "Start Recording"}
            >
                {#if isRecording}
                    <div class="stop-icon"></div>
                {:else}
                    <span class="start-label">Start</span>
                {/if}
            </button>
            <button
                class="control-btn"
                class:active={isTransparent}
                onclick={toggleTransparency}
                title="Toggle Transparency"
            >
                {#if isTransparent}
                    <IconEye size={14} />
                {:else}
                    <IconEyeOff size={14} />
                {/if}
            </button>
            <button
                class="control-btn minimize"
                onclick={minimizeWindow}
                title="Minimize"
            >
                <div class="icon-minimize"></div>
            </button>
            <button
                class="control-btn close"
                onclick={closeWindow}
                title="Close (Hide)"
            >
                <div class="icon-close"></div>
            </button>
        </div>
    </div>

    <main class="content">
        <TranscriptDisplay
            {transcriptText}
            {interimText}
            {isRecording}
            {showNoSpeechWarning}
            {showSettings}
            deviceId={selectedDeviceId}
            {boostGain}
        />
    </main>
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        background: transparent;
        overflow: hidden;
    }

    .transcript-window {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background-color: rgba(20, 20, 20, 0.95);
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        margin: 10px; /* Gap for shadow */
        transition: background-color 0.3s ease;
    }

    /* Transparent Mode */
    .transcript-window.transparent-mode {
        background-color: rgba(0, 0, 0, 0.4); /* Much more transparent */
        backdrop-filter: blur(
            4px
        ); /* Reduce blur for clearer view of background */
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: none;
    }

    .transcript-window.transparent-mode .window-header {
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    }

    .transcript-window.transparent-mode .content {
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8); /* readable text */
    }

    .window-header {
        height: 32px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 0 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        position: relative;
        cursor: move; /* Indicate draggable */
    }

    .drag-handle {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
    }

    .window-controls {
        display: flex;
        gap: 6px;
        z-index: 10;
        -webkit-app-region: no-drag;
    }

    .control-btn {
        min-width: 24px;
        height: 24px;
        padding: 0 4px;
        border-radius: 4px;
        border: none;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.6);
        transition: all 0.2s;
    }
    .control-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }
    .control-btn.active {
        color: #6366f1;
        background: rgba(99, 102, 241, 0.1);
    }

    .control-btn.record-btn:hover {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
    }
    .control-btn.recording {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.2);
        animation: pulse-recording 2s infinite;
    }

    .stop-icon {
        width: 8px;
        height: 8px;
        background: currentColor;
        border-radius: 1px;
    }

    .start-label {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    @keyframes pulse-recording {
        0% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
        100% {
            opacity: 1;
        }
    }

    .control-btn.close:hover {
        background: #ef4444;
    }

    .icon-minimize {
        width: 10px;
        height: 1px;
        background: currentColor;
    }
    .icon-close {
        width: 10px;
        height: 10px;
        position: relative;
    }
    .icon-close::before,
    .icon-close::after {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 1px;
        background: currentColor;
        transform: translate(-50%, -50%) rotate(45deg);
    }
    .icon-close::after {
        transform: translate(-50%, -50%) rotate(-45deg);
    }

    .content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 16px;
    }
</style>
