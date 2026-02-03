<script lang="ts">
    let { size = 24, class: className = "" } = $props();
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    class={className}
>
    <!-- Circle background (partially transparent) -->
    <path
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"
        fill="currentColor"
        opacity="0.5"
    />
    <!-- Waveform/Lines -->
    <path
        d="M12 6v12M8 10v4M16 10v4"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
    />
</svg>
