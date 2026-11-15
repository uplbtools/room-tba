<script lang="ts">
	import FollowUpdates from '#lib/components/community/FollowUpdates.svelte';
	import {
		DISCORD_URL,
		GITHUB_ROOM_TBA_URL,
		UPLB_TOOLS_URL
	} from '#lib/constants/content/links/community.js';
	import {
		CAMPUS_DATA_LICENSE,
		CAMPUS_DATA_LICENSE_URL,
		DATA_LICENSE_TERMS_PATH,
		OSM_COPYRIGHT_URL,
		SOFTWARE_LICENSE
	} from '#lib/constants/data-license.js';

	const reportIssueUrl = `${GITHUB_ROOM_TBA_URL}/issues/new/choose`;
</script>

<h1>Help &amp; FAQ</h1>
<p class="text-neutral-600">
	Short answers to questions students ask often. Room TBA is a
	<a href={UPLB_TOOLS_URL} target="_blank" rel="noopener noreferrer">UPLB Tools</a> volunteer project.
</p>

<article
	class="mt-8 flex flex-col gap-2.5 text-sm [&_details]:rounded-xl [&_details]:border [&_details]:border-neutral-200 [&_details]:bg-white [&_details]:px-4 [&_details]:py-3.5 [&_summary]:cursor-pointer [&_summary]:text-[0.9375rem] [&_summary]:font-semibold [&_summary]:text-[hsl(5,53%,28%)]"
>
	<details id="official">
		<summary>Is Room TBA an official UPLB site?</summary>
		<p>
			No. Room TBA is a student-run community tool under UPLB Tools. It is not affiliated with,
			endorsed by, or operated by the University of the Philippines Los Baños. For enrollment,
			grades, or official announcements, use university channels.
		</p>
	</details>

	<details id="3d-models">
		<summary>Where do the 3D models come from?</summary>
		<p>
			Building shapes are <strong>not</strong> imported CAD files or photogrammetry scans. The app
			builds a simple 3D view by
			<strong>extruding an OpenStreetMap (OSM) building footprint</strong> for that place.
		</p>
		<ul>
			<li>
				Floor count comes from OSM tags such as <code>building:levels</code> or
				<code>height</code>, or from a small default estimate when those tags are missing.
			</li>
			<li>
				Room dots on the model are placement markers aligned to the footprint. They are
				<strong>not</strong> official floor plans. Where an editor has not placed a room by hand,
				the marker's floor is read from the room code (<code>PS B-203</code> → floor 2) and its spot on
				that floor is an estimate along the corridor.
			</li>
			<li>
				If OSM has no footprint for a building, the viewer draws a clearly-labelled approximate box
				around its coordinates instead of showing nothing. The label stays until the building is
				mapped in OSM.
			</li>
			<li>
				Ground texture uses OSM-based map tiles. Map and building data ©
				<a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer"
					>OpenStreetMap contributors</a
				>.
			</li>
		</ul>
	</details>

	<details id="schedules">
		<summary>Where does class and room schedule data come from?</summary>
		<p>
			Volunteers import class offerings from AMIS/CRS each term. Class search can list lecture, lab,
			recitation, thesis, special problem, and similar sections; sections without a room in AMIS
			show as unassigned. Room schedules list lecture, lab, and similar sections that have an
			assigned room. Thesis and special-problem style rows usually have no facility in AMIS, so they
			often do not appear on a room timetable.
		</p>
		<p>
			Offerings can still change up to the last day of change of matriculation. Always double-check
			with your instructor or department when it matters.
		</p>
	</details>

	<details id="missing">
		<summary>Why is my class or room missing?</summary>
		<p>Common reasons:</p>
		<ul>
			<li>
				The section type is outside what room schedules show (for example thesis or special problem
				with no facility in AMIS).
			</li>
			<li>
				The AMIS facility string does not match our room codes yet (aliases and typos). Volunteers
				track that as data work.
			</li>
			<li>The building or room has not been added to the map database.</li>
		</ul>
		<p>See also how to <a href="#report">report wrong or missing data</a>.</p>
	</details>

	<details id="report">
		<summary>How do I report wrong data?</summary>
		<p>
			Open a GitHub issue with the room code, building name, or class section and what is wrong:
			<a href={reportIssueUrl} target="_blank" rel="noopener noreferrer">Report wrong data</a>. You
			can also ask in
			<a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Discord</a>. Signed-in
			contributors can use <strong>Suggest an edit</strong> in the app for many map fields.
		</p>
	</details>

	<details id="updates">
		<summary>How do I find out when something changes?</summary>
		<p>
			Every release is listed under <strong>What's new</strong> in the app menu. The bigger items also
			go out on the UPLB Tools accounts, so you see them without opening the app.
		</p>
		<div class="mt-3">
			<FollowUpdates
				note="Posted there: new features, corrections to room and class data, and the day each term's schedules land."
			/>
		</div>
	</details>

	<details id="data-license">
		<summary>Can I reuse Room TBA data?</summary>
		<p>It depends which layer you mean:</p>
		<ul>
			<li>
				<strong>App code</strong> is {SOFTWARE_LICENSE}. Fork for another campus is fine; replace
				the UPLB data.
			</li>
			<li>
				<strong>Community campus map data</strong> (buildings, rooms, dorms, orgs, pins, aliases
				curated here) is
				<a href={CAMPUS_DATA_LICENSE_URL} target="_blank" rel="noopener noreferrer"
					>{CAMPUS_DATA_LICENSE}</a
				>. Credit Room TBA / UPLB Tools.
			</li>
			<li>
				<strong>OpenStreetMap</strong> basemap tiles and building footprints stay under the
				<a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">ODbL</a>; keep OSM
				attribution.
			</li>
			<li>
				<strong>AMIS/CRS class schedules</strong> and similar university imports are not offered for bulk
				redistribution under an open license. Use the app; do not scrape and republish the registrar feed.
			</li>
		</ul>
		<p>Binding wording for contributors is in the <a href={DATA_LICENSE_TERMS_PATH}>Terms</a>.</p>
	</details>

	<details id="offline">
		<summary>Does the app work offline?</summary>
		<p>
			Yes, within limits. Room TBA is a PWA: after you visit online, campus data can stay cached in
			your browser (PGlite). Map tiles work offline if you already loaded them or used the offline
			maps download. A first visit with no signal will not have a full cache yet.
		</p>
	</details>
</article>
