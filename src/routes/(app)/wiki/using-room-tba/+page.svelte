<script lang="ts">
	import WikiProvenance from '../WikiProvenance.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<article class="wiki-article">
	<header class="article-hero">
		<h1 class="wiki-title">Finding a room, a class, or a way across campus</h1>
		<p class="wiki-lede">
			This page walks through the everyday jobs Room TBA is for, each in a few steps. Nothing here
			needs an account.
		</p>
		<WikiProvenance {data} />
	</header>

	<section aria-labelledby="find-room">
		<h2 id="find-room">Find a room or building</h2>
		<ol class="steps">
			<li>
				Open the <a href="/">map</a> and type into the search bar. A room code (CEM 101), a building name,
				or a nickname (BioSci) all work.
			</li>
			<li>
				Tap the result. The map centers on it, and the panel shows written walking directions where
				a volunteer has added them.
			</li>
			<li>
				For a list, browse the <a href="/building/">building directory</a>
				or the <a href="/room/">room directory</a>.
			</li>
		</ol>
		<p>
			If you’re not sure what a code means, see the <a href="/wiki/glossary">glossary</a>.
		</p>
	</section>

	<section aria-labelledby="find-class">
		<h2 id="find-class">Find out where a class meets</h2>
		<ol class="steps">
			<li>
				Open the menu and choose <strong>Classes</strong>, or search for the course code.
			</li>
			<li>Pick the term you want. Each term keeps its own set of classes.</li>
			<li>
				Open the section. If its room shows TBA, the room hasn’t been assigned in AMIS yet. Check
				again closer to the start of the term.
			</li>
		</ol>
		<p>
			Section letters such as B or ST encode the day and start time. See
			<a href="/wiki/section-times">what times section names correspond to</a>.
		</p>
	</section>

	<section aria-labelledby="plan-week">
		<h2 id="plan-week">Plan your week</h2>
		<ul class="break-list">
			<li>
				The <a href="/planner">class planner</a> lets you add sections by term, flags conflicts, and exports
				to your calendar.
			</li>
			<li>
				<a href="/today">Today</a> lists your classes in time order with a link to each room.
			</li>
			<li>
				<a href="/final-exams">Final exams</a> shows exam dates and rooms by term, taken from Office of
				the University Registrar releases.
			</li>
			<li>
				The <a href="/calendar">academic calendar</a> shows where today falls in the term.
			</li>
		</ul>
	</section>

	<section aria-labelledby="go-offline">
		<h2 id="go-offline">Use it with no signal</h2>
		<ol class="steps">
			<li>On Wi-Fi, open the menu and choose <strong>Offline maps</strong>.</li>
			<li>
				Tap <strong>Download campus map</strong>, then <strong>Download campus directory</strong>.
			</li>
			<li>
				The <a href="/wiki/emergency-hotlines">emergency hotlines</a> and
				<a href="/faq">FAQ</a> pages are saved on your device the first time you install the app.
			</li>
		</ol>
	</section>

	<section aria-labelledby="get-around">
		<h2 id="get-around">Get around campus</h2>
		<p>
			Open a building and choose directions for walking routes. For jeepneys and buses, read the
			<a href="/wiki/jeepney-guide">jeepney guide</a>.
		</p>
	</section>

	<section aria-labelledby="report-wrong">
		<h2 id="report-wrong">Report something wrong</h2>
		<ul class="break-list">
			<li>
				In the app, open the menu and choose <strong>Send feedback</strong>, or suggest an edit on
				the room or building itself.
			</li>
			<li>For a mistake on a wiki page, use “Report a correction” under the page title.</li>
			<li>
				More on how data is collected and corrected is in the
				<a href="/faq#report">FAQ</a>.
			</li>
		</ul>
	</section>

	<section aria-labelledby="official-sources">
		<h2 id="official-sources">What Room TBA doesn’t do</h2>
		<p>
			Room TBA is a student-run tool, not an official UPLB site. It can’t enroll you, show your
			grades, or confirm a graduation requirement. For those, and for the official academic
			calendar, use the
			<a href="https://our.uplb.edu.ph" target="_blank" rel="noopener noreferrer"
				>Office of the University Registrar</a
			>
			and AMIS. If Room TBA and an official notice disagree, the official notice wins.
		</p>
	</section>
</article>
