<script>
  import "carbon-components-svelte/css/g90.css";
  import { ClickableTile } from "carbon-components-svelte";
  import { Truncate } from "carbon-components-svelte";

  /** @type {import('./$types').PageData} */    
  export let data;
</script>

<div class="container">
{#each data.posts as post}
  <ClickableTile href="/blog/{post.id}" style="margin-bottom:8px">
    <p>Published at: {post.createdAt}</p>
    <h1>{post.title}</h1>
    <Truncate>{post.description}</Truncate>
  </ClickableTile>
{/each}
</div>

<style>
  .container {
    max-width: 768px;
    margin: 0 auto;
  }
  p {
    color: grey;
    margin-bottom: 16px;
  }
  h1 {
    margin-bottom: 16px;
  }
</style>

