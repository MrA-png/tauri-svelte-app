<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    let {
        isRecording,
        transcriptText,
        interimText,
        showNoSpeechWarning,
        showSettings,
        topElement,
    } = $props<{
        isRecording: boolean;
        transcriptText: string;
        interimText: string;
        showNoSpeechWarning: boolean;
        showSettings: boolean;
        topElement?: any; // To allow injecting settings panel
    }>();

    let scrollContainer = $state() as HTMLDivElement;

    // Auto scroll logic effect
    $effect(() => {
        // We depend on transcriptText and interimText changes
        const _ = transcriptText + interimText;
        if (scrollContainer) {
            requestAnimationFrame(() => {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            });
        }
    });
</script>

<div bind:this={scrollContainer} id="transcript-box" class="transcript-box">
    {#if showSettings}
        <!-- Slot for Settings Panel -->
        {@render topElement?.()}
    {:else if !transcriptText && !interimText}
        <div class="placeholder">
            {#if isRecording}
                <div class="listening-loader">
                    <span class="pulse-dot"></span>
                    <p>Listening...</p>
                    {#if showNoSpeechWarning}
                        <p class="warning-text">
                            No speech detected. Check "Stereo Mix" settings.
                        </p>
                    {/if}
                </div>
            {:else}
                <p>Ready to transcribe.</p>
                <p class="sub">Select system audio/mic and press record.</p>
            {/if}
        </div>
    {/if}
    <p class="text-content">
        {transcriptText}
        <span class="interim">{interimText}</span>
    </p>
</div>

<style>
    .transcript-box {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        font-size: 1rem;
        line-height: 1.6;
        word-wrap: break-word;
        color: #e0e0e0;
    }

    .placeholder {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.3);
        text-align: center;
    }

    .placeholder .sub {
        font-size: 0.8rem;
        margin-top: 8px;
    }

    .interim {
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
    }

    .listening-loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        color: #6366f1;
    }

    .pulse-dot {
        width: 12px;
        height: 12px;
        background-color: #6366f1;
        border-radius: 50%;
        animation: pulse-dot 1.5s infinite ease-in-out;
    }

    @keyframes pulse-dot {
        0% {
            transform: scale(0.8);
            opacity: 0.5;
        }
        50% {
            transform: scale(1.5);
            opacity: 1;
        }
        100% {
            transform: scale(0.8);
            opacity: 0.5;
        }
    }

    .warning-text {
        color: #ef4444;
        font-size: 0.8rem;
        margin-top: 4px;
        animation: fade-in 0.5s ease-out;
    }

    @keyframes fade-in {
        from {
            opacity: 0;
            transform: translateY(-5px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
