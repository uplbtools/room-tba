import { getJSONFetch, getLocalRoomByCode } from "$lib/utils/local/data/utils";
import type { Room } from "$lib/utils/types";

let _currentRoom = $state<Room | null>(null);
let _currentRoomNotFound = $state(false);
let roomLoadGeneration = 0;
export const currentRoom = {
    get value() {
        return _currentRoom;
    },
    /** True only after a lookup completed without a match. While null and not
     * notFound, the room is still being fetched (or a fetch is about to start),
     * so panels should show a loading state rather than "not found". */
    get notFound() {
        return _currentRoomNotFound;
    },
    async getRoomByCode(code: string) {
        // Overlapping lookups: only the newest may write. Otherwise a slow
        // earlier fetch lands last and stamps notFound from a stale result.
        const generation = ++roomLoadGeneration;
        _currentRoom = null;
        _currentRoomNotFound = false;
        try {
            const localRoom = await getLocalRoomByCode(code);
            if (localRoom === null) {
                const codeParam = encodeURI(code.toUpperCase());
                const remoteRoomReq = await getJSONFetch<{ data: Room }>(
                    `/api/rooms?code=${codeParam}`
                );
                if (generation !== roomLoadGeneration) return;
                _currentRoom = remoteRoomReq.data;
                return;
            }
            if (generation !== roomLoadGeneration) return;
            _currentRoom = localRoom;
        } catch (e) {
            console.error(e);
            if (generation !== roomLoadGeneration) return;
            _currentRoom = null;
        } finally {
            if (generation === roomLoadGeneration) {
                _currentRoomNotFound = _currentRoom === null;
            }
        }
    },
    async getRoomFromSearch(room: Room) {
        roomLoadGeneration++;
        _currentRoom = room;
        _currentRoomNotFound = false;
    },
    setRoom(room: Room) {
        roomLoadGeneration++;
        _currentRoom = room;
        _currentRoomNotFound = false;
    }
};