<script lang="ts">
	import {
		DISCORD_URL,
		GITHUB_ROOM_TBA_URL,
		MESSENGER_CONTRIBUTE_TARGET,
		UPLB_TOOLS_URL
	} from '#lib/constants/content/links/community.js';
	import {
		CAMPUS_DATA_LICENSE,
		CAMPUS_DATA_LICENSE_URL,
		CONTRIBUTOR_LICENSE_GRANT,
		DATA_LICENSE_FAQ_PATH,
		MAPTILER_COPYRIGHT_URL,
		OSM_COPYRIGHT_URL,
		SOFTWARE_LICENSE
	} from '#lib/constants/data-license.js';
</script>

<h1>Terms of Service</h1>
<p class="text-neutral-600">
	Last updated: July 28, 2026. By using Room TBA you agree to these terms. The service is provided
	by <a href={UPLB_TOOLS_URL} target="_blank" rel="noopener noreferrer">UPLB Tools</a> volunteers.
</p>

<section>
	<h2>The service</h2>
	<p>
		Room TBA helps UPLB students find rooms, buildings, schedules, and campus events on a map. We
		provide the site <strong>as is</strong>, free of charge, without guaranteed uptime, accuracy, or
		completeness.
	</p>
</section>

<section>
	<h2>Not official UPLB</h2>
	<p>
		Room TBA is a community tool. It is not affiliated with, endorsed by, or operated by the
		University of the Philippines Los Baños. Do not rely on it as your only source for enrollment,
		room assignments, or official announcements.
	</p>
</section>

<section>
	<h2>Data accuracy</h2>
	<p>
		Schedules and locations are crowd-maintained and imported from sources such as AMIS exports.
		They can be wrong, stale, or missing, especially during change of matriculation. Always verify
		critical information with your instructor, department, or official university channels.
	</p>
</section>

<section>
	<h2>Contributing and editing</h2>
	<ul>
		<li>
			<strong>In-app contributions.</strong> Use “Suggest an edit” or contributor tools inside the map.
			Do not submit false or malicious data.
		</li>
		<li>
			<strong>Review.</strong> Volunteer editors may approve, reject, or request changes to proposals
			before they go live.
		</li>
		<li>
			<strong>Editor accounts.</strong> Accounts are issued at maintainer discretion. Misuse may result
			in deactivation without notice.
		</li>
		<li>
			<strong>License to published edits.</strong>
			{CONTRIBUTOR_LICENSE_GRANT}
			Application source code remains under the repository {SOFTWARE_LICENSE} license.
		</li>
	</ul>
</section>

<section id="data-licenses">
	<h2>Data licenses</h2>
	<p>
		Room TBA mixes several sources. Short summary (see also the <a href={DATA_LICENSE_FAQ_PATH}
			>FAQ</a
		>):
	</p>
	<ul>
		<li>
			<strong>Software.</strong> Application code is {SOFTWARE_LICENSE} (see the repository
			<code>LICENSE</code> file).
		</li>
		<li>
			<strong>Community campus map data.</strong> Buildings, rooms, dorms, orgs, pins, aliases, and
			similar fields curated in Room TBA are offered under
			<a href={CAMPUS_DATA_LICENSE_URL} target="_blank" rel="noopener noreferrer"
				>{CAMPUS_DATA_LICENSE}</a
			>. Credit Room TBA / UPLB Tools when you reuse that data.
		</li>
		<li>
			<strong>Basemap and OpenStreetMap.</strong> Map tiles and OSM building footprints remain under
			the
			<a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer"
				>Open Database License (ODbL)</a
			>. Tile hosting also follows
			<a href={MAPTILER_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">MapTiler</a> terms.
		</li>
		<li>
			<strong>University system imports.</strong> Class schedules and related rows imported from
			AMIS/CRS, OUR finals, OSA directories, and similar sources are shown as-is for students. They
			are
			<strong>not</strong> offered under an open bulk-redistribution license.
		</li>
		<li>
			<strong>Path network.</strong> The campus walking network used by the travel-time tools is
			derived from
			<a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">OpenStreetMap</a> data,
			© OpenStreetMap contributors, available under the
			<a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer"
				>Open Database License (ODbL)</a
			>.
		</li>
	</ul>
</section>

<section>
	<h2>Acceptable use</h2>
	<p>You agree not to:</p>
	<ul>
		<li>Attempt to break, scrape, or overload the service.</li>
		<li>Bypass authentication or tamper with other users’ edits.</li>
		<li>Upload illegal, harassing, or unrelated content through editor tools.</li>
		<li>Impersonate official UPLB offices or staff.</li>
	</ul>
</section>

<section>
	<h2>Sponsored content</h2>
	<p>
		We may display clearly labeled promotions from local businesses to fund the project. Sponsored
		content does not imply endorsement by UPLB or UPLB Tools. We reserve the right to accept or
		reject any sponsor.
	</p>
</section>

<section>
	<h2>Disclaimer of warranties</h2>
	<p>
		THE SERVICE IS PROVIDED “AS IS” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
		MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
	</p>
</section>

<section>
	<h2>Limitation of liability</h2>
	<p>
		To the fullest extent permitted by law, UPLB Tools volunteers and contributors are not liable
		for any indirect, incidental, or consequential damages arising from your use of Room TBA,
		including missed classes, wrong rooms, or lost data.
	</p>
</section>

<section>
	<h2>Changes</h2>
	<p>
		We may modify these terms or discontinue features. Continued use after changes are posted
		constitutes acceptance of the updated terms.
	</p>
</section>

<section>
	<h2>Contact</h2>
	<p>
		Questions? Reach us on
		<a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Discord</a> or
		<a href={MESSENGER_CONTRIBUTE_TARGET} target="_blank" rel="noopener noreferrer">Messenger</a>,
		or open an issue on
		<a href={GITHUB_ROOM_TBA_URL} target="_blank" rel="noopener noreferrer">GitHub</a>.
	</p>
</section>
