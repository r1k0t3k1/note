<script>
  import "carbon-components-svelte/css/g90.css";
  import { ClickableTile } from "carbon-components-svelte";

  /** @type {import('./$types').PageData} */
  export let data;
</script>

<div class="container">
  <h1>{data.post.title}<h1>
  <hr>
  <ClickableTile>
    {@html data.post.content}
  </ClickableTile>
</div>

<style>
  .container {
    max-width: 768px;
    margin: 0 auto;
  }

  :global(.container img) {
    max-width: 100%;
    height: auto;
  }
</style>
