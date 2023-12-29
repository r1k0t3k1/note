<script>
  import { base } from "$app/paths";
  import { Card } from "flowbite-svelte";
  /** @type {import('./$types').PageData} */    
  export let data;
</script>

<div class="card-container">
  {#each data.posts as post}
  <Card class="card" href="{base}/blog/{post.id}" style="margin-bottom:8px">
    <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
      {post.title}
    </h5>
    <p class="font-normal text-gray-700 dark:text-gray-400 leading-tight">
      {post.description}
    </p>
    <p class="font-normal text-gray-700 dark:text-gray-400 leading-tight">
      {post.createdAt}
    </p>
  </Card>
  {/each}
</div>

<style>
  :global(.card-container) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    box-sizing: border-box;
    min-width: 200px;
    max-width: 980px;
    margin: 0 auto;
    padding: 45px;
  }
  @media (max-width: 767px) {
    .card-container {
      padding: 8px;
    }
  }
</style>
