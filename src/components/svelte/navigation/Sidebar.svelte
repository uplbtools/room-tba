<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import BookText from "@lucide/svelte/icons/book-text";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Landmark from "@lucide/svelte/icons/landmark";
  import University from "@lucide/svelte/icons/university";
  import Users from "@lucide/svelte/icons/users";
  import { openBrowseClasses, openCampusBrowse } from "@lib/browse-campus";
  import {
    queryStore,
    sidebarStore,
    sidePanelStore,
  } from "@lib/store.svelte";
  import { Map } from "@lucide/svelte";
    import { slide } from "svelte/transition";

  const entityButtonsInfo: {
    id: string;
    label: string;
    icon: typeof University;
  }[] = [
    { id: "buildings", label: "Buildings", icon: University },
    { id: "colleges", label: "Colleges", icon: GraduationCap },
    { id: "divisions", label: "Divisions", icon: Landmark },
    { id: "organizations", label: "Orgs", icon: Users },
    { id: "classes", label: "Classes", icon: BookText },
  ];
  function handleBrowse(id: string) {
    if (id === "classes") {
      openBrowseClasses(queryStore, sidePanelStore);
      return;
    }
    openCampusBrowse(queryStore, sidePanelStore, id);
  }

  const activeTab = $derived.by((): string | null => {
    if (queryStore.category === "classes") return "classes";
    if (queryStore.category !== "browse") return null;
    if (
      queryStore.queryValue === "colleges" ||
      queryStore.queryValue === "divisions" ||
      queryStore.queryValue === "organizations"
    ) {
      return queryStore.queryValue;
    }
    return "buildings";
  });
  const mapCategoriesOpen = $derived(sidebarStore.panelOpen === "map");
</script>

