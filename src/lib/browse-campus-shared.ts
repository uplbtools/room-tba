export type CampusBrowseTab = "buildings" | "colleges" | "divisions";

type ModalStoreLike = {
  openModal: (
    type: "filter",
    options?: { filterTab?: CampusBrowseTab },
  ) => void;
};

export function openCampusBrowseModal(
  modalStore: ModalStoreLike,
  tab: CampusBrowseTab = "buildings",
) {
  modalStore.openModal("filter", { filterTab: tab });
}
