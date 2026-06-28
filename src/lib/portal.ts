/** Move a node to a portal target (default `document.body`) for overlays. */
export function portal(
  node: HTMLElement,
  target: HTMLElement | string = "body",
) {
  const targetEl =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;
  if (!targetEl) return { destroy() {} };
  targetEl.appendChild(node);
  return {
    destroy() {
      node.remove();
    },
  };
}
