<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { fade } from "svelte/transition";
  import { X, Building2, Loader, RotateCcw, Pencil } from "@lucide/svelte";
  import { building3DStore, adminAuthStore } from "@lib/store.svelte";
  import { getAppData } from "@lib/context";
  import type { RoomData } from "@lib/types";
  import { getBuildingRooms } from "@lib/local/data/utils";
  import {
    checkLocalBuildingRoom,
    syncBuildingRooms,
  } from "@lib/local/data/sync";
  import { fetchBuildingFootprint } from "@lib/overpass";
  import { fetchBasemap } from "@lib/osm-basemap";
  import {
    footprintToLocalPolygon,
    mockPlaceRooms,
    defaultFloorCount,
    maxInferredFloor,
    type LocalPolygonData,
    type RoomPlacement,
  } from "@lib/building-3d";

  const appData = getAppData();
  const buildings = $derived(appData().loaded ? appData().buildings : []);

  let { name }: { name: string } = $props();

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
    room?: RoomData | null;
    latest?: RoomData | null;
    error?: string;
  };
  type RoomPositionDraft = { floor: number; x: number; y: number };

  let canvasContainer: HTMLDivElement | null = $state(null);
  let labelContainer: HTMLDivElement | null = $state(null);

  let loading = $state(true);
  let errorMsg: string | null = $state(null);
  let totalFloors = $state(1);
  let selectedFloor = $state<number | "all">("all");
  let activeRoomCode = $state<string | null>(null);
  let hoveredRoomCode = $state<string | null>(null);
  let footprintNote = $state<string | null>(null);

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
  let onClickBound: ((e: MouseEvent) => void) | null = null;
  let disposers: Array<() => void> = [];
  let roomMeshes: Array<{
    mesh: any;
    placement: RoomPlacement;
    baseColor: number;
  }> = [];
  let floorGroups: Array<{ floor: number; group: any }> = [];

  let buildingRooms = $state<RoomData[]>([]);

  const buildingMeta = $derived(
    buildings.find((b) => b.buildingName === name) ?? null,
  );

  const roomCodes = $derived(buildingRooms.map((r) => r.code));

  const placements = $derived(
    polygon
      ? mockPlaceRooms(roomCodes, polygon, totalFloors, savedOverrides)
      : ([] as RoomPlacement[]),
  );

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

  async function init() {
    if (!canvasContainer || !labelContainer) return;
    if (!buildingMeta?.lat || !buildingMeta?.lon) {
      errorMsg = "This building has no coordinates yet.";
      loading = false;
      return;
    }

    try {
      const buildingChecker = await checkLocalBuildingRoom(buildingMeta.id);
      const roomsForBuilding = await getBuildingRooms(
        buildingChecker.valid,
        buildingMeta.id,
      );
      buildingRooms = roomsForBuilding;
      await syncBuildingRooms(
        buildingChecker,
        buildingMeta.id,
        roomsForBuilding,
      );

      const [THREE, OrbitMod, CSS2DMod, DragMod, savedRes] = await Promise.all([
        import("three"),
        import("three/examples/jsm/controls/OrbitControls.js"),
        import("three/examples/jsm/renderers/CSS2DRenderer.js"),
        import("three/examples/jsm/controls/DragControls.js"),
        fetch(`/api/positions?building=${encodeURIComponent(name)}`, {
          credentials: "same-origin",
        }).catch(() => null),
      ]);

      // Layer in any saved positions before we compute placements / build meshes.
      if (savedRes && savedRes.ok) {
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

      const footprint = await fetchBuildingFootprint(
        buildingMeta.lat,
        buildingMeta.lon,
      );

      if (!footprint) {
        errorMsg =
          "Could not pull a building footprint from OpenStreetMap. The building may not be mapped yet.";
        loading = false;
        return;
      }

      const localPoly = footprintToLocalPolygon(footprint);
      polygon = localPoly;

      const inferred = maxInferredFloor(roomCodes);
      const floors = defaultFloorCount(footprint, inferred);
      totalFloors = floors;

      footprintNote = footprint.levels
        ? `OSM has \`building:levels=${footprint.levels}\`.`
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
      labelRenderer.domElement.style.position = "absolute";
      labelRenderer.domElement.style.top = "0";
      labelRenderer.domElement.style.left = "0";
      labelRenderer.domElement.style.pointerEvents = "none";
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
        roughness: 0.95,
      });
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(groundHalf * 2, groundHalf * 2),
        groundMat,
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
        zoom: 18,
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

      // Outer translucent shell — shows the whole building height.
      const shellGeom = new THREE.ExtrudeGeometry(shape, {
        depth: floors * FLOOR_HEIGHT,
        bevelEnabled: false,
      });
      shellGeom.rotateX(-Math.PI / 2);
      const shellMat = new THREE.MeshStandardMaterial({
        color: SHELL_COLOR,
        transparent: true,
        opacity: SHELL_OPACITY,
        roughness: 0.9,
        depthWrite: false,
      });
      const shellMesh = new THREE.Mesh(shellGeom, shellMat);
      shellMesh.castShadow = false;
      shellMesh.receiveShadow = false;
      scene.add(shellMesh);

      const edgeGeom = new THREE.EdgesGeometry(shellGeom);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x6b5b48,
        transparent: true,
        opacity: 0.6,
      });
      const edges = new THREE.LineSegments(edgeGeom, edgeMat);
      scene.add(edges);

      // Per-floor slabs.
      floorGroups = [];
      for (let f = 1; f <= floors; f++) {
        const slabGeom = new THREE.ExtrudeGeometry(shape, {
          depth: 0.18,
          bevelEnabled: false,
        });
        slabGeom.rotateX(-Math.PI / 2);
        const slabMat = new THREE.MeshStandardMaterial({
          color: FLOOR_SLAB_COLOR,
          transparent: true,
          opacity: FLOOR_SLAB_OPACITY,
          roughness: 0.85,
          side: THREE.DoubleSide,
        });
        const slab = new THREE.Mesh(slabGeom, slabMat);
        slab.position.y = (f - 1) * FLOOR_HEIGHT;
        slab.castShadow = false;
        slab.receiveShadow = true;

        const group = new THREE.Group();
        group.add(slab);

        // Floor label sprite
        const labelEl = document.createElement("div");
        labelEl.className = "viewer-floor-label";
        labelEl.textContent = `F${f}`;
        const labelObj = new CSS2DMod.CSS2DObject(labelEl);
        labelObj.position.set(
          localPoly.widthMeters / 2 + 1.5,
          (f - 1) * FLOOR_HEIGHT + 0.4,
          localPoly.depthMeters / 2 + 1.5,
        );
        group.add(labelObj);

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
            metalness: 0.05,
          }),
        );
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

        const labelEl = document.createElement("div");
        labelEl.className = "viewer-room-label";
        labelEl.textContent = placement.code;
        const labelObj = new CSS2DMod.CSS2DObject(labelEl);
        labelObj.position.set(0, 1.0, 0);
        cyl.add(labelObj);

        roomMeshes.push({ mesh: cyl, placement, baseColor: ROOM_COLOR });
      }

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
      };
      onClickBound = () => {
        if (!pointerNDC || !raycaster || !camera || !scene) return;
        pointer.set(pointerNDC.x, pointerNDC.y);
        raycaster.setFromCamera(pointer, camera);
        const meshes = roomMeshes.map((rm) => rm.mesh);
        const hits = raycaster.intersectObjects(meshes, false);
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
      renderer.domElement.addEventListener("click", onClickBound);

      // === Cleanup registration ===
      disposers.push(() => {
        renderer.domElement.removeEventListener(
          "pointermove",
          onPointerMoveBound!,
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
        controls?.update();
        // Hover detection
        if (pointerNDC && raycaster && camera) {
          pointer.set(pointerNDC.x, pointerNDC.y);
          raycaster.setFromCamera(pointer, camera);
          const meshes = roomMeshes.map((rm) => rm.mesh);
          const hits = raycaster.intersectObjects(meshes, false);
          hoveredRoomCode =
            hits.length > 0
              ? ((hits[0]!.object.userData.roomCode as string | undefined) ??
                null)
              : null;
        }
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      };

      loading = false;
      animate();
    } catch (err) {
      console.error("Building3DViewer init failed", err);
      errorMsg = "Failed to load the 3D viewer.";
      loading = false;
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
        const effectiveFloor =
          dirtyMap.get(rm.placement.code)?.floor ?? rm.placement.floor;
        const visible = selected === "all" || effectiveFloor === selected;
        rm.mesh.visible = visible;
      }
      for (const fg of floorGroups) {
        const slabVisible = selected === "all" || fg.floor === selected;
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

  async function autosaveRoomPosition(
    roomCode: string,
    next: RoomPositionDraft,
    previous: RoomPositionDraft,
  ) {
    const room = buildingRooms.find((candidate) => candidate.code === roomCode);
    if (!room) return;

    setPendingPosition(roomCode, next);
    setRoomSavingState(roomCode, "saving");
    editorStatus = {
      type: "info",
      message: `Saving ${roomCode}...`,
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
            message: `${roomCode} was not saved because the server has newer data.`,
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

  onMount(() => {
    init();
    return () => {
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

<div class="viewer-overlay" transition:fade={{ duration: 180 }}>
  <div class="viewer-frame">
    <header class="viewer-header">
      <div class="viewer-title">
        <Building2 size={20} />
        <div>
          <div class="viewer-name">{name}</div>
          <div class="viewer-subtitle">
            3D model from OpenStreetMap footprint
          </div>
        </div>
      </div>
      <button class="viewer-close" onclick={close} aria-label="Close 3D viewer">
        <X size={20} />
      </button>
    </header>

    <div class="viewer-body">
      <aside class="viewer-sidebar">
        <section class="viewer-section">
          <h3>Floor</h3>
          <div class="floor-pills">
            {#each floorOptions as opt (opt.value)}
              <button
                class="floor-pill"
                class:active={selectedFloor === opt.value}
                onclick={() => (selectedFloor = opt.value)}
              >
                {opt.label}
              </button>
            {/each}
          </div>
        </section>

        <section class="viewer-section">
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
                <span>{editMode ? "Editing positions" : "Edit positions"}</span>
              </button>
              {#if editMode}
                <p class="editor-hint">
                  Drag a room cylinder or change its floor. Changes autosave to
                  Neon with a version check.
                </p>
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
        <div bind:this={canvasContainer} class="viewer-canvas"></div>
        <div bind:this={labelContainer} class="viewer-labels"></div>

        <div class="viewer-attribution">
          ©
          <a
            href="https://www.maptiler.com/copyright/"
            target="_blank"
            rel="noreferrer">MapTiler</a
          >
          ©
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer">OpenStreetMap contributors</a
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
    font-size: 0.75rem;
    color: hsl(0, 0%, 45%);
    margin-top: 0.125rem;
  }
  .viewer-close {
    background: transparent;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    padding: 0.375rem;
    color: hsl(0, 0%, 30%);
    display: flex;
  }
  .viewer-close:hover {
    background-color: hsl(0, 0%, 95%);
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
    color: hsl(0, 0%, 50%);
  }
  .room-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 16rem;
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
    color: hsl(0, 0%, 50%);
    padding: 0.25rem 0.125rem;
  }

  .viewer-note {
    font-size: 0.6875rem;
    color: hsl(0, 0%, 45%);
    line-height: 1.4;
    background-color: hsl(45, 90%, 96%);
    border: 1px solid hsl(45, 92%, 88%);
    padding: 0.5rem 0.625rem;
    border-radius: 0.5rem;
  }

  .viewer-reset {
    display: inline-flex;
    align-items: center;
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
    color: hsl(0, 0%, 45%);
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
    transform: translate(-50%, -130%);
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
    .viewer-body {
      flex-direction: column;
    }
    .viewer-sidebar {
      width: 100%;
      border-right: none;
      border-bottom: 1px solid hsl(0, 0%, 92%);
      max-height: 16rem;
    }
    .room-info-card {
      width: calc(100% - 1.75rem);
    }
  }
</style>
