<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    import AudioVisualizer from "$lib/components/AudioVisualizer.svelte";

    let { availableDevices, selectedDeviceId = $bindable() } = $props<{
        availableDevices: MediaDeviceInfo[];
        selectedDeviceId: string;
    }>();

    let isWindows = $state(false);
    let isMac = $state(false);

    // Derived state for visualizer configuration
    let selectedDeviceLabel = $derived(
        availableDevices.find(
            (d: MediaDeviceInfo) => d.deviceId === selectedDeviceId,
        )?.label || "",
    );
    let isBlackHole = $derived(
        selectedDeviceLabel.toLowerCase().includes("blackhole"),
    );
    let boostGain = $derived(isBlackHole ? 4.0 : 1.0);

    onMount(() => {
        const platform = navigator.userAgent;
        isWindows = platform.indexOf("Windows") !== -1;
        isMac = platform.indexOf("Mac") !== -1;
    });
</script>

<div class="settings-panel">
    <h3>Input Settings</h3>
    <p class="hint">
        <strong>Setup for System Audio:</strong>
        {#if isWindows}
            <br />1. Open <strong>Sound Settings</strong> >
            <strong>Record</strong>.
            <br />2. Right-click & enable <strong>"Stereo Mix"</strong>.
            <br />3. Select "Stereo Mix" below.
        {:else if isMac}
            <br />Mac does not have "Stereo Mix" by default.
            <br />1. Install <strong>BlackHole 2ch</strong>:
            <br /><code class="code-snippet">brew install blackhole-2ch</code>
            <br />2. Open <strong>Audio MIDI Setup</strong> app.
            <br />3. Create a <strong>Multi-Output Device</strong> (select your
            speakers + BlackHole).
            <br />4. Set Output to Multi-Output Device.
            <br />5. Set Input to <strong>BlackHole 2ch</strong> in System
            Settings.
            <br />6. Select "BlackHole 2ch" below.
        {:else}
            <br />Detecting OS... ({navigator.userAgent})
            <br />Ensure system audio is routed to the selected input device.
        {/if}
    </p>
    <select bind:value={selectedDeviceId} class="device-select">
        <option value="default">Default System Input (Mic)</option>
        {#each availableDevices as device}
            <option value={device.deviceId}
                >{device.label ||
                    `Device ${device.deviceId.slice(0, 5)}...`}</option
            >
        {/each}
    </select>

    <!-- Active device indicator -->
    <div class="device-status">
        <span class="status-dot"></span>
        <span class="status-label">
            Active: <strong
                >{selectedDeviceLabel || "Default System Input"}</strong
            >
        </span>
    </div>

    {#if isBlackHole}
        <!-- Warning: SpeechRecognition mungkin tidak bisa otomatis pakai BlackHole -->
        <div class="transcription-warning">
            <div class="warning-icon">⚠️</div>
            <div class="warning-body">
                <strong>Penting untuk Transkripsi!</strong><br />
                Agar teks bisa muncul, pastikan:
                <br />1. Buka <strong>System Settings → Sound → Input</strong>
                <br />2. Pilih <strong>BlackHole 2ch</strong> sebagai Default
                Input
                <br /><em style="font-size:0.8em; opacity:0.75">
                    (Visualizer ✅ memakai device ini langsung, tapi mesin
                    transkripsi butuh System Default Input)
                </em>
            </div>
        </div>
    {/if}

    <div class="visualizer-wrapper">
        <p class="visualizer-label">
            🎙️ Audio Preview (gelombang = audio terdeteksi)
        </p>
        <AudioVisualizer
            deviceId={selectedDeviceId}
            {boostGain}
            width={300}
            height={50}
        />
    </div>
</div>

<style>
    .settings-panel {
        background: rgba(255, 255, 255, 0.05);
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
    }

    h3 {
        margin: 0 0 10px 0;
        font-size: 1rem;
        color: #fff;
    }

    .hint {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 15px;
        line-height: 1.4;
    }

    .code-snippet {
        background: rgba(0, 0, 0, 0.4);
        padding: 4px 6px;
        border-radius: 4px;
        color: #a5b4fc;
        font-family: monospace;
        font-size: 0.9em;
        user-select: text; /* Allow user to copy */
        display: inline-block;
        margin: 4px 0;
    }

    .visualizer-wrapper {
        margin-top: 5px;
    }

    .visualizer-label {
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.5);
        margin: 0 0 6px 0;
    }

    .device-status {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 10px;
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.6);
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 6px #22c55e;
        display: inline-block;
        flex-shrink: 0;
    }

    .status-label strong {
        color: #a5b4fc;
    }

    .transcription-warning {
        display: flex;
        gap: 8px;
        background: rgba(234, 179, 8, 0.12);
        border: 1px solid rgba(234, 179, 8, 0.4);
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 12px;
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.5;
    }

    .warning-icon {
        font-size: 1.2rem;
        flex-shrink: 0;
        line-height: 1.4;
    }

    .warning-body strong {
        color: #fde68a;
    }

    .device-select {
        width: 100%;
        margin-bottom: 15px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 6px;
        appearance: none;
        cursor: pointer;
    }

    .device-select:focus {
        outline: none;
        border-color: #6366f1;
        background: rgba(0, 0, 0, 0.5);
    }

    .device-select option {
        background-color: #1a1a1a;
        color: white;
        padding: 8px;
    }
</style>
