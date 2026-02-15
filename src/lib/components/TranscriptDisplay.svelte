<script lang="ts">
    import AudioVisualizer from "$lib/components/AudioVisualizer.svelte";

    let {
        isRecording,
        transcriptText,
        interimText,
        showNoSpeechWarning,
        showSettings,
        topElement,
        deviceId = "default",
        boostGain = 1.0,
    } = $props<{
        isRecording: boolean;
        transcriptText: string;
        interimText: string;
        showNoSpeechWarning: boolean;
        showSettings: boolean;
        topElement?: any;
        deviceId?: string;
        boostGain?: number;
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
                    <AudioVisualizer
                        {deviceId}
                        {boostGain}
                        width={200}
                        height={60}
                        barColor={[99, 102, 241]}
                    />
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
