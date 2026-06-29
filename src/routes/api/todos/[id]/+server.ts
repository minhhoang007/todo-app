import { json } from '@sveltejs/kit';
import db from '$lib/db';
import type { RequestHandler } from './$types';

// PATCH /api/todos/:id
// Accepts a JSON body with any combination of:
//   { toggle: true }           — flip the done status
//   { title: "new title" }     — rename the todo
//   { category: "work" }       — change the category
export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);

	const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as
		| { id: number; title: string; done: number; category: string }
		| undefined;

	if (!todo) {
		return json({ error: 'Todo not found' }, { status: 404 });
	}

	const body = await request.json();

	if (body.toggle) {
		const newDone = todo.done === 0 ? 1 : 0;
		db.prepare('UPDATE todos SET done = ? WHERE id = ?').run(newDone, id);
	}

	if (typeof body.title === 'string' && body.title.trim() !== '') {
		db.prepare('UPDATE todos SET title = ? WHERE id = ?').run(body.title.trim(), id);
	}

	if (typeof body.category === 'string') {
		db.prepare('UPDATE todos SET category = ? WHERE id = ?').run(body.category, id);
	}

	const updated = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
	return json(updated);
};

export const DELETE: RequestHandler = ({ params }) => {
	const id = Number(params.id);

	const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
	if (!todo) {
		return json({ error: 'Todo not found' }, { status: 404 });
	}

	db.prepare('DELETE FROM todos WHERE id = ?').run(id);
	return json({ success: true });
};
