import { error } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getPosts } from "$lib/posts"
import { parseMarkdown } from "$lib/markdown";

/** @type {import('./$types').PageServerLoad} */
export async function load() {
    const posts = await getPosts();
    if (posts) {
      return { posts: structuredClone(posts) };
    };
  
    throw error(404, 'Not found');
}
