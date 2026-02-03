<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    let { availableDevices, selectedDeviceId = $bindable() } = $props<{
        availableDevices: MediaDeviceInfo[];
        selectedDeviceId: string;
    }>();

    let canvas = $state() as HTMLCanvasElement;
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let audioStream: MediaStream;
    let animationId: number;

    async function startVisualizer(deviceId: string) {
        try {
            if (audioStream) stopVisualizer();

            audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId:
                        deviceId !== "default"
                            ? { exact: deviceId }
                            : undefined,
                },
            });

            audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(audioStream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            drawVisualizer();
        } catch (e) {
            console.error("Visualizer init error", e);
        }
    }

    function stopVisualizer() {
        if (animationId) cancelAnimationFrame(animationId);
        if (audioStream) {
            audioStream.getTracks().forEach((track) => track.stop());
        }
        if (audioContext) audioContext.close();
    }

    function drawVisualizer() {
        if (!canvas) return;
        animationId = requestAnimationFrame(drawVisualizer);

        analyser.getByteFrequencyData(dataArray as any);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const barWidth = (width / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = dataArray[i] / 2;
            ctx.fillStyle = `rgb(${barHeight + 100}, 100, 255)`; // bluish
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    // Effect to restart visualizer when device changes
    $effect(() => {
        if (selectedDeviceId) {
            startVisualizer(selectedDeviceId);
        }
        return () => stopVisualizer();
    });

    onMount(() => {
        startVisualizer(selectedDeviceId);
    });

    onDestroy(() => {
        stopVisualizer();
    });
</script>

<div class="settings-panel">
    <h3>Input Settings</h3>
    <p class="hint">
        <strong>Important:</strong> To transcribe YouTube/System Audio:
        <br />1. Enable "Stereo Mix" in Windows Sound Settings.
        <br />2. Set "Stereo Mix" as the
        <strong>Default Recording Device</strong>
        in Windows.
        <br />3. This app's visualizer below will move when it hears audio.
    </p>
    <select bind:value={selectedDeviceId} class="device-select">
        <option value="default">Default System Input</option>
        {#each availableDevices as device}
            <option value={device.deviceId}
                >{device.label ||
                    `Device ${device.deviceId.slice(0, 5)}...`}</option
            >
        {/each}
    </select>
    <div class="visualizer-container">
        <canvas bind:this={canvas} width="300" height="50"></canvas>
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

    .device-select {
        width: 100%;
        margin-bottom: 15px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 6px;
    }

    .visualizer-container {
        width: 100%;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        overflow: hidden;
        height: 50px;
    }
</style>
