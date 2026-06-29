import { json } from '@sveltejs/kit';
import db from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const todos = db.prepare('SELECT * FROM todos ORDER BY created_at DESC').all();
	return json(todos);
};

export const POST: RequestHandler = async ({ request }) => {
	const { title, category = 'general', priority = 'medium', due_date = null } = await request.json();

	if (!title || title.trim() === '') {
		return json({ error: 'Title cannot be empty' }, { status: 400 });
	}

	const result = db
		.prepare('INSERT INTO todos (title, category, priority, due_date) VALUES (?, ?, ?, ?)')
		.run(title.trim(), category, priority, due_date);

	const newTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
	return json(newTodo, { status: 201 });
};
