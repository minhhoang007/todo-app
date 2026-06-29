import db from '$lib/db';
import type { PageServerLoad } from './$types';

// This runs on the server every time someone visits the homepage.
// It loads all todos and passes them to the page component.
export const load: PageServerLoad = () => {
	const todos = db.prepare('SELECT * FROM todos ORDER BY created_at DESC').all();
	return { todos };
};
