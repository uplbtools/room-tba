<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import BookText from "@lucide/svelte/icons/book-text";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Landmark from "@lucide/svelte/icons/landmark";
  import House from "@lucide/svelte/icons/house";
  import School from "@lucide/svelte/icons/school";
  import Briefcase from "@lucide/svelte/icons/briefcase";
  import Settings from "@lucide/svelte/icons/settings";
  import Store from "@lucide/svelte/icons/store";
  import Ticket from "@lucide/svelte/icons/ticket";
  import BusFront from "@lucide/svelte/icons/bus-front";
  import Trophy from "@lucide/svelte/icons/trophy";
  import Globe from "@lucide/svelte/icons/globe";
  import Wrench from "@lucide/svelte/icons/wrench";
  import HeartHandshake from "@lucide/svelte/icons/heart-handshake";
  import X from "@lucide/svelte/icons/x";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import University from "@lucide/svelte/icons/university";
  import UserPlus from "@lucide/svelte/icons/user-plus";
  import Users from "@lucide/svelte/icons/users";
  import { openBrowseClasses, openCampusBrowse } from "@lib/browse-campus";
  import {
    adminAuthStore,
    jeepneyStore,
    modalStore,
    queryStore,
    sidebarStore,
    sidePanelStore,
  } from "@lib/store.svelte";
  import Map from "@lucide/svelte/icons/map";
  import Keyboard from "@lucide/svelte/icons/keyboard";
  import Cookie from "@lucide/svelte/icons/cookie";
  import { slide } from "svelte/transition";
  import CircleQuestionMark from "@lucide/svelte/icons/circle-question-mark";
  import Tag from "@lucide/svelte/icons/tag";
  import { LogIn, LogOut } from "@lucide/svelte";
  import NavLink from "./NavLink.svelte";
  import { APP_VERSION_LABEL } from "@constants/version";

  const entityButtonsInfo: {
    id: string;
    label: string;
    icon: typeof University;
  }[] = [
    { id: "buildings", label: "Buildings", icon: University },
    { id: "dorms", label: "Dorms", icon: House },
    { id: "colleges", label: "Colleges", icon: GraduationCap },
    { id: "divisions", label: "Divisions", icon: School },
    { id: "organizations", label: "Orgs", icon: Users },
    { id: "offices", label: "Units & offices", icon: Briefcase },
    { id: "landmarks", label: "Landmarks", icon: Landmark },
    { id: "services", label: "Services & establishments", icon: Store },
    { id: "classes", label: "Classes", icon: BookText },
    { id: "events", label: "Events", icon: Ticket },
    { id: "jeepney", label: "Jeepney routes", icon: BusFront },
  ];
  function handleBrowse(id: string) {
    if (id === "classes") {
      openBrowseClasses(queryStore, sidePanelStore);
      return;
    }
    if (id === "jeepney") {
      // Routes browse panel + the transit layer on the map behind it.
      jeepneyStore.enableLayer();
      openCampusBrowse(queryStore, sidePanelStore, "jeepney");
      return;
    }
    if (id === "events") {
      queryStore.updateQuery({
        category: "events",
        type: "result",
        value: "Campus events",
      });
      queryStore.inputValue = "";
      sidePanelStore.expand();
      return;
    }
    openCampusBrowse(queryStore, sidePanelStore, id);
  }

  // Selecting anything auto-closes the mobile rail; the hamburger reopens it.
  $effect(() => {
    if (queryStore.category !== null) sidebarStore.closeRail();
  });

  const activeTab = $derived.by((): string | null => {
    if (queryStore.category === "classes") return "classes";
    if (queryStore.category === "events") return "events";
    if (queryStore.category !== "browse") return null;
    if (
      queryStore.queryValue === "colleges" ||
      queryStore.queryValue === "divisions" ||
      queryStore.queryValue === "organizations" ||
      queryStore.queryValue === "offices" ||
      queryStore.queryValue === "dorms" ||
      queryStore.queryValue === "landmarks" ||
      queryStore.queryValue === "services" ||
      queryStore.queryValue === "jeepney"
    ) {
      return queryStore.queryValue;
    }
    return "buildings";
  });
  const mapCategoriesOpen = $derived(sidebarStore.panelOpen === "map");

  // Grouped bottom rail: collapsed by default so the rail stays short.
  let communityOpen = $state(false);
  let supportOpen = $state(false);
</script>

