<script lang="ts">
  import { onMount, untrack } from "svelte";
  import IconButton from "@ui/IconButton.svelte";
  import { fade, fly } from "svelte/transition";
  import { X, Building2, Loader, Pencil, Info } from "@lucide/svelte";
  import BottomSheet from "@ui/BottomSheet.svelte";
  import MapControlsStack, {
    type MapControlsController,
  } from "./map-chrome/MapControlsStack.svelte";
  import type { BottomSheetSnap } from "@lib/bottom-sheet-snap";
  import {
    MAPTILER_COPYRIGHT_URL,
    OSM_COPYRIGHT_URL,
  } from "@constants/data-license";
  import {
    getBasemapProvider,
    onBasemapProviderChange,
  } from "@lib/basemap-provider";
  import { building3DStore, adminAuthStore } from "@lib/store.svelte";
  import {
    modalContentDismiss,
    modalContentReveal,
    overlayFade,
  } from "@lib/motion";
  import { MediaQuery } from "svelte/reactivity";
  import { getAppData } from "@lib/context";
  import type { RoomData } from "@lib/types";
  import { firstBuildingRooms } from "@lib/local/data/utils";
  import {
    checkLocalBuildingRoom,
    syncBuildingRooms,
  } from "@lib/local/data/sync";
  import { fetchBuildingFootprint } from "@lib/overpass";
  import { bundledFootprint } from "@lib/building-footprints";
  import { fetchBasemap } from "@lib/osm-basemap";
  import { trapFocus } from "@lib/focus-trap";
  import {
    footprintToLocalPolygon,
    placeRooms,
    approximateFootprint,
    defaultFloorCount,
    maxInferredFloor,
    pickNonOverlappingLabels,
    cameraFitDistance,
    isRoomLabelShown,
    type LabelBox,
    type LocalPolygonData,
    type RoomPlacement,
  } from "@lib/building-3d";
  import {
    inferBuildingPlacements,
    type InferredPlacement,
    type RoomPlacementInput,
  } from "@lib/room-placement";

  const appData = getAppData();
  const buildings = $derived(appData().loaded ? appData().buildings : []);

  let { name }: { name: string } = $props();

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = new MediaQuery("max-width:48rem");

  const FLOOR_HEIGHT = 3.5;
  /** Gap between storeys so each floor reads as its own band. */
  const FLOOR_GAP = 0.45;
  const ROOM_COLOR = 0xdc2626;
  const ROOM_HIGHLIGHT_COLOR = 0xfacc15;
  const ROOM_EDIT_COLOR = 0x2563eb;
  // Brand-tinted storeys (alternating so floors separate) with a maroon
  // outline, the same #7b1113 the campus map pins use.
  const FLOOR_COLORS = [0xf1d9d0, 0xe4bcae];
  const OUTLINE_COLOR = 0x7b1113;
  /** Storeys above the selected floor fade so its markers stay in view. */
  const GHOST_OPACITY = 0.14;
  /** Plain land colour around the ground image, close to the campus style's. */
  const LAND_COLOR = 0xf5f3ef;
  const FOV_DEG = 45;
  /**
   * Camera tilt, MapLibre-style (degrees from straight down). Past ~50° the
   * horizon creeps into a phone's short visible strip.
   */
  const DEFAULT_PITCH_DEG = 45;
  const MAX_PITCH_DEG = 50;
  /** Share of the visible map the building fills when framed. */
  const FIT_FILL = 1.15;

  type RoomPositionPatchResponse = {
    success?: boolean;
    room?: RoomData | null;
    latest?: RoomData | null;
    error?: string;
    code?: string;
  };
  type RoomPositionDraft = { floor: number; x: number; y: number };

  let viewerFrameEl: HTMLDivElement | null = $state(null);
  let headingEl: HTMLHeadingElement | null = $state(null);
  let stageEl: HTMLDivElement | null = $state(null);
  let headerH = $state(0);
  let sheetSnap = $state<BottomSheetSnap>("peek");
  /** Stage pixels hidden behind the mobile sheet (MapLibre `padding.bottom`). */
  let padBottom = $state(0);
  let attributionOpen = $state(false);
  // Credit whoever served the ground tiles, as the campus map does (#885).
  let basemapProvider = $state(getBasemapProvider());
  /** Degrees clockwise from north, for the compass. */
  let cameraBearing = $state(0);
  let canvasContainer: HTMLDivElement | null = $state(null);
  let labelContainer: HTMLDivElement | null = $state(null);

  let loading = $state(true);
  let errorMsg: string | null = $state(null);
  let totalFloors = $state(1);
  let selectedFloor = $state<number | "all">("all");
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
    type: "success" | "error" | "info";
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
  let floorGroups: Array<{
    floor: number;
    group: any;
    block: any;
    outline: any;
  }> = [];
  /** The three.js module, kept for camera maths outside init(). */
  let three: any = null;
  /** Until the user drags or zooms, padding changes re-frame the building. */
  let userMovedCamera = false;
  let cameraTween: {
    fromPos: any;
    toPos: any;
    fromTarget: any;
    toTarget: any;
    start: number;
    ms: number;
  } | null = null;
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

  let buildingRooms = $state<RoomData[]>([]);

  const buildingMeta = $derived(
    buildings.find((b) => b.buildingName === name) ?? null,
  );

  const roomInputs = $derived(
    buildingRooms.map<RoomPlacementInput>((r) => ({
      roomCode: r.code,
      buildingName: name,
      directions: r.directions,
    })),
  );

  const placements = $derived(
    polygon
      ? placeRooms(roomInputs, polygon, totalFloors, savedOverrides)
      : ([] as RoomPlacement[]),
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
      new Set(savedOverrides.keys()),
    );
  });

  let polygon: LocalPolygonData | null = $state(null);

  const floorOptions = $derived.by(() => {
    const opts: Array<{ value: number | "all"; label: string }> = [
      { value: "all", label: "All floors" },
    ];
    for (let f = totalFloors; f >= 1; f--) {
      opts.push({ value: f, label: `Floor ${f}` });
    }
    return opts;
  });

  const visibleRooms = $derived.by(() => {
    if (selectedFloor === "all") return placements;
    return placements.filter(
      (p) => (dirty.get(p.code)?.floor ?? p.floor) === selectedFloor,
    );
  });

  function close() {
    building3DStore.close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  // `aria-modal="true"` tells assistive tech the rest of the page is inert, so
  // Tab has to honour that. Same shared trap the other modals use. Focus starts
  // on the heading: the first focusable was the FAQ link, which painted its
  // focus ring the moment the viewer opened from a tap.
  $effect(() => {
    if (!viewerFrameEl) return;
    return trapFocus(viewerFrameEl, {
      onEscape: close,
      initialFocus: headingEl,
    });
  });

  async function init() {
    if (!canvasContainer || !labelContainer) return;
    if (!buildingMeta?.lat || !buildingMeta?.lon) {
      errorMsg = "This building has no coordinates yet.";
      loading = false;
      return;
    }

    try {
      const { id: buildingId, lat, lon } = buildingMeta;
      // The committed manifest answers synchronously for every building the
      // generator has seen; only unknown buildings wait on Overpass.
      const bundled = bundledFootprint(name);

      // Room sync, the three.js chunks, saved positions, and the footprint
      // are independent, so none of them waits on another.
      const [, THREE, OrbitMod, CSS2DMod, DragMod, savedRes, osmFootprint] =
        await Promise.all([
          (async () => {
            // Server and local cache race, so a cold PGlite boot no longer
            // holds up the first frame; the cache write happens afterwards.
            buildingRooms = await firstBuildingRooms(buildingId, async (rooms) => {
              const buildingChecker = await checkLocalBuildingRoom(buildingId);
              await syncBuildingRooms(buildingChecker, buildingId, rooms);
            });
          })(),
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
          import("three/examples/jsm/renderers/CSS2DRenderer.js"),
          import("three/examples/jsm/controls/DragControls.js"),
          fetch(`/api/positions?building=${encodeURIComponent(name)}`, {
            credentials: "same-origin",
          }).catch(() => null),
          bundled !== undefined ? bundled : fetchBuildingFootprint(lat, lon),
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
      footprintApproximate = osmFootprint === null;
      // OSM had *a* building nearby, but not one containing our coordinates —
      // the outline probably belongs to a neighbour.
      footprintUncertain = osmFootprint !== null && !osmFootprint.containsPoint;
      footprintOsmName = osmFootprint?.osmName ?? null;
      const footprint =
        osmFootprint ??
        approximateFootprint(buildingMeta.lat, buildingMeta.lon);

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
      three = THREE;
      scene = new THREE.Scene();
      // Matches the land apron below, so a background never reads as sky.
      scene.background = new THREE.Color(LAND_COLOR);

      const width = canvasContainer.clientWidth;
      const height = canvasContainer.clientHeight;

      camera = new THREE.PerspectiveCamera(FOV_DEG, width / height, 0.1, 6000);
      const radius = Math.max(localPoly.widthMeters, localPoly.depthMeters);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      canvasContainer.appendChild(renderer.domElement);

      labelRenderer = new CSS2DMod.CSS2DRenderer();
      labelRenderer.setSize(width, height);
      labelRenderer.domElement.style.position = "absolute";
      labelRenderer.domElement.style.top = "0";
      labelRenderer.domElement.style.left = "0";
      labelRenderer.domElement.style.pointerEvents = "none";
      labelContainer.appendChild(labelRenderer.domElement);

      controls = new OrbitMod.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 4;
      // Pitch cap: steeper than this and the horizon shows above the ground.
      controls.maxPolarAngle = (MAX_PITCH_DEG * Math.PI) / 180;
      controls.addEventListener("start", () => {
        userMovedCamera = true;
        cameraTween = null;
      });
      measurePadding();
      frameBuilding(false);

      // === Lighting ===
      const ambient = new THREE.AmbientLight(0xffffff, 0.9);
      scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 1.2);
      dir.position.set(radius, radius * 2.5, radius * 0.6);
      dir.castShadow = true;
      scene.add(dir);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7f74, 0.5);
      scene.add(hemi);

      // === Ground ===
      // Sized to comfortably contain the building plus context. The basemap
      // texture (loaded async below) will be cropped to this exact half-extent
      // so its pixels land 1:1 with world meters.
      const groundHalf = Math.max(150, radius * 3);
      // Unlit: lighting the tiles greyed them into a blue-grey haze.
      const groundMat = new THREE.MeshBasicMaterial({ color: LAND_COLOR });
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(groundHalf * 2, groundHalf * 2),
        groundMat,
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.02;
      scene.add(ground);
      // Land apron far past the tiles: with the pitch capped the view never
      // reaches the horizon, so the edge of the basemap shows plain land
      // instead of grey sky.
      const apron = new THREE.Mesh(
        new THREE.PlaneGeometry(8000, 8000),
        new THREE.MeshBasicMaterial({ color: LAND_COLOR }),
      );
      apron.rotation.x = -Math.PI / 2;
      apron.position.y = -0.05;
      scene.add(apron);

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
            basemap.halfDepthMeters * 2,
          );
          groundMat.color.setHex(0xffffff);
          groundMat.map = basemapTexture;
          groundMat.needsUpdate = true;
        })
        .catch((err) => {
          console.warn("Basemap load failed", err);
        });

      // === Building shape ===
      const shape = new THREE.Shape();
      const pts = localPoly.points;
      if (pts.length === 0) {
        errorMsg = "Building footprint is empty.";
        loading = false;
        return;
      }
      shape.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i]!;
        shape.lineTo(p.x, p.y);
      }

      // One solid block per storey, a little shorter than the floor height,
      // so "All floors" reads as stacked floors instead of one see-through
      // box. Markers draw over the blocks (depthTest off), so solid walls never
      // hide a room.
      // The footprint corner nearest the default (south-east) camera: floor
      // badges sit on the building's own edge instead of floating in the
      // bounding-box corner, which can be metres off an L-shaped footprint.
      const corner = pts.reduce((best, p) =>
        p.x - p.y > best.x - best.y ? p : best,
      );
      const blockGeom = new THREE.ExtrudeGeometry(shape, {
        depth: FLOOR_HEIGHT - FLOOR_GAP,
        bevelEnabled: false,
      });
      blockGeom.rotateX(-Math.PI / 2);
      const outlineGeom = new THREE.EdgesGeometry(blockGeom);
      floorGroups = [];
      cssLabels = [];
      labelProjection = new THREE.Vector3();
      for (let f = 1; f <= floors; f++) {
        const block = new THREE.Mesh(
          blockGeom,
          new THREE.MeshStandardMaterial({
            color: FLOOR_COLORS[(f - 1) % FLOOR_COLORS.length],
            roughness: 0.85,
            transparent: true,
            opacity: 1,
            // Pushed back a hair so the outline wins the depth test.
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
          }),
        );
        block.position.y = (f - 1) * FLOOR_HEIGHT;
        const outline = new THREE.LineSegments(
          outlineGeom,
          new THREE.LineBasicMaterial({
            color: OUTLINE_COLOR,
            transparent: true,
            opacity: 0.9,
          }),
        );
        outline.position.y = block.position.y;

        const group = new THREE.Group();
        group.add(block);
        group.add(outline);

        const labelEl = document.createElement("div");
        labelEl.className = "viewer-floor-label";
        labelEl.textContent = `F${f}`;
        const labelObj = new CSS2DMod.CSS2DObject(labelEl);
        labelObj.position.set(
          corner.x,
          (f - 1) * FLOOR_HEIGHT + (FLOOR_HEIGHT - FLOOR_GAP) / 2,
          -corner.y,
        );
        // Alternate sides of the corner so stacked storeys' badges sit side
        // by side instead of on top of each other.
        labelObj.center.set(f % 2 === 1 ? 1.2 : -0.2, 0.5);
        labelObj.userData.floor = f;
        group.add(labelObj);
        cssLabels.push({
          obj: labelObj,
          el: labelEl,
          priority: 0,
          code: null,
          w: 0,
          h: 0,
        });

        scene.add(group);
        floorGroups.push({ floor: f, group, block, outline });
      }

      // === Room markers ===
      // Sized to the building so they stay visible once the whole footprint
      // is framed (a fixed 0.55 m pin was a few pixels on a big building).
      const markerR = Math.min(1.6, Math.max(0.55, radius * 0.014));
      roomMeshes = [];
      const stableRooms = placements;
      for (const placement of stableRooms) {
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(markerR, markerR, 1.4, 16),
          new THREE.MeshStandardMaterial({
            color: ROOM_COLOR,
            emissive: 0x1a0606,
            roughness: 0.45,
            metalness: 0.05,
            depthTest: false,
            // The storeys sit in the transparent pass (their opacity fades);
            // markers must too, or the blocks paint over them.
            transparent: true,
          }),
        );
        cyl.renderOrder = 10;
        cyl.position.set(
          placement.x,
          (placement.floor - 1) * FLOOR_HEIGHT + 0.95,
          // Local +Y is north; the polygon's `-π/2` X-rotation puts north at
          // world -Z, so we negate here to keep cylinders aligned with the
          // shape (and with the OSM basemap's north).
          -placement.y,
        );
        cyl.userData.roomCode = placement.code;
        cyl.userData.floor = placement.floor;
        cyl.castShadow = true;
        cyl.receiveShadow = false;
        scene.add(cyl);

        // The floor chip lives inside the label so it can never drift away
        // from the room it belongs to.
        const labelEl = document.createElement("div");
        labelEl.className = "viewer-room-label";
        const codeEl = document.createElement("span");
        codeEl.textContent = placement.code;
        const floorEl = document.createElement("span");
        floorEl.className = "viewer-room-label-floor";
        floorEl.textContent = `F${placement.floor}`;
        labelEl.append(codeEl, floorEl);
        const labelObj = new CSS2DMod.CSS2DObject(labelEl);
        labelObj.position.set(0, 0.9, 0);
        // Bottom-centre on the marker: the chip sits just above its pin
        // instead of covering it.
        labelObj.center.set(0.5, 1);
        cyl.add(labelObj);
        cssLabels.push({
          obj: labelObj,
          el: labelEl,
          priority: 1,
          code: placement.code,
          w: 0,
          h: 0,
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
        renderer.domElement,
      );
      dragControls.enabled = false;
      // Track per-drag state so we can lock Y to the floor's slab plane.
      let dragOriginY = 0;
      let dragCode: string | null = null;
      let dragFloor: number | null = null;
      dragControls.addEventListener("dragstart", (e: any) => {
        controls.enabled = false;
        const code = e.object?.userData?.roomCode as string | undefined;
        const floor = e.object?.userData?.floor as number | undefined;
        dragCode = code ?? null;
        dragFloor = floor ?? null;
        dragOriginY = e.object.position.y;
        if (code) activeRoomCode = code;
      });
      dragControls.addEventListener("drag", (e: any) => {
        // Lock Y so the marker can't fly off the floor it belongs to.
        e.object.position.y = dragOriginY;
      });
      dragControls.addEventListener("dragend", (e: any) => {
        controls.enabled = true;
        if (!dragCode || dragFloor === null) return;
        const next = {
          floor: dragFloor,
          x: e.object.position.x,
          // World Z grows southward; our placement.y is local-north meters,
          // so flip the sign on the way in.
          y: -e.object.position.z,
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
          y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
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
      renderer.domElement.addEventListener("pointermove", onPointerMoveBound);
      renderer.domElement.addEventListener("pointerleave", onPointerLeaveBound);
      renderer.domElement.addEventListener("click", onClickBound);

      // === Cleanup registration ===
      disposers.push(() => {
        renderer.domElement.removeEventListener(
          "pointermove",
          onPointerMoveBound!,
        );
        renderer.domElement.removeEventListener(
          "pointerleave",
          onPointerLeaveBound!,
        );
        renderer.domElement.removeEventListener("click", onClickBound!);
      });
      disposers.push(() => {
        dragControls?.dispose?.();
      });
      disposers.push(() => {
        for (const rm of roomMeshes) {
          rm.mesh.geometry.dispose();
          rm.mesh.material.dispose();
        }
        blockGeom.dispose();
        outlineGeom.dispose();
        ground.geometry.dispose();
        (ground.material as any).dispose();
        apron.geometry.dispose();
        apron.material.dispose();
        if (basemapTexture) basemapTexture.dispose();
        for (const fg of floorGroups) {
            // Geometry is shared across storeys and disposed above.
          fg.group.traverse((obj: any) => obj.material?.dispose());
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
        measurePadding();
      });
      resizeObs.observe(canvasContainer);

      const animate = () => {
        if (cameraTween) stepCameraTween();
        // OrbitControls.update() reports whether the camera actually moved.
        const cameraMoved = controls?.update() === true;
        // Unchanged values don't re-render the compass.
        cameraBearing = (-controls.getAzimuthalAngle() * 180) / Math.PI;
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
              ? ((hits[0]!.object.userData.roomCode as string | undefined) ??
                null)
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
      } else if (placements.length > 0) {
        // Open on the lowest floor that has rooms, so the map labels exactly
        // the rooms the list shows. "All floors" is one tap away.
        selectedFloor = Math.min(...placements.map((p) => p.floor));
      }
      if (building3DStore.initialEditMode && adminAuthStore.canPublish) {
        editMode = true;
      }

      animate();
    } catch (err) {
      console.error("Building3DViewer init failed", err);
      errorMsg = "Failed to load the 3D viewer.";
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
      if (entry.el.style.display === "none") continue;
      const focused =
        entry.code !== null &&
        (entry.code === activeRoomCode || entry.code === hoveredRoomCode);
      entry.el.classList.toggle("is-active", entry.code === activeRoomCode);
      // A single floor shows its own badge only; room chips carry the rest.
      const hidden =
        entry.code === null
          ? selectedFloor !== "all" && entry.obj.userData.floor !== selectedFloor
          : !isRoomLabelShown({
              floor: entry.obj.parent?.userData.floor ?? 0,
              selectedFloor,
              focused,
            });
      if (hidden) {
        entry.el.style.display = "none";
        continue;
      }
      // Text never changes, so one layout read per label is enough.
      if (entry.w === 0) {
        entry.w = entry.el.offsetWidth;
        entry.h = entry.el.offsetHeight;
      }
      labelProjection.setFromMatrixPosition(entry.obj.matrixWorld);
      const depth = labelProjection.distanceTo(camera.position);
      labelProjection.project(camera);
      onScreen.push(entry);
      boxes.push({
        // Box centre, honouring each label's anchor (`CSS2DObject.center`).
        x:
          (labelProjection.x * 0.5 + 0.5) * width +
          (0.5 - entry.obj.center.x) * entry.w,
        y:
          (-labelProjection.y * 0.5 + 0.5) * height +
          (entry.obj.center.y - 0.5) * entry.h,
        // A few px of breathing room so kept labels never touch.
        width: entry.w + LABEL_GAP_PX,
        height: entry.h + LABEL_GAP_PX,
        rank: focused ? -1 : entry.priority,
        depth,
      });
    }

    const keep = new Set(pickNonOverlappingLabels(boxes));
    for (let i = 0; i < onScreen.length; i++) {
      if (!keep.has(i)) onScreen[i]!.el.style.display = "none";
    }
  }

  const LABEL_GAP_PX = 6;

  /**
   * How much of the stage the mobile sheet covers, applied the way MapLibre
   * applies `padding`: the projection centre shifts up into the visible strip
   * (`setViewOffset`), so the building sits in the middle of what the user can
   * see instead of behind the sheet.
   */
  function measurePadding() {
    if (!stageEl) return;
    const sheet = mobile.current
      ? viewerFrameEl?.querySelector<HTMLElement>(".bottom-sheet")
      : null;
    const stage = stageEl.getBoundingClientRect();
    padBottom = sheet
      ? Math.max(
          0,
          Math.min(
            stage.height,
            Math.round(stage.bottom - sheet.getBoundingClientRect().top),
          ),
        )
      : 0;
    if (!camera || !canvasContainer) return;
    const w = canvasContainer.clientWidth;
    const h = canvasContainer.clientHeight;
    if (w === 0 || h === 0) return;
    if (padBottom > 0) camera.setViewOffset(w, h, 0, padBottom / 2, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    if (!userMovedCamera && !cameraTween) frameBuilding(false);
  }

  /** Where the camera sits to frame the whole building, MapLibre `fitBounds`-style. */
  function framedCamera(azimuth: number) {
    if (!polygon || !canvasContainer || !three) return null;
    const height = totalFloors * FLOOR_HEIGHT;
    const distance = cameraFitDistance({
      radius:
        0.5 * Math.hypot(polygon.widthMeters, polygon.depthMeters, height),
      fovDeg: FOV_DEG,
      width: canvasContainer.clientWidth,
      height: canvasContainer.clientHeight,
      padBottom,
      fill: FIT_FILL,
    });
    const target = new three.Vector3(0, height * 0.4, 0);
    const pitch = (DEFAULT_PITCH_DEG * Math.PI) / 180;
    const pos = new three.Vector3().setFromSphericalCoords(
      distance,
      pitch,
      azimuth,
    );
    return { pos: pos.add(target), target, distance };
  }

  function frameBuilding(animated = true) {
    if (!camera || !controls) return;
    const framed = framedCamera(Math.PI / 4);
    if (!framed) return;
    controls.maxDistance = framed.distance * 2.5;
    moveCamera(framed.pos, framed.target, animated ? 450 : 0);
  }

  function moveCamera(toPos: any, toTarget: any, ms: number) {
    if (!camera || !controls) return;
    if (ms === 0 || reducedMotion.current) {
      cameraTween = null;
      camera.position.copy(toPos);
      controls.target.copy(toTarget);
      controls.update();
      return;
    }
    cameraTween = {
      fromPos: camera.position.clone(),
      toPos,
      fromTarget: controls.target.clone(),
      toTarget,
      start: performance.now(),
      ms,
    };
  }

  function stepCameraTween() {
    if (!cameraTween) return;
    const t = Math.min(1, (performance.now() - cameraTween.start) / cameraTween.ms);
    const eased = 1 - (1 - t) ** 3;
    camera.position.lerpVectors(cameraTween.fromPos, cameraTween.toPos, eased);
    controls.target.lerpVectors(
      cameraTween.fromTarget,
      cameraTween.toTarget,
      eased,
    );
    if (t === 1) cameraTween = null;
  }

  /** Same map controls as the campus map, driving the orbit camera. */
  const cameraController: MapControlsController = {
    get bearing() {
      return cameraBearing;
    },
    resetNorth() {
      if (!camera || !controls || !three) return;
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new three.Spherical().setFromVector3(offset);
      spherical.theta = 0;
      const pos = new three.Vector3()
        .setFromSpherical(spherical)
        .add(controls.target);
      moveCamera(pos, controls.target.clone(), 400);
    },
    zoomBy(delta) {
      if (!camera || !controls) return;
      userMovedCamera = true;
      const offset = camera.position.clone().sub(controls.target);
      const distance = Math.min(
        controls.maxDistance,
        Math.max(controls.minDistance, offset.length() / 1.6 ** delta),
      );
      const pos = offset.setLength(distance).add(controls.target);
      moveCamera(pos, controls.target.clone(), 200);
    },
    recenter() {
      userMovedCamera = false;
      frameBuilding();
    },
    exitTo2D: close,
  };

  // The sheet changes height by animating `transform`, which no
  // ResizeObserver sees; re-measure when it settles.
  $effect(() => {
    const isMobile = mobile.current;
    void sheetSnap;
    const frame = viewerFrameEl;
    if (!frame) return;
    untrack(measurePadding);
    if (!isMobile) return;
    const onEnd = (e: TransitionEvent) => {
      if ((e.target as Element).classList?.contains("bottom-sheet")) {
        measurePadding();
      }
    };
    frame.addEventListener("transitionend", onEnd);
    const settle = setTimeout(measurePadding, 400);
    return () => {
      frame.removeEventListener("transitionend", onEnd);
      clearTimeout(settle);
    };
  });

  // A room picked on the map scrolls its list row into view.
  $effect(() => {
    const code = activeRoomCode;
    if (!code || !viewerFrameEl) return;
    viewerFrameEl
      .querySelector(`[data-room-code="${CSS.escape(code)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  });

  $effect(() => {
    // Hide rooms not on the selected floor (or show all). A dirty (unsaved)
    // floor change wins over the seeded placement floor so newly-relocated
    // rooms follow the filter.
    const selected = selectedFloor;
    const dirtyMap = dirty;
    untrack(() => {
      for (const rm of roomMeshes) {
        const effectiveFloor =
          dirtyMap.get(rm.placement.code)?.floor ?? rm.placement.floor;
        const visible = selected === "all" || effectiveFloor === selected;
        rm.mesh.visible = visible;
        // "All floors" draws every marker through the storeys above it;
        // dim the buried ones so the roof doesn't read as one floor.
        rm.mesh.material.opacity =
          selected === "all" && effectiveFloor < totalFloors ? 0.45 : 1;
      }
      // Storeys above the selected floor fade to a ghost so its markers and
      // labels sit in clear view; the rest stay solid.
      for (const fg of floorGroups) {
        const ghost = selected !== "all" && fg.floor > selected;
        fg.block.material.opacity = ghost ? GHOST_OPACITY : 1;
        fg.block.material.depthWrite = !ghost;
        fg.outline.material.opacity = ghost ? 0.25 : 0.9;
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
        renderer.domElement.style.cursor = enabled ? "grab" : "";
      }
    });
  });

  function samePosition(a: RoomPositionDraft, b: RoomPositionDraft) {
    return (
      a.floor === b.floor &&
      Math.abs(a.x - b.x) < 1e-4 &&
      Math.abs(a.y - b.y) < 1e-4
    );
  }

  function placementForRoom(code: string): RoomPositionDraft | null {
    const p = placements.find((pl) => pl.code === code);
    return p ? { floor: p.floor, x: p.x, y: p.y } : null;
  }

  function applyRoomPosition(code: string, position: RoomPositionDraft) {
    const target = roomMeshes.find((rm) => rm.placement.code === code);
    if (!target) return;
    target.mesh.position.set(
      position.x,
      (position.floor - 1) * FLOOR_HEIGHT + 0.95,
      -position.y,
    );
    target.mesh.userData.floor = position.floor;
    const chip = target.mesh.children[0]?.element?.querySelector(
      ".viewer-room-label-floor",
    );
    if (chip) chip.textContent = `F${position.floor}`;
  }

  function keepActiveRoomVisible(code: string, position: RoomPositionDraft) {
    if (
      activeRoomCode === code &&
      selectedFloor !== "all" &&
      selectedFloor !== position.floor
    ) {
      selectedFloor = position.floor;
    }
  }

  function setRoomSavingState(
    code: string,
    state: "saving" | "saved" | "failed" | null,
  ) {
    const nextSaving = new Set(savingRoomCodes);
    const nextSaved = new Set(savedRoomCodes);
    const nextFailed = new Set(failedRoomCodes);

    nextSaving.delete(code);
    nextSaved.delete(code);
    nextFailed.delete(code);

    if (state === "saving") nextSaving.add(code);
    if (state === "saved") nextSaved.add(code);
    if (state === "failed") nextFailed.add(code);

    savingRoomCodes = nextSaving;
    savedRoomCodes = nextSaved;
    failedRoomCodes = nextFailed;

    if (state === "saved") {
      setTimeout(() => {
        const current = new Set(savedRoomCodes);
        current.delete(code);
        savedRoomCodes = current;
      }, 1800);
    }
  }

  function setPendingPosition(
    code: string,
    position: RoomPositionDraft | null,
  ) {
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
      y: -target.mesh.position.z,
    };
    if (samePosition(previous, next)) return;
    applyRoomPosition(code, next);
    void autosaveRoomPosition(code, next, previous);
    // If the user is filtering to a single floor, follow the room.
    if (selectedFloor !== "all") selectedFloor = f;
  }

  function replaceBuildingRoom(room: RoomData) {
    buildingRooms = buildingRooms.map((candidate) =>
      candidate.id === room.id ? room : candidate,
    );
  }

  async function refreshSavedPositionsFromServer() {
    const res = await fetch(
      `/api/positions?building=${encodeURIComponent(name)}`,
      {
        credentials: "same-origin",
      },
    );
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
      y: placement.posY,
    };
    await autosaveRoomPosition(code, next, next, "inferred");
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
      type: saved === entries.length ? "success" : "error",
      message: `Saved ${saved} of ${entries.length} suggested positions.`,
    };
  }

  async function autosaveRoomPosition(
    roomCode: string,
    next: RoomPositionDraft,
    previous: RoomPositionDraft,
    source: "manual" | "inferred" = "manual",
  ) {
    const room = buildingRooms.find((candidate) => candidate.code === roomCode);
    if (!room) return;

    setPendingPosition(roomCode, next);
    setRoomSavingState(roomCode, "saving");
    editorStatus = {
      type: "info",
      message: `Saving ${roomCode}…`,
    };

    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          version: room.version,
          position: {
            floor: next.floor,
            posX: String(next.x),
            posY: String(next.y),
            source,
          },
        }),
      });
      const data = (await res
        .json()
        .catch(() => ({}))) as RoomPositionPatchResponse;

      if (res.status === 401) {
        applyRoomPosition(roomCode, previous);
        keepActiveRoomVisible(roomCode, previous);
        setPendingPosition(roomCode, null);
        setRoomSavingState(roomCode, "failed");
        editorStatus = {
          type: "error",
          message: "Session expired. Please log in again.",
        };
        adminAuthStore.isLoggedIn = false;
        return;
      }

      if (!res.ok) {
        if (res.status === 409 && data.latest) {
          replaceBuildingRoom(data.latest);
          const latestPositions = await refreshSavedPositionsFromServer().catch(
            () => null,
          );
          const restoredPosition = latestPositions?.get(roomCode) ?? previous;
          applyRoomPosition(roomCode, restoredPosition);
          keepActiveRoomVisible(roomCode, restoredPosition);
          setPendingPosition(roomCode, null);
          setRoomSavingState(roomCode, "failed");
          editorStatus = {
            type: "error",
            message:
              data.code === "manual_position"
                ? `${roomCode} was not saved: an editor has already placed this room by hand.`
                : `${roomCode} was not saved because the server has newer data.`,
          };
          return;
        }

        applyRoomPosition(roomCode, previous);
        keepActiveRoomVisible(roomCode, previous);
        setPendingPosition(roomCode, null);
        setRoomSavingState(roomCode, "failed");
        editorStatus = {
          type: "error",
          message: `${roomCode} failed to save: ${data.error ?? `Save failed (${res.status})`}`,
        };
        return;
      }

      if (!data.room) {
        applyRoomPosition(roomCode, previous);
        keepActiveRoomVisible(roomCode, previous);
        setPendingPosition(roomCode, null);
        setRoomSavingState(roomCode, "failed");
        editorStatus = {
          type: "error",
          message: `${roomCode} failed to save.`,
        };
        return;
      }

      replaceBuildingRoom(data.room);
      const nextSaved = new Map(savedOverrides);
      nextSaved.set(roomCode, next);
      savedOverrides = nextSaved;
      setPendingPosition(roomCode, null);
      setRoomSavingState(roomCode, "saved");
      editorStatus = {
        type: "success",
        message: `${roomCode} saved.`,
      };
    } catch {
      applyRoomPosition(roomCode, previous);
      keepActiveRoomVisible(roomCode, previous);
      setPendingPosition(roomCode, null);
      setRoomSavingState(roomCode, "failed");
      editorStatus = {
        type: "error",
        message: `Network error while saving ${roomCode}.`,
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
      if (ready && buildings.length > 0) {
        initStarted = true;
        errorMsg = "This building is not in the campus data yet.";
        loading = false;
      }
    });
  });

  onMount(() => {
    const offProvider = onBasemapProviderChange(
      (next) => (basemapProvider = next),
    );
    return () => {
      offProvider();
      if (frameId !== null) cancelAnimationFrame(frameId);
      resizeObs?.disconnect();
      for (const dispose of disposers) {
        try {
          dispose();
        } catch (e) {
          console.warn("3D dispose error", e);
        }
      }
      if (renderer?.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      if (labelRenderer?.domElement?.parentNode) {
        labelRenderer.domElement.parentNode.removeChild(
          labelRenderer.domElement,
        );
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
    activeRoomCode
      ? (buildingRooms.find((r) => r.code === activeRoomCode) ?? null)
      : null,
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

<div
  class="viewer-overlay"
  transition:fade={overlayFade(reducedMotion.current)}
>
  <div
    bind:this={viewerFrameEl}
    class="viewer-frame"
    role="dialog"
    aria-modal="true"
    aria-label={`3D view of ${name}`}
    in:fly={modalContentReveal(reducedMotion.current)}
    out:fly={modalContentDismiss(reducedMotion.current)}
  >
    <header class="viewer-header" bind:offsetHeight={headerH}>
      <div class="viewer-title">
        <Building2 size={20} />
        <div>
          <h2 class="viewer-name" tabindex="-1" bind:this={headingEl}>
            {name}
          </h2>
          <div class="viewer-subtitle">
            3D model from OpenStreetMap footprint
            <a class="viewer-faq-link" href="/faq#3d-models"
              >Learn about these models</a
            >
          </div>
        </div>
      </div>
      <IconButton shape="rounded" label="Close 3D viewer" onclick={close}>
        <X size={20} />
      </IconButton>
    </header>

    {#snippet roomInfo()}
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
                  changeRoomFloor(
                    activeRoomMeta.code,
                    parseInt(e.currentTarget.value, 10),
                  )}
              >
                {#each Array.from({ length: totalFloors }, (_, i) => i + 1) as f (f)}
                  <option value={f}>F{f}</option>
                {/each}
              </select>
            </label>
          {:else}
            <span class="room-info-floor"
              >Floor {activeRoomFloor ?? "?"}</span
            >
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
    {/snippet}

    {#snippet panel()}
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
        {#if selectedFloor === "all" && placements.length > 0}
          <p class="floor-hint">Pick a floor to label its rooms on the map.</p>
        {/if}
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
            {@const hasRoomStatus =
              isSavingRoom || isSavedRoom || isFailedRoom}
            <li>
              <button
                class="room-item"
                data-room-code={p.code}
                aria-pressed={activeRoomCode === p.code}
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
                  if (activeRoomCode)
                    selectedFloor = pending?.floor ?? p.floor;
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
                      {isSavingRoom
                        ? "Saving"
                        : isFailedRoom
                          ? "Failed"
                          : "Saved"}
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
              <span>{editMode ? "Editing positions" : "Edit positions"}</span>
            </button>
            {#if editMode}
              <p class="editor-hint">
                Drag a room cylinder or change its floor. Changes autosave to
                the server with a version check.
              </p>
              {#if suggestions.size > 0}
                <div class="suggest-block">
                  <p class="editor-hint">
                    {suggestions.size} unsaved room{suggestions.size === 1
                      ? ""
                      : "s"} can be placed from their room code. Floors are read
                    from the code or directions; the spot on the floor is a corridor
                    estimate — check them before saving.
                  </p>
                  <button
                    class="suggest-accept-all"
                    type="button"
                    disabled={acceptingSuggestions}
                    onclick={acceptAllSuggestions}
                  >
                    {acceptingSuggestions
                      ? "Saving…"
                      : `Save all ${suggestions.size}`}
                  </button>
                  <ul class="suggest-list">
                    {#each [...suggestions] as [code, placement] (code)}
                      <li class="suggest-item">
                        <div class="suggest-row">
                          <span class="suggest-code" title={code}>{code}</span
                          >
                          <span class="suggest-floor">F{placement.floor}</span
                          >
                          <span
                            class="suggest-confidence"
                            class:high={placement.confidence === "high"}
                            class:medium={placement.confidence === "medium"}
                            class:low={placement.confidence === "low"}
                            >{placement.confidence}</span
                          >
                          <button
                            class="suggest-accept"
                            type="button"
                            disabled={acceptingSuggestions ||
                              savingRoomCodes.has(code)}
                            onclick={() => acceptSuggestion(code, placement)}
                            >Save</button
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
                class:error={editorStatus?.type === "error"}
                class:success={editorStatus?.type === "success"}
              >
                {editorStatus?.message ??
                  "Ready. Each move saves automatically."}
              </p>
            {/if}
          </div>
        </section>
      {/if}
    {/snippet}

    <div class="viewer-body">
      {#if !mobile.current}
        <aside class="viewer-sidebar">{@render panel()}</aside>
      {/if}

      <div
        class="viewer-stage"
        bind:this={stageEl}
        style:--viewer-pad-bottom="{padBottom}px"
      >
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
                Approximate shape. OpenStreetMap has no footprint for this
                building yet, so this is a stand-in box around its coordinates —
                the outline is not the real building.
              {:else}
                This outline may belong to a neighbouring building: the closest
                OpenStreetMap footprint{footprintOsmName
                  ? ` (“${footprintOsmName}”)`
                  : ""} does not contain this building’s coordinates.
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

        {#if !loading && !errorMsg}
          <div class="viewer-controls">
            <MapControlsStack controller={cameraController} />
          </div>
        {/if}

        <!-- Compact, MapLibre-style: the OSM credit stays visible, the rest
             opens from the (i) button instead of a wide box over the map. -->
        <div class="viewer-attribution" class:expanded={attributionOpen}>
          <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noreferrer"
            >© OpenStreetMap{attributionOpen ? " contributors" : ""}</a
          >
          {#if attributionOpen && basemapProvider === "maptiler"}
            <a href={MAPTILER_COPYRIGHT_URL} target="_blank" rel="noreferrer"
              >© MapTiler</a
            >
          {:else if attributionOpen && basemapProvider === "openfreemap"}
            <a href="https://openfreemap.org/" target="_blank" rel="noreferrer"
              >© OpenFreeMap</a
            >
          {/if}
          <button
            type="button"
            class="viewer-attribution-toggle"
            aria-label="More map data credits"
            aria-expanded={attributionOpen}
            onclick={() => (attributionOpen = !attributionOpen)}
          >
            <Info size={12} aria-hidden="true" />
          </button>
        </div>

        {#if !mobile.current}{@render roomInfo()}{/if}
      </div>
    </div>

    {#if mobile.current}
      <!-- Same sheet as the other mobile details panels; the 3D stage stays
           live above it. Dragging it down past peek closes the viewer. -->
      <BottomSheet
        open
        bind:snap={sheetSnap}
        peekRatio={0.46}
        expandedRatio={0.86}
        topInset="{headerH}px"
        onDismiss={close}
      >
        <div class="viewer-sheet">
          <!-- On a phone the card sits in the sheet, not over the model. -->
          {@render roomInfo()}
          {@render panel()}
        </div>
      </BottomSheet>
    {/if}
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
    margin: 0;
    font-weight: 700;
    font-size: 1rem;
    line-height: 1.2;
  }
  /* Initial focus lands here on open; only keyboard users get a ring. */
  .viewer-name:focus {
    outline: none;
  }
  .viewer-name:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 2px;
    border-radius: 0.25rem;
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
  .floor-hint {
    margin: 0.375rem 0 0;
    font-size: 0.6875rem;
    color: hsl(0, 0%, 40%);
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

  /* Mobile: the sidebar's contents, inside the shared BottomSheet. */
  .viewer-sheet {
    display: flex;
    flex-direction: column;
    gap: 1rem;
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
    /* LAND_COLOR: the scene's own ground, shown until the canvas paints. */
    background-color: #f5f3ef;
    overflow: hidden;
  }
  .viewer-controls {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 4;
  }
  .viewer-canvas {
    position: absolute;
    inset: 0;
  }
  .viewer-labels {
    position: absolute;
    inset: 0;
    /* CSS2DRenderer z-sorts labels with inline z-indexes; keep that whole
       stack under the controls and the room card. */
    z-index: 1;
    pointer-events: none;
  }
  .viewer-attribution {
    position: absolute;
    /* Above the mobile sheet, not hidden behind it. */
    bottom: calc(var(--viewer-pad-bottom, 0px) + 0.375rem);
    right: 0.375rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    max-width: calc(100% - 0.75rem);
    font-size: 0.5625rem;
    line-height: 1;
    color: hsl(0, 0%, 25%);
    background-color: rgba(255, 255, 255, 0.8);
    padding: 0.125rem 0.125rem 0.125rem 0.375rem;
    border-radius: 999px;
    z-index: 3;
    pointer-events: auto;
  }
  .viewer-attribution a {
    color: hsl(0, 0%, 25%);
    text-decoration: none;
    white-space: nowrap;
  }
  .viewer-attribution a:hover,
  .viewer-attribution a:focus-visible {
    text-decoration: underline;
  }
  .viewer-attribution-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.125rem;
    height: 1.125rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: hsl(0, 0%, 30%);
    cursor: pointer;
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
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background-color: white;
    color: hsl(0, 0%, 15%);
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.125rem 0.1875rem 0.125rem 0.375rem;
    border: 1px solid hsl(0, 0%, 85%);
    border-radius: 0.375rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
    white-space: nowrap;
    /* No `transform` here: CSS2DRenderer writes an inline transform on every
       frame, so anything set from the stylesheet is dead weight. Offset the
       label via its CSS2DObject position instead. */
    pointer-events: none;
  }
  :global(.viewer-room-label-floor) {
    font-size: 0.625rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
    background-color: hsl(5, 60%, 95%);
    padding: 0 0.25rem;
    border-radius: 0.25rem;
  }
  /* The room picked in the list (or on the map): same yellow as its row. */
  :global(.viewer-room-label.is-active) {
    background-color: hsl(45, 96%, 58%);
    border-color: hsl(40, 90%, 40%);
    color: hsl(0, 0%, 8%);
    z-index: 1;
  }
  :global(.viewer-floor-label) {
    background-color: hsl(5, 53%, 32%);
    color: white;
    font-size: 0.625rem;
    font-weight: 700;
    padding: 0.0625rem 0.3125rem;
    border-radius: 0.25rem;
    pointer-events: none;
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
    .viewer-header {
      padding: 0.625rem 0.75rem 0.625rem 1rem;
    }
    /*
     * One scroll surface on narrow screens: the bottom sheet's body. A
     * scroller inside a scroller meant a drag over the list never reached the
     * sheet, leaving the note and the editor panel unreachable.
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
    .edit-toggle {
      min-height: 2.75rem;
    }
    .suggest-accept,
    .suggest-accept-all {
      min-height: 2.25rem;
    }
    .viewer-provisional {
      /* Tighter on a short stage so the notice stays a notice, not a curtain.
         Left-aligned so it clears the map controls on the right. */
      top: 0.5rem;
      left: 0.5rem;
      translate: none;
      width: calc(100% - 4.25rem);
      padding: 0.4rem 0.55rem;
      font-size: 0.6875rem;
      gap: 0.25rem;
    }
    .room-info-card {
      position: static;
      width: auto;
      box-sizing: border-box;
      border: 1px solid hsl(45, 92%, 60%);
      background-color: hsl(45, 92%, 97%);
      box-shadow: none;
    }
  }
</style>
