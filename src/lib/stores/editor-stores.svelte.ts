import { clearProposeEventDraft } from "../contributor-drafts.js";
import { deactivateMapModesExcept } from "./map-modes.js";
import type { EventPlacementDraft, MapProposalTarget } from "./store-types.js";

export class EditorChromeStore {
  additionModalOpen = $state(false);

  openAdditionModal = () => {
    this.additionModalOpen = true;
  };

  closeAdditionModal = () => {
    this.additionModalOpen = false;
  };
}

export class MapEditStore {
  enabled: boolean = $state(false);

  enable = () => {
    if (this.enabled) return;
    this.enabled = true;
    deactivateMapModesExcept("edit");
  };

  toggle = () => {
    if (this.enabled) this.enabled = false;
    else this.enable();
  };

  close = () => {
    this.enabled = false;
  };
}

export class MapProposalStore {
  target: MapProposalTarget | null = $state(null);
  submitterName = $state("");
  proposalId: number | null = $state(null);

  get enabled() {
    return this.target !== null;
  }

  pinKey(): string | null {
    if (!this.target) return null;
    if (this.target.type === "event") return `event:${this.target.id}:location`;
    return `${this.target.type}:${this.target.id}`;
  }

  allowsKey(key: string) {
    return this.enabled && this.pinKey() === key;
  }

  enable(
    target: MapProposalTarget,
    submitterName = "",
    proposalId: number | null = null,
  ) {
    this.target = target;
    this.submitterName = submitterName;
    this.proposalId = proposalId;
  }

  disable() {
    this.target = null;
    this.proposalId = null;
  }
}

export class AdditionProposalStore {
  pinPickActive = $state(false);
  draftPin: { lat: number; lon: number } | null = $state(null);
  private pinResolver: ((coords: { lat: number; lon: number }) => void) | null =
    null;
  private pinReject: ((reason?: unknown) => void) | null = null;

  requestMapPin() {
    if (this.pinPickActive) {
      this.cancelMapPin();
    }
    this.pinPickActive = true;
    return new Promise<{ lat: number; lon: number }>((resolve, reject) => {
      this.pinResolver = resolve;
      this.pinReject = reject;
    });
  }

  deliverMapPin(lat: number, lon: number) {
    const coords = { lat, lon };
    this.draftPin = coords;
    this.pinResolver?.(coords);
    this.pinResolver = null;
    this.pinReject = null;
    this.pinPickActive = false;
  }

  cancelMapPin() {
    this.pinReject?.(new Error("cancelled"));
    this.pinResolver = null;
    this.pinReject = null;
    this.pinPickActive = false;
  }

  clearDraftPin() {
    this.draftPin = null;
  }

  setDraftPin(pin: { lat: number; lon: number } | null) {
    this.draftPin = pin;
  }
}

export class EventPlacementStore {
  draft: EventPlacementDraft | null = $state(null);
  creating: boolean = $state(false);
  createdEventId: number | null = $state(null);
  proposing: boolean = $state(false);
  submitterName: string = $state("");
  active = $derived(this.draft !== null);

  start = (
    draft: EventPlacementDraft,
    options: { propose?: boolean; submitterName?: string } = {},
  ) => {
    this.draft = draft;
    this.creating = false;
    this.createdEventId = null;
    this.proposing = options.propose ?? false;
    this.submitterName = options.submitterName?.trim() ?? "";
    deactivateMapModesExcept("edit");
  };

  beginCreate = () => {
    if (!this.draft) return;
    this.creating = true;
  };

  finishCreate = (eventId: number) => {
    this.draft = null;
    this.creating = false;
    this.createdEventId = eventId;
  };

  failCreate = () => {
    this.creating = false;
  };

  cancel = () => {
    this.draft = null;
    this.creating = false;
    this.proposing = false;
    this.submitterName = "";
    clearProposeEventDraft();
  };

  consumeCreatedEvent = (eventId: number) => {
    if (this.createdEventId !== eventId) return false;
    this.createdEventId = null;
    return true;
  };
}
