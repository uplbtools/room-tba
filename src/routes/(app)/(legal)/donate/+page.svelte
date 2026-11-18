<script lang="ts">
	import { page } from '$app/state';

	const AMOUNTS = [50, 100, 200];

	let selected = $state(0);
	let custom = $state<number | null>(null);
	let message = $state('');
	let submitting = $state(false);
	let status = $state<{ text: string; kind: 'info' | 'error' | 'success' } | null>(
		page.url.searchParams.has('success')
			? { text: 'Salamat! Your donation went through.', kind: 'success' }
			: page.url.searchParams.has('cancelled')
				? { text: 'Checkout was cancelled. No charge was made.', kind: 'info' }
				: null
	);

	async function donate() {
		const amount = selected || Math.floor(custom ?? 0);
		if (!amount || amount < 10 || amount > 50000) {
			status = { text: 'Pick an amount between ₱10 and ₱50,000.', kind: 'error' };
			return;
		}
		submitting = true;
		try {
			const res = await fetch('/api/donate', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ amount, message })
			});
			const data = (await res.json()) as { checkout_url?: string; error?: string };
			if (!res.ok || !data.checkout_url) {
				status = { text: data.error ?? 'Something went wrong. Try again.', kind: 'error' };
				return;
			}
			location.href = data.checkout_url;
		} catch {
			status = { text: 'Network error. Check your connection and retry.', kind: 'error' };
		} finally {
			submitting = false;
		}
	}
</script>

<h1>Buy the volunteers a kape</h1>
<p>
	Room TBA and the rest of UPLB Tools are free, open-source and run by student volunteers. One-time
	donations cover operational costs first (hosting, database, domain), then contributor payouts,
	same as <a href="/sponsors">sponsorships</a>. Every peso is tracked in the
	<a href="https://www.uplb.tools/transparency">transparency report</a>.
</p>

<section class="donate-card" aria-label="Donation form">
	{#if status}
		<p class="status" data-kind={status.kind} role="status">{status.text}</p>
	{/if}
	<div class="amounts" role="group" aria-label="Choose an amount">
		{#each AMOUNTS as amount (amount)}
			<button
				type="button"
				class="amount"
				class:selected={selected === amount}
				onclick={() => {
					selected = amount;
					custom = null;
				}}
			>
				₱{amount}
			</button>
		{/each}
		<label class="custom">
			<span>Custom</span>
			<input
				type="number"
				min="10"
				max="50000"
				placeholder="₱"
				inputmode="numeric"
				bind:value={custom}
				oninput={() => (selected = 0)}
			/>
		</label>
	</div>
	<label class="message">
		<span>
			Message (optional). Donations are anonymous by default. Add a message if you want a dedication
			or to be acknowledged by name.
		</span>
		<input type="text" maxlength="200" placeholder="Salamat sa Room TBA!" bind:value={message} />
	</label>
	<button type="button" class="submit" disabled={submitting} onclick={donate}>
		{submitting ? 'Opening checkout…' : 'Donate'}
	</button>
	<p class="fineprint">
		Payments are processed by
		<a href="https://www.paymongo.com" target="_blank" rel="noopener noreferrer">PayMongo</a>
		via QR Ph, which works with GCash, Maya and bank apps. We never see your payment details. The minimum
		is ₱10. See our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
	</p>
</section>

<style>
	.donate-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 2rem;
		padding: 1.25rem;
		border-radius: 0.75rem;
		border: 1px solid hsl(5 30% 88%);
		background: hsl(5 20% 98%);
	}

	.status {
		margin: 0;
		padding: 0.625rem 0.875rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 0.9375rem;
	}

	.status[data-kind='success'] {
		background: hsl(145 50% 94%);
		color: hsl(145, 63%, 22%);
	}

	.status[data-kind='error'] {
		background: hsl(0 70% 96%);
		color: hsl(0, 72%, 35%);
	}

	.status[data-kind='info'] {
		background: hsl(208 50% 95%);
		color: hsl(208, 52%, 30%);
	}

	.amounts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: stretch;
	}

	.amount {
		flex: 1 1 4.5rem;
		padding: 0.75rem 1rem;
		border-radius: 0.625rem;
		border: 1px solid hsl(5 30% 80%);
		background: white;
		font-size: 1.0625rem;
		font-weight: 700;
		color: hsl(5, 53%, 32%);
		cursor: pointer;
	}

	.amount:hover {
		background: hsl(5 30% 96%);
	}

	.amount.selected {
		background: hsl(5, 53%, 32%);
		border-color: hsl(5, 53%, 32%);
		color: white;
	}

	.custom {
		flex: 1.5 1 7rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 0.75rem;
		border-radius: 0.625rem;
		border: 1px solid hsl(5 30% 80%);
		background: white;
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(0, 0%, 40%);
	}

	.custom input {
		width: 100%;
		min-width: 0;
		border: none;
		outline: none;
		padding: 0.75rem 0;
		font-size: 1.0625rem;
		font-weight: 700;
		color: hsl(5, 53%, 32%);
		background: transparent;
	}

	.message {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(0, 0%, 40%);
	}

	.message input {
		padding: 0.625rem 0.75rem;
		border-radius: 0.625rem;
		border: 1px solid hsl(5 30% 80%);
		font-size: 0.9375rem;
	}

	.submit {
		padding: 0.875rem 1rem;
		border-radius: 0.625rem;
		border: none;
		background: hsl(5, 53%, 32%);
		color: white;
		font-size: 1.0625rem;
		font-weight: 700;
		cursor: pointer;
	}

	.submit:hover:not(:disabled) {
		background: hsl(5, 53%, 40%);
	}

	.submit:disabled {
		opacity: 0.7;
		cursor: wait;
	}

	.fineprint {
		margin: 0;
		font-size: 0.8125rem;
		color: hsl(0, 0%, 40%);
		line-height: 1.55;
	}
</style>
