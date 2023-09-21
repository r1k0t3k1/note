import { error } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import fs from "fs";
import { getPosts } from "$lib/posts"

export const prerender = true;

export async function GET() {
    return json(await getPosts());
}