<aside id="app-sidebar" class:retracted={!sidebarStore.railOpen}>
  <div class="rail-close">
    <NavLink
      active={false}
      hard={false}
      tooltip="Close menu"
      aria-label="Close menu"
      onclick={() => sidebarStore.closeRail()}
    >
      <X size={20} />
    </NavLink>
  </div>
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
      <NavLink
        onclick={() => {
          sidebarStore.changeOpened("map");
        }}
        active={sidebarStore.panelOpen === "map"}
        tooltip="Maps"
        hard={true}
      >
        <Map size={20} />
      </NavLink>
      {#if mapCategoriesOpen}
        <div
          class="map-categories"
          transition:slide={{
            axis: "y",
            duration: 500,
          }}
        >
          {#each entityButtonsInfo as entityButtonInfo (entityButtonInfo.id)}
            <NavLink
              onclick={() => {
                handleBrowse(entityButtonInfo.id);
              }}
              active={activeTab === entityButtonInfo.id}
              hard={false}
              tooltip={entityButtonInfo.label}
            >
              <entityButtonInfo.icon size={20} />
            </NavLink>
          {/each}
        </div>
      {/if}

      <NavLink
        onclick={() => {
          sidebarStore.changeOpened("planner");
        }}
        active={sidebarStore.panelOpen === "planner"}
        hard={true}
        tooltip="Planner"
      >
        <CalendarDays size={20} />
      </NavLink>
    </div>
  </div>

  <div class="bottom">
    <div class="nav-support">
      <NavLink
        onclick={() => {
          communityOpen = !communityOpen;
          if (communityOpen) supportOpen = false;
        }}
        active={communityOpen}
        hard={true}
        tooltip="Contributors"
      >
        <HeartHandshake size={20} />
      </NavLink>
    </div>
    {#if communityOpen}
    <div class="nav-links map-categories" transition:slide={{ axis: "y", duration: 300 }}>
      <NavLink
        href="https://discord.uplbtools.me"
        aria-label="Join Discord"
        tooltip="Join Discord"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="16"
          viewBox="0 0 64 48"
          fill="none"
        >
          <path
            d="M40.9051 0C40.2863 1.09866 39.7306 2.2352 39.2255 3.397C34.4268 2.67719 29.5396 2.67719 24.7283 3.397C24.2358 2.2352 23.6675 1.09866 23.0487 0C18.5404 0.770324 14.1458 2.12155 9.97847 4.02841C1.71959 16.2652 -0.51561 28.1863 0.595677 39.9432C5.4323 43.517 10.8498 46.2447 16.6209 47.9874C17.9216 46.2447 19.0708 44.3883 20.0558 42.4562C18.1868 41.7616 16.381 40.8903 14.6509 39.88C15.1055 39.5517 15.5475 39.2107 15.9769 38.8824C26.1174 43.6559 37.8617 43.6559 48.0148 38.8824C48.4441 39.236 48.8861 39.577 49.3407 39.88C47.6107 40.9029 45.8048 41.7616 43.9232 42.4688C44.9082 44.4009 46.0574 46.2573 47.3581 48C53.1292 46.2573 58.5467 43.5422 63.3834 39.9684C64.6967 26.3299 61.1355 14.5099 53.9753 4.04104C49.8206 2.13418 45.426 0.782952 40.9177 0.0252565L40.9051 0ZM21.4702 32.7072C18.351 32.7072 15.7622 29.8785 15.7622 26.3804C15.7622 22.8824 18.25 20.041 21.4576 20.041C24.6651 20.041 27.216 22.895 27.1655 26.3804C27.115 29.8658 24.6525 32.7072 21.4702 32.7072ZM42.5089 32.7072C39.3771 32.7072 36.8135 29.8785 36.8135 26.3804C36.8135 22.8824 39.3013 20.041 42.5089 20.041C45.7164 20.041 48.2547 22.895 48.2042 26.3804C48.1537 29.8658 45.6912 32.7072 42.5089 32.7072Z"
            fill="black"
          />
        </svg>
      </NavLink>
      <NavLink
        href="https://messenger.uplbtools.me"
        aria-label="Join our Contributors GC"
        tooltip="Join our Contributors GC"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          id="Logo"
          viewBox="0 0 502 502"
          width="20"
          height="20"
        >
          <defs>
            <style>
              .cls-1 {
                fill: #fff;
              }

              .cls-1,
              .cls-2 {
                stroke-width: 0px;
              }

              .cls-2 {
                fill: #0866ff;
              }
            </style>
          </defs>
          <path
            class="cls-2"
            d="M501,243.5c0,139.34-109.17,242.5-250,242.5-25.29,0-49.56-3.34-72.37-9.61-4.43-1.23-9.14-.88-13.35.97l-49.62,21.91c-12.98,5.73-27.63-3.5-28.06-17.68l-1.36-44.48c-.17-5.48-2.63-10.6-6.72-14.25C30.87,379.36,1,316.39,1,243.5,1,104.16,110.17,1,251,1s250,103.16,250,242.5Z"
          />
          <path
            class="cls-1"
            d="M318.88,313.31l87.04-134.52c8.75-13.52-7.46-29.26-20.72-20.11l-90.86,62.67c-3.06,2.11-7.1,2.17-10.22.15l-80.65-52.18c-6.83-4.42-15.94-2.46-20.35,4.36l-87.05,134.52c-8.75,13.52,7.46,29.26,20.72,20.11l90.88-62.68c3.06-2.11,7.1-2.17,10.22-.15l80.63,52.17c6.83,4.42,15.94,2.46,20.36-4.36Z"
          />
        </svg>
      </NavLink>
      <NavLink
        href="https://guide.stimmie.dev"
        aria-label="UPLB resources & guides"
        tooltip="UPLB resources & guides"
      >
        <Globe size={20} />
      </NavLink>
      <NavLink
        href="https://uplbtools.me"
        aria-label="More UPLB tools"
        tooltip="More UPLB tools"
      >
        <Wrench size={20} />
      </NavLink>
      <NavLink
        active={false}
        hard={false}
        tooltip="Contributor leaderboard"
        onclick={() => modalStore.openModal("leaderboard")}
      >
        <Trophy size={20} />
      </NavLink>
      {#if !adminAuthStore.isLoggedIn}
        <NavLink
          active={false}
          hard={false}
          tooltip="Create contributor account"
          onclick={() => adminAuthStore.openLogin("signup")}
        >
          <UserPlus size={20} />
        </NavLink>
      {/if}
      <NavLink
        active={false}
        hard={false}
        tooltip={adminAuthStore.isLoggedIn ? "Logout" : "Login"}
        onclick={() => {
            if (!adminAuthStore.isLoggedIn) {
                adminAuthStore.openLogin("signin");
            } else {
                adminAuthStore.logout();
            }
        }}
      >
        {#if adminAuthStore.isLoggedIn}
          <LogOut size={20} />
        {:else}
          <LogIn size={20} />
        {/if}
      </NavLink>
    </div>
    {/if}
    <div class="nav-support">
      <NavLink
        onclick={() => {
          supportOpen = !supportOpen;
          if (supportOpen) communityOpen = false;
        }}
        active={supportOpen}
        hard={true}
        tooltip="Help & settings"
      >
        <CircleQuestionMark size={20} />
      </NavLink>
    </div>
    {#if supportOpen}
    <div class="nav-support map-categories" transition:slide={{ axis: "y", duration: 300 }}>
      <NavLink
        active={false}
        hard={false}
        tooltip="Settings"
        onclick={() => modalStore.openModal("settings")}
      >
        <Settings size={20} />
      </NavLink>
      <NavLink
        active={false}
        hard={false}
        onclick={() => {
          window.location.href = "/privacy";
        }}
        tooltip="Privacy"
      >
        <Cookie size={20} />
      </NavLink>
      <NavLink
        active={false}
        hard={false}
        onclick={() => modalStore.openModal("changelog")}
        tooltip="What's new?"
      >
        <Sparkles size={20} />
      </NavLink>
      <NavLink
        active={false}
        hard={false}
        onclick={() => {
          window.dispatchEvent(new CustomEvent("room-tba:open-shortcuts-help"));
        }}
        tooltip="Keyboard Shortcuts"
      >
        <Keyboard size={20} />
      </NavLink>
    </div>
    {/if}
  </div>
</aside>

<style>
  aside {
    padding: 0.5rem 0.5rem 1.25rem;
    background: white;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    /* Expanded groups can outgrow the viewport; the rail itself scrolls. */
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    box-shadow:
      0 1px 3px hsla(0, 0%, 0%, 0.12),
      0 4px 12px hsla(0, 0%, 0%, 0.16),
      0 10px 24px hsla(0, 0%, 0%, 0.1);
      position:relative;
      z-index:200;
  }
  div.top,
  div.bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }
  div.bottom {
    margin-top: auto;
  }
  div.categories,
  div.map-categories,
  div.nav-support {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  /* Rail close affordance is a mobile-overlay concern only. */
  div.rail-close {
    display: none;
  }

  @media (max-width: 48rem) {
    /* Overlay drawer: leaves no reserved flex column behind, so the search
       chrome and map data pill hug the viewport edge when it is closed. */
    aside {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));
      padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
      transition: transform var(--motion-duration-fast, 150ms) ease;
    }

    aside.retracted {
      transform: translateX(calc(-100% - 0.5rem));
      pointer-events: none;
    }

    div.rail-close {
      display: flex;
      justify-content: center;
      margin-bottom: 0.25rem;
    }

    /* Tighter rhythm so the full rail fits small screens. */
    aside > .top > svg {
      width: 2.25rem;
      height: 2.25rem;
    }

    div.top,
    div.bottom {
      gap: 0.625rem;
    }

    aside :global(.nav-link) {
      padding: 0.5rem;
    }
  }
</style>
