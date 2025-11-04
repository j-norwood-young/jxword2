<script lang="ts">
    import Button from "./Button.svelte";
    import { Upload } from "lucide-svelte";

    type Props = {
        file_formats: string[];
        handleFileSelect: (data: { content: string, filename: string }) => void;
    }
    let { file_formats = [".xd"], handleFileSelect }: Props = $props();

    let fileInput: HTMLInputElement;
    let fileInputId = `file-${Math.random().toString(36).substr(2, 9)}`;

    function onFileSelect() {
        const reader = new FileReader();
        reader.onload = (function() {
            return async function(e) {
                try {
                    const data = {
                        content: e.target?.result?.toString() || "",
                        filename: fileInput.files?.[0]?.name || "",
                    }
                    handleFileSelect(data);
                } catch(err) {
                    console.error(err);
                    throw "Unable to upload file";
                }
            };
        })();
        // Read in the file as text.
        const file = fileInput.files?.[0];
        if (file) {
            reader.readAsText(file);
        }
    }
    
    function handleButtonClick() {
        fileInput.click();
    }
</script>

<input 
    type="file" 
    id={fileInputId}
    name="files" 
    accept={file_formats.join(",")} 
    bind:this={fileInput} 
    onchange={onFileSelect}
    class="hidden"
/>

<Button variant="outline" onclick={handleButtonClick}>
    <Upload size={16} class="mr-2" />
    Choose File
</Button>