<aside>
  <div class="top">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
    >
      <g clip-path="url(#clip0_77_35)">
        <g filter="url(#filter0_d_77_35)">
          <rect width="48" height="48" rx="13" fill="white" />
          <rect
            width="48"
            height="48"
            rx="13"
            fill="url(#paint0_linear_77_35)"
          />
        </g>
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M31.2195 25.5063C31.71 27.2332 31.4747 29.0839 30.6242 30.544C30.5247 30.7148 31.1076 31.1837 31.6511 31.6983C34.1869 34.0986 35.7378 34.3196 35.7656 36.2821C35.7239 37.4328 34.7969 38.4379 33.0328 37.8027C32.4094 37.5783 32.287 37.5067 30.771 35.5531C30.2706 34.9083 28.6855 32.6062 28.433 32.8294C27.7025 33.4749 23.9963 35.133 20.5947 32.3171C18.0695 30.2266 17.2224 25.7399 20.1812 22.715C20.7957 22.0774 21.5378 21.5638 22.3664 21.2156C22.476 18.6408 22.5279 17.1796 22.5637 16.9968C22.5648 16.991 22.6286 15.1402 22.6561 14.892C22.6622 14.8361 22.6317 14.8352 22.6967 14.1902C22.7584 13.5776 22.6716 13.5766 22.7366 12.9623C22.7847 12.5079 22.7623 11.8209 22.8212 11.4718C22.8589 11.2484 22.7076 11.0745 22.988 10.9426C23.181 10.8518 23.3007 10.8175 23.3824 10.8717C23.3824 10.8717 24.9324 10.0326 24.9023 9.9917C24.8135 9.87074 24.8335 9.85861 24.834 9.05975C24.834 9.02878 24.8342 8.696 24.8789 8.67516C25.1022 8.57096 24.9114 9.76177 25.0194 9.83189C25.1139 9.89325 25.1172 9.88946 25.1695 9.98707C25.2822 10.1973 25.5876 10.0063 25.5955 10.5057C25.598 10.6636 25.5379 10.9127 25.7174 11.014C26.324 11.3563 26.4344 11.4374 26.4127 11.2954C26.3185 10.6809 26.7262 10.9966 26.8025 11.0004C27.1084 11.0155 26.9681 11.1765 27.0355 12.2145C27.0447 12.3548 27.1167 13.4639 27.1341 13.9695C27.1557 14.5382 27.4183 19.1989 27.5185 21.2505C29.3118 22.0328 30.6884 23.5944 31.2195 25.5063Z"
          fill="white"
          stroke="white"
          stroke-width="4"
          stroke-miterlimit="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M35.7656 36.282C35.7239 37.4328 34.7969 38.4378 33.0328 37.8026C32.4094 37.5782 32.2871 37.5067 30.771 35.5531C30.2706 34.9082 28.6856 32.6062 28.433 32.8293C27.7026 33.4749 23.9964 35.1329 20.5947 32.317C17.921 30.1036 17.1287 25.2041 20.7428 22.1975C21.5908 21.492 21.2409 22.9666 21.386 23.6545C21.4503 23.9599 19.7517 25.104 19.9474 27.6916C20.1823 30.7964 23.0502 32.6593 25.7503 32.2025C29.336 31.5957 31.0946 27.2938 28.8424 24.3298C28.4837 23.8577 28.2206 23.722 28.2466 23.5254C28.3716 22.5808 27.9984 21.3526 29.0225 22.1868C31.7327 24.3942 32.0812 28.0425 30.6242 30.544C30.5247 30.7148 31.1076 31.1836 31.6512 31.6982C34.1869 34.0985 35.7378 34.3196 35.7656 36.282Z"
          fill="url(#paint1_linear_77_35)"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M27.1339 13.9695C27.1595 14.6439 27.6371 23.4381 27.6679 24.4464C27.6798 24.8361 27.7971 24.7751 27.8569 24.7877C28.6065 24.9457 28.6104 24.993 28.6157 25.0572C28.7502 26.6837 26.0926 28.4491 26.0172 27.8213C25.9557 27.3088 25.9158 26.3703 25.9105 26.244C25.8885 25.727 25.2588 25.4423 25.1371 25.4412C24.9689 25.4398 24.3561 25.3286 24.0509 25.898C23.7459 26.467 24.0331 27.8374 23.7787 27.9119C23.256 28.0651 21.4914 26.6998 21.2442 25.1466C21.1908 24.8104 22.2047 24.8228 22.214 24.6237C22.434 19.9358 22.5142 17.2491 22.5634 16.9968C22.5646 16.991 22.6284 15.1403 22.6558 14.892C22.662 14.8362 22.6315 14.8352 22.6965 14.1902C22.7582 13.5776 22.6714 13.5766 22.7364 12.9623C22.7845 12.5079 22.7621 11.821 22.821 11.4718C22.8587 11.2484 22.7074 11.0745 22.9879 10.9426C23.3276 10.7828 23.4404 10.798 23.5181 11.1633C23.575 11.4302 23.3901 12.0001 23.6024 11.9524C24.1309 11.8336 24.4659 11.6376 24.4137 12.0825C24.3958 12.2343 24.2764 14.4924 24.2931 15.0219C24.3034 15.3475 23.4666 15.2364 23.4576 15.4581C23.4325 16.0755 23.426 16.0745 23.1113 23.1746C23.0582 24.3732 23.0249 24.4137 23.1201 24.4503C23.1265 24.4527 24.8038 24.0324 24.8728 24.0059C24.9364 23.9815 24.929 23.9524 24.929 19.449C24.929 10.0386 24.9322 10.0327 24.9021 9.99173C24.8133 9.87074 24.8333 9.85865 24.8338 9.05977C24.8338 9.02878 24.834 8.69602 24.8786 8.67516C25.1019 8.57096 24.9111 9.76177 25.0191 9.83191C25.1137 9.89328 25.1169 9.88946 25.1693 9.98709C25.282 10.1973 25.5874 10.0063 25.5953 10.5058C25.5978 10.6637 25.5376 10.9127 25.7171 11.014C26.3238 11.3563 26.4343 11.4374 26.4125 11.2954C26.3183 10.6809 26.7259 10.9966 26.8023 11.0004C27.1082 11.0155 26.9679 11.1765 27.0353 12.2145C27.0445 12.3549 27.1165 13.4639 27.1339 13.9695ZM26.5214 13.1365C26.4748 12.3211 26.4831 12.3229 26.465 12.2546C26.4357 12.1444 25.6885 11.8944 25.6179 11.8708C25.6094 11.868 25.5489 11.8665 25.5376 11.9111C25.5228 11.9701 25.5973 14.3005 25.6044 14.3251C25.6294 14.4113 26.5172 14.7381 26.5449 14.7342C26.661 14.7183 26.5317 13.9396 26.5214 13.1365Z"
          fill="url(#paint2_linear_77_35)"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M26.193 28.2563C26.4518 28.5888 28.1274 30.5993 28.1324 30.6693C28.1451 30.8472 26.2789 32.4013 23.9957 31.949C23.8005 31.9104 22.6592 31.6843 21.771 30.8356C21.6617 30.7311 21.7401 30.6956 22.3506 29.9411C22.5227 29.7285 24.3594 27.4586 24.5356 27.3106C24.6702 27.1976 25.3773 27.2649 25.4247 27.3171C25.5341 27.4375 25.954 27.9757 26.193 28.2563ZM24.8886 28.2158C24.8905 28.2286 24.9275 28.4822 24.9911 28.3405C25.0205 28.275 24.9856 27.8202 24.8886 28.2158ZM25.0563 30.3201C25.0565 30.2871 25.0583 29.9464 25.0243 29.9087C24.9657 29.8435 24.8803 29.8788 24.8616 29.9182C24.8488 29.9452 24.758 30.8129 24.9171 30.848C25.1158 30.8918 25.0779 30.7709 25.0563 30.3201ZM25.0306 28.8735C25.0255 28.7955 25.0396 28.7957 25.0101 28.7382C24.9159 28.5548 24.8186 29.0336 24.9631 29.0764C25.0566 29.1041 25.0132 29.0375 25.0306 28.8735ZM25.0049 27.6022C24.9467 27.2047 24.8623 27.711 24.9307 27.7619C24.9953 27.81 25.0043 27.6163 25.0049 27.6022Z"
          fill="url(#paint3_linear_77_35)"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_77_35"
          x="-12.8483"
          y="-12.8483"
          width="73.6966"
          height="73.6966"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="6.42414" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.716716 0 0 0 0 0.206361 0 0 0 0 0.206361 0 0 0 0.15 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_77_35"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_77_35"
            result="shape"
          />
        </filter>
        <linearGradient
          id="paint0_linear_77_35"
          x1="39.7895"
          y1="-9.89474"
          x2="-8.22207"
          y2="40.3996"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#8E1538" />
          <stop offset="1" stop-color="#C41D4D" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_77_35"
          x1="31.2717"
          y1="15.3268"
          x2="18.5828"
          y2="34.5314"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#8E1538" />
          <stop offset="1" stop-color="#C41D4D" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_77_35"
          x1="31.2715"
          y1="15.3269"
          x2="18.5826"
          y2="34.5315"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#8E1538" />
          <stop offset="1" stop-color="#C41D4D" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_77_35"
          x1="31.2714"
          y1="15.3266"
          x2="18.5825"
          y2="34.5312"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#8E1538" />
          <stop offset="1" stop-color="#C41D4D" />
        </linearGradient>
        <clipPath id="clip0_77_35">
          <rect width="48" height="48" fill="white" />
        </clipPath>
      </defs>
    </svg>
    <div class="categories">
      <button
        class="category"
        onclick={() => {
          sidebarStore.changeOpened("map");
        }}
        class:category--hard-active={sidebarStore.panelOpen === "map"}
      >
        <Map size={20} />
      </button>
      {#if mapCategoriesOpen}
        <div class="map-categories" transition:slide={{
            axis: "y",
            duration: 500
        }}>
          {#each entityButtonsInfo as entityButtonInfo (entityButtonInfo.id)}
            <button
              class="category"
              onclick={() => {
                handleBrowse(entityButtonInfo.id);
              }}
              class:category--soft-active={activeTab === entityButtonInfo.id}
            >
              <entityButtonInfo.icon size={20} />
            </button>
          {/each}
        </div>
      {/if}

      <button
        class="category"
        onclick={() => {
          sidebarStore.changeOpened("planner");
        }}
        class:category--hard-active={sidebarStore.panelOpen === "planner"}
      >
        <CalendarDays size={20} />
      </button>
    </div>
  </div>
</aside>

<style>
  aside {
    padding: 0.5rem;
    background: white;
    pointer-events: auto;
  }
  div.top {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  div.categories, div.map-categories {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  button.category {
    padding: 0.75rem;
    display: flex;
    color: hsl(0, 0%, 20%);
    border-radius: 0.5rem;
    transition: 75ms ease-in-out;
    &:hover:not(.category--soft-active, .category--hard-active) {
      background-color: hsl(0, 0%, 90%);
    }
  }
  button.category--soft-active {
    color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 96%);
  }
  button.category--hard-active {
    background-color: hsl(5, 53%, 32%);
    color: hsl(5, 53%, 96%);
  }
</style>
