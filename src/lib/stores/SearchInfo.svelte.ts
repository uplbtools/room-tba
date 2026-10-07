import { SvelteMap } from "svelte/reactivity";
import type { SearchInfoState, RecentSearch } from "./store-types.js";
import { buildingTypeFilter } from "./filter-stores.svelte.js";

export default class SearchInfo {
    private _searchInfo = $state<SearchInfoState>({
        category: null,
        type: 'query',
        value: ''
    });
    recentSearches: RecentSearch[] = $state([]);
    private _filters = new SvelteMap<string, Exclude<SearchInfoState['category'], null>>();
    category = $derived(this._searchInfo.category);
    type = $derived(this._searchInfo.type);
    queryValue = $derived(this._searchInfo.value);
    selectedEventSlug = $derived(this._searchInfo.eventSlug ?? null);
    filterValues = $derived(
        Array.from(
            this._filters.entries().map(([value, category]) => ({
                category,
                value
            }))
        )
    );

    hasActiveResult() {
        if (this._searchInfo.category === null) return false;
        return ["building", "organization", "place", "dorm"].includes(this._searchInfo.category);
    }

    isActiveMarker(value: string, category: SearchInfoState["category"]): boolean {
        return value === this._searchInfo.value && category === this._searchInfo.category;
    }

    updateQuery = (obj: SearchInfoState & { id?: number }) => {
        this._searchInfo = obj;

        if (obj.type === 'result' && obj.category !== null && obj.category !== 'browse') {
            this.addRecentSearch({
                category: obj.category,
                value: obj.value,
            });

            // Committing a result outside the pin filter's domain (e.g. an office
            // while "Other dorms" is filtered) ends the browsing context — clear the
            // filter so its chip doesn't mislabel the selected entity.
            const filter = buildingTypeFilter.value;
            const filterCoversResult =
                filter === 'all' ||
                (obj.category === 'building' &&
                    (filter === 'class-building' || filter === 'administrative-building')) ||
                (obj.category === 'dorm' &&
                    (filter === 'up-managed-dorm' || filter === 'non-up-managed-dorm'));
            if (!filterCoversResult) buildingTypeFilter.set('all');
        }
    };

    hasQuery = () => {
        return this.queryValue !== ''
    }

    isSearchMode = () => {
        return this.type === "query";
    }

    hydrateQuery = (obj: SearchInfoState) => {
        this._searchInfo = obj;
    };

    addRecentSearch(recentSearch: RecentSearch) {
        const qIndex = this.recentSearches.findIndex((query) => {
            if (query.category !== recentSearch.category) return false;
            // if (recentSearch.category === 'event' && recentSearch.eventSlug && query.eventSlug) {
            //     return query.eventSlug === recentSearch.eventSlug;
            // }
            return query.value === recentSearch.value;
        });
        if (qIndex !== -1) this.recentSearches.splice(qIndex, 1);
        else if (this.recentSearches.length > 4) this.recentSearches.pop();
        this.recentSearches.unshift(recentSearch);
    }

    removeRecentSearch(id: number) {
        this.recentSearches.splice(id, 1);
    }

    clearSearch = () => {
        this._searchInfo = {
            category: null,
            type: 'query',
            value: ''
        };
    };

    exitResultMode = () => {
        this._searchInfo = {
            category: null,
            type: 'query',
            value: ''
        };
    };

    setType = (type: SearchInfoState['type']) => {
        this._searchInfo.type = type;
    };

    setCategory = (category: SearchInfoState['category']) => {
        this._searchInfo.category = category;
    };

    addFilter = (key: string, category: Exclude<SearchInfoState['category'], null>) => {
        this._filters.set(key, category);
    };

    removeFilter = (key: string) => {
        this._filters.delete(key);
    };

    clearFilters = () => {
        this._filters.clear();
    };
}