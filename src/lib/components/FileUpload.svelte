<script lang="ts">

    type Props = {
        file_formats: string[];
        handleFileSelect: (data: { content: string, filename: string }) => void;
    }
    let { file_formats = [".xd"], handleFileSelect }: Props = $props();

let fileInput: HTMLInputElement;

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
</script>

<input class="drop_zone" type="file" id="file" name="files" accept={file_formats.join(",")} bind:this={fileInput} onchange={onFileSelect} />