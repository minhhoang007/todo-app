import { json } from '@sveltejs/kit';
import db from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const todos = db.prepare('SELECT * FROM todos ORDER BY created_at DESC').all();
	return json(todos);
};

export const POST: RequestHandler = async ({ request }) => {
	const { title, category = 'general' } = await request.json();

	if (!title || title.trim() === '') {
		return json({ error: 'Title cannot be empty' }, { status: 400 });
	}

	const result = db
		.prepare('INSERT INTO todos (title, category) VALUES (?, ?)')
		.run(title.trim(), category);

	const newTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
	return json(newTodo, { status: 201 });
};
