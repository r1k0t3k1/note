import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import adapter from "@sveltejs/adapter-static";

const dev = process.argv.includes("dev");

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: [vitePreprocess({})],
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: undefined,
      precompress: false,
      strict: false,
    }),
    paths: {
      base: dev ? "" : process.env.BASE_PATH,
    },
    prerender: {
      entries: ["/", "/about", "/api/blogs.json", "/blog", "/api/blog/1"],
    },
  },
};
