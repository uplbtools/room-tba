## [1.18.1](https://github.com/uplbtools/room-tba/compare/v1.18.0...v1.18.1) (2026-06-30)


### Bug Fixes

* **dorm:** restore missing normalizeStringList import in DormResult ([d03ff29](https://github.com/uplbtools/room-tba/commit/d03ff29e2461da6dafe2fa6d4d4c00a92769c50d))

# [1.17.1](https://github.com/uplbtools/room-tba/compare/v1.17.0...v1.17.1) (2026-06-29)


### Bug Fixes

* **store:** compile runes module as index.svelte.ts ([67acd53](https://github.com/uplbtools/room-tba/commit/67acd535a9410e94c44625bb824dc23131c45ecf)), closes [#295](https://github.com/uplbtools/room-tba/issues/295)

# [1.17.0](https://github.com/uplbtools/room-tba/compare/v1.16.0...v1.17.0) (2026-06-29)


### Bug Fixes

* **ci:** restore semantic-release npmPublish false and drop git plugin ([61f2f9a](https://github.com/uplbtools/room-tba/commit/61f2f9ace2667b361f649166ee86465f1fa6c7d8)), closes [#357](https://github.com/uplbtools/room-tba/issues/357)
* **ui:** repair store split build and overlay click regressions ([625949e](https://github.com/uplbtools/room-tba/commit/625949e6cfb8e48e640c78f852e7c004f09b1f70))
* **ui:** restore browse modal chips, drawer layout, event action row ([#339](https://github.com/uplbtools/room-tba/issues/339) [#319](https://github.com/uplbtools/room-tba/issues/319)) ([#369](https://github.com/uplbtools/room-tba/issues/369)) ([47bfeea](https://github.com/uplbtools/room-tba/commit/47bfeea574ade89ef0f95b699b8f205b47f4d6e4))


### Features

* **admin:** entity merge pipeline for buildings, colleges, divisions, dorms ([50a1dca](https://github.com/uplbtools/room-tba/commit/50a1dca4b1d82f8da330b7766450671886d6cc84)), closes [#273](https://github.com/uplbtools/room-tba/issues/273) [#273](https://github.com/uplbtools/room-tba/issues/273)
* **batch:** 10 medium/high-priority tickets — deps, sync, admin, docs ([#365](https://github.com/uplbtools/room-tba/issues/365)) ([67943be](https://github.com/uplbtools/room-tba/commit/67943be064c014cd5c81afe2c5d129526bf0fb96)), closes [medium/hi#priority](https://github.com/medium/hi/issues/priority) [#281](https://github.com/uplbtools/room-tba/issues/281) [#229](https://github.com/uplbtools/room-tba/issues/229) [#216](https://github.com/uplbtools/room-tba/issues/216) [#161](https://github.com/uplbtools/room-tba/issues/161) [#281](https://github.com/uplbtools/room-tba/issues/281) [#229](https://github.com/uplbtools/room-tba/issues/229) [#216](https://github.com/uplbtools/room-tba/issues/216) [#161](https://github.com/uplbtools/room-tba/issues/161) [#283](https://github.com/uplbtools/room-tba/issues/283) [#285](https://github.com/uplbtools/room-tba/issues/285) [#332](https://github.com/uplbtools/room-tba/issues/332) [#333](https://github.com/uplbtools/room-tba/issues/333) [#334](https://github.com/uplbtools/room-tba/issues/334) [#341](https://github.com/uplbtools/room-tba/issues/341) [#169](https://github.com/uplbtools/room-tba/issues/169) [#231](https://github.com/uplbtools/room-tba/issues/231) [#205](https://github.com/uplbtools/room-tba/issues/205) [#231](https://github.com/uplbtools/room-tba/issues/231) [#205](https://github.com/uplbtools/room-tba/issues/205) [#155](https://github.com/uplbtools/room-tba/issues/155)
* **batch:** 10 small tickets — telemetry, schedule, middleware, stacking, tests ([#363](https://github.com/uplbtools/room-tba/issues/363)) ([633bce5](https://github.com/uplbtools/room-tba/commit/633bce5452fe22ce47549f2d76bb8145a5738c53)), closes [#237](https://github.com/uplbtools/room-tba/issues/237) [#241](https://github.com/uplbtools/room-tba/issues/241) [#302](https://github.com/uplbtools/room-tba/issues/302) [#270](https://github.com/uplbtools/room-tba/issues/270) [#241](https://github.com/uplbtools/room-tba/issues/241) [#302](https://github.com/uplbtools/room-tba/issues/302) [#313](https://github.com/uplbtools/room-tba/issues/313) [#270](https://github.com/uplbtools/room-tba/issues/270) [#247](https://github.com/uplbtools/room-tba/issues/247) [#263](https://github.com/uplbtools/room-tba/issues/263) [#247](https://github.com/uplbtools/room-tba/issues/247) [#263](https://github.com/uplbtools/room-tba/issues/263)
* **batch:** 15 issues — hover preview, build cache, merge pipeline, campus partners, dark mode, contributor profiles, dev credits, class refresh, events, visual pass, editor pins, proposals ([#388](https://github.com/uplbtools/room-tba/issues/388)) ([24c985f](https://github.com/uplbtools/room-tba/commit/24c985f83114ee7a42eed0584b178d25a75aa573)), closes [#288](https://github.com/uplbtools/room-tba/issues/288) [#331](https://github.com/uplbtools/room-tba/issues/331) [#273](https://github.com/uplbtools/room-tba/issues/273) [#257](https://github.com/uplbtools/room-tba/issues/257) [#264](https://github.com/uplbtools/room-tba/issues/264) [#248](https://github.com/uplbtools/room-tba/issues/248) [#381](https://github.com/uplbtools/room-tba/issues/381) [#310](https://github.com/uplbtools/room-tba/issues/310) [#275](https://github.com/uplbtools/room-tba/issues/275) [#274](https://github.com/uplbtools/room-tba/issues/274) [#287](https://github.com/uplbtools/room-tba/issues/287) [#254](https://github.com/uplbtools/room-tba/issues/254) [#247](https://github.com/uplbtools/room-tba/issues/247) [#238](https://github.com/uplbtools/room-tba/issues/238) [#255](https://github.com/uplbtools/room-tba/issues/255)
* **batch:** 5 small tickets — pin validation, schedule theme, PWA install, changelog, offline ([#354](https://github.com/uplbtools/room-tba/issues/354)) ([0f0e027](https://github.com/uplbtools/room-tba/commit/0f0e027866a32aa4823ad0d2fd0e2687e13fce7a)), closes [#283](https://github.com/uplbtools/room-tba/issues/283) [#240](https://github.com/uplbtools/room-tba/issues/240) [#213](https://github.com/uplbtools/room-tba/issues/213) [#212](https://github.com/uplbtools/room-tba/issues/212) [#101](https://github.com/uplbtools/room-tba/issues/101)
* **batch:** class browse, ops guards, sync, aliases, backup ([#367](https://github.com/uplbtools/room-tba/issues/367)) ([0aefc94](https://github.com/uplbtools/room-tba/commit/0aefc94b965c8da22861463e411c6f1f6bfbba57)), closes [#281](https://github.com/uplbtools/room-tba/issues/281) [#229](https://github.com/uplbtools/room-tba/issues/229) [#216](https://github.com/uplbtools/room-tba/issues/216) [#161](https://github.com/uplbtools/room-tba/issues/161) [#281](https://github.com/uplbtools/room-tba/issues/281) [#229](https://github.com/uplbtools/room-tba/issues/229) [#216](https://github.com/uplbtools/room-tba/issues/216) [#161](https://github.com/uplbtools/room-tba/issues/161) [#283](https://github.com/uplbtools/room-tba/issues/283) [#285](https://github.com/uplbtools/room-tba/issues/285) [#332](https://github.com/uplbtools/room-tba/issues/332) [#333](https://github.com/uplbtools/room-tba/issues/333) [#334](https://github.com/uplbtools/room-tba/issues/334) [#341](https://github.com/uplbtools/room-tba/issues/341) [#169](https://github.com/uplbtools/room-tba/issues/169) [#231](https://github.com/uplbtools/room-tba/issues/231) [#205](https://github.com/uplbtools/room-tba/issues/205) [#231](https://github.com/uplbtools/room-tba/issues/231) [#205](https://github.com/uplbtools/room-tba/issues/205) [#155](https://github.com/uplbtools/room-tba/issues/155) [#155](https://github.com/uplbtools/room-tba/issues/155)
* **contributor-progress:** building and room completeness dashboard ([#315](https://github.com/uplbtools/room-tba/issues/315)) ([282098a](https://github.com/uplbtools/room-tba/commit/282098a28e481c05db225ce62ec800a4536c59f6))
* **final-exams:** viewer, schema, import, and room panel ([#327](https://github.com/uplbtools/room-tba/issues/327)) ([b87f110](https://github.com/uplbtools/room-tba/commit/b87f110d1eed1279c8c80e7adea0a327c7b83547))
* **opt:** seamless bootstrap, offline toasts, latency health, perf spot-check ([#336](https://github.com/uplbtools/room-tba/issues/336) [#101](https://github.com/uplbtools/room-tba/issues/101) [#313](https://github.com/uplbtools/room-tba/issues/313) [#263](https://github.com/uplbtools/room-tba/issues/263)) ([#372](https://github.com/uplbtools/room-tba/issues/372)) ([f5063ba](https://github.com/uplbtools/room-tba/commit/f5063baa34f1b736fa8ef1157d7fbb1e29493810))
* **opt:** seamless bootstrap, offline toasts, latency health, perf spot-check ([#336](https://github.com/uplbtools/room-tba/issues/336) [#101](https://github.com/uplbtools/room-tba/issues/101) [#313](https://github.com/uplbtools/room-tba/issues/313) [#263](https://github.com/uplbtools/room-tba/issues/263)) ([#372](https://github.com/uplbtools/room-tba/issues/372)) ([#373](https://github.com/uplbtools/room-tba/issues/373)) ([ee225e7](https://github.com/uplbtools/room-tba/commit/ee225e775796bc4c350c30e899bc2ee9cd71c39a))
* **schedule-route:** import personal schedule and multi-stop routing ([#329](https://github.com/uplbtools/room-tba/issues/329)) ([c0205c7](https://github.com/uplbtools/room-tba/commit/c0205c7a81e3450a25f9271f03d94a598e19be78))
* **ui:** overlay stacking, PWA guards, changelog overview ([#302](https://github.com/uplbtools/room-tba/issues/302), [#321](https://github.com/uplbtools/room-tba/issues/321)-323, [#212](https://github.com/uplbtools/room-tba/issues/212)) ([f4a0c8b](https://github.com/uplbtools/room-tba/commit/f4a0c8b42160f394cf333e0943061d4c61f4a7df)), closes [#321-323](https://github.com/uplbtools/room-tba/issues/321-323) [#322](https://github.com/uplbtools/room-tba/issues/322) [#323](https://github.com/uplbtools/room-tba/issues/323)

# [1.16.0](https://github.com/uplbtools/room-tba/compare/v1.15.0...v1.16.0) (2026-06-29)


### Features

* **batch:** 5 small tickets — pin validation, schedule theme, PWA install, changelog, offline ([#354](https://github.com/uplbtools/room-tba/issues/354)) ([#355](https://github.com/uplbtools/room-tba/issues/355)) ([89969c1](https://github.com/uplbtools/room-tba/commit/89969c169795f0880a1ea4f92a753ea5d9adb9c7)), closes [#283](https://github.com/uplbtools/room-tba/issues/283) [#240](https://github.com/uplbtools/room-tba/issues/240) [#213](https://github.com/uplbtools/room-tba/issues/213) [#212](https://github.com/uplbtools/room-tba/issues/212) [#101](https://github.com/uplbtools/room-tba/issues/101)

# [1.15.0](https://github.com/uplbtools/room-tba/compare/v1.14.0...v1.15.0) (2026-06-29)


### Features

* **ui:** sync copy, action chips, LEC/LAB grouping ([#338](https://github.com/uplbtools/room-tba/issues/338), [#319](https://github.com/uplbtools/room-tba/issues/319), [#301](https://github.com/uplbtools/room-tba/issues/301)) ([ec503e5](https://github.com/uplbtools/room-tba/commit/ec503e53fc6d698dd7f5cd9f0d67dac86fb91504))

# [1.14.0](https://github.com/uplbtools/room-tba/compare/v1.13.1...v1.14.0) (2026-06-29)


### Bug Fixes

* **pwa:** load legal pages outside fallback ([5571e79](https://github.com/uplbtools/room-tba/commit/5571e7939f0e58e430bf2c6cdc602c344ab6e601))
* **schedule:** bind canvas element ref instead of getElementById ([8738719](https://github.com/uplbtools/room-tba/commit/873871910ad2b27243414c072b17e1dd221adb76)), closes [#330](https://github.com/uplbtools/room-tba/issues/330)
* **search:** make recent search remove button work ([28454da](https://github.com/uplbtools/room-tba/commit/28454da4b209c8b4a2d55c60b6f0c1c52b36d764)), closes [#326](https://github.com/uplbtools/room-tba/issues/326)
* **ui:** close jeepney stop panel when query changes ([ff86769](https://github.com/uplbtools/room-tba/commit/ff86769d771ada9ece6d6913c87562f24df333a7)), closes [#324](https://github.com/uplbtools/room-tba/issues/324)
* **ux:** open Contributors on Campus team tab ([dae07dd](https://github.com/uplbtools/room-tba/commit/dae07dd0cb4e16bc365ca13e98a3513baf4f5c40)), closes [#320](https://github.com/uplbtools/room-tba/issues/320)


### Features

* **batch:** 5 small tickets — refresh, class counts, transit exclusivity, stop panel, z-index fix ([#344](https://github.com/uplbtools/room-tba/issues/344)) ([6b8eb45](https://github.com/uplbtools/room-tba/commit/6b8eb4583e9d4fb353b4392160fd722d5ce16aa9)), closes [#340](https://github.com/uplbtools/room-tba/issues/340) [#337](https://github.com/uplbtools/room-tba/issues/337) [#342](https://github.com/uplbtools/room-tba/issues/342) [#324](https://github.com/uplbtools/room-tba/issues/324) [#339](https://github.com/uplbtools/room-tba/issues/339)

# [1.13.1](https://github.com/uplbtools/room-tba/compare/v1.13.0...v1.13.1) (2026-06-28)


### Bug Fixes

* **amis:** correct CRS term IDs and harden import pipeline ([a93b89e](https://github.com/uplbtools/room-tba/commit/a93b89ee472e820e522105184ee1451cb4582555))

# [1.13.0](https://github.com/uplbtools/room-tba/compare/v1.12.0...v1.13.0) (2026-06-28)


### Bug Fixes

* **copy:** repair terms typos and finish em-dash cleanup ([bf3ae16](https://github.com/uplbtools/room-tba/commit/bf3ae1655d7cdf30a492158d2def128384812f25))
* **map:** tighten map chrome layout and mobile panel exclusivity ([8a3974e](https://github.com/uplbtools/room-tba/commit/8a3974e71119f5ef75281b420c3f91b6ec58f561))
* **ui:** improve entity detail panels on mobile and narrow widths ([70e511e](https://github.com/uplbtools/room-tba/commit/70e511e061e1ea3ac4e1a816accf8bcff8baaddf))
* **ui:** keep term selector visible in map edit mode ([5229493](https://github.com/uplbtools/room-tba/commit/5229493c0b5c4f0b1d8bfea0e6cb51bc22898f6f))


### Features

* AMIS class import, term calendar, and map UI fixes ([#314](https://github.com/uplbtools/room-tba/issues/314)) ([7ec9f02](https://github.com/uplbtools/room-tba/commit/7ec9f02d1ef9b2d9360330d45924f10a2fb5d597))
* **amis:** add import pipeline with sanitized local cache ([b046501](https://github.com/uplbtools/room-tba/commit/b04650146fd035435430e94edf10ffcd53a5b090))
* **db:** add term calendar migrations and midyear fixes ([9b2778f](https://github.com/uplbtools/room-tba/commit/9b2778f7f737ecc2058141cfbe5f7b01ab14f9ec))
* **ui:** polish term selector and add jeepney stop modal ([1684b13](https://github.com/uplbtools/room-tba/commit/1684b136852a5e75855347f137162ee32ab8821e))
* **ui:** sync term selection through URLs and static entity pages ([4a45d10](https://github.com/uplbtools/room-tba/commit/4a45d10f24e99fe8587f1cb20441691fb39a70c0))

# [1.12.0](https://github.com/uplbtools/room-tba/compare/v1.11.0...v1.12.0) (2026-06-28)


### Features

* **chrome:** legal pages, community links, and status bar rework ([#303](https://github.com/uplbtools/room-tba/issues/303)) ([39ace06](https://github.com/uplbtools/room-tba/commit/39ace060a779c054dab089443774837200b70e36))

# [1.11.0](https://github.com/uplbtools/room-tba/compare/v1.10.0...v1.11.0) (2026-06-28)


### Bug Fixes

* **a11y:** fix clipped focus rings and unify action chip hovers ([07ff6cb](https://github.com/uplbtools/room-tba/commit/07ff6cbb3ab1559b7bad3b67c14fd9cb239ce71d))
* **a11y:** improve map UI accessibility for dialogs and panels ([e4c3c21](https://github.com/uplbtools/room-tba/commit/e4c3c213a3b566fdd3dd4e66005cbe2b46250d6f))
* **contributor:** hide event propose name field until propose is clicked ([865c220](https://github.com/uplbtools/room-tba/commit/865c2208e5110366c8753d038f5244116a0cf6cd))
* **dorms:** harden amenity parsing for quoted Postgres arrays ([224f07d](https://github.com/uplbtools/room-tba/commit/224f07d0004c5114752470dd3005674065e1e7eb))
* **dorms:** strip quote wrappers from amenity chips ([d5cc921](https://github.com/uplbtools/room-tba/commit/d5cc92150235dca13479727193124d88ec76d1f3))
* **map-chrome:** clarify status bar directions progress and catalog date ([e999233](https://github.com/uplbtools/room-tba/commit/e9992333b89b8255ef3260a15878a9832cf82ac3))
* **map-chrome:** collapse status bar details by default on narrow layouts ([1206df4](https://github.com/uplbtools/room-tba/commit/1206df4a533960002b82f7f5cf96001f67900e72))
* **map-chrome:** fix attribution expand lifting FABs and dedupe editor entry ([11a1756](https://github.com/uplbtools/room-tba/commit/11a17560ec27c87758a5f70fdbd729090221af1d))
* **map-chrome:** fix bottom gradient leaking map pixels ([4e8b549](https://github.com/uplbtools/room-tba/commit/4e8b549e2d479528e02c477bae2997790941c890))
* **map-chrome:** fix map tools mode row and restore campus tour toggle ([7578d37](https://github.com/uplbtools/room-tba/commit/7578d37dc320e0d8f00868d276d1eec66ddd669f))
* **map-chrome:** fix map tools panel positioning after motion pass ([a01d04c](https://github.com/uplbtools/room-tba/commit/a01d04c9a2efb9cdf15fbce60c93b5061b3ae258))
* **map-chrome:** fix mobile padding and FAB placement ([848d43b](https://github.com/uplbtools/room-tba/commit/848d43b471b35ca6bdbc8c2469faf85777c1fb09))
* **map-chrome:** prevent editor shelf clip in search chrome ([6b42d0d](https://github.com/uplbtools/room-tba/commit/6b42d0d1884180070411e5123a95860b3f3d0c16))
* **map-chrome:** remove hover-triggered scrollbar from search chip row ([78d1550](https://github.com/uplbtools/room-tba/commit/78d1550777c941062e5c3b4791437970a9cc2ef6))
* **map-chrome:** remove unnecessary horizontal scroll from map tools ([016b1cd](https://github.com/uplbtools/room-tba/commit/016b1cd6ca532fad926f1f808a104b968e73c49b))
* **map-chrome:** restore spacious mobile map tools sheet ([0ab45bb](https://github.com/uplbtools/room-tba/commit/0ab45bbeb9a98e71cbce44e3cdc99ddf59ba134b))
* **map-chrome:** restore two-row expanded status bar with sync transparency ([3aa63d2](https://github.com/uplbtools/room-tba/commit/3aa63d2e38bb4621f35dbedc47af2fc8b57bb46d))
* **map:** align compass icon when map bearing is north ([1c530b1](https://github.com/uplbtools/room-tba/commit/1c530b1227ac429fb0f8267f865c4cc1424b3dea))
* **map:** hide 3D building extrusions in flat 2D view ([5400f15](https://github.com/uplbtools/room-tba/commit/5400f1515d3688b420a68595b66a2ee4211c1143))
* **map:** raise building pins above events and dedupe pin labels ([3d278cb](https://github.com/uplbtools/room-tba/commit/3d278cb62af0989aea2eb14992dccbe8b8869dcb))
* **map:** remove dead campus tour control that broke hydration ([939fc9d](https://github.com/uplbtools/room-tba/commit/939fc9dba8cd42094fc777b47c4f38384102456b))
* **map:** set basemap preset to warm stone not neutral greige ([c6b6dd8](https://github.com/uplbtools/room-tba/commit/c6b6dd85b05926e6d20b2ce5f1c6f2a9786b4802))
* **security:** harden image URL validation and layout observer crash ([9b10199](https://github.com/uplbtools/room-tba/commit/9b1019995cec2b808fa8dabecd989cb3a7f560ef))
* **ui:** dismiss loading shell when hydration fails to start ([b8cd003](https://github.com/uplbtools/room-tba/commit/b8cd003eb107843003932f43adf472c4239fc699))
* **ui:** fix bootstrap loading overlay that never dismisses ([52a7c00](https://github.com/uplbtools/room-tba/commit/52a7c00f97e2c17e3fefaabf6b145899eed585e6))
* **ui:** landing modal tabs and stale events cache on boot ([01a91fa](https://github.com/uplbtools/room-tba/commit/01a91fa00292a1d1e3ea31dbce3909c8558f1056))


### Features

* **api:** add term-aware class queries and GET /api/terms ([9f897c8](https://github.com/uplbtools/room-tba/commit/9f897c8d79bcb5b0715d65d27b25df033bd0b0b9))
* **contributor:** replace Google Forms links with in-app propose flow ([896bbb2](https://github.com/uplbtools/room-tba/commit/896bbb23fda6c115f43e0f0b3066348251be886d))
* **db:** add terms table and seed UPLB semesters ([6d5b82f](https://github.com/uplbtools/room-tba/commit/6d5b82fef27f771d6fe3653935c470874a1f1694))
* **editor:** foundation refactor and map chrome componentization ([8d4cfa4](https://github.com/uplbtools/room-tba/commit/8d4cfa461ab5ad7adac1f0ba749d2e27358dfc86))
* **editor:** move tools to top-bar chip, shelf, and add-to-map modal ([327dd07](https://github.com/uplbtools/room-tba/commit/327dd07da68464ae7d2f31b41058858764c03509))
* **editor:** open dashboard full-screen on mobile ([533e1ff](https://github.com/uplbtools/room-tba/commit/533e1ff789a0233eeec870f9400021e751000170))
* **events:** add Cloudflare R2 image upload for event photos ([a58708b](https://github.com/uplbtools/room-tba/commit/a58708b3bc88c01ea65cb4c2734ad1b5eff7bf74))
* **events:** include campus date in map pin labels ([54edf54](https://github.com/uplbtools/room-tba/commit/54edf541cb2f5b1f6235fbf6901f0aece6a4a3bc))
* **map-chrome:** add functional motion transitions ([c229b2e](https://github.com/uplbtools/room-tba/commit/c229b2ea74b1901271d227739c1ab46ab44ceb57))
* **map-chrome:** unify bottom tray, transit chip, Supabase, and event images ([267e6e9](https://github.com/uplbtools/room-tba/commit/267e6e9d8ca2e5b52a367ddf587a485cbda3adc3))
* **map:** gate auto-rotate behind opt-in and motion policy ([ac3bc81](https://github.com/uplbtools/room-tba/commit/ac3bc81923a27539902fecb156383572b11c3311))
* **map:** sync entity selection to canonical browser URLs ([cec355e](https://github.com/uplbtools/room-tba/commit/cec355e7535ad3891184d04d78c6b6f3214d498a))
* **side-panel:** add copy-link actions for room and dorm panels ([ba5b19d](https://github.com/uplbtools/room-tba/commit/ba5b19d9c4ad8f263004c6e5de382cd4bdc74dc7))
* **store:** add term selection and room class cache ([0b9ec4a](https://github.com/uplbtools/room-tba/commit/0b9ec4af2cec98a0c52243b53e26d9afe5727a7d))
* **ui:** add term selector to expanded status bar ([df119a5](https://github.com/uplbtools/room-tba/commit/df119a577591737cf50d0168851ca3e4dd295ae3))
* **ui:** filter room schedule by active term ([185c83d](https://github.com/uplbtools/room-tba/commit/185c83df13cf23c1a6f23ee839cac0cea4aae9a9))
* **ui:** show loading state while campus data sync is pending ([6626e80](https://github.com/uplbtools/room-tba/commit/6626e8039021e94844dddf842fd0ef3c2ae13917))
* **ui:** show map immediately and sync campus data in background ([902a038](https://github.com/uplbtools/room-tba/commit/902a03830f6d401553c31431b92d57c535d45889))

# [1.10.0](https://github.com/uplbtools/room-tba/compare/v1.9.0...v1.10.0) (2026-06-25)


### Bug Fixes

* **auth:** rename isAdmin store flag to isLoggedIn ([#203](https://github.com/uplbtools/room-tba/issues/203)) ([f18a160](https://github.com/uplbtools/room-tba/commit/f18a160234c85db586a2c565c410a31da3b1eb52))
* **ci:** do not fail release when version sync PR is blocked ([6170b5b](https://github.com/uplbtools/room-tba/commit/6170b5ba44121b9f7d4edde22598554ba866b916))
* **proposals:** harden approval flow, entity checks, and GET access ([#208](https://github.com/uplbtools/room-tba/issues/208)) ([b5e9573](https://github.com/uplbtools/room-tba/commit/b5e957368be5714fd876f453b8aad3b837babb65))
* **pwa:** raise Workbox precache limit for AppRoot bundle ([447212c](https://github.com/uplbtools/room-tba/commit/447212c1bc320773b74d23bb9eadf3e20b8b619f))
* **search:** unblock typing after event selection and stale room fallback ([8e58322](https://github.com/uplbtools/room-tba/commit/8e583228f1a7e085fc838536bff80c6dd38a9f2f))
* **ui:** improve landing modal scroll and backdrop blur ([bdd4944](https://github.com/uplbtools/room-tba/commit/bdd4944d31fac510c3516504fa43efeab5ad9146))


### Features

* **auth:** add multi-user editor sessions and publish role gates ([#203](https://github.com/uplbtools/room-tba/issues/203)) ([a86c3c3](https://github.com/uplbtools/room-tba/commit/a86c3c34e82efe6038cd293671fd517bc2eefed8))
* **db:** add admin_users and edit_proposals schema migrations ([610150c](https://github.com/uplbtools/room-tba/commit/610150c4d26158eefe25347207169ad254e2643b)), closes [#203](https://github.com/uplbtools/room-tba/issues/203) [#208](https://github.com/uplbtools/room-tba/issues/208)
* **editor:** add admin POST routes for direct entity creation ([a0b9246](https://github.com/uplbtools/room-tba/commit/a0b9246bf25e8aa348ecaa19a1c1d0ab4404837a))
* **editor:** add create affordances in publisher shield menu ([e3ad02a](https://github.com/uplbtools/room-tba/commit/e3ad02a13f9edd79ed9571e0e8d1439d34b2df6e))
* **proposals:** add addition proposal store and event placement state ([#208](https://github.com/uplbtools/room-tba/issues/208)) ([b676581](https://github.com/uplbtools/room-tba/commit/b6765817022c7736cc4c4a2801372f4d5359f6f3))
* **proposals:** add admin create helpers for new entities ([#208](https://github.com/uplbtools/room-tba/issues/208)) ([16387e0](https://github.com/uplbtools/room-tba/commit/16387e08888b4a0c37c2e9a810dbe94340f55659))
* **proposals:** add client helpers for create proposals ([#208](https://github.com/uplbtools/room-tba/issues/208)) ([f988fd6](https://github.com/uplbtools/room-tba/commit/f988fd635f89cf4821222451b71ed60b0a1d320f))
* **proposals:** add edit proposal service and API routes ([#208](https://github.com/uplbtools/room-tba/issues/208)) ([cfa62d3](https://github.com/uplbtools/room-tba/commit/cfa62d301ec74281dfbf980832bfafa4ac7e80e4))
* **proposals:** add map UI for proposing new campus entities ([#208](https://github.com/uplbtools/room-tba/issues/208)) ([71239e2](https://github.com/uplbtools/room-tba/commit/71239e2ba509a1679d9754210bad231e71af7bc6))
* **proposals:** add suggest-edit UI, review panel, and map pin proposals ([#208](https://github.com/uplbtools/room-tba/issues/208)) ([30c6d80](https://github.com/uplbtools/room-tba/commit/30c6d80b28238d459de13cbdf01ab9659260aaef))
* **proposals:** support create proposals in service and review UI ([#208](https://github.com/uplbtools/room-tba/issues/208)) ([a600947](https://github.com/uplbtools/room-tba/commit/a600947a88db04b45c07417f1b84f7a51271bb8a))
* **rooms:** detect duplicate names and offer in-app merge ([489da72](https://github.com/uplbtools/room-tba/commit/489da723ef01d04de9d0bb213b0a15158f990952))
* **taxonomy:** link divisions to parent colleges ([e81e509](https://github.com/uplbtools/room-tba/commit/e81e509139cf474ce0dc6bfbd2742234b5b0dd2a))

# [1.9.0](https://github.com/uplbtools/room-tba/compare/v1.8.0...v1.9.0) (2026-06-25)


### Bug Fixes

* **ci:** repair release workflow version read step ([3c18283](https://github.com/uplbtools/room-tba/commit/3c182837748ddea250f91ff74724a03f2b5265dc))
* map attribution chrome and offline alias cache ([#207](https://github.com/uplbtools/room-tba/issues/207) [#155](https://github.com/uplbtools/room-tba/issues/155) follow-ups) ([8b47748](https://github.com/uplbtools/room-tba/commit/8b47748ace8df8268c34f74ce24212decaf4cd57))


### Features

* attribution, SEO, offline fallbacks, and alias search ([#207](https://github.com/uplbtools/room-tba/issues/207) [#128](https://github.com/uplbtools/room-tba/issues/128) [#169](https://github.com/uplbtools/room-tba/issues/169) [#155](https://github.com/uplbtools/room-tba/issues/155)) ([29b702c](https://github.com/uplbtools/room-tba/commit/29b702c9ee7b12ca55afe23ba7639d5316d69a2e))

# [1.8.0](https://github.com/uplbtools/room-tba/compare/v1.7.3...v1.8.0) (2026-06-25)


### Bug Fixes

* **3d:** align Building3DViewer imports with renamed building-3d exports ([8b1ac80](https://github.com/uplbtools/room-tba/commit/8b1ac806f23feea329c0f88d9ce9181c67e0ffc2))
* add actionable error messages and help text to admin login ([667104a](https://github.com/uplbtools/room-tba/commit/667104a221ac2c11cfeb88f0b37a3123709769aa))
* add left join to rooms table ([52bf086](https://github.com/uplbtools/room-tba/commit/52bf08684411ae07aa730b30a95465922a188115))
* add prerender=false to all admin pages ([78c81ff](https://github.com/uplbtools/room-tba/commit/78c81ff197e3d30cac82f87077432b391eca5179))
* add retractable result sidebars ([fbda15e](https://github.com/uplbtools/room-tba/commit/fbda15ecb58f94f73461c5cfb7cd2c5189329b18))
* allow pin selection in edit mode ([e655a98](https://github.com/uplbtools/room-tba/commit/e655a980c11b4f0d4a48e2eaed90add92838af0a))
* cap offline tile prefetch to the source maxzoom ([b9ccbd5](https://github.com/uplbtools/room-tba/commit/b9ccbd51d12d93ad73c2c20652da8a42e119e535))
* **ci:** make semantic-release work with protected main. ([1106651](https://github.com/uplbtools/room-tba/commit/1106651ecf72ae80ada4c6f6524e495165ce5586))
* clean up map UI controls ([3931744](https://github.com/uplbtools/room-tba/commit/39317448dd172c0296382fda4d62148f5c2bacbb))
* commenting code causes parsing error ([6778849](https://github.com/uplbtools/room-tba/commit/6778849ae477705fbfbff966d89f1ea9e67cc744))
* enlarge map control tap targets to 44px on mobile ([d810f53](https://github.com/uplbtools/room-tba/commit/d810f5380723882e5305d817ef4dfd42531980b4))
* filter by map place categories ([b1c3de7](https://github.com/uplbtools/room-tba/commit/b1c3de70afc86a726d90d134412c97a9e5a3341a))
* harden 3d room position editor ([7810ee7](https://github.com/uplbtools/room-tba/commit/7810ee7dd7ecc0cc389e83ba0b260bd8b50df524))
* keep edit toolbar clear of side panel ([b3fb4a7](https://github.com/uplbtools/room-tba/commit/b3fb4a7550bab400d745c4e9280443ceb54c20da))
* keep map control panels exclusive ([2a25961](https://github.com/uplbtools/room-tba/commit/2a25961cc5d03d5a1edb037c9ab48fd1929f3dc3))
* keep status bar anchored under overlays ([1f22c7b](https://github.com/uplbtools/room-tba/commit/1f22c7ba25255620310b3136b788a2af935d3134))
* **map:** drop accidental jeepney WIP from event-dim hotfix. ([17fd200](https://github.com/uplbtools/room-tba/commit/17fd2002465ed1c3d0ae748733b7baf76ee9a0dc))
* **map:** remove orphan editor WIP that breaks a clean checkout. ([b707fa7](https://github.com/uplbtools/room-tba/commit/b707fa77859db622fa4dcd73c8be7acc278a4457))
* move the offline-ready toast clear of the bottom bar ([7413d77](https://github.com/uplbtools/room-tba/commit/7413d774fc11dc9192013f615312f52a4dadc36f)), closes [#pwa-toast](https://github.com/uplbtools/room-tba/issues/pwa-toast)
* pin Vercel build runtime ([b0c3e2e](https://github.com/uplbtools/room-tba/commit/b0c3e2ec58dee45025ccd93d4a8d8a53496788eb))
* pre-merge safety fixes for offline versions and map chrome. ([bafcbe5](https://github.com/uplbtools/room-tba/commit/bafcbe5c3713294f0ac33a716d2dbe41b21b1741))
* precache the app shell so the PWA works offline ([ee7503f](https://github.com/uplbtools/room-tba/commit/ee7503f6c3ece39bae9b769aad6ffac03f699db4))
* prevent version label overflow in the status bar ([#171](https://github.com/uplbtools/room-tba/issues/171)) ([c8fa4f0](https://github.com/uplbtools/room-tba/commit/c8fa4f0cc9dc2d801a6c72775602a5d77aa1ead6))
* remove duplicate osm attribution ([b8d03a5](https://github.com/uplbtools/room-tba/commit/b8d03a5fb9a0e96463685e41fdc9cb2fdbe01dd2))
* restore 3D map pitch and zoom to pre-refactor values ([fa9893c](https://github.com/uplbtools/room-tba/commit/fa9893c2b353ec09d6eaa95efd13dd8af5916b71)), closes [#148](https://github.com/uplbtools/room-tba/issues/148)
* restore flat map after terrain toggle ([6b8bfbb](https://github.com/uplbtools/room-tba/commit/6b8bfbbafe02b817ddf331abad7edfcccc6d82bf))
* **review:** make the mobile drawer handle more discoverable ([3714d05](https://github.com/uplbtools/room-tba/commit/3714d053dbac47f05dc4a1a0f04f2ed1f06ab812))
* **review:** tighten offline download size estimate ([9763f62](https://github.com/uplbtools/room-tba/commit/9763f621ebcd845453e1f91a59ae41a68c942e19))
* stabilize entity prerender routes ([8f3b191](https://github.com/uplbtools/room-tba/commit/8f3b1914c6c2d5ba2b219a19058c5c83edee4d9c))
* **ui:** align event copy-link buttons with sidepanel actions. ([f9d9638](https://github.com/uplbtools/room-tba/commit/f9d9638de348cc7d11fa30aa408de642db30f991))
* **ui:** anchor mobile detail sheet below search and map tools. ([74d7516](https://github.com/uplbtools/room-tba/commit/74d751676e229fd86b30bcf9b81e2d98ff5c0030))
* **ui:** dim unrelated pins on event focus and mobile edge chrome. ([f31e0ea](https://github.com/uplbtools/room-tba/commit/f31e0ea216809ba8e833fed14816da4df3d85026))
* **ui:** keep offline maps visible in the status bar. ([a473365](https://github.com/uplbtools/room-tba/commit/a4733651a5d50c162418a7e915db35b52d3db24e))
* **ui:** restore mobile entity detail sheet above status bar. ([08f3b72](https://github.com/uplbtools/room-tba/commit/08f3b7273131dc9f65ac20c045070e7d2b3087e8))
* **ui:** shrink mobile search header with inline campus events. ([2ce8b8e](https://github.com/uplbtools/room-tba/commit/2ce8b8eadb56e5e1080493c8fa85bff4c6a004fe))
* **ui:** unify search chrome radius and toggle alignment. ([f7f465b](https://github.com/uplbtools/room-tba/commit/f7f465b4e6b7a8fcb1a64d57af592cf9e9aaf527))
* update array naming ([f620f5b](https://github.com/uplbtools/room-tba/commit/f620f5bf004e6fb677eaf2efdfe9d484003c481f))
* update college sync ([0d0e888](https://github.com/uplbtools/room-tba/commit/0d0e8889b7a586aff581eacf094aa2cac5d6c35a))
* update context object and derivation ([6715a83](https://github.com/uplbtools/room-tba/commit/6715a83f44e79b89d03f123fce365934aea3fa7c))
* update sw.js destination ([4d881d8](https://github.com/uplbtools/room-tba/commit/4d881d82e517b36b95854a1ec5371a5cddd2e1f4))
* update type field and change variable naming ([e276547](https://github.com/uplbtools/room-tba/commit/e276547354db9c120526ed4848730d50061fa648))
* use supported Vercel node runtime ([5457503](https://github.com/uplbtools/room-tba/commit/5457503a492911f865352925453c3e11ea59830e))


### Features

* add API routes for data in DB ([777ece1](https://github.com/uplbtools/room-tba/commit/777ece129e5cf740d9c356eb0d29147b3ec6871d))
* add building copy links ([24f3ab2](https://github.com/uplbtools/room-tba/commit/24f3ab2ec16340b43924b427def541ab2430d0e9))
* add building type filter ([9eb2377](https://github.com/uplbtools/room-tba/commit/9eb2377b92ec272718833db86f2bbe7d47b86a9d))
* add building-type to buildings table ([c703d14](https://github.com/uplbtools/room-tba/commit/c703d146adf07b39937d4620d90c69de653f2861))
* add data fetching for on-demand data querying ([db54279](https://github.com/uplbtools/room-tba/commit/db542796d0b40b29219a7e0826ae2e8d2b405f64))
* add data fetching for on-demand data querying ([95c55cc](https://github.com/uplbtools/room-tba/commit/95c55ccd41fd406507034ae28afd0dd71c15fe7a))
* add dorms ([1f2a94a](https://github.com/uplbtools/room-tba/commit/1f2a94abe04ec643bda6bedfe11ec2138a1e48bd))
* add fields to check sync ([a8e7f32](https://github.com/uplbtools/room-tba/commit/a8e7f32fd04b9e7889e5276f463940d29b6622ef))
* add function for getting dorms ([f9865b0](https://github.com/uplbtools/room-tba/commit/f9865b011fba3334a725482a761edb3e78dca160))
* add functionality for room search and viewing ([2b7153a](https://github.com/uplbtools/room-tba/commit/2b7153a9499674f47d8356f549e3382878122507))
* add functionality to local data sync ([504c670](https://github.com/uplbtools/room-tba/commit/504c670bb3783d593e75c91d3bcdea3b437029ff))
* add helper for client and move pgliteDB file ([c9679a8](https://github.com/uplbtools/room-tba/commit/c9679a8ea175b13b3082d77fa461d16e089e7e3f))
* add indicator for syncing ([7c33f25](https://github.com/uplbtools/room-tba/commit/7c33f258431548da145ac34aa75affd8449228cd))
* add inline room side panel editor ([e509853](https://github.com/uplbtools/room-tba/commit/e5098537a2135f8266db4cdba1f5cef51aecfe8e))
* add Makiling terrain mode ([4903e9c](https://github.com/uplbtools/room-tba/commit/4903e9cd61b0694779e094ddef8770d233f5f25f))
* add map orientation controls (2D toggle, rotate, tilt, reset north) ([afd302f](https://github.com/uplbtools/room-tba/commit/afd302f5c3fbdd3844bfcea0ce9e1287312c2f68)), closes [#173](https://github.com/uplbtools/room-tba/issues/173) [#174](https://github.com/uplbtools/room-tba/issues/174)
* add map orientation controls (2D toggle, rotate, tilt, reset north) ([9154abd](https://github.com/uplbtools/room-tba/commit/9154abdfef4a04360b1f56b15e3290b4be8257ab)), closes [#173](https://github.com/uplbtools/room-tba/issues/173) [#174](https://github.com/uplbtools/room-tba/issues/174)
* add native event support ([30b6d4f](https://github.com/uplbtools/room-tba/commit/30b6d4ff48c92d731b5945b6ada7dd32fa1f0f16))
* add new API endpoints ([578ece2](https://github.com/uplbtools/room-tba/commit/578ece2e9291d193a892bdaa63c72c53946d76b1))
* add new mechanism for data syncing ([6e74f0f](https://github.com/uplbtools/room-tba/commit/6e74f0f9007757f0a399094c3ecd2ea93bfdeb70))
* add pgLite for local data storage ([6669db7](https://github.com/uplbtools/room-tba/commit/6669db7d84837dcb94fad9fef6866ccb47a29774))
* add predicate function logic ([f2908c3](https://github.com/uplbtools/room-tba/commit/f2908c3cb9f30f2e2e6220bff93a554c54f18279))
* add responsive styling to sync toast ([a6f636a](https://github.com/uplbtools/room-tba/commit/a6f636acef38ef6a818c8c9148e321d32a98279e))
* add RoomPosition type ([120c025](https://github.com/uplbtools/room-tba/commit/120c025e257ee6f2b8df798dde42cf30a3442720))
* add services for backend ([9f626e3](https://github.com/uplbtools/room-tba/commit/9f626e30fcca75695484652a89d4d43d23637091))
* add syncBuilding function ([9a90e69](https://github.com/uplbtools/room-tba/commit/9a90e69f8a1c05775429a6606a39a41f8534dc1a))
* add terrain hillshade shadows ([752f3a5](https://github.com/uplbtools/room-tba/commit/752f3a593e841ad21077c04556a87dfa6622e416))
* add updateTable schema ([7df2d81](https://github.com/uplbtools/room-tba/commit/7df2d81cd91ca7a55c06727d0a38934f12724415))
* add utility fn and update type ([d8fb99e](https://github.com/uplbtools/room-tba/commit/d8fb99ee3f5907c691d9125f80210fa48dc75226))
* add utility function for checking the environment ([3d0a4ce](https://github.com/uplbtools/room-tba/commit/3d0a4ceba29613c73a6a65c3e19dcb1c4f2a8a28))
* add utils for syncing data ([a75927c](https://github.com/uplbtools/room-tba/commit/a75927ce9feb20ca9755ba7e291d6247b870748b))
* add versioned map editor updates ([429f14c](https://github.com/uplbtools/room-tba/commit/429f14c107dfe51075bda273941974458ff7db0b))
* add versioned room admin updates ([b5c6f72](https://github.com/uplbtools/room-tba/commit/b5c6f72e659526918d4cba2de3da511b8b260b30))
* add visual map editor with draggable pins ([c348321](https://github.com/uplbtools/room-tba/commit/c348321eaa636aa2a82e181005f1eb1c45d16154))
* add whacky loading spinner ([7bb74a6](https://github.com/uplbtools/room-tba/commit/7bb74a67c57644842e1d8cc766d9d3bd91e1365b))
* change sitemap generator ([b91dcf2](https://github.com/uplbtools/room-tba/commit/b91dcf223f036c8c9f244dd536529f7ab972d21b))
* create new Store to use for toast ([7519e52](https://github.com/uplbtools/room-tba/commit/7519e52771ed77f492e0ca53e71556ed2e14758c))
* **map:** 3D building viewer with OSM footprint and mock room placements ([ebb0eb0](https://github.com/uplbtools/room-tba/commit/ebb0eb0888baf7991329371be88768f7321f5b08))
* **map:** add draggable building indicators for admins ([e8c4c46](https://github.com/uplbtools/room-tba/commit/e8c4c468ecf9c8d77a3ea5a2dbc54184a0de2672))
* offline campus map download with progress and data size ([dbf8ef9](https://github.com/uplbtools/room-tba/commit/dbf8ef9e9af906f55fdeba3bf3c7c018675ae28f))
* scaffold editor GUI for non-technical room/building management ([839c27e](https://github.com/uplbtools/room-tba/commit/839c27e39274e545f9054b29d0694559d42c714d))
* sidebar retraction as a full-height sliding drawer ([#181](https://github.com/uplbtools/room-tba/issues/181)) ([c235d0d](https://github.com/uplbtools/room-tba/commit/c235d0d04da5b32510163a02b7268263b7d2b3ae))
* update api route for rooms ([167ed83](https://github.com/uplbtools/room-tba/commit/167ed83e322560938690a593330e47076bec8d18))
* update connection database connection and adapter ([d8fe6c6](https://github.com/uplbtools/room-tba/commit/d8fe6c65537788afc72d982422dac89d3745a658))
* update db schema ([7fb806a](https://github.com/uplbtools/room-tba/commit/7fb806a4b931bbc6cde3690fc1bc5bae9c91841d))
* update drizzle config to cloud db ([06a5e82](https://github.com/uplbtools/room-tba/commit/06a5e82000581be43e921b203704531d5b79ee65))
* update finalized classes in Room TBA ([dcd08a8](https://github.com/uplbtools/room-tba/commit/dcd08a892ec9c597ec46b1e3cd74657fced20126))
* update imports and update client directive ([f6d9c98](https://github.com/uplbtools/room-tba/commit/f6d9c98eec09f918f8f4bfc9a4d55b17e2f4c1d2))
* update jeepney routes ([110394a](https://github.com/uplbtools/room-tba/commit/110394aaaa38b51e6536e57cd858dd3d321cab66))
* update map styling ([00a3a0e](https://github.com/uplbtools/room-tba/commit/00a3a0eb96e3f3c44182e64c6020838f0a5e9fed))
* update map styling ([7e81c39](https://github.com/uplbtools/room-tba/commit/7e81c39a567d6bca1d0f7d94e313ed8b4b50fd16))
* update type field ([c7e6526](https://github.com/uplbtools/room-tba/commit/c7e65267da6789d7c8775e0ac9f0d7cddbd6e5ec))

## [1.7.3](https://github.com/smmariquit/room-tba/compare/v1.7.2...v1.7.3) (2026-06-11)


### Bug Fixes

* remove invalid comment headers from JSON files ([68cbe95](https://github.com/smmariquit/room-tba/commit/68cbe95e847900a21c5426cdb58caa4845b290e1))

## [1.7.2](https://github.com/smmariquit/room-tba/compare/v1.7.1...v1.7.2) (2026-06-11)


### Bug Fixes

* acknowledge where 3D building models come from ([811ae15](https://github.com/smmariquit/room-tba/commit/811ae158e73f4b8e13b1d484b8aaa3409b810d96))
* add largest campus to landing modal description ([1040b6d](https://github.com/smmariquit/room-tba/commit/1040b6d594d0313988c46bca3a2a20dddba2db29))

## [1.7.1](https://github.com/smmariquit/room-tba/compare/v1.7.0...v1.7.1) (2026-06-10)


### Bug Fixes

* update date of update ([cd46811](https://github.com/smmariquit/room-tba/commit/cd46811739dcf43fdc799829e96d467a6475806e))

# [1.7.0](https://github.com/smmariquit/room-tba/compare/v1.6.0...v1.7.0) (2026-06-10)


### Bug Fixes

* acknowledge where 3D building models come from ([811bd89](https://github.com/smmariquit/room-tba/commit/811bd8959cfcb70d2b9c124b7f9c76bc0ddd4555))
* change visibility of suggestions to avoid cluttering half of the map ([d754926](https://github.com/smmariquit/room-tba/commit/d7549266b5dba5cdf3c88813818638f628ba89de))
* **dorms:** polish UI, add socials/maps, filter, remove 5 dorms ([821954c](https://github.com/smmariquit/room-tba/commit/821954c5db05cf087c375d5d498068a1dc6f0dac))
* remove waypoints when the map is not pointing to building ([808b25d](https://github.com/smmariquit/room-tba/commit/808b25d5a24b509958187c9247225141a2176bb0))
* revised logo ([4068c9c](https://github.com/smmariquit/room-tba/commit/4068c9ce69cd3d7483ccb9298d93321a25e1b730))
* **seo:** prevent static pages from being cached to prevent large PWA load ([9829b9d](https://github.com/smmariquit/room-tba/commit/9829b9dd1ea67b79c3e9af395eb62815fd74e1c4))


### Features

* add jeepney route menu with mock Kaliwa/Kanan and Forestry routes ([caa6ed3](https://github.com/smmariquit/room-tba/commit/caa6ed3e823b8d17d923807ea6b832cef0f26705))
* add messenger contact link to status bar ([fa923f3](https://github.com/smmariquit/room-tba/commit/fa923f357dad8f0bfeeeccfd7963b763e50cd972))
* add messenger redirect ([b14b822](https://github.com/smmariquit/room-tba/commit/b14b8226488d6319bb83b148463e04561532704c))
* add new classes and seeding file ([8f5d2ae](https://github.com/smmariquit/room-tba/commit/8f5d2ae67d6c1efcd95753965595590069e96314))
* add x button to give users the option to remove the options ([f8db089](https://github.com/smmariquit/room-tba/commit/f8db08920ad5db102c61a884cfec44400aa60a1f))
* **dorms:** add UPLB dormitory feature with UP-managed and private dorms ([b74b247](https://github.com/smmariquit/room-tba/commit/b74b247c591be7190bf6d634bab91d8ac839044d))
* **map:** highlight dataset buildings yellow on 3D OSM map ([74d3a07](https://github.com/smmariquit/room-tba/commit/74d3a07a860e4a06cd05c025e8ac848b5ca54f55))
* **seo:** add crawlable entity pages ([89de2f1](https://github.com/smmariquit/room-tba/commit/89de2f110d203fc5c74650ee4105c8daaaad18f1))
* update status bar ([2f99c0a](https://github.com/smmariquit/room-tba/commit/2f99c0a9de88bc6349e8f3ceb13bf7d5fa91bd9a))

# [1.6.0](https://github.com/smmariquit/room-tba/compare/v1.5.0...v1.6.0) (2026-05-08)


### Bug Fixes

* change visibility of suggestions to avoid cluttering half of the map ([3103d51](https://github.com/smmariquit/room-tba/commit/3103d5123dd8dcc962f8e47314d05a0c66af9328))
* remove waypoints when the map is not pointing to building ([d3a462d](https://github.com/smmariquit/room-tba/commit/d3a462dca74c521feffa78b14ea29bbd6b38ec5a))


### Features

* add jeepney route menu with mock Kaliwa/Kanan and Forestry routes ([98fb7e8](https://github.com/smmariquit/room-tba/commit/98fb7e8ad0b9cd2dda7c16a4e761c596ae8d390a))
* add x button to give users the option to remove the options ([2ace62b](https://github.com/smmariquit/room-tba/commit/2ace62b67db3d2a733e7b8877b7678bd6866f250))

# [1.5.0](https://github.com/smmariquit/room-tba/compare/v1.4.0...v1.5.0) (2026-05-08)


### Features

* **map:** highlight dataset buildings yellow on 3D OSM map ([6b573c0](https://github.com/smmariquit/room-tba/commit/6b573c0282f12978b42f9269c366de4cfaa94fff))

# [1.4.0](https://github.com/smmariquit/room-tba/compare/v1.3.1...v1.4.0) (2026-05-01)


### Features

* add messenger contact link to status bar ([2a6d822](https://github.com/smmariquit/room-tba/commit/2a6d822f0d9b23073f3cc9b8ddc34d29700fcd7b))
* add messenger redirect ([bda4177](https://github.com/smmariquit/room-tba/commit/bda417718264db438cec65c9b590536a572ba05c))

## [1.3.1](https://github.com/smmariquit/room-tba/compare/v1.3.0...v1.3.1) (2026-04-23)


### Bug Fixes

* add padding to map when navigating ([0eb16b2](https://github.com/smmariquit/room-tba/commit/0eb16b2f2c79036f128f49c3e7f125b54b72c911))

# [1.3.0](https://github.com/smmariquit/room-tba/compare/v1.2.2...v1.3.0) (2026-04-22)


### Bug Fixes

* change minZoom and update map style ([e51bbda](https://github.com/smmariquit/room-tba/commit/e51bbdae6d44e6491c2ba1480c9a6d0ad371b36b))
* update map bounds ([f02e7db](https://github.com/smmariquit/room-tba/commit/f02e7dbbe7651ce1bc44e2e64790dccdd94ad426))


### Features

* Add veterinary hospital building ([9f0426a](https://github.com/smmariquit/room-tba/commit/9f0426adacfa71eb268d235853e5df591bc7512b))
* update flyout ([708e944](https://github.com/smmariquit/room-tba/commit/708e944121dec1120fd92b2e8a005066f01929ab))

## [1.2.2](https://github.com/smmariquit/room-tba/compare/v1.2.1...v1.2.2) (2026-04-22)


### Bug Fixes

* remove shrink property from icon to prevent a smaller arrow ([1c0c3f5](https://github.com/smmariquit/room-tba/commit/1c0c3f564910153ac2b90d477a3fb06576d74968))
* update progress bar styling for compatibility ([a21fbb5](https://github.com/smmariquit/room-tba/commit/a21fbb521f78c3eb89edca9685462a1e90827127))

## [1.2.1](https://github.com/smmariquit/room-tba/compare/v1.2.0...v1.2.1) (2026-04-18)


### Bug Fixes

* resolve missing images on landing page ([b935329](https://github.com/smmariquit/room-tba/commit/b93532994827d0f2c26809c8a86387205d142096))

# [1.2.0](https://github.com/smmariquit/room-tba/compare/v1.1.0...v1.2.0) (2026-04-18)


### Bug Fixes

* update changelog ([4f54450](https://github.com/smmariquit/room-tba/commit/4f544506bccb81b4442372a166d312f08e75333f))
* update suggestion for trending searches ([b1eeaa1](https://github.com/smmariquit/room-tba/commit/b1eeaa1dbb382a5f93045030384a94031afb1564))


### Features

* add changelog.md to /changelog route ([5bbb4e2](https://github.com/smmariquit/room-tba/commit/5bbb4e2afcd3a47af625af5ad753507cb1ae58c8))
* add close button to the modal when schedule is open ([8221c2b](https://github.com/smmariquit/room-tba/commit/8221c2b77a04bb2b149eb4649af2faffa17b117c))
* add more suggestions to trending searches ([5cb42d3](https://github.com/smmariquit/room-tba/commit/5cb42d30fa3500fa55daad52b7ccd18b2629007c))
* add reactive icons if the location is centered ([407a16f](https://github.com/smmariquit/room-tba/commit/407a16fea19edee596c33d406c325682fa9d8864))
* update icons with lucide-icons ([5d841b0](https://github.com/smmariquit/room-tba/commit/5d841b02af4a9e489d165a874ef9ecda5519d928))
* update icons with lucide-icons ([3a9ed78](https://github.com/smmariquit/room-tba/commit/3a9ed78917fb89a3f8bc3eb9425f6be0dd862e67))

# [1.1.0](https://github.com/smmariquit/room-tba/compare/v1.0.1...v1.1.0) (2026-04-15)


### Features

* add vercel analytics ([20aab87](https://github.com/smmariquit/room-tba/commit/20aab87545aa0afe5d622e2fff68b648d45f3b9b))

## [1.0.1](https://github.com/smmariquit/room-tba/compare/v1.0.0...v1.0.1) (2026-04-14)


### Bug Fixes

* reloadPrompt unable to show reload button ([5d7ee5d](https://github.com/smmariquit/room-tba/commit/5d7ee5da195ed1e0daf97826f2522b1a7fd82c22))

# 1.0.0 (2026-04-14)


### Bug Fixes

* add scrolling for classQuery component ([a5e5823](https://github.com/smmariquit/room-tba/commit/a5e58233f23e943465647fda83d63c72254402f5))
* added css styling to no directions on room modal ([afcd5cc](https://github.com/smmariquit/room-tba/commit/afcd5cc4ccba3c39033c0722823d2405ced684d2))
* change logic for visibility of suggestions when searching ([ab58f4a](https://github.com/smmariquit/room-tba/commit/ab58f4ade867801e5ecb7eef28822dc2b2a9407d))
* fix image path for contributors/devs based on public/ structure ([c2e04f8](https://github.com/smmariquit/room-tba/commit/c2e04f859d530577072e87a5255ec6544068fcb2))
* fix removed settype ([b90da9d](https://github.com/smmariquit/room-tba/commit/b90da9df05d49630e31a957ec6b26af3ae9bf5fa))
* move filter below search and add padding at mobile to hero-header ([e3ac095](https://github.com/smmariquit/room-tba/commit/e3ac095ddc58cb7f9b224c18e49bfc043cc4241c))
* replace transparency on hover to outline on hover on filter button on entry ([c8dfaef](https://github.com/smmariquit/room-tba/commit/c8dfaef00d4061bb8d3c330335af4f46a13210b2))
* reset filter and close modals on new search query ([32fa6ee](https://github.com/smmariquit/room-tba/commit/32fa6eee68b7f6d1fb253faafb417c3fed2cc01e))
* update font-family ([5ca632e](https://github.com/smmariquit/room-tba/commit/5ca632e0aea920b11d9767d729cc41728d511699))
* update results not showing in suggestion event ([fcef254](https://github.com/smmariquit/room-tba/commit/fcef254c853ca6f3810f479abb3c55b34355b07f))
* updateQuery refactor to change behavior for searching ([1e6085c](https://github.com/smmariquit/room-tba/commit/1e6085c987c81a2d6deea98f4e067ae7f347676b))


### Features

* add 3d map and markers per building ([88f4a5f](https://github.com/smmariquit/room-tba/commit/88f4a5fe293885e86ad39ecee5f63dd48ab162f2))
* add changelog route ([d3190ba](https://github.com/smmariquit/room-tba/commit/d3190ba3a20e7f70729a66f6c1ae25b78c095ada))
* add CollegeResult and DivisionResult components ([f1e52ac](https://github.com/smmariquit/room-tba/commit/f1e52ac759e2b2aea3441a99c5501ffcddfc65bf))
* add conditional render to prompt users to open google form to contribute to room-tba if there is no direction data for a room/building ([291c352](https://github.com/smmariquit/room-tba/commit/291c3521708ff3138bc955e489c6e5b86ed40861))
* add directions/routing to buildings via maplibregldirections api ([2a62bf7](https://github.com/smmariquit/room-tba/commit/2a62bf745cb59faf7a1b84dae38059ac0b9a6c18))
* add functionalities to map: ([7c3eace](https://github.com/smmariquit/room-tba/commit/7c3eace030d0652d16f351ef2a8ed0d0e47efa25))
* add icons to suggestions ([e61af54](https://github.com/smmariquit/room-tba/commit/e61af54c7b65c62924ee1520cd7ac115718a5d01))
* add map rotation on room/building ([5a39a09](https://github.com/smmariquit/room-tba/commit/5a39a098f3599f0dec6818cbdcc26022054a956f))
* add maroon colors to hero ([48907f2](https://github.com/smmariquit/room-tba/commit/48907f2a8f9eac4ef8271e96c842c262bacf8165))
* add maxBounds to restrict number of tiles ([cfc8467](https://github.com/smmariquit/room-tba/commit/cfc84675a333b397ca1423f4f538f48077beec0a))
* add sorting based on number of classes in that room in descending order ([f1dd827](https://github.com/smmariquit/room-tba/commit/f1dd8275d1c8e178e07b6924a93f7e9faf1e8d36))
* add zoom in when room is selected and add function to determine if active marker ([98ee497](https://github.com/smmariquit/room-tba/commit/98ee4976d4b423a457142609ccec2f4cbee5e7f9))
* add zoom out when query is cleared ([f48e395](https://github.com/smmariquit/room-tba/commit/f48e3954b45c90832bde5a55bfe82727f9c4ad1b))
* calibrated all building data ([4d34090](https://github.com/smmariquit/room-tba/commit/4d34090838ca28e94356736f63118edc15646ef8))
* **ci:** add semantic-release and wire UI version to package.json ([6ae9912](https://github.com/smmariquit/room-tba/commit/6ae9912c86c584fdad393102075e65bc794ef294))
* copy over code to classquery to visually align with other sidepanel components ([2aa1b92](https://github.com/smmariquit/room-tba/commit/2aa1b92ae4724222d4d1fc26356df4f3529ef473))
* edit RoomDisplay para onclick set query to that room ([0011955](https://github.com/smmariquit/room-tba/commit/001195593d4dd0c08725e4c54c9b4e96e257252c))
* edit the header section to be more like a hero section ([d423ebb](https://github.com/smmariquit/room-tba/commit/d423ebbc43917e79ce46abdc780aa55ed02c7e4f))
* esc button closes sidepanel and clears query + directions ([45f764d](https://github.com/smmariquit/room-tba/commit/45f764dbfdabc6e134659400eaaefc8cc79a1a82))
* improve adding history logic to queryHistory ([f9de00b](https://github.com/smmariquit/room-tba/commit/f9de00b0f1ab799af0a6d4a4a478727c8b0fea7c))
* initial release ([df8cb2f](https://github.com/smmariquit/room-tba/commit/df8cb2fbe8464391dbc9dc70f60027633be2909f))
* make the label visible when a certain zoom level is met ([b9d8bae](https://github.com/smmariquit/room-tba/commit/b9d8bae283effb35818076bf3041523cfc3478b8))
* migrate RoomModalContent to RoomResult component ([d0dacad](https://github.com/smmariquit/room-tba/commit/d0dacadf9147467b09a335bd97c768d408527dfb))
* readded room directions ([6de7230](https://github.com/smmariquit/room-tba/commit/6de7230ae2395888fd4395c3e5a11cf01f4155f4))
* reopen landingmodal on contributors in statusbar ([f981fdb](https://github.com/smmariquit/room-tba/commit/f981fdb71c5848148649ce92019aff2cc73053b8))
* **statusbar:** make status bar collapsible on mobile ([337c950](https://github.com/smmariquit/room-tba/commit/337c95092a0b43ca79c0abcc82356919e2a9fce2))
* update pitch when centering location ([21fb023](https://github.com/smmariquit/room-tba/commit/21fb023467a2cf8c74889c319060a58ed7afe56f))
* update Suggestion component visibility ([d685515](https://github.com/smmariquit/room-tba/commit/d6855155b48c1e1b2157fe281f856b3d23fce8f4))


### Performance Improvements

* limit routing to one request only on initial get directions ([5da0d90](https://github.com/smmariquit/room-tba/commit/5da0d90643f0472a9d6e412f0b820cf3dba7190c))
* removed infinite loop by untracking flyto in map ([c527b3f](https://github.com/smmariquit/room-tba/commit/c527b3fa16346842393f5ce4f12f72cd1dc07a82))
