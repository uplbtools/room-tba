<script lang="ts">
	import {
		DISCORD_URL,
		MESSENGER_CONTRIBUTE_TARGET,
		UPLB_TOOLS_URL
	} from '#lib/constants/content/links/community.js';
</script>

<h1>Privacy Policy</h1>
<p class="text-neutral-600">
	This page was last updated on August 6, 2026. Room TBA is operated by
	<a href={UPLB_TOOLS_URL} target="_blank" rel="noopener noreferrer">UPLB Tools</a> volunteers. This policy
	explains what we collect and why.
</p>

<section>
	<h2>What Room TBA is</h2>
	<p>
		Room TBA is a free campus map and schedule finder for UPLB students. It is <strong>not</strong> an
		official University of the Philippines Los Baños website. Class and room data are maintained by volunteers
		and may be incomplete or out of date.
	</p>
</section>

<section>
	<h2>Information we process</h2>
	<h3>Browsing the map (no account)</h3>
	<ul>
		<li>
			<strong>Usage analytics.</strong> We use Vercel Analytics on the public site to understand traffic
			patterns (page views, referrers). We don't intentionally collect your name or student number through
			analytics.
		</li>
		<li>
			<strong>Device storage.</strong> The app caches campus data in your browser (PGlite / IndexedDB)
			and may store preferences such as recent searches, term selection, and “don’t show again” for the
			welcome modal.
		</li>
		<li>
			<strong>In-app feedback (optional).</strong> If you send feedback from Settings, we store your message,
			the optional contact you typed, the screen you were on, the app version, and whether you were online.
			No email is required and your IP address is not stored.
		</li>
		<li>
			<strong>Location (optional).</strong> If you enable location on your device, the map may use your
			coordinates locally to show where you are. We don't persist your live GPS track on our servers.
		</li>
		<li>
			<strong>Online counter.</strong> To show how many people are using the map right now, your browser
			sends a random session id (kept only for the current tab) every 30 seconds. It isn't linked to an
			account, and we store nothing else with it, so there's no IP address and no user agent. The id is
			deleted once the session has been idle for 10 minutes.
		</li>
	</ul>

	<h3>Contributors and editors (signed in)</h3>
	<ul>
		<li>
			<strong>Account identifiers.</strong> Editor/contributor accounts store a username, hashed password,
			role, and optional display name.
		</li>
		<li>
			<strong>Edit proposals and published changes.</strong> Suggestions and approved edits record
			who submitted or approved them (<code>edited_by</code> and related audit fields).
		</li>
		<li>
			<strong>Session cookies.</strong> Signed-in sessions use httpOnly cookies scoped to this site.
		</li>
	</ul>

	<h3>Server and hosting</h3>
	<ul>
		<li>
			Campus data lives in a Postgres database (Supabase) accessed by our API routes. Hosting and
			logs are provided by Vercel and our database provider under their respective privacy policies.
		</li>
		<li>Optional event image uploads may be stored in Cloudflare R2 when configured.</li>
	</ul>
</section>

<section>
	<h2>What we don't sell</h2>
	<p>
		We don't sell your personal information. The interactive map runs no third-party ad networks.
	</p>
</section>

<section>
	<h2>Sponsored content</h2>
	<p>
		Room TBA displays curated sponsor promotions from local businesses. Sponsors are manually
		selected by our team. Sponsor placements use no ad networks, tracking pixels, or behavioral
		targeting. Sponsor images are hosted on our own servers. Clicking a sponsor link takes you to
		the sponsor's website. We don't share any of your data with sponsors.
	</p>
</section>

<section>
	<h2>Advertising on wiki pages</h2>
	<p>
		Wiki articles (pages under <code>/wiki</code>) may show ads served by Google AdSense. Ads never
		appear on the interactive map or other app screens. Google, as a third-party vendor, uses
		cookies to serve ads based on your prior visits to this or other websites. You can opt out of
		personalized advertising at
		<a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer"
			>Google Ads Settings</a
		>, and read how Google uses data from partner sites at
		<a
			href="https://policies.google.com/technologies/partner-sites"
			target="_blank"
			rel="noopener noreferrer">policies.google.com</a
		>.
	</p>
</section>

<section>
	<h2>Community channels</h2>
	<p>
		If you contact us on Discord or Messenger, those platforms handle messages under their own
		policies. Don't send passwords or sensitive personal data in public channels.
	</p>
</section>

<section>
	<h2>Your choices</h2>
	<ul>
		<li>Clear site data in your browser to remove local caches.</li>
		<li>Sign out of editor/contributor sessions when using shared devices.</li>
		<li>
			If you have an editor or contributor account, open <strong>Account settings</strong> (from the app
			menu) to change your display name, email or password, connect or disconnect a Google sign-in, download
			a copy of your account data, or delete your account. Deleting an account removes your email, display
			name and password. Past proposals and edit history remain on record, attributed to a deleted user,
			so the audit trail for published changes stays intact.
		</li>
	</ul>
</section>

<section>
	<h2>Changes</h2>
	<p>
		We may update this policy as the app evolves. Material changes will be reflected on this page
		with an updated date.
	</p>
</section>

<section>
	<h2>Contact</h2>
	<p>
		Questions about privacy? Reach the team via
		<a href={MESSENGER_CONTRIBUTE_TARGET} target="_blank" rel="noopener noreferrer">Messenger</a> or
		<a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Discord</a>.
	</p>
</section>
