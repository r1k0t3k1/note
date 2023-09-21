<script>
  /** @type {import('./$types').PageData} */    
  export let data;
</script>
<div>test</div>
<ul>
  {#each data.posts as post}
    <li>
      <p>
        {post.title}
      </p>
    </li>
  {/each}
</ul>

