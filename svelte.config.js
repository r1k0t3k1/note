import adapter from '@sveltejs/adapter-static';
import { optimizeImports, elements } from "carbon-preprocess-svelte";

const dev = process.argv.includes('dev');

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess:[
    optimizeImports(),
    elements()
  ],
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: false
		}),
   	paths: {
			base: dev ? '' : process.env.BASE_PATH,
		},
   	prerender: {
			entries: ["/","/about","/api/blogs.json","/blog","/api/blog/1"]
		},
	}
};
