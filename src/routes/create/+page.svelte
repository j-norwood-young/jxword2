<script lang="ts">
    import type { PageProps } from './$types';
    import JXWordCreator from "$lib/components/JXWordCreator.svelte";
    let { data }: PageProps = $props();
</script>

<h1 class="text-3xl font-bold underline">Create</h1>

<JXWordCreator />