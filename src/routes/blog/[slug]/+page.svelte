<script>
  import { MetaTags } from "svelte-meta-tags";
  import { base } from "$app/paths";

  /** @type {import('./$types').PageData} */
  export let data;
</script>

<svelte:head>
  <link rel="stylesheet" href="/atom-one-dark.min.css"/>
  <script src="/highlight.min.js"></script>
  <script>
    window.onload = function () {
      hljs.highlightAll();
    };
  </script>
</svelte:head>

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
  {@html data.post.content}
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
  :global(.container code) {
    font-size: 45%;
  }
</style>
