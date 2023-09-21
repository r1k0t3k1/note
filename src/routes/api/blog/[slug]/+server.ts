import { error } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const prerender = true;

export function GET({ params }) {
    return json(params);
}

