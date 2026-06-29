<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	// ── Types ───────────────────────────────────────────────────────────────
	type Todo = {
		id: number;
		title: string;
		done: number;
		category: string;
		priority: string;
		due_date: string | null;
		created_at: string;
	};
	type Filter = 'all' | 'active' | 'done';

	// ── Config: categories and priorities ───────────────────────────────────
	const CATEGORIES: Record<string, { label: string; color: string }> = {
		general:  { label: 'General',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
		work:     { label: 'Work',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
		personal: { label: 'Personal', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
		shopping: { label: 'Shopping', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
		health:   { label: 'Health',   color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' }
	};

	const PRIORITIES: Record<string, { label: string; dot: string; badge: string }> = {
		urgent: { label: 'Urgent', dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
		high:   { label: 'High',   dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
		medium: { label: 'Medium', dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
		low:    { label: 'Low',    dot: 'bg-blue-300',   badge: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' }
	};

	// ── Props & state ───────────────────────────────────────────────────────
	let { data }: { data: PageData } = $props();

	let todos    = $state(data.todos as Todo[]);
	let darkMode = $state(false);

	// Filters
	let filter         = $state<Filter>('all');
	let categoryFilter = $state('all');

	// Add-form
	let newTitle    = $state('');
	let newCategory = $state('general');
	let newPriority = $state('medium');
	let newDueDate  = $state('');
	let loading     = $state(false);

	// Inline title edit
	let editingId    = $state<number | null>(null);
	let editingTitle = $state('');

	// UI state
	let showShortcuts   = $state(false);
	let prefsLoaded     = $state(false);
	let newTitleInput   = $state<HTMLInputElement | null>(null);

	// ── Today's date (for due date comparison) ──────────────────────────────
	const today = new Date().toISOString().split('T')[0];

	// ── Derived values ──────────────────────────────────────────────────────
	let filteredByStatus = $derived(
		filter === 'all'    ? todos :
		filter === 'active' ? todos.filter((t) => t.done === 0) :
		                      todos.filter((t) => t.done === 1)
	);

	let visibleTodos = $derived(
		categoryFilter === 'all'
			? filteredByStatus
			: filteredByStatus.filter((t) => t.category === categoryFilter)
	);

	let doneCount    = $derived(todos.filter((t) => t.done === 1).length);
	let totalCount   = $derived(todos.length);
	let overdueCount = $derived(
		todos.filter((t) => t.done === 0 && t.due_date !== null && t.due_date < today).length
	);
	let progressPct  = $derived(totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100));

	// ── Load & save preferences (localStorage) ──────────────────────────────
	onMount(() => {
		const f  = localStorage.getItem('todo-filter');
		const cf = localStorage.getItem('todo-category-filter');
		const dm = localStorage.getItem('todo-dark') === 'true';

		if (f)  filter         = f as Filter;
		if (cf) categoryFilter = cf;
		darkMode = dm;

		prefsLoaded = true;
	});

	$effect(() => {
		// This runs whenever darkMode changes (in the browser only).
		document.documentElement.classList.toggle('dark', darkMode);
	});

	$effect(() => {
		if (!prefsLoaded) return;
		localStorage.setItem('todo-filter',          filter);
		localStorage.setItem('todo-category-filter', categoryFilter);
		localStorage.setItem('todo-dark',            String(darkMode));
	});

	// ── Due date helpers ────────────────────────────────────────────────────
	function dueDateBadge(dueDate: string | null, done: number) {
		if (!dueDate || done === 1) return null;
		const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
		if (dueDate < today)     return { text: 'Overdue',   cls: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' };
		if (dueDate === today)   return { text: 'Today',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' };
		if (dueDate === tomorrow) return { text: 'Tomorrow', cls: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300' };
		const d = new Date(dueDate + 'T00:00:00');
		return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' };
	}

	// ── Add todo ────────────────────────────────────────────────────────────
	async function addTodo() {
		const title = newTitle.trim();
		if (!title) return;

		loading = true;
		const res = await fetch('/api/todos', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title, category: newCategory, priority: newPriority, due_date: newDueDate || null })
		});

		if (res.ok) {
			const todo: Todo = await res.json();
			todos = [todo, ...todos];
			newTitle   = '';
			newDueDate = '';
		}
		loading = false;
	}

	// ── Toggle done ─────────────────────────────────────────────────────────
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

	// ── Delete one ──────────────────────────────────────────────────────────
	async function deleteTodo(id: number) {
		const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
		if (res.ok) todos = todos.filter((t) => t.id !== id);
	}

	// ── Bulk actions ────────────────────────────────────────────────────────
	async function markAllDone() {
		const active = todos.filter((t) => t.done === 0);
		await Promise.all(
			active.map((t) =>
				fetch(`/api/todos/${t.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ toggle: true })
				})
			)
		);
		todos = todos.map((t) => ({ ...t, done: 1 }));
	}

	async function clearCompleted() {
		const done = todos.filter((t) => t.done === 1);
		await Promise.all(done.map((t) => fetch(`/api/todos/${t.id}`, { method: 'DELETE' })));
		todos = todos.filter((t) => t.done === 0);
	}

	// ── Inline title edit ───────────────────────────────────────────────────
	function startEditing(todo: Todo) {
		editingId    = todo.id;
		editingTitle = todo.title;
	}

	async function saveEdit(id: number) {
		if (editingTitle.trim() === '') { cancelEdit(); return; }
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

	function cancelEdit() { editingId = null; editingTitle = ''; }

	function handleEditKeydown(e: KeyboardEvent, id: number) {
		if (e.key === 'Enter')  saveEdit(id);
		if (e.key === 'Escape') cancelEdit();
	}

	// ── Export ──────────────────────────────────────────────────────────────
	function download(content: string, filename: string, type: string) {
		const blob = new Blob([content], { type });
		const url  = URL.createObjectURL(blob);
		const a    = document.createElement('a');
		a.href = url; a.download = filename; a.click();
		URL.revokeObjectURL(url);
	}

	function exportJSON() {
		download(JSON.stringify(todos, null, 2), 'todos.json', 'application/json');
	}

	function exportCSV() {
		const header = 'id,title,done,category,priority,due_date,created_at';
		const rows   = todos.map(
			(t) => `${t.id},"${t.title.replace(/"/g, '""')}",${t.done === 1 ? 'yes' : 'no'},${t.category},${t.priority},${t.due_date ?? ''},${t.created_at}`
		);
		download([header, ...rows].join('\n'), 'todos.csv', 'text/csv');
	}

	// ── Global keyboard shortcuts ───────────────────────────────────────────
	function handleGlobalKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

		if (e.key === 'Escape') {
			showShortcuts = false;
			if (editingId !== null) cancelEdit();
			return;
		}
		if (isTyping) return; // don't trigger shortcuts while typing

		if (e.key === '?') { e.preventDefault(); showShortcuts = !showShortcuts; }
		if (e.key === 'n') { e.preventDefault(); newTitleInput?.focus(); }
		if (e.key === 'd') { e.preventDefault(); darkMode = !darkMode; }
		if (e.key === '1') { e.preventDefault(); filter = 'all'; }
		if (e.key === '2') { e.preventDefault(); filter = 'active'; }
		if (e.key === '3') { e.preventDefault(); filter = 'done'; }
	}
</script>

<svelte:head><title>My Todo App</title></svelte:head>
<svelte:window onkeydown={handleGlobalKeydown} />

<!-- ── Root wrapper: dark mode class lives here ───────────────────────────── -->
<div class="{darkMode ? 'dark' : ''} min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">

	<!-- ── Sticky header ──────────────────────────────────────────────────── -->
	<header class="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
		<div class="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
			<h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">My Todos</h1>
			<div class="flex items-center gap-2">
				<button
					onclick={() => (showShortcuts = true)}
					class="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					title="Keyboard shortcuts (?)"
				>?</button>
				<button
					onclick={() => (darkMode = !darkMode)}
					class="text-lg"
					title="Toggle dark mode (D)"
				>{darkMode ? '☀️' : '🌙'}</button>
			</div>
		</div>
	</header>

	<main class="max-w-lg mx-auto px-4 py-6 space-y-4">

		<!-- ── Stats bar ────────────────────────────────────────────────── -->
		<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
			<div class="flex justify-between items-center mb-2">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
					{doneCount} of {totalCount} completed · {progressPct}%
				</span>
				{#if overdueCount > 0}
					<span class="text-xs font-semibold text-red-600 dark:text-red-400">
						⚠ {overdueCount} overdue
					</span>
				{/if}
			</div>
			<!-- Progress bar -->
			<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
				<div
					class="bg-blue-500 h-2 rounded-full transition-all duration-500"
					style="width: {progressPct}%"
				></div>
			</div>
			<!-- Category counts -->
			{#if totalCount > 0}
				<div class="flex gap-2 mt-3 flex-wrap">
					{#each Object.entries(CATEGORIES) as [key, cat]}
						{@const count = todos.filter((t) => t.category === key).length}
						{#if count > 0}
							<span class="text-xs px-2 py-0.5 rounded-full {cat.color}">{cat.label}: {count}</span>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<!-- ── Add todo form ─────────────────────────────────────────────── -->
		<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm space-y-3">
			<!-- Title input -->
			<div class="flex gap-2">
				<input
					bind:this={newTitleInput}
					type="text"
					bind:value={newTitle}
					onkeydown={(e) => { if (e.key === 'Enter') addTodo(); }}
					placeholder="What do you need to do?  (press N to focus)"
					disabled={loading}
					class="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button
					onclick={addTodo}
					disabled={loading || !newTitle.trim()}
					class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>Add</button>
			</div>

			<!-- Options row -->
			<div class="flex flex-wrap gap-x-4 gap-y-2 text-xs">
				<!-- Category -->
				<div class="flex items-center gap-1.5 flex-wrap">
					<span class="text-gray-500 dark:text-gray-400">Category:</span>
					{#each Object.entries(CATEGORIES) as [key, cat]}
						<button
							onclick={() => (newCategory = key)}
							class="px-2 py-0.5 rounded-full border transition-colors {
								newCategory === key
									? cat.color + ' border-transparent font-semibold'
									: 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400'
							}"
						>{cat.label}</button>
					{/each}
				</div>

				<!-- Priority -->
				<div class="flex items-center gap-1.5 flex-wrap">
					<span class="text-gray-500 dark:text-gray-400">Priority:</span>
					{#each Object.entries(PRIORITIES) as [key, p]}
						<button
							onclick={() => (newPriority = key)}
							class="px-2 py-0.5 rounded-full border transition-colors {
								newPriority === key
									? p.badge + ' border-transparent font-semibold'
									: 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400'
							}"
						>{p.label}</button>
					{/each}
				</div>

				<!-- Due date -->
				<div class="flex items-center gap-1.5">
					<span class="text-gray-500 dark:text-gray-400">Due:</span>
					<input
						type="date"
						bind:value={newDueDate}
						min={today}
						class="border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
					/>
					{#if newDueDate}
						<button onclick={() => (newDueDate = '')} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
					{/if}
				</div>
			</div>
		</div>

		<!-- ── Controls: filter + category filter + bulk actions ─────────── -->
		<div class="space-y-2">
			<!-- Filter tabs -->
			<div class="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
				{#each [{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'done', label: 'Done' }] as tab}
					<button
						onclick={() => (filter = tab.key as Filter)}
						class="flex-1 text-sm py-1.5 rounded-md font-medium transition-colors {
							filter === tab.key
								? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm'
								: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
						}"
					>{tab.label}</button>
				{/each}
			</div>

			<!-- Category filter + bulk actions -->
			<div class="flex items-center gap-2 flex-wrap">
				<select
					bind:value={categoryFilter}
					class="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="all">All categories</option>
					{#each Object.entries(CATEGORIES) as [key, cat]}
						<option value={key}>{cat.label}</option>
					{/each}
				</select>

				<button
					onclick={markAllDone}
					disabled={todos.every((t) => t.done === 1)}
					class="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
				>✓ All done</button>

				<button
					onclick={clearCompleted}
					disabled={todos.every((t) => t.done === 0)}
					class="text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
				>✕ Clear done</button>
			</div>
		</div>

		<!-- ── Todo list ─────────────────────────────────────────────────── -->
		{#if visibleTodos.length === 0}
			<p class="text-center text-gray-400 dark:text-gray-500 text-sm py-10">
				{totalCount === 0
					? 'No todos yet. Add one above!'
					: filter === 'active' ? 'No active todos — great work!'
					: filter === 'done'   ? 'No completed todos yet.'
					:                       'No todos in this category.'}
			</p>
		{:else}
			<ul class="space-y-2">
				{#each visibleTodos as todo (todo.id)}
					{@const dueBadge   = dueDateBadge(todo.due_date, todo.done)}
					{@const priority   = PRIORITIES[todo.priority]   ?? PRIORITIES.medium}
					{@const category   = CATEGORIES[todo.category]   ?? CATEGORIES.general}

					<li class="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 shadow-sm group transition-opacity {todo.done === 1 ? 'opacity-60' : ''}">

						<!-- Priority dot -->
						<span class="w-2 h-2 rounded-full flex-shrink-0 {priority.dot}" title={priority.label}></span>

						<!-- Checkbox -->
						<input
							type="checkbox"
							checked={todo.done === 1}
							onchange={() => toggleTodo(todo.id)}
							class="w-4 h-4 accent-blue-600 cursor-pointer flex-shrink-0"
						/>

						<!-- Title or edit input -->
						<div class="flex-1 min-w-0">
							{#if editingId === todo.id}
								<input
									type="text"
									bind:value={editingTitle}
									onkeydown={(e) => handleEditKeydown(e, todo.id)}
									onblur={() => saveEdit(todo.id)}
									class="w-full text-sm border-b border-blue-400 focus:outline-none bg-transparent text-gray-800 dark:text-gray-100 pb-0.5"
									autofocus
								/>
							{:else}
								<button
									onclick={() => startEditing(todo)}
									class="text-left w-full text-sm truncate transition-colors {
										todo.done === 1
											? 'line-through text-gray-400 dark:text-gray-500'
											: 'text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400'
									}"
									title="Click to edit"
								>{todo.title}</button>
							{/if}
						</div>

						<!-- Badges: due date + category -->
						<div class="flex items-center gap-1.5 flex-shrink-0">
							{#if dueBadge}
								<span class="text-xs px-1.5 py-0.5 rounded {dueBadge.cls}">{dueBadge.text}</span>
							{/if}
							<span class="text-xs px-1.5 py-0.5 rounded-full {category.color}">{category.label}</span>
						</div>

						<!-- Delete (appears on hover) -->
						<button
							onclick={() => deleteTodo(todo.id)}
							class="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all text-xl leading-none"
							title="Delete"
						>×</button>

					</li>
				{/each}
			</ul>
		{/if}

		<!-- ── Export ────────────────────────────────────────────────────── -->
		{#if todos.length > 0}
			<div class="flex items-center justify-center gap-3 pt-2">
				<span class="text-xs text-gray-400 dark:text-gray-500">Export:</span>
				<button
					onclick={exportJSON}
					class="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
				>JSON</button>
				<button
					onclick={exportCSV}
					class="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
				>CSV</button>
			</div>
		{/if}

	</main>

	<!-- ── Keyboard shortcuts modal ──────────────────────────────────────── -->
	{#if showShortcuts}
		<!-- Backdrop -->
		<button
			class="fixed inset-0 bg-black/40 z-20 cursor-default"
			onclick={() => (showShortcuts = false)}
			aria-label="Close shortcuts"
		></button>

		<!-- Modal -->
		<div class="fixed inset-0 z-30 flex items-center justify-center p-4 pointer-events-none">
			<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm pointer-events-auto">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-bold text-gray-800 dark:text-gray-100">Keyboard Shortcuts</h2>
					<button
						onclick={() => (showShortcuts = false)}
						class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
					>×</button>
				</div>

				<table class="w-full text-sm">
					<tbody class="divide-y divide-gray-100 dark:divide-gray-700">
						{#each [
							['?',      'Open / close this panel'],
							['N',      'Focus the new todo input'],
							['D',      'Toggle dark mode'],
							['1',      'Filter: All'],
							['2',      'Filter: Active'],
							['3',      'Filter: Done'],
							['Enter',  'Add todo / save edit'],
							['Escape', 'Cancel edit / close modal'],
						] as [key, desc]}
							<tr>
								<td class="py-2 pr-4">
									<kbd class="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600">{key}</kbd>
								</td>
								<td class="py-2 text-gray-600 dark:text-gray-400">{desc}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

</div>
