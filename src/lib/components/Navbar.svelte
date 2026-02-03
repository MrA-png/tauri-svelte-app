<script lang="ts">
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import IconLogo from "$lib/icons/IconLogo.svelte";
    import IconMic from "$lib/icons/IconMic.svelte";
    import IconEye from "$lib/icons/IconEye.svelte";
    import IconEyeOff from "$lib/icons/IconEyeOff.svelte";
    import IconTrash from "$lib/icons/IconTrash.svelte";
    import IconX from "$lib/icons/IconX.svelte";

    // Props
    let {
        isRecording,
        isTransparent,
        language,
        showSettings,
        onToggleRecording,
        onToggleTransparency,
        onClearText,
        onToggleSettings,
        onChangeLanguage,
    } = $props<{
        isRecording: boolean;
        isTransparent: boolean;
        language: string;
        showSettings: boolean;
        onToggleRecording: () => void;
        onToggleTransparency: () => void;
        onClearText: () => void;
        onToggleSettings: () => void;
        onChangeLanguage: (lang: string) => void;
    }>();

    function closeApp() {
        getCurrentWindow().close();
    }
</script>

<header data-tauri-drag-region class="navbar">
    <div class="logo">
        <IconLogo size={24} class="brand-icon" />
        <span class="brand-name">Transcriber</span>
    </div>

    <div class="nav-actions">
        <!-- Language Selector (Compact) -->
        <div class="select-wrapper compact">
            <select
                value={language}
                onchange={(e) => onChangeLanguage(e.currentTarget.value)}
            >
                <option value="id-ID">ID</option>
                <option value="en-US">EN</option>
            </select>
        </div>

        <div class="divider"></div>

        <!-- Record Button (Compact) -->
        <button
            class="icon-btn record-btn-compact"
            class:recording={isRecording}
            onclick={onToggleRecording}
            title={isRecording ? "Stop Recording" : "Start Recording"}
        >
            {#if isRecording}
                <div class="stop-icon"></div>
            {:else}
                <IconMic size={18} />
            {/if}
        </button>

        <!-- Transparency Link -->
        <button
            class="icon-btn"
            class:active={isTransparent}
            onclick={onToggleTransparency}
            title="Toggle Transparency"
        >
            {#if isTransparent}
                <IconEye size={18} />
            {:else}
                <IconEyeOff size={18} />
            {/if}
        </button>

        <!-- Clear Text -->
        <button class="icon-btn" onclick={onClearText} title="Clear Text">
            <IconTrash size={18} />
        </button>

        <div class="divider"></div>

        <!-- Device Selector (Simplified) -->
        <button
            class="icon-btn"
            onclick={onToggleSettings}
            title="Audio Settings"
            class:active={showSettings}
        >
            <IconMic size={18} />
        </button>

        <!-- Close App -->
        <button class="icon-btn close-btn" onclick={closeApp} title="Close">
            <IconX size={18} />
        </button>
    </div>
</header>

<style>
    .navbar {
        height: 60px;
        display: flex;
        align-items: center;
        padding: 0 16px;
        background: rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        justify-content: space-between;
        flex-shrink: 0;
        cursor: default;
    }

    .logo {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #fff;
        font-weight: 500;
        font-size: 0.9rem;
    }

    /* .brand-icon is now passed as a class to IconLogo */
    :global(.brand-icon) {
        color: #6366f1;
    }

    .brand-name {
        font-weight: 600;
    }

    .nav-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        -webkit-app-region: no-drag;
    }

    button,
    select,
    .select-wrapper {
        -webkit-app-region: no-drag;
    }

    .icon-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .icon-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }

    .icon-btn.active {
        color: #6366f1;
        background: rgba(99, 102, 241, 0.1);
    }

    .close-btn:hover {
        background: #ef4444;
        color: white;
    }

    .record-btn-compact {
        color: #ef4444;
    }
    .record-btn-compact:hover {
        background: rgba(239, 68, 68, 0.1);
    }
    .record-btn-compact.recording {
        color: #ef4444;
        animation: pulse-text 2s infinite;
        background: rgba(239, 68, 68, 0.2);
    }

    .stop-icon {
        width: 8px;
        height: 8px;
        background: currentColor;
        border-radius: 1px;
    }

    @keyframes pulse-text {
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

    .divider {
        width: 1px;
        height: 18px;
        background: rgba(255, 255, 255, 0.15);
        margin: 0 4px;
    }

    .select-wrapper.compact {
        width: auto;
        position: relative;
    }

    .select-wrapper.compact select {
        padding: 4px 8px;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 0.8rem;
        appearance: none;
        color: white;
        border-radius: 6px;
        font-family: inherit;
        cursor: pointer;
        outline: none;
    }

    .select-wrapper.compact select:hover {
        background: rgba(255, 255, 255, 0.1);
    }
</style>
