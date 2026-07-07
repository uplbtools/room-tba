<script lang="ts">
  type Person = {
    name: string;
    href?: string;
    imageSrc: string;
    subtitle?: string;
    login?: string;
  };

  type Props = {
    people: Person[];
    imageFolder?: "developers" | "contributors";
    showGithubMeta?: boolean;
  };

  const {
    people,
    imageFolder = "contributors",
    showGithubMeta = false,
  }: Props = $props();

  function slugifyName(name: string) {
    return name.toLowerCase().split(" ").join("-");
  }

  function imageFor(person: Person) {
    return person.imageSrc || `/${imageFolder}/${slugifyName(person.name)}.png`;
  }

  function handleImageError(event: Event) {
    (event.currentTarget as HTMLImageElement).src = "/profile.svg";
  }

  function cardKey(person: Person) {
    return person.login ?? `${person.name}-${person.href ?? ""}`;
  }

  function tooltipLabel(person: Person) {
    const parts = [person.name];
    if (person.login) parts.push(`@${person.login}`);
    if (person.subtitle) parts.push(person.subtitle);
    return parts.join(" · ");
  }
</script>

<div class="people-grid" class:github={showGithubMeta} role="list">
  {#each people as person (cardKey(person))}
    {@const label = tooltipLabel(person)}
    {#if person.href}
      <a
        class="person-card tooltip"
        href={person.href}
        target="_blank"
        rel="noopener noreferrer"
        data-tooltip={label}
      >
        <img
          src={imageFor(person)}
          alt={person.name}
          loading="lazy"
          onerror={handleImageError}
        />
        <span class="person-name">{person.name}</span>
        {#if showGithubMeta && person.login}
          <span class="person-login">@{person.login}</span>
        {/if}
        {#if person.subtitle}
          <span class="person-subtitle">{person.subtitle}</span>
        {/if}
      </a>
    {:else}
      <div class="person-card tooltip" data-tooltip={label} role="listitem">
        <img
          src={imageFor(person)}
          alt={person.name}
          loading="lazy"
          onerror={handleImageError}
        />
        <span class="person-name">{person.name}</span>
        {#if showGithubMeta && person.login}
          <span class="person-login">@{person.login}</span>
        {/if}
        {#if person.subtitle}
          <span class="person-subtitle">{person.subtitle}</span>
        {/if}
      </div>
    {/if}
  {/each}
</div>

<style>
  .people-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
    gap: 0.75rem;
    width: 100%;
    max-width: 32rem;
  }

  .people-grid.github {
    grid-template-columns: repeat(auto-fill, minmax(6.75rem, 1fr));
    max-width: 36rem;
  }

  .person-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    text-decoration: none;
    color: inherit;
    min-width: 0;
    padding: 0.125rem;
  }

  .person-card img {
    width: 2.75rem;
    height: 2.75rem;
    border: 1px solid hsl(0, 0%, 82%);
    border-radius: 50%;
    object-fit: cover;
    background-color: hsl(0, 0%, 96%);
  }

  .person-name {
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1.25;
    text-align: center;
    max-width: 100%;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  .person-login {
    font-size: 0.625rem;
    color: hsl(0, 0%, 32%);
    line-height: 1.2;
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .person-subtitle {
    font-size: 0.625rem;
    font-weight: 600;
    color: hsl(5, 60%, 26%);
    line-height: 1.2;
    text-align: center;
  }

  .tooltip {
    position: relative;
    outline: unset;
  }

  .tooltip::before {
    content: attr(data-tooltip);
    position: absolute;
    top: 0;
    left: 50%;
    translate: -50% calc(-1 * (100% + 8px));
    padding: 0.2rem 0.4rem;
    background-color: hsla(0, 0%, 10%, 0.85);
    color: white;
    border-radius: 6px;
    pointer-events: none;
    opacity: 0;
    width: max-content;
    max-width: 14rem;
    transition: opacity 0.125s;
    font-size: 0.75rem;
    z-index: 50;
  }

  .tooltip:is(:hover, :focus-visible)::before {
    opacity: 1;
  }
</style>
