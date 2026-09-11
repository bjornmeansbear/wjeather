import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Design preview: local only. Not prerendered, and a 404 in production.
export const prerender = false;

export function load() {
	if (!dev) error(404, 'Not found');
}
