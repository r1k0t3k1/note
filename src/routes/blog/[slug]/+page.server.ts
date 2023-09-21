import { error } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getPosts } from "$lib/posts"
import { getPostById } from "$lib/posts"
import { parseMarkdown } from "$lib/markdown";

/** @type {import('./$types').PageServerLoad} */
export async function load({params}) {
    const post = await getPostById(params.slug);
    if (post) {
      return { post: structuredClone(post) };
    };

    throw error(404, 'Not found');
}

