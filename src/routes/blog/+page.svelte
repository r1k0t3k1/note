<script>
  import "carbon-components-svelte/css/g90.css";
  import { ClickableTile } from "carbon-components-svelte";

  /** @type {import('./$types').PageData} */    
  export let data;
</script>

{#each data.posts as post}
  <ClickableTile>
    {post.title}
  </ClickableTile>
{/each}

