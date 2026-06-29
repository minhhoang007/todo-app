import { json } from '@sveltejs/kit';
import db from '$lib/db';
import type { RequestHandler } from './$types';

// PATCH /api/todos/:id
// Accepts any combination of:
//   { toggle: true }           — flip done
//   { title: "new title" }     — rename
//   { category: "work" }       — change category
//   { priority: "high" }       — change priority
//   { due_date: "2026-07-01" } — set due date (null to clear)
export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);

	const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as
		| { id: number; title: string; done: number; category: string; priority: string; due_date: string | null }
		| undefined;

	if (!todo) return json({ error: 'Todo not found' }, { status: 404 });

	const body = await request.json();

	if (body.toggle) {
		db.prepare('UPDATE todos SET done = ? WHERE id = ?').run(todo.done === 0 ? 1 : 0, id);
	}
	if (typeof body.title === 'string' && body.title.trim() !== '') {
		db.prepare('UPDATE todos SET title = ? WHERE id = ?').run(body.title.trim(), id);
	}
	if (typeof body.category === 'string') {
		db.prepare('UPDATE todos SET category = ? WHERE id = ?').run(body.category, id);
	}
	if (typeof body.priority === 'string') {
		db.prepare('UPDATE todos SET priority = ? WHERE id = ?').run(body.priority, id);
	}
	if ('due_date' in body) {
		db.prepare('UPDATE todos SET due_date = ? WHERE id = ?').run(body.due_date, id);
	}

	const updated = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
	return json(updated);
};

export const DELETE: RequestHandler = ({ params }) => {
	const id = Number(params.id);

	const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
	if (!todo) return json({ error: 'Todo not found' }, { status: 404 });

	db.prepare('DELETE FROM todos WHERE id = ?').run(id);
	return json({ success: true });
};
