import { error } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import fs from "fs";
import { getBlogs } from "$lib/posts"

export const prerender = true;

export function GET() {
    return json(getBlogs());
}

