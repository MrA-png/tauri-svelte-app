<script lang="ts">
    import { onMount } from "svelte";
    import { listen } from "@tauri-apps/api/event";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import TranscriptDisplay from "$lib/components/TranscriptDisplay.svelte";

    let transcriptText = $state("");
    let interimText = $state("");
    let isRecording = $state(false);
    let showNoSpeechWarning = $state(false);
    let showSettings = $state(false);

    onMount(async () => {
        // Listen for updates from main window
        await listen("transcript-update", (event: any) => {
            const payload = event.payload;
            transcriptText = payload.transcriptText;
            interimText = payload.interimText;
            isRecording = payload.isRecording;
            showNoSpeechWarning = payload.showNoSpeechWarning;
        });

        // Show window when ready
        getCurrentWindow().show();
    });

    function closeWindow() {
        // Just hide instead of closing to keep state/listeners active
        getCurrentWindow().hide();
    }

    function minimizeWindow() {
        getCurrentWindow().minimize();
    }
</script>

<div class="transcript-window">
    <div class="window-header" data-tauri-drag-region>
        <div class="drag-handle"></div>
        <div class="window-controls">
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
        background-color: rgba(
            20,
            20,
            20,
            0.85
        ); /* Slightly less transparent for readability */
        backdrop-filter: blur(20px);
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        margin: 10px; /* Gap for shadow */
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
        width: 24px;
        height: 24px;
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
