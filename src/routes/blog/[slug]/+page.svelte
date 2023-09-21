<script>
  import "carbon-components-svelte/css/g90.css";
  import { ClickableTile } from "carbon-components-svelte";

  /** @type {import('./$types').PageData} */
  export let data;
</script>

<div class="container">
  {@html data.post.content}
</div>

<style>
  .container {
    max-width: 768px;
    margin: 0 auto;
  }
</style>
