<script>
  import "carbon-components-svelte/css/g90.css";
  import { ClickableTile } from "carbon-components-svelte";
  import { MetaTags } from "svelte-meta-tags";
  import { base } from "$app/paths";

  /** @type {import('./$types').PageData} */
  export let data;
</script>

<MetaTags
  title="{data.post.title}"
  description={data.post.description}
  openGraph={{
    type: "website",
    url: `https://r1k0t3k1.github.io${base}/blog/blog-sample-1`,
    title: data.post.title,
    description: data.post.description,
    images: [
      {
        url: `https://r1k0t3k1.github.io${base}/ogp/test.png`,
        width: 1200,
        height: 630,
        alt: data.post.title
      }
    ]
  }}
/>

<div class="container">
  <h1>{data.post.title}<h1>
  <hr>
  <ClickableTile>
    {@html data.post.content}
  </ClickableTile>
</div>

<style>
  .container {
    max-width: 796px;
    margin: 0 auto;
  }

  :global(.container img) {
    max-width: 100%;
    height: auto;
  }
</style>
