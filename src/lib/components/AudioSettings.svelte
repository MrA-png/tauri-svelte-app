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
            <br />4. Select "BlackHole 2ch" below as input.
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

    <div class="visualizer-wrapper">
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
