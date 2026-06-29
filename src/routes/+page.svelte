<script lang="ts">
	import type { PageData } from './$types';

	// ── Types ──────────────────────────────────────────────────────────────
	type Todo = {
		id: number;
		title: string;
		done: number;
		category: string;
		created_at: string;
	};

	type Filter = 'all' | 'active' | 'done';

	// ── Category config ────────────────────────────────────────────────────
	// Each category has a label and a Tailwind color class for its badge.
	const CATEGORIES: Record<string, { label: string; color: string }> = {
		general:  { label: 'General',  color: 'bg-gray-100 text-gray-600' },
		work:     { label: 'Work',     color: 'bg-blue-100 text-blue-700' },
		personal: { label: 'Personal', color: 'bg-purple-100 text-purple-700' },
		shopping: { label: 'Shopping', color: 'bg-green-100 text-green-700' },
		health:   { label: 'Health',   color: 'bg-red-100 text-red-700' }
	};

	// ── Props & state ──────────────────────────────────────────────────────
	let { data }: { data: PageData } = $props();

	let todos    = $state(data.todos as Todo[]);
	let filter   = $state<Filter>('all');
	let loading  = $state(false);

	// Add-form state
	let newTitle    = $state('');
	let newCategory = $state('general');

	// Inline-edit state
	let editingId    = $state<number | null>(null);
	let editingTitle = $state('');

	// ── Derived: todos shown on screen based on active filter ──────────────
	let visibleTodos = $derived(
		filter === 'all'    ? todos :
		filter === 'active' ? todos.filter((t) => t.done === 0) :
		                      todos.filter((t) => t.done === 1)
	);

	let doneCount  = $derived(todos.filter((t) => t.done === 1).length);
	let totalCount = $derived(todos.length);

	// ── Add ────────────────────────────────────────────────────────────────
	async function addTodo() {
		const title = newTitle.trim();
		if (!title) return;

		loading = true;
		const res = await fetch('/api/todos', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title, category: newCategory })
		});

		if (res.ok) {
			const todo: Todo = await res.json();
			todos = [todo, ...todos];
			newTitle = '';
		}
		loading = false;
	}

	// ── Toggle done ────────────────────────────────────────────────────────
	async function toggleTodo(id: number) {
		const res = await fetch(`/api/todos/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ toggle: true })
		});
		if (res.ok) {
			const updated: Todo = await res.json();
			todos = todos.map((t) => (t.id === id ? updated : t));
		}
	}

	// ── Delete ─────────────────────────────────────────────────────────────
	async function deleteTodo(id: number) {
		const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
		if (res.ok) {
			todos = todos.filter((t) => t.id !== id);
		}
	}

	// ── Inline edit ────────────────────────────────────────────────────────
	function startEditing(todo: Todo) {
		editingId    = todo.id;
		editingTitle = todo.title;
	}

	async function saveEdit(id: number) {
		if (editingTitle.trim() === '') {
			cancelEdit();
			return;
		}

		const res = await fetch(`/api/todos/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: editingTitle })
		});

		if (res.ok) {
			const updated: Todo = await res.json();
			todos = todos.map((t) => (t.id === id ? updated : t));
		}

		cancelEdit();
	}

	function cancelEdit() {
		editingId    = null;
		editingTitle = '';
	}

	function handleEditKeydown(e: KeyboardEvent, id: number) {
		if (e.key === 'Enter')  saveEdit(id);
		if (e.key === 'Escape') cancelEdit();
	}

	// ── Add on Enter ───────────────────────────────────────────────────────
	function handleAddKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') addTodo();
	}
</script>

<svelte:head>
	<title>My Todo App</title>
</svelte:head>

<main class="min-h-screen bg-gray-50 py-10 px-4">
	<div class="max-w-lg mx-auto">

		<!-- ── Header ─────────────────────────────────────────────────── -->
		<h1 class="text-3xl font-bold text-gray-800 mb-1 text-center">My Todos</h1>
		<p class="text-center text-sm text-gray-400 mb-8">
			{doneCount} of {totalCount} completed
		</p>

		<!-- ── Add Todo Form ──────────────────────────────────────────── -->
		<div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-6 space-y-3">
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={newTitle}
					onkeydown={handleAddKeydown}
					placeholder="What do you need to do?"
					class="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					disabled={loading}
				/>
				<button
					onclick={addTodo}
					disabled={loading || !newTitle.trim()}
					class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					Add
				</button>
			</div>

			<!-- Category selector -->
			<div class="flex items-center gap-2 flex-wrap">
				<span class="text-xs text-gray-500">Category:</span>
				{#each Object.entries(CATEGORIES) as [key, cat]}
					<button
						onclick={() => (newCategory = key)}
						class="text-xs px-2 py-1 rounded-full border transition-colors {
							newCategory === key
								? cat.color + ' border-transparent font-semibold'
								: 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
						}"
					>
						{cat.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- ── Filter Tabs ─────────────────────────────────────────────── -->
		<div class="flex gap-1 mb-4 bg-gray-200 rounded-lg p-1">
			{#each [{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'done', label: 'Done' }] as tab}
				<button
					onclick={() => (filter = tab.key as Filter)}
					class="flex-1 text-sm py-1.5 rounded-md font-medium transition-colors {
						filter === tab.key
							? 'bg-white text-gray-800 shadow-sm'
							: 'text-gray-500 hover:text-gray-700'
					}"
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- ── Todo List ───────────────────────────────────────────────── -->
		{#if visibleTodos.length === 0}
			<p class="text-center text-gray-400 text-sm mt-10">
				{filter === 'all' ? 'No todos yet. Add one above!' :
				 filter === 'active' ? 'No active todos. Nice work!' :
				 'No completed todos yet.'}
			</p>
		{:else}
			<ul class="space-y-2">
				{#each visibleTodos as todo (todo.id)}
					<li class="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm group">

						<!-- Checkbox -->
						<input
							type="checkbox"
							checked={todo.done === 1}
							onchange={() => toggleTodo(todo.id)}
							class="w-4 h-4 accent-blue-600 cursor-pointer flex-shrink-0"
						/>

						<!-- Title (or edit input) -->
						<div class="flex-1 min-w-0">
							{#if editingId === todo.id}
								<input
									type="text"
									bind:value={editingTitle}
									onkeydown={(e) => handleEditKeydown(e, todo.id)}
									onblur={() => saveEdit(todo.id)}
									class="w-full text-sm border-b border-blue-400 focus:outline-none bg-transparent pb-0.5"
									autofocus
								/>
							{:else}
								<button
									onclick={() => startEditing(todo)}
									class="text-left w-full text-sm text-gray-700 truncate {todo.done === 1 ? 'line-through text-gray-400' : ''} hover:text-blue-600 transition-colors"
									title="Click to edit"
								>
									{todo.title}
								</button>
							{/if}
						</div>

						<!-- Category badge -->
						<span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0 {
							(CATEGORIES[todo.category] ?? CATEGORIES.general).color
						}">
							{(CATEGORIES[todo.category] ?? CATEGORIES.general).label}
						</span>

						<!-- Delete button (visible on hover) -->
						<button
							onclick={() => deleteTodo(todo.id)}
							class="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 text-lg leading-none"
							title="Delete"
						>
							×
						</button>

					</li>
				{/each}
			</ul>
		{/if}

	</div>
</main>
