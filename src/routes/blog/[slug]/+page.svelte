<script>
  import { MetaTags } from "svelte-meta-tags";
  import { base } from "$app/paths";
  import "../../../app.pcss";

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

<div class="markdown-body format lg:format-lg dark:format-invert">
  <h1>{data.post.title}</h1>
  {@html data.post.content}
</div>

<style>
  :global(img) {
    max-width: 100%;
    height: auto;
    display: block;
    margin: auto;
    border: 1px solid #374151;
  }
  :global(.markdown-body) {
    overflow-wrap: break-word;
    box-sizing: border-box;
    min-width: 200px;
    max-width: 980px;
    margin: 0 auto;
    padding: 45px;
  }
  :global(.rlc-container) {
    width: 100%;
    max-width: 800px;
    max-height: 120px;
    margin: 0 auto 2rem;
  
    color: black;
    text-decoration: none;
  
    border: 2px solid #374151;
    border-radius: 0.25rem;
    display: flex;
    align-items: stretch;
  
    transition: background 200ms ease-in-out 0s, box-shadow 200ms ease-in-out 0s;
  }

  :global(.rlc-container:hover){
    background-color: rgba(80,80,80, 0.1);
    box-shadow: 0 4px 5px 2px rgba(80,80,80, 0.2);
  }
  
  :global(.rlc-info) {
    overflow: hidden;
    padding: 0.5rem;
    flex: 4 1 100px;
    text-align: left;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  
  :global(.rlc-title) {
    font-size: 24px;
    color: #9ca3af;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  :global(.rlc-description) {
    font-size: 16px;
    color: #374151;
    overflow: hidden;
    line-height:1rem;
    height: 2rem;
  }
  
  :global(.rlc-url-container) {
    display: none;
    align-items: center;
  }
  
  :global(.rlc-favicon) {
    margin-right: 4px;
    width: 16px;
    height: 16px;
  }
  
  :global(.rlc-url) {
    font-size: 1rem;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
  
  :global(.rlc-image-container) {
    position: relative;
    flex: 1 1 160px;
  }
  
  :global(.rlc-image) {
    margin: 0px;
    object-fit: cover;
    width: 100%;
    height: 100%;
    border-bottom-right-radius: 0.25rem;
    border-top-right-radius: 0.25rem;
  }
  @media (max-width: 767px) {
    .markdown-body {
      padding: 8px;
    }
  }
</style>
