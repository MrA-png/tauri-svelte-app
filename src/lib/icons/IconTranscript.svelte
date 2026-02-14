<script lang="ts">
    let { size = 18, class: className = "", strokeWidth = 2 } = $props();
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    class={className}
>
    <!-- Screen/Window Outline -->
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>

    <!-- Lines suggesting text -->
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
    <path d="M6 8h12"></path>
    <path d="M6 12h8"></path>
</svg>
