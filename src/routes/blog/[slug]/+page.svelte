<script>
  import { MetaTags } from "svelte-meta-tags";
  import { base } from "$app/paths";
  import "/static/github-markdown.css";

  /** @type {import('./$types').PageData} */
  export let data;
</script>

<svelte:head>
  <link rel="stylesheet" href="{base}/atom-one-dark.min.css"/>
  <meta property="og:type" content="article"/>
</svelte:head>

<MetaTags
  title="{data.post.title}"
  description={data.post.description}
  openGraph={{
    title: data.post.title,
    url: `https://r1k0t3k1.github.io${base}/blog/${data.post.id}`,
    description: data.post.description,
    images: [
      {
        url: `https://r1k0t3k1.github.io${base}/ogp/${data.post.id}.png`,
        width: 1200,
        height: 630,
        alt: data.post.title
      }
    ]
  }}
  twitter={{
    cardType: "summary_large_image",
    handle: "@r1k0t3k1"
  }}
/>

<div class="markdown-body">
  <h1>{data.post.title}</h1>
  {@html data.post.content}
</div>

<style>
  :global(img) {
    width: 100%;
    height: auto;
  }
  :global(.markdown-body) {
    font-size: 16px;
    box-sizing: border-box;
    min-width: 200px;
    max-width: 980px;
    margin: 0 auto;
    padding: 45px;
  }
  /*@media (max-width: 767px) {
    .markdown-body {
      padding: 15px;
    }
  }*/
</style>
