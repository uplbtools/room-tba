<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import IconButton from '$lib/components/IconButton.svelte';
	import { fade, fly } from 'svelte/transition';
	import { X, Building2, Loader, RotateCcw, Pencil } from '@lucide/svelte';
	import { building3DStore, adminAuthStore } from '$lib/stores.svelte';
	import { modalContentDismiss, modalContentReveal, overlayFade } from '$lib/utils/motion';
	import { MediaQuery } from 'svelte/reactivity';
	import { getAppData } from '$lib/utils/context';
	import type { Room } from '$lib/utils/types';
	import { getBuildingRooms } from '$lib/utils/local/data/utils';
	import { checkLocalBuildingRoom, syncBuildingRooms } from '$lib/utils/local/data/sync';
	import { fetchBuildingFootprint } from '$lib/utils/overpass';
	import { fetchBasemap } from '$lib/utils/osm-basemap';
	import { trapFocus } from '$lib/utils/focus-trap';
	import {
		footprintToLocalPolygon,
		placeRooms,
		approximateFootprint,
		defaultFloorCount,
		maxInferredFloor,
		pickNonOverlappingLabels,
		type LabelBox,
		type LocalPolygonData,
		type RoomPlacement
	} from '$lib/utils/building-3d';
	import {
		inferBuildingPlacements,
		type InferredPlacement,
		type RoomPlacementInput
	} from '$lib/utils/room-placement';

	const appData = getAppData();
	const buildings = $derived(appData().loaded ? appData().buildings : []);

	let { name }: { name: string } = $props();

	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	const FLOOR_HEIGHT = 3.5;
	const ROOM_COLOR = 0xdc2626;
	const ROOM_HIGHLIGHT_COLOR = 0xfacc15;
	const ROOM_EDIT_COLOR = 0x2563eb;
	const SHELL_COLOR = 0xb89e84;
	const SHELL_OPACITY = 0.18;
	const FLOOR_SLAB_COLOR = 0xf5efe6;
	const FLOOR_SLAB_OPACITY = 0.75;

	type RoomPositionPatchResponse = {
		success?: boolean;
		room?: Room | null;
		latest?: Room | null;
		error?: string;
		code?: string;
	};
	type RoomPositionDraft = { floor: number; x: number; y: number };

	let viewerFrameEl: HTMLDivElement | null = $state(null);
	let canvasContainer: HTMLDivElement | null = $state(null);
	let labelContainer: HTMLDivElement | null = $state(null);

	let loading = $state(true);
	let errorMsg: string | null = $state(null);
	let totalFloors = $state(1);
	let selectedFloor = $state<number | 'all'>('all');
	let activeRoomCode = $state<string | null>(null);
	let hoveredRoomCode = $state<string | null>(null);
	let footprintNote = $state<string | null>(null);
	/** True when OSM had no building here and we drew a stand-in box instead. */
	let footprintApproximate = $state(false);
	/** True when the OSM polygon we found does not contain this building's point. */
	let footprintUncertain = $state(false);
	let footprintOsmName = $state<string | null>(null);
	let acceptingSuggestions = $state(false);

	// Editor state
	let editMode = $state(false);
	let savedOverrides = $state<Map<string, RoomPositionDraft>>(new Map());
	let dirty = $state<Map<string, RoomPositionDraft>>(new Map());
	let savingRoomCodes = $state<Set<string>>(new Set());
	let savedRoomCodes = $state<Set<string>>(new Set());
	let failedRoomCodes = $state<Set<string>>(new Set());
	let saving = $derived(savingRoomCodes.size > 0);
	let editorStatus = $state<{
		type: 'success' | 'error' | 'info';
		message: string;
	} | null>(null);

	// Three.js objects (not reactive — just refs we hand off to render loop / cleanup).
	let scene: any = null;
	let camera: any = null;
	let renderer: any = null;
	let labelRenderer: any = null;
	let controls: any = null;
	let dragControls: any = null;
	let raycaster: any = null;
	let pointer: any = null;
	let pointerNDC: { x: number; y: number } | null = null;
	let frameId: number | null = null;
	let resizeObs: ResizeObserver | null = null;
	let onPointerMoveBound: ((e: PointerEvent) => void) | null = null;
	let onPointerLeaveBound: (() => void) | null = null;
	let onClickBound: ((e: MouseEvent) => void) | null = null;
	let disposers: Array<() => void> = [];
	let roomMeshes: Array<{
		mesh: any;
		placement: RoomPlacement;
		baseColor: number;
	}> = [];
	let floorGroups: Array<{ floor: number; group: any }> = [];
	/** Raycast targets, hoisted so the render loop stops rebuilding them. */
	let pickTargets: any[] = [];
	let initStarted = false;
	/** Only re-raycast when the pointer or the camera actually moved. */
	let pointerMoved = false;
	/**
	 * Every CSS2D label in the scene, for the per-frame overlap pass. `w`/`h` are
	 * measured lazily on first use; the text never changes so one read is enough.
	 */
	let cssLabels: Array<{
		obj: any;
		el: HTMLElement;
		/** Lower wins the space: floor markers 0, room pins 1. */
		priority: number;
		code: string | null;
		w: number;
		h: number;
	}> = [];
	let labelProjection: any = null;

	let buildingRooms = $state<Room[]>([]);

	const buildingMeta = $derived((buildings ?? []).find((b) => b.buildingName === name) ?? null);

	const roomInputs = $derived(
		buildingRooms.map<RoomPlacementInput>((r) => ({
			roomCode: r.code,
			buildingName: name,
			directions: r.directions
		}))
	);

	let polygon: LocalPolygonData | null = $state(null);

	const placements = $derived(
		polygon ? placeRooms(roomInputs, polygon, totalFloors, savedOverrides) : ([] as RoomPlacement[])
	);

	/**
	 * Rooms the inference can place that nobody has saved a position for yet.
	 * These are exactly the pins an editor can accept into `room_positions`.
	 */
	const suggestions = $derived.by(() => {
		if (!polygon) return new Map<string, InferredPlacement>();
		return inferBuildingPlacements(
			roomInputs,
			polygon,
			totalFloors,
			new Set(savedOverrides.keys())
		);
	});

	const floorOptions = $derived.by(() => {
		const opts: Array<{ value: number | 'all'; label: string }> = [
			{ value: 'all', label: 'All floors' }
		];
		for (let f = totalFloors; f >= 1; f--) {
			opts.push({ value: f, label: `Floor ${f}` });
		}
		return opts;
	});

	const visibleRooms = $derived.by(() => {
		if (selectedFloor === 'all') return placements;
		return placements.filter((p) => (dirty.get(p.code)?.floor ?? p.floor) === selectedFloor);
	});

	function close() {
		building3DStore.close();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	// `aria-modal="true"` tells assistive tech the rest of the page is inert, so
	// Tab has to honour that. Same shared trap the other modals use.
	$effect(() => {
		if (!viewerFrameEl) return;
		return trapFocus(viewerFrameEl, { onEscape: close });
	});

	async function init() {
		if (!canvasContainer || !labelContainer) return;
		if (!buildingMeta?.lat || !buildingMeta?.lon) {
			errorMsg = 'This building has no coordinates yet.';
			loading = false;
			return;
		}

		try {
			const buildingChecker = await checkLocalBuildingRoom(buildingMeta.id);
			const roomsForBuilding = await getBuildingRooms(buildingChecker, buildingMeta.id);
			buildingRooms = roomsForBuilding;
			await syncBuildingRooms(buildingChecker, buildingMeta.id, roomsForBuilding);

			const [THREE, OrbitMod, CSS2DMod, DragMod, savedRes] = await Promise.all([
				import('three'),
				import('three/examples/jsm/controls/OrbitControls.js'),
				import('three/examples/jsm/renderers/CSS2DRenderer.js'),
				import('three/examples/jsm/controls/DragControls.js'),
				fetch(`/api/positions?building=${encodeURIComponent(name)}`, {
					credentials: 'same-origin'
				}).catch(() => null)
			]);

			// Layer in any saved positions before we compute placements / build meshes.
			if (savedRes?.ok) {
				try {
					const data = (await savedRes.json()) as {
						positions?: Array<{
							roomCode: string;
							floor: number;
							x: number;
							y: number;
						}>;
					};
					const map = new Map<string, RoomPositionDraft>();
					for (const p of data.positions ?? []) {
						map.set(p.roomCode, { floor: p.floor, x: p.x, y: p.y });
					}
					savedOverrides = map;
				} catch {
					// ignore — we'll fall back to seeded mock placements.
				}
			}

			// When OSM has nothing here we fall back to a plain square around the
			// building's own coordinates so rooms can still be placed and browsed.
			// It is labelled as approximate everywhere it shows up — see
			// `footprintApproximate`.
			const osmFootprint = await fetchBuildingFootprint(buildingMeta.lat, buildingMeta.lon);
			footprintApproximate = osmFootprint === null;
			// OSM had *a* building nearby, but not one containing our coordinates —
			// the outline probably belongs to a neighbour.
			footprintUncertain = osmFootprint !== null && !osmFootprint.containsPoint;
			footprintOsmName = osmFootprint?.osmName ?? null;
			const footprint = osmFootprint ?? approximateFootprint(buildingMeta.lat, buildingMeta.lon);

			const localPoly = footprintToLocalPolygon(footprint);
			polygon = localPoly;

			const inferred = maxInferredFloor(roomInputs);
			const floors = defaultFloorCount(footprint, inferred);
			totalFloors = floors;

			footprintNote = footprintApproximate
				? `Floor count estimated from the room codes (${floors}).`
				: footprint.levels
					? `OpenStreetMap lists ${footprint.levels} floors for this building.`
					: footprint.heightMeters
						? `Floor count estimated from OSM height (~${footprint.heightMeters.toFixed(0)} m).`
						: null;

			// === Scene setup ===
			scene = new THREE.Scene();
			scene.background = new THREE.Color(0xeef2f7);

			const width = canvasContainer.clientWidth;
			const height = canvasContainer.clientHeight;

			camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
			const radius = Math.max(localPoly.widthMeters, localPoly.depthMeters);
			camera.position.set(radius * 1.4, radius * 1.2, radius * 1.4);
			camera.lookAt(0, totalFloors * FLOOR_HEIGHT * 0.4, 0);

			renderer = new THREE.WebGLRenderer({ antialias: true });
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.setSize(width, height);
			renderer.shadowMap.enabled = true;
			canvasContainer.appendChild(renderer.domElement);

			labelRenderer = new CSS2DMod.CSS2DRenderer();
			labelRenderer.setSize(width, height);
			labelRenderer.domElement.style.position = 'absolute';
			labelRenderer.domElement.style.top = '0';
			labelRenderer.domElement.style.left = '0';
			labelRenderer.domElement.style.pointerEvents = 'none';
			labelContainer.appendChild(labelRenderer.domElement);

			controls = new OrbitMod.OrbitControls(camera, renderer.domElement);
			controls.target.set(0, totalFloors * FLOOR_HEIGHT * 0.4, 0);
			controls.enableDamping = true;
			controls.dampingFactor = 0.08;
			controls.minDistance = 4;
			controls.maxDistance = radius * 6;
			controls.maxPolarAngle = Math.PI * 0.495; // don't let users go below ground
			controls.update();

			// === Lighting ===
			const ambient = new THREE.AmbientLight(0xffffff, 0.55);
			scene.add(ambient);
			const dir = new THREE.DirectionalLight(0xffffff, 0.85);
			dir.position.set(radius, radius * 2.5, radius * 0.6);
			dir.castShadow = true;
			scene.add(dir);
			const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.4);
			scene.add(hemi);

			// === Ground ===
			// Sized to comfortably contain the building plus context. The basemap
			// texture (loaded async below) will be cropped to this exact half-extent
			// so its pixels land 1:1 with world meters.
			const groundHalf = Math.max(40, radius * 2.5);
			const groundMat = new THREE.MeshStandardMaterial({
				color: 0xd9d4cb,
				roughness: 0.95
			});
			const ground = new THREE.Mesh(
				new THREE.PlaneGeometry(groundHalf * 2, groundHalf * 2),
				groundMat
			);
			ground.rotation.x = -Math.PI / 2;
			ground.position.y = -0.02;
			ground.receiveShadow = true;
			scene.add(ground);

			// Asynchronously upgrade the ground with an OSM-based street map. We
			// don't await this — the viewer should be usable while tiles are loading.
			// CRITICAL: center on the *polygon's* centroid (not on whatever lat/lon
			// is in app_data.json), otherwise the basemap drifts a few meters
			// relative to the 3D shape because app_data points usually aren't the
			// true geometric center of the OSM building.
			let basemapTexture: any = null;
			void fetchBasemap({
				centerLat: localPoly.centerLat,
				centerLon: localPoly.centerLon,
				radiusMeters: groundHalf,
				zoom: 18
			})
				.then((basemap) => {
					if (!basemap || !scene) return;
					basemapTexture = new THREE.CanvasTexture(basemap.canvas);
					// Canvas image origin is top-left (north). After the plane's
					// -π/2 X rotation, plane local +Y maps to world -Z (north). With
					// flipY=false, UV v=0 samples canvas y=0 (north) and lands at the
					// plane's bottom edge → world +Z (south)... but we want north at
					// -Z. The default flipY=true flips it back the way we want.
					basemapTexture.colorSpace = THREE.SRGBColorSpace;
					basemapTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
					// Replace the geometry to match the basemap's *true* pixel-aligned
					// extents (which can be ±1 px off the requested radius).
					ground.geometry.dispose();
					ground.geometry = new THREE.PlaneGeometry(
						basemap.halfWidthMeters * 2,
						basemap.halfDepthMeters * 2
					);
					groundMat.color.setHex(0xffffff);
					groundMat.map = basemapTexture;
					groundMat.needsUpdate = true;
				})
				.catch((err) => {
					console.warn('Basemap load failed', err);
				});

			// === Building shape ===
			const shape = new THREE.Shape();
			const pts = localPoly.points;
			if (pts.length === 0) {
				errorMsg = 'Building footprint is empty.';
				loading = false;
				return;
			}
			shape.moveTo(pts[0]!.x, pts[0]!.y);
			for (let i = 1; i < pts.length; i++) {
				const p = pts[i]!;
				shape.lineTo(p.x, p.y);
			}

			// Outer translucent shell — shows the whole building height.
			const shellGeom = new THREE.ExtrudeGeometry(shape, {
				depth: floors * FLOOR_HEIGHT,
				bevelEnabled: false
			});
			shellGeom.rotateX(-Math.PI / 2);
			const shellMat = new THREE.MeshStandardMaterial({
				color: SHELL_COLOR,
				transparent: true,
				opacity: SHELL_OPACITY,
				roughness: 0.9,
				depthWrite: false
			});
			const shellMesh = new THREE.Mesh(shellGeom, shellMat);
			shellMesh.castShadow = false;
			shellMesh.receiveShadow = false;
			scene.add(shellMesh);

			const edgeGeom = new THREE.EdgesGeometry(shellGeom);
			const edgeMat = new THREE.LineBasicMaterial({
				color: 0x6b5b48,
				transparent: true,
				opacity: 0.6
			});
			const edges = new THREE.LineSegments(edgeGeom, edgeMat);
			scene.add(edges);

			// Per-floor slabs.
			floorGroups = [];
			cssLabels = [];
			labelProjection = new THREE.Vector3();
			for (let f = 1; f <= floors; f++) {
				const slabGeom = new THREE.ExtrudeGeometry(shape, {
					depth: 0.18,
					bevelEnabled: false
				});
				slabGeom.rotateX(-Math.PI / 2);
				const slabMat = new THREE.MeshStandardMaterial({
					color: FLOOR_SLAB_COLOR,
					transparent: true,
					opacity: FLOOR_SLAB_OPACITY,
					roughness: 0.85,
					side: THREE.DoubleSide
				});
				const slab = new THREE.Mesh(slabGeom, slabMat);
				slab.position.y = (f - 1) * FLOOR_HEIGHT;
				slab.castShadow = false;
				slab.receiveShadow = true;

				const group = new THREE.Group();
				group.add(slab);

				// Floor label sprite
				const labelEl = document.createElement('div');
				labelEl.className = 'viewer-floor-label';
				labelEl.textContent = `F${f}`;
				const labelObj = new CSS2DMod.CSS2DObject(labelEl);
				labelObj.position.set(
					localPoly.widthMeters / 2 + 1.5,
					(f - 1) * FLOOR_HEIGHT + 0.4,
					localPoly.depthMeters / 2 + 1.5
				);
				group.add(labelObj);
				cssLabels.push({
					obj: labelObj,
					el: labelEl,
					priority: 0,
					code: null,
					w: 0,
					h: 0
				});

				scene.add(group);
				floorGroups.push({ floor: f, group });
			}

			// === Room markers ===
			roomMeshes = [];
			const stableRooms = placements;
			for (const placement of stableRooms) {
				const cyl = new THREE.Mesh(
					new THREE.CylinderGeometry(0.55, 0.55, 1.4, 16),
					new THREE.MeshStandardMaterial({
						color: ROOM_COLOR,
						emissive: 0x1a0606,
						roughness: 0.45,
						metalness: 0.05
					})
				);
				cyl.position.set(
					placement.x,
					(placement.floor - 1) * FLOOR_HEIGHT + 0.95,
					// Local +Y is north; the polygon's `-π/2` X-rotation puts north at
					// world -Z, so we negate here to keep cylinders aligned with the
					// shape (and with the OSM basemap's north).
					-placement.y
				);
				cyl.userData.roomCode = placement.code;
				cyl.userData.floor = placement.floor;
				cyl.castShadow = true;
				cyl.receiveShadow = false;
				scene.add(cyl);

				const labelEl = document.createElement('div');
				labelEl.className = 'viewer-room-label';
				labelEl.textContent = placement.code;
				const labelObj = new CSS2DMod.CSS2DObject(labelEl);
				labelObj.position.set(0, 1.0, 0);
				cyl.add(labelObj);
				cssLabels.push({
					obj: labelObj,
					el: labelEl,
					priority: 1,
					code: placement.code,
					w: 0,
					h: 0
				});

				roomMeshes.push({ mesh: cyl, placement, baseColor: ROOM_COLOR });
			}
			pickTargets = roomMeshes.map((rm) => rm.mesh);

			// === Drag controls (editor mode) ===
			// Built once and toggled via .enabled so we don't tear down meshes when
			// entering/leaving edit mode.
			dragControls = new DragMod.DragControls(
				roomMeshes.map((rm) => rm.mesh),
				camera,
				renderer.domElement
			);
			dragControls.enabled = false;
			// Track per-drag state so we can lock Y to the floor's slab plane.
			let dragOriginY = 0;
			let dragCode: string | null = null;
			let dragFloor: number | null = null;
			dragControls.addEventListener('dragstart', (e: any) => {
				controls.enabled = false;
				const code = e.object?.userData?.roomCode as string | undefined;
				const floor = e.object?.userData?.floor as number | undefined;
				dragCode = code ?? null;
				dragFloor = floor ?? null;
				dragOriginY = e.object.position.y;
				if (code) activeRoomCode = code;
			});
			dragControls.addEventListener('drag', (e: any) => {
				// Lock Y so the marker can't fly off the floor it belongs to.
				e.object.position.y = dragOriginY;
			});
			dragControls.addEventListener('dragend', (e: any) => {
				controls.enabled = true;
				if (!dragCode || dragFloor === null) return;
				const next = {
					floor: dragFloor,
					x: e.object.position.x,
					// World Z grows southward; our placement.y is local-north meters,
					// so flip the sign on the way in.
					y: -e.object.position.z
				};
				const previous = placementForRoom(dragCode);
				if (!previous) {
					dragCode = null;
					dragFloor = null;
					return;
				}
				if (samePosition(previous, next)) {
					setPendingPosition(dragCode, null);
				} else {
					void autosaveRoomPosition(dragCode, next, previous);
				}
				dragCode = null;
				dragFloor = null;
			});

			raycaster = new THREE.Raycaster();
			pointer = new THREE.Vector2();

			onPointerMoveBound = (e: PointerEvent) => {
				if (!canvasContainer) return;
				const rect = canvasContainer.getBoundingClientRect();
				pointerNDC = {
					x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
					y: -((e.clientY - rect.top) / rect.height) * 2 + 1
				};
				pointerMoved = true;
			};
			onPointerLeaveBound = () => {
				// Without this the pointer stays "over" the last spot forever, so the
				// hover highlight sticks and the render loop keeps raycasting.
				pointerNDC = null;
				hoveredRoomCode = null;
			};
			onClickBound = () => {
				if (!pointerNDC || !raycaster || !camera || !scene) return;
				pointer.set(pointerNDC.x, pointerNDC.y);
				raycaster.setFromCamera(pointer, camera);
				const hits = raycaster.intersectObjects(pickTargets, false);
				if (hits.length > 0) {
					const hit = hits[0]!.object;
					const code = hit.userData.roomCode as string | undefined;
					const floor = hit.userData.floor as number | undefined;
					if (code) {
						activeRoomCode = activeRoomCode === code ? null : code;
						if (activeRoomCode && floor) {
							selectedFloor = floor;
						}
					}
				} else {
					activeRoomCode = null;
				}
			};
			renderer.domElement.addEventListener('pointermove', onPointerMoveBound);
			renderer.domElement.addEventListener('pointerleave', onPointerLeaveBound);
			renderer.domElement.addEventListener('click', onClickBound);

			// === Cleanup registration ===
			disposers.push(() => {
				renderer.domElement.removeEventListener('pointermove', onPointerMoveBound!);
				renderer.domElement.removeEventListener('pointerleave', onPointerLeaveBound!);
				renderer.domElement.removeEventListener('click', onClickBound!);
			});
			disposers.push(() => {
				dragControls?.dispose?.();
			});
			disposers.push(() => {
				for (const rm of roomMeshes) {
					rm.mesh.geometry.dispose();
					rm.mesh.material.dispose();
				}
				shellGeom.dispose();
				shellMat.dispose();
				edgeGeom.dispose();
				edgeMat.dispose();
				ground.geometry.dispose();
				(ground.material as any).dispose();
				if (basemapTexture) basemapTexture.dispose();
				for (const fg of floorGroups) {
					fg.group.traverse((obj: any) => {
						if (obj.geometry) obj.geometry.dispose();
						if (obj.material) obj.material.dispose();
					});
				}
				renderer.dispose();
			});

			// === Resize observer ===
			resizeObs = new ResizeObserver(() => {
				if (!canvasContainer || !renderer || !camera || !labelRenderer) return;
				const w = canvasContainer.clientWidth;
				const h = canvasContainer.clientHeight;
				if (w === 0 || h === 0) return;
				renderer.setSize(w, h);
				labelRenderer.setSize(w, h);
				camera.aspect = w / h;
				camera.updateProjectionMatrix();
			});
			resizeObs.observe(canvasContainer);

			const animate = () => {
				// OrbitControls.update() reports whether the camera actually moved.
				const cameraMoved = controls?.update() === true;
				// Hover detection — only when something changed. It used to raycast
				// every frame forever, because pointerNDC stayed set after the first
				// pointermove and was never cleared.
				if ((pointerMoved || cameraMoved) && pointerNDC && raycaster && camera) {
					pointerMoved = false;
					pointer.set(pointerNDC.x, pointerNDC.y);
					raycaster.setFromCamera(pointer, camera);
					const hits = raycaster.intersectObjects(pickTargets, false);
					hoveredRoomCode =
						hits.length > 0
							? ((hits[0]!.object.userData.roomCode as string | undefined) ?? null)
							: null;
				}
				renderer.render(scene, camera);
				labelRenderer.render(scene, camera);
				// Must run after labelRenderer.render(): it rewrites every label's
				// inline `display` each frame, so culling before it would be undone.
				cullOverlappingLabels();
				frameId = requestAnimationFrame(animate);
			};

			loading = false;

			// Apply initial room/edit from store
			if (building3DStore.initialRoomCode) {
				const targetCode = building3DStore.initialRoomCode;
				activeRoomCode = targetCode;
				const roomPlacement = placements.find((p) => p.code === targetCode);
				if (roomPlacement) {
					selectedFloor = roomPlacement.floor;
				}
			}
			if (building3DStore.initialEditMode && adminAuthStore.canPublish) {
				editMode = true;
			}

			animate();
		} catch (err) {
			console.error('Building3DViewer init failed', err);
			errorMsg = 'Failed to load the 3D viewer.';
			loading = false;
		}
	}

	/**
	 * Hide labels that would land on top of one another. Without this every room
	 * gets a label at all times, so a building with a few dozen rooms renders an
	 * illegible pile (Physical Sciences: 38 labels, 101 overlapping pairs).
	 *
	 * Nearest-to-camera wins the space, floor markers outrank room pins, and the
	 * active/hovered room always survives so selecting from the sidebar can never
	 * point at a hidden label.
	 *
	 * ponytail: O(n²) sweep against already-placed boxes. Fine for the tens of
	 * rooms a building has; swap in a grid index if a building ever has hundreds.
	 */
	function cullOverlappingLabels() {
		if (!camera || !canvasContainer || !labelProjection) return;
		const width = canvasContainer.clientWidth;
		const height = canvasContainer.clientHeight;
		if (width === 0 || height === 0) return;

		const onScreen: Array<(typeof cssLabels)[number]> = [];
		const boxes: LabelBox[] = [];

		for (const entry of cssLabels) {
			// CSS2DRenderer already hid it: off-screen, or on a filtered-out floor.
			if (entry.el.style.display === 'none') continue;
			// Text never changes, so one layout read per label is enough.
			if (entry.w === 0) {
				entry.w = entry.el.offsetWidth;
				entry.h = entry.el.offsetHeight;
			}
			labelProjection.setFromMatrixPosition(entry.obj.matrixWorld);
			const depth = labelProjection.distanceTo(camera.position);
			labelProjection.project(camera);
			const focused =
				entry.code !== null && (entry.code === activeRoomCode || entry.code === hoveredRoomCode);
			onScreen.push(entry);
			boxes.push({
				x: (labelProjection.x * 0.5 + 0.5) * width,
				y: (-labelProjection.y * 0.5 + 0.5) * height,
				width: entry.w,
				height: entry.h,
				rank: focused ? -1 : entry.priority,
				depth
			});
		}

		const keep = new Set(pickNonOverlappingLabels(boxes));
		for (let i = 0; i < onScreen.length; i++) {
			if (!keep.has(i)) onScreen[i]!.el.style.display = 'none';
		}
	}

	function resetCamera() {
		if (!camera || !controls || !polygon) return;
		const radius = Math.max(polygon.widthMeters, polygon.depthMeters);
		camera.position.set(radius * 1.4, radius * 1.2, radius * 1.4);
		controls.target.set(0, totalFloors * FLOOR_HEIGHT * 0.4, 0);
		controls.update();
	}

	$effect(() => {
		// Hide rooms not on the selected floor (or show all). A dirty (unsaved)
		// floor change wins over the seeded placement floor so newly-relocated
		// rooms follow the filter.
		const selected = selectedFloor;
		const dirtyMap = dirty;
		untrack(() => {
			for (const rm of roomMeshes) {
				const effectiveFloor = dirtyMap.get(rm.placement.code)?.floor ?? rm.placement.floor;
				const visible = selected === 'all' || effectiveFloor === selected;
				rm.mesh.visible = visible;
			}
			for (const fg of floorGroups) {
				const slabVisible = selected === 'all' || fg.floor === selected;
				fg.group.children.forEach((child: any) => {
					// Always show the floor labels; only hide the slab itself when filtered.
					if (child.isMesh) child.visible = slabVisible;
				});
			}
		});
	});

	$effect(() => {
		const code = activeRoomCode;
		const hover = hoveredRoomCode;
		const editing = editMode;
		const dirtyMap = dirty;
		untrack(() => {
			for (const rm of roomMeshes) {
				const isActive = rm.placement.code === code;
				const isHover = rm.placement.code === hover;
				const isDirty = dirtyMap.has(rm.placement.code);
				const targetColor = isActive
					? ROOM_HIGHLIGHT_COLOR
					: isHover
						? 0xfb923c
						: editing
							? isDirty
								? 0x059669
								: ROOM_EDIT_COLOR
							: rm.baseColor;
				const mat = rm.mesh.material as {
					color: { setHex: (hex: number) => void };
				};
				mat.color.setHex(targetColor);
				const scale = isActive ? 1.4 : isHover ? 1.15 : 1;
				rm.mesh.scale.setScalar(scale);
			}
		});
	});

	// Toggle DragControls when entering / leaving edit mode.
	$effect(() => {
		const enabled = editMode && !saving;
		untrack(() => {
			if (dragControls) dragControls.enabled = enabled;
			if (renderer?.domElement) {
				renderer.domElement.style.cursor = enabled ? 'grab' : '';
			}
		});
	});

	function samePosition(a: RoomPositionDraft, b: RoomPositionDraft) {
		return a.floor === b.floor && Math.abs(a.x - b.x) < 1e-4 && Math.abs(a.y - b.y) < 1e-4;
	}

	function placementForRoom(code: string): RoomPositionDraft | null {
		const p = placements.find((pl) => pl.code === code);
		return p ? { floor: p.floor, x: p.x, y: p.y } : null;
	}

	function applyRoomPosition(code: string, position: RoomPositionDraft) {
		const target = roomMeshes.find((rm) => rm.placement.code === code);
		if (!target) return;
		target.mesh.position.set(position.x, (position.floor - 1) * FLOOR_HEIGHT + 0.95, -position.y);
		target.mesh.userData.floor = position.floor;
	}

	function keepActiveRoomVisible(code: string, position: RoomPositionDraft) {
		if (activeRoomCode === code && selectedFloor !== 'all' && selectedFloor !== position.floor) {
			selectedFloor = position.floor;
		}
	}

	function setRoomSavingState(code: string, state: 'saving' | 'saved' | 'failed' | null) {
		const nextSaving = new Set(savingRoomCodes);
		const nextSaved = new Set(savedRoomCodes);
		const nextFailed = new Set(failedRoomCodes);

		nextSaving.delete(code);
		nextSaved.delete(code);
		nextFailed.delete(code);

		if (state === 'saving') nextSaving.add(code);
		if (state === 'saved') nextSaved.add(code);
		if (state === 'failed') nextFailed.add(code);

		savingRoomCodes = nextSaving;
		savedRoomCodes = nextSaved;
		failedRoomCodes = nextFailed;

		if (state === 'saved') {
			setTimeout(() => {
				const current = new Set(savedRoomCodes);
				current.delete(code);
				savedRoomCodes = current;
			}, 1800);
		}
	}

	function setPendingPosition(code: string, position: RoomPositionDraft | null) {
		const nextDirty = new Map(dirty);
		if (position) {
			nextDirty.set(code, position);
		} else {
			nextDirty.delete(code);
		}
		dirty = nextDirty;
	}

	/**
	 * Move a room to a different floor (editor-only). The change is autosaved
	 * through the versioned room admin endpoint, matching map pin editing.
	 */
	function changeRoomFloor(code: string, nextFloor: number) {
		if (!editMode || savingRoomCodes.has(code)) return;
		const f = Math.max(1, Math.min(totalFloors, Math.floor(nextFloor)));
		const previous = placementForRoom(code);
		if (!previous) return;
		const target = roomMeshes.find((rm) => rm.placement.code === code);
		if (!target) return;
		const next = {
			floor: f,
			x: target.mesh.position.x,
			// World Z grows southward; convert back to local-north meters.
			y: -target.mesh.position.z
		};
		if (samePosition(previous, next)) return;
		applyRoomPosition(code, next);
		void autosaveRoomPosition(code, next, previous);
		// If the user is filtering to a single floor, follow the room.
		if (selectedFloor !== 'all') selectedFloor = f;
	}

	function replaceBuildingRoom(room: Room) {
		buildingRooms = buildingRooms.map((candidate) => (candidate.id === room.id ? room : candidate));
	}

	async function refreshSavedPositionsFromServer() {
		const res = await fetch(`/api/positions?building=${encodeURIComponent(name)}`, {
			credentials: 'same-origin'
		});
		if (!res.ok) return null;
		const data = (await res.json()) as {
			positions?: Array<{
				roomCode: string;
				floor: number;
				x: number;
				y: number;
			}>;
		};
		const map = new Map<string, RoomPositionDraft>();
		for (const p of data.positions ?? []) {
			map.set(p.roomCode, { floor: p.floor, x: p.x, y: p.y });
		}
		savedOverrides = map;
		return map;
	}

	/**
	 * Accept one inferred position into `room_positions`. It goes through the
	 * same versioned endpoint as a drag, tagged `source: "inferred"` so the
	 * server refuses to overwrite anything a human placed.
	 */
	async function acceptSuggestion(code: string, placement: InferredPlacement) {
		const next = {
			floor: placement.floor,
			x: placement.posX,
			y: placement.posY
		};
		await autosaveRoomPosition(code, next, next, 'inferred');
	}

	async function acceptAllSuggestions() {
		if (acceptingSuggestions) return;
		acceptingSuggestions = true;
		// Snapshot: `suggestions` shrinks as each save lands in savedOverrides.
		const entries = [...suggestions];
		for (const [code, placement] of entries) {
			await acceptSuggestion(code, placement);
		}
		const saved = entries.filter(([code]) => savedOverrides.has(code)).length;
		acceptingSuggestions = false;
		editorStatus = {
			type: saved === entries.length ? 'success' : 'error',
			message: `Saved ${saved} of ${entries.length} suggested positions.`
		};
	}

	async function autosaveRoomPosition(
		roomCode: string,
		next: RoomPositionDraft,
		previous: RoomPositionDraft,
		source: 'manual' | 'inferred' = 'manual'
	) {
		const room = buildingRooms.find((candidate) => candidate.code === roomCode);
		if (!room) return;

		setPendingPosition(roomCode, next);
		setRoomSavingState(roomCode, 'saving');
		editorStatus = {
			type: 'info',
			message: `Saving ${roomCode}…`
		};

		try {
			const res = await fetch(`/api/admin/rooms/${room.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({
					version: room.version,
					position: {
						floor: next.floor,
						posX: String(next.x),
						posY: String(next.y),
						source
					}
				})
			});
			const data = (await res.json().catch(() => ({}))) as RoomPositionPatchResponse;

			if (res.status === 401) {
				applyRoomPosition(roomCode, previous);
				keepActiveRoomVisible(roomCode, previous);
				setPendingPosition(roomCode, null);
				setRoomSavingState(roomCode, 'failed');
				editorStatus = {
					type: 'error',
					message: 'Session expired. Please log in again.'
				};
				adminAuthStore.isLoggedIn = false;
				return;
			}

			if (!res.ok) {
				if (res.status === 409 && data.latest) {
					replaceBuildingRoom(data.latest);
					const latestPositions = await refreshSavedPositionsFromServer().catch(() => null);
					const restoredPosition = latestPositions?.get(roomCode) ?? previous;
					applyRoomPosition(roomCode, restoredPosition);
					keepActiveRoomVisible(roomCode, restoredPosition);
					setPendingPosition(roomCode, null);
					setRoomSavingState(roomCode, 'failed');
					editorStatus = {
						type: 'error',
						message:
							data.code === 'manual_position'
								? `${roomCode} was not saved: an editor has already placed this room by hand.`
								: `${roomCode} was not saved because the server has newer data.`
					};
					return;
				}

				applyRoomPosition(roomCode, previous);
				keepActiveRoomVisible(roomCode, previous);
				setPendingPosition(roomCode, null);
				setRoomSavingState(roomCode, 'failed');
				editorStatus = {
					type: 'error',
					message: `${roomCode} failed to save: ${data.error ?? `Save failed (${res.status})`}`
				};
				return;
			}

			if (!data.room) {
				applyRoomPosition(roomCode, previous);
				keepActiveRoomVisible(roomCode, previous);
				setPendingPosition(roomCode, null);
				setRoomSavingState(roomCode, 'failed');
				editorStatus = {
					type: 'error',
					message: `${roomCode} failed to save.`
				};
				return;
			}

			replaceBuildingRoom(data.room);
			const nextSaved = new Map(savedOverrides);
			nextSaved.set(roomCode, next);
			savedOverrides = nextSaved;
			setPendingPosition(roomCode, null);
			setRoomSavingState(roomCode, 'saved');
			editorStatus = {
				type: 'success',
				message: `${roomCode} saved.`
			};
		} catch {
			applyRoomPosition(roomCode, previous);
			keepActiveRoomVisible(roomCode, previous);
			setPendingPosition(roomCode, null);
			setRoomSavingState(roomCode, 'failed');
			editorStatus = {
				type: 'error',
				message: `Network error while saving ${roomCode}.`
			};
		}
	}

	// `buildings` is empty until the campus dataset arrives, so calling init()
	// straight from onMount made a deep link (`/building/<slug>/?3d=1`, which
	// opens the viewer during bootstrap) dead-end on a false "no coordinates
	// yet" error that never retried. Wait for this building's record instead.
	$effect(() => {
		const meta = buildingMeta;
		const ready = appData().loaded;
		untrack(() => {
			if (initStarted) return;
			if (meta) {
				initStarted = true;
				void init();
				return;
			}
			// Only give up once the dataset is in and the building still isn't there.
			if (ready && (buildings ?? []).length > 0) {
				initStarted = true;
				errorMsg = 'This building is not in the campus data yet.';
				loading = false;
			}
		});
	});

	onMount(() => {
		return () => {
			if (frameId !== null) cancelAnimationFrame(frameId);
			resizeObs?.disconnect();
			for (const dispose of disposers) {
				try {
					dispose();
				} catch (e) {
					console.warn('3D dispose error', e);
				}
			}
			if (renderer?.domElement?.parentNode) {
				renderer.domElement.parentNode.removeChild(renderer.domElement);
			}
			if (labelRenderer?.domElement?.parentNode) {
				labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement);
			}
			scene = null;
			camera = null;
			renderer = null;
			labelRenderer = null;
			controls = null;
			dragControls = null;
			raycaster = null;
			pointer = null;
			roomMeshes = [];
			floorGroups = [];
			pickTargets = [];
			cssLabels = [];
			labelProjection = null;
			disposers = [];
		};
	});

	const activeRoomMeta = $derived(
		activeRoomCode ? (buildingRooms.find((r) => r.code === activeRoomCode) ?? null) : null
	);

	// Resolve the floor we should *display* for the active room: dirty wins,
	// then committed placements, then "?".
	const activeRoomFloor = $derived.by(() => {
		if (!activeRoomCode) return null;
		const d = dirty.get(activeRoomCode);
		if (d) return d.floor;
		const p = placements.find((pl) => pl.code === activeRoomCode);
		return p?.floor ?? null;
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="viewer-overlay" transition:fade={overlayFade(reducedMotion.current)}>
	<div
		bind:this={viewerFrameEl}
		class="viewer-frame"
		role="dialog"
		aria-modal="true"
		aria-label={`3D view of ${name}`}
		in:fly={modalContentReveal(reducedMotion.current)}
		out:fly={modalContentDismiss(reducedMotion.current)}
	>
		<header class="viewer-header">
			<div class="viewer-title">
				<Building2 size={20} />
				<div>
					<div class="viewer-name">{name}</div>
					<div class="viewer-subtitle">
						3D model from OpenStreetMap footprint
						<a class="viewer-faq-link" href="/faq#3d-models">Learn about these models</a>
					</div>
				</div>
			</div>
			<IconButton shape="rounded" label="Close 3D viewer" onclick={close}>
				<X size={20} />
			</IconButton>
		</header>

		<div class="viewer-body">
			<aside class="viewer-sidebar">
				<section class="viewer-section">
					<h3>Floor</h3>
					<div class="floor-pills">
						{#each floorOptions as opt (opt.value)}
							<button
								class="floor-pill"
								type="button"
								aria-pressed={selectedFloor === opt.value}
								class:active={selectedFloor === opt.value}
								onclick={() => (selectedFloor = opt.value)}
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</section>

				<section class="viewer-section rooms-section">
					<div class="rooms-header">
						<h3>Rooms</h3>
						<span class="rooms-count">{visibleRooms.length}</span>
					</div>
					<ul class="room-list">
						{#each visibleRooms as p (p.code)}
							{@const pending = dirty.get(p.code)}
							{@const isSavingRoom = savingRoomCodes.has(p.code)}
							{@const isSavedRoom = savedRoomCodes.has(p.code)}
							{@const isFailedRoom = failedRoomCodes.has(p.code)}
							{@const hasRoomStatus = isSavingRoom || isSavedRoom || isFailedRoom}
							<li>
								<button
									class="room-item"
									class:active={activeRoomCode === p.code}
									class:dirty={Boolean(pending)}
									class:saving={isSavingRoom}
									class:failed={isFailedRoom}
									onmouseenter={() => (hoveredRoomCode = p.code)}
									onmouseleave={() => {
										if (hoveredRoomCode === p.code) hoveredRoomCode = null;
									}}
									onclick={() => {
										activeRoomCode = activeRoomCode === p.code ? null : p.code;
										if (activeRoomCode) selectedFloor = pending?.floor ?? p.floor;
									}}
								>
									<span class="room-code">{p.code}</span>
									<span class="room-meta">
										{#if hasRoomStatus}
											<span
												class="room-save-state"
												class:saving={isSavingRoom}
												class:saved={isSavedRoom}
												class:failed={isFailedRoom}
											>
												{isSavingRoom ? 'Saving' : isFailedRoom ? 'Failed' : 'Saved'}
											</span>
										{/if}
										<span class="room-floor" class:dirty={Boolean(pending)}
											>F{pending?.floor ?? p.floor}</span
										>
									</span>
								</button>
							</li>
						{/each}
						{#if visibleRooms.length === 0}
							<li class="room-empty">No rooms on this floor.</li>
						{/if}
					</ul>
				</section>

				{#if footprintNote}
					<p class="viewer-note">{footprintNote}</p>
				{/if}

				<button class="viewer-reset" onclick={resetCamera}>
					<RotateCcw size={14} /> Reset camera
				</button>

				{#if adminAuthStore.canPublish}
					<section class="viewer-section editor-section">
						<h3>Editor</h3>
						<div class="editor-controls">
							<button
								class="edit-toggle"
								class:active={editMode}
								type="button"
								aria-pressed={editMode}
								onclick={() => (editMode = !editMode)}
							>
								<span class="edit-toggle-icon">
									<Pencil size={12} />
								</span>
								<span>{editMode ? 'Editing positions' : 'Edit positions'}</span>
							</button>
							{#if editMode}
								<p class="editor-hint">
									Drag a room cylinder or change its floor. Changes autosave to the server with a
									version check.
								</p>
								{#if suggestions.size > 0}
									<div class="suggest-block">
										<p class="editor-hint">
											{suggestions.size} unsaved room{suggestions.size === 1 ? '' : 's'} can be placed
											from their room code. Floors are read from the code or directions; the spot on the
											floor is a corridor estimate — check them before saving.
										</p>
										<button
											class="suggest-accept-all"
											type="button"
											disabled={acceptingSuggestions}
											onclick={acceptAllSuggestions}
										>
											{acceptingSuggestions ? 'Saving…' : `Save all ${suggestions.size}`}
										</button>
										<ul class="suggest-list">
											{#each [...suggestions] as [code, placement] (code)}
												<li class="suggest-item">
													<div class="suggest-row">
														<span class="suggest-code" title={code}>{code}</span>
														<span class="suggest-floor">F{placement.floor}</span>
														<span
															class="suggest-confidence"
															class:high={placement.confidence === 'high'}
															class:medium={placement.confidence === 'medium'}
															class:low={placement.confidence === 'low'}
															>{placement.confidence}</span
														>
														<button
															class="suggest-accept"
															type="button"
															disabled={acceptingSuggestions || savingRoomCodes.has(code)}
															onclick={() => acceptSuggestion(code, placement)}>Save</button
														>
													</div>
													<p class="suggest-reason">{placement.reason}</p>
												</li>
											{/each}
										</ul>
									</div>
								{/if}
								<p
									class="editor-status"
									class:error={editorStatus?.type === 'error'}
									class:success={editorStatus?.type === 'success'}
								>
									{editorStatus?.message ?? 'Ready. Each move saves automatically.'}
								</p>
							{/if}
						</div>
					</section>
				{/if}
			</aside>

			<div class="viewer-stage">
				{#if loading}
					<div class="viewer-status">
						<Loader size={20} class="viewer-spin" />
						<span>Loading building from OpenStreetMap…</span>
					</div>
				{/if}
				{#if errorMsg}
					<div class="viewer-status error">{errorMsg}</div>
				{/if}
				{#if (footprintApproximate || footprintUncertain) && !errorMsg && !loading}
					<div class="viewer-provisional">
						<span>
							{#if footprintApproximate}
								Approximate shape. OpenStreetMap has no footprint for this building yet, so this is
								a stand-in box around its coordinates — the outline is not the real building.
							{:else}
								This outline may belong to a neighbouring building: the closest OpenStreetMap
								footprint{footprintOsmName ? ` (“${footprintOsmName}”)` : ''} does not contain this building’s
								coordinates.
							{/if}
						</span>
						{#if buildingMeta}
							<a
								href={`https://www.openstreetmap.org/edit#map=19/${buildingMeta.lat}/${buildingMeta.lon}`}
								target="_blank"
								rel="noreferrer">Fix it in OpenStreetMap</a
							>
						{/if}
					</div>
				{/if}
				<div bind:this={canvasContainer} class="viewer-canvas"></div>
				<div bind:this={labelContainer} class="viewer-labels"></div>

				<div class="viewer-attribution">
					©
					<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a
					>
					©
					<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
						>OpenStreetMap contributors</a
					>
				</div>

				{#if activeRoomMeta}
					<div class="room-info-card" transition:fade={{ duration: 120 }}>
						<div class="room-info-header">
							<strong>{activeRoomMeta.code}</strong>
							{#if editMode && activeRoomFloor !== null}
								<label class="room-info-floor-edit">
									Floor
									<select
										value={activeRoomFloor}
										onchange={(e) =>
											changeRoomFloor(activeRoomMeta.code, parseInt(e.currentTarget.value, 10))}
									>
										{#each Array.from({ length: totalFloors }, (_, i) => i + 1) as f (f)}
											<option value={f}>F{f}</option>
										{/each}
									</select>
								</label>
							{:else}
								<span class="room-info-floor">Floor {activeRoomFloor ?? '?'}</span>
							{/if}
						</div>
						{#if activeRoomMeta.collegeName}
							<div class="room-info-row">
								<span>College</span>
								<span>{activeRoomMeta.collegeName}</span>
							</div>
						{/if}
						{#if activeRoomMeta.divisionName}
							<div class="room-info-row">
								<span>Division</span>
								<span>{activeRoomMeta.divisionName}</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.viewer-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(8, 12, 22, 0.55);
		backdrop-filter: blur(2px);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		pointer-events: auto;
	}
	.viewer-frame {
		width: min(72rem, 100%);
		height: min(46rem, 100%);
		background-color: white;
		border-radius: 1rem;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.viewer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.125rem;
		border-bottom: 1px solid hsl(0, 0%, 92%);
		flex: 0 0 auto;
	}
	.viewer-title {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		color: hsl(0, 0%, 15%);
	}
	.viewer-name {
		font-weight: 700;
		font-size: 1rem;
		line-height: 1.2;
	}
	.viewer-subtitle {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.5rem;
		font-size: 0.75rem;
		color: hsl(0, 0%, 45%);
		margin-top: 0.125rem;
	}

	.viewer-faq-link {
		color: hsl(5, 53%, 32%);
		font-weight: 600;
		text-decoration: none;
	}

	.viewer-faq-link:hover,
	.viewer-faq-link:focus-visible {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.viewer-body {
		flex: 1 1 auto;
		display: flex;
		min-height: 0;
	}

	.viewer-sidebar {
		width: 17rem;
		border-right: 1px solid hsl(0, 0%, 92%);
		padding: 0.875rem;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background-color: hsl(0, 0%, 99%);
	}
	.viewer-section h3 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: hsl(0, 0%, 35%);
		margin-bottom: 0.4rem;
	}
	.floor-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	.floor-pill {
		border: 1px solid hsl(0, 0%, 88%);
		background-color: white;
		border-radius: 999px;
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		cursor: pointer;
		color: hsl(0, 0%, 25%);
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}
	.floor-pill:hover {
		background-color: hsl(0, 0%, 96%);
	}
	.floor-pill.active {
		background-color: hsl(5, 53%, 32%);
		color: white;
		border-color: hsl(5, 53%, 32%);
	}

	.rooms-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.rooms-count {
		font-size: 0.75rem;
		/* Was hsl(0,0%,50%) on the hsl(0,0%,99%) sidebar: 3.8:1, under AA. */
		color: hsl(0, 0%, 40%);
	}
	/*
   * The rooms list takes whatever height is left instead of a fixed 16rem.
   * The fixed cap used to fill ~90% of the sidebar on narrow screens, so the
   * list swallowed the sidebar's scroll and the note / reset / editor controls
   * below it could not be reached.
   */
	.rooms-section {
		flex: 1 1 auto;
		min-height: 8rem;
		display: flex;
		flex-direction: column;
	}
	.room-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
	}
	.room-item {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.4rem 0.625rem;
		border-radius: 0.5rem;
		border: 1px solid transparent;
		background-color: white;
		cursor: pointer;
		text-align: left;
	}
	.room-item:hover {
		background-color: hsl(0, 0%, 96%);
	}
	.room-item.active {
		background-color: hsl(45, 92%, 95%);
		border-color: hsl(45, 92%, 60%);
	}
	.room-item.dirty {
		background-color: hsl(160, 84%, 96%);
		border-color: hsl(160, 70%, 58%);
	}
	.room-item.saving {
		background-color: hsl(217, 91%, 97%);
		border-color: hsl(217, 91%, 72%);
	}
	.room-item.failed {
		background-color: hsl(5, 90%, 97%);
		border-color: hsl(5, 60%, 72%);
	}
	.room-code {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(0, 0%, 15%);
	}
	.room-meta {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		flex: 0 0 auto;
	}
	.room-floor {
		font-size: 0.6875rem;
		color: hsl(0, 0%, 45%);
		background-color: hsl(0, 0%, 95%);
		padding: 0.0625rem 0.375rem;
		border-radius: 999px;
	}
	.room-floor.dirty {
		color: hsl(160, 84%, 22%);
		background-color: hsl(160, 84%, 90%);
	}
	.room-save-state {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.room-save-state.saving {
		color: hsl(217, 72%, 36%);
	}
	.room-save-state.saved {
		color: hsl(145, 55%, 28%);
	}
	.room-save-state.failed {
		color: hsl(5, 60%, 34%);
	}
	.room-empty {
		font-size: 0.8125rem;
		/* Was hsl(0,0%,50%) on the hsl(0,0%,99%) sidebar: 3.8:1, under AA. */
		color: hsl(0, 0%, 40%);
		padding: 0.25rem 0.125rem;
	}

	.viewer-note {
		flex: 0 0 auto;
		font-size: 0.6875rem;
		/* Was hsl(0,0%,45%) on this tinted panel: ~4.3:1, under AA. */
		color: hsl(0, 0%, 36%);
		line-height: 1.4;
		background-color: hsl(45, 90%, 96%);
		border: 1px solid hsl(45, 92%, 88%);
		padding: 0.5rem 0.625rem;
		border-radius: 0.5rem;
	}

	.viewer-reset {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		padding: 0.4rem 0.625rem;
		border: 1px solid hsl(0, 0%, 88%);
		background: white;
		border-radius: 0.5rem;
		cursor: pointer;
		width: max-content;
	}
	.viewer-reset:hover {
		background-color: hsl(0, 0%, 96%);
	}

	.editor-section {
		position: sticky;
		bottom: 0;
		z-index: 2;
		box-sizing: border-box;
		margin-top: auto;
		padding: 0.75rem;
		border: 1px solid hsl(0, 0%, 88%);
		border-radius: 0.75rem;
		background-color: rgba(255, 255, 255, 0.96);
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.05);
		backdrop-filter: blur(6px);
	}
	.editor-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.edit-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		border: 1px solid hsl(0, 0%, 86%);
		border-radius: 0.5rem;
		background-color: white;
		padding: 0.45rem 0.625rem;
		cursor: pointer;
		font-size: 0.8125rem;
		font-weight: 700;
		color: hsl(0, 0%, 20%);
		transition:
			background-color 0.15s,
			border-color 0.15s,
			color 0.15s;
	}
	.edit-toggle:hover {
		background-color: hsl(217, 91%, 97%);
		border-color: hsl(217, 91%, 82%);
	}
	.edit-toggle.active {
		background-color: hsl(217, 91%, 96%);
		border-color: hsl(217, 91%, 62%);
		color: hsl(217, 91%, 28%);
	}
	.edit-toggle-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 999px;
		background-color: hsl(0, 0%, 94%);
	}
	.edit-toggle.active .edit-toggle-icon {
		background-color: hsl(217, 91%, 88%);
	}
	.editor-hint {
		margin: 0;
		font-size: 0.6875rem;
		/* Was hsl(0,0%,45%) on this tinted panel: ~4.3:1, under AA. */
		color: hsl(0, 0%, 36%);
		line-height: 1.4;
		background-color: hsl(217, 91%, 97%);
		border: 1px solid hsl(217, 91%, 90%);
		padding: 0.4rem 0.5rem;
		border-radius: 0.5rem;
	}
	.editor-status {
		margin: 0;
		font-size: 0.6875rem;
		line-height: 1.35;
		color: hsl(217, 72%, 30%);
	}

	.suggest-block {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		min-width: 0;
	}
	.suggest-accept-all {
		align-self: flex-start;
		max-width: 100%;
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.3rem 0.6rem;
		border-radius: 0.5rem;
		border: 1px solid hsl(217, 60%, 70%);
		background-color: hsl(217, 91%, 97%);
		color: hsl(217, 72%, 30%);
		cursor: pointer;
	}
	.suggest-accept-all:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.suggest-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		max-height: 14rem;
		overflow-y: auto;
	}
	.suggest-item {
		border: 1px solid hsl(0, 0%, 90%);
		border-radius: 0.5rem;
		padding: 0.375rem 0.5rem;
		min-width: 0;
	}
	.suggest-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.375rem;
		min-width: 0;
	}
	.suggest-code {
		flex: 1 1 auto;
		min-width: 0;
		font-size: 0.75rem;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.suggest-floor {
		font-size: 0.625rem;
		color: hsl(0, 0%, 40%);
	}
	.suggest-confidence {
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		padding: 0.1rem 0.3rem;
		border-radius: 999px;
	}
	.suggest-confidence.high {
		background-color: hsl(145, 60%, 94%);
		color: hsl(145, 55%, 25%);
	}
	.suggest-confidence.medium {
		background-color: hsl(45, 90%, 93%);
		color: hsl(35, 70%, 28%);
	}
	.suggest-confidence.low {
		background-color: hsl(5, 80%, 95%);
		color: hsl(5, 60%, 34%);
	}
	.suggest-accept {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.2rem 0.45rem;
		border-radius: 0.4rem;
		border: 1px solid hsl(0, 0%, 82%);
		background-color: white;
		cursor: pointer;
	}
	.suggest-accept:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.suggest-reason {
		margin: 0.25rem 0 0;
		font-size: 0.625rem;
		line-height: 1.35;
		color: hsl(0, 0%, 45%);
	}

	.viewer-provisional {
		position: absolute;
		top: 0.75rem;
		left: 50%;
		translate: -50% 0;
		/*
     * `width`, not `max-width`. Shrink-to-fit collapsed this to its minimum
     * content width on a narrow stage, turning a two-line notice into a
     * 160px-wide column that filled the full height of the 3D view and covered
     * both the attribution and every room label.
     */
		width: min(32rem, calc(100% - 1.5rem));
		box-sizing: border-box;
		max-height: calc(100% - 3.5rem);
		overflow-y: auto;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.375rem;
		background-color: hsl(45, 90%, 96%);
		border: 1px solid hsl(45, 92%, 84%);
		color: hsl(35, 60%, 24%);
		border-radius: 0.625rem;
		padding: 0.45rem 0.75rem;
		font-size: 0.75rem;
		line-height: 1.35;
		z-index: 5;
	}
	.viewer-provisional a {
		color: hsl(217, 72%, 36%);
		text-decoration: underline;
		white-space: nowrap;
	}
	.editor-status.success {
		color: hsl(145, 55%, 28%);
	}
	.editor-status.error {
		color: hsl(5, 60%, 34%);
		font-weight: 600;
	}

	.viewer-stage {
		position: relative;
		flex: 1 1 auto;
		/* The 3D view is the point of this dialog; never let it collapse. */
		min-height: 12rem;
		background-color: hsl(212, 24%, 95%);
		overflow: hidden;
	}
	.viewer-canvas {
		position: absolute;
		inset: 0;
	}
	.viewer-labels {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.viewer-attribution {
		position: absolute;
		bottom: 0.4rem;
		right: 0.4rem;
		font-size: 0.625rem;
		color: hsl(0, 0%, 25%);
		background-color: rgba(255, 255, 255, 0.78);
		padding: 0.15rem 0.4rem;
		border-radius: 0.25rem;
		z-index: 3;
		pointer-events: auto;
	}
	.viewer-attribution a {
		color: hsl(0, 0%, 25%);
		text-decoration: underline;
	}
	.viewer-status {
		position: absolute;
		top: 0.75rem;
		left: 50%;
		translate: -50% 0;
		background-color: white;
		border: 1px solid hsl(0, 0%, 90%);
		border-radius: 999px;
		padding: 0.4rem 0.875rem;
		font-size: 0.8125rem;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		z-index: 5;
		box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
	}
	.viewer-status.error {
		color: hsl(5, 65%, 32%);
		border-color: hsl(5, 50%, 80%);
		background-color: hsl(5, 90%, 97%);
	}
	:global(.viewer-spin) {
		animation: viewer-spin 1s linear infinite;
	}
	@keyframes viewer-spin {
		to {
			transform: rotate(360deg);
		}
	}

	:global(.viewer-room-label) {
		background-color: white;
		color: hsl(0, 0%, 15%);
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		border-radius: 0.375rem;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
		white-space: nowrap;
		/* No `transform` here: CSS2DRenderer writes an inline transform on every
       frame, so anything set from the stylesheet is dead weight. Offset the
       label via its CSS2DObject position instead. */
		pointer-events: none;
	}
	:global(.viewer-floor-label) {
		background-color: hsl(5, 53%, 32%);
		color: white;
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 0.0625rem 0.375rem;
		border-radius: 0.25rem;
		pointer-events: none;
		opacity: 0.85;
	}

	.room-info-card {
		position: absolute;
		bottom: 0.875rem;
		left: 0.875rem;
		background-color: white;
		border-radius: 0.75rem;
		padding: 0.75rem 0.875rem;
		box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
		width: 17rem;
		z-index: 4;
	}
	.room-info-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.room-info-header strong {
		font-size: 0.9375rem;
		color: hsl(0, 0%, 15%);
	}
	.room-info-floor {
		font-size: 0.6875rem;
		color: white;
		background-color: hsl(5, 53%, 32%);
		padding: 0.0625rem 0.375rem;
		border-radius: 999px;
	}
	.room-info-floor-edit {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		color: hsl(0, 0%, 30%);
	}
	.room-info-floor-edit select {
		font: inherit;
		border: 1px solid hsl(217, 91%, 70%);
		background-color: hsl(217, 91%, 97%);
		color: hsl(217, 91%, 25%);
		border-radius: 0.375rem;
		padding: 0.125rem 0.25rem;
		cursor: pointer;
	}
	.room-info-row {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.75rem;
		margin-top: 0.4rem;
	}
	.room-info-row span:first-child {
		color: hsl(0, 0%, 45%);
	}
	.room-info-row span:last-child {
		color: hsl(0, 0%, 15%);
		text-align: right;
	}
	@media screen and (max-width: 48rem) {
		.viewer-overlay {
			padding: 0;
		}
		.viewer-frame {
			width: 100%;
			height: 100%;
			border-radius: 0;
		}
		.viewer-title {
			align-items: flex-start;
		}
		.viewer-body {
			flex-direction: column;
		}
		.viewer-sidebar {
			width: 100%;
			border-right: none;
			border-bottom: 1px solid hsl(0, 0%, 92%);
			/* Was a flat 16rem, which ate 45% of a 568px-tall phone and left the
         3D view 184px. Scale with the viewport so the model keeps the room. */
			max-height: min(14rem, 34vh);
			flex: 0 0 auto;
		}
		/*
     * One scroll surface on narrow screens. The desktop layout gives the list
     * its own scroller inside a sidebar tall enough to also show the controls
     * beneath it; at this width there is no such room, and a scroller inside a
     * scroller meant a drag over the list never reached the sidebar, leaving
     * the note, Reset camera and the editor panel unreachable.
     */
		.rooms-section {
			flex: 0 0 auto;
			min-height: 0;
		}
		.room-list {
			flex: 0 0 auto;
			overflow-y: visible;
		}
		/* Touch targets: these were 25–31px tall, under the 44px minimum. */
		.floor-pill,
		.room-item,
		.viewer-reset,
		.edit-toggle {
			min-height: 2.75rem;
		}
		.suggest-accept,
		.suggest-accept-all {
			min-height: 2.25rem;
		}
		.viewer-provisional {
			/* Tighter on a short stage so the notice stays a notice, not a curtain. */
			top: 0.5rem;
			width: calc(100% - 1rem);
			padding: 0.4rem 0.55rem;
			font-size: 0.6875rem;
			gap: 0.25rem;
		}
		.room-info-card {
			width: calc(100% - 1.75rem);
			/* Keep the attribution readable underneath the card. */
			bottom: 1.75rem;
		}
	}
</style>
