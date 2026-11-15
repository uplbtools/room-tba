(() => {
  const form = document.getElementById("wiki-search");
  const input = document.getElementById("wiki-search-input");
  const items = [...document.querySelectorAll(".wiki-index__item")];
  if (!form || !input) return;
  const status = form.querySelector(".wiki-search__status");
  form.hidden = false;
  form.addEventListener("submit", (event) => event.preventDefault());
  input.addEventListener("input", () => {
    const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const item of items) {
      const text = item.getAttribute("data-search") || "";
      const match = terms.every((term) => text.includes(term));
      item.hidden = !match;
      if (match) shown += 1;
    }
    if (status) {
      status.textContent = terms.length
        ? `${shown} of ${items.length} articles`
        : "";
    }
  });
})();
