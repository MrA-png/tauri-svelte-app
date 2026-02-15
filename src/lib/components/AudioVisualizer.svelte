<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    let {
        deviceId,
        boostGain = 1.0,
        width = 300,
        height = 50,
        barColor = [100, 100, 255], // RGBBase
    } = $props<{
        deviceId: string;
        boostGain?: number;
        width?: number;
        height?: number;
        barColor?: [number, number, number];
    }>();

    let canvas = $state() as HTMLCanvasElement;
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let audioStream: MediaStream;
    let animationId: number;

    async function startVisualizer(currDeviceId: string, currBoost: number) {
        try {
            if (audioStream) stopVisualizer();

            // Setup Constraints
            // If high boost (BlackHole), disable processing
            const processing = currBoost <= 1.5; // Heuristic: if boost is high, it's raw audio, disable processing

            const constraints = {
                audio: {
                    deviceId:
                        currDeviceId !== "default"
                            ? { exact: currDeviceId }
                            : undefined,
                    echoCancellation: processing,
                    noiseSuppression: processing,
                    autoGainControl: processing,
                },
            };

            audioStream =
                await navigator.mediaDevices.getUserMedia(constraints);

            audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(audioStream);
            const gainNode = audioContext.createGain();

            gainNode.gain.value = currBoost;

            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;

            source.connect(gainNode);
            gainNode.connect(analyser);

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

        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const barWidth = (w / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = dataArray[i] / 2;
            const [r, g, b] = barColor;
            // Dynamic color based on height or fixed base
            ctx.fillStyle = `rgb(${Math.min(r + barHeight, 255)}, ${g}, ${b})`;
            ctx.fillRect(x, h - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    $effect(() => {
        if (deviceId) {
            startVisualizer(deviceId, boostGain);
        }
        return () => stopVisualizer();
    });

    onDestroy(() => {
        stopVisualizer();
    });
</script>

<div class="visualizer-container" style="width: {width}px; height: {height}px;">
    <canvas bind:this={canvas} {width} {height}></canvas>
</div>

<style>
    .visualizer-container {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        overflow: hidden;
    }
</style>
