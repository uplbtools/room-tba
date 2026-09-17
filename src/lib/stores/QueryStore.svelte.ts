import { SvelteMap } from "svelte/reactivity";
import type { QueryStoreState, RecentSearch } from "./store-types";
import { buildingTypeFilter } from "./filter-stores.svelte.js";

export default class QueryStore {
    private _queryStore = $state<QueryStoreState>({
        category: null,
        type: 'query',
        value: ''
    });
    recentSearches: RecentSearch[] = $state([]);
    private _filters = new SvelteMap<string, Exclude<QueryStoreState['category'], null>>();
    inputValue = $state('');
    category = $derived(this._queryStore.category);
    type = $derived(this._queryStore.type);
    queryValue = $derived(this._queryStore.value);
    selectedEventSlug = $derived(this._queryStore.eventSlug ?? null);
    filterValues = $derived(
        Array.from(
            this._filters.entries().map(([value, category]) => ({
                category,
                value
            }))
        )
    );

    hasActiveMarker() {
        if (this._queryStore.category === null) return false;
        return ["building", "organization", "place", "dorm"].includes(this._queryStore.category);
    }

    isActiveMarker(value: string, category: QueryStoreState["category"]): boolean {
        return value === this._queryStore.value && category === this._queryStore.category;
    }

    updateQuery = (obj: QueryStoreState & { id?: number }) => {
        this._queryStore = obj;
        this.inputValue = obj.value;

        if (obj.type === 'result' && obj.category !== null && obj.category !== 'browse') {
            this.addRecentSearch({
                category: obj.category,
                value: obj.value,
                eventSlug: obj.eventSlug,
                id: obj.id
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

    hydrateQuery = (obj: QueryStoreState) => {
        this._queryStore = obj;
        this.inputValue = obj.value;
    };

    addRecentSearch(recentSearch: RecentSearch) {
        const qIndex = this.recentSearches.findIndex((query) => {
            if (query.category !== recentSearch.category) return false;
            if (recentSearch.category === 'event' && recentSearch.eventSlug && query.eventSlug) {
                return query.eventSlug === recentSearch.eventSlug;
            }
            return query.value === recentSearch.value;
        });
        if (qIndex !== -1) this.recentSearches.splice(qIndex, 1);
        else if (this.recentSearches.length > 4) this.recentSearches.pop();
        this.recentSearches.unshift(recentSearch);
    }

    removeRecentSearch(id: number) {
        this.recentSearches.splice(id, 1);
    }

    clearQuery = () => {
        this._queryStore = {
            category: null,
            type: 'query',
            value: ''
        };
        this.inputValue = '';
    };

    exitResultMode = () => {
        this._queryStore = {
            category: null,
            type: 'query',
            value: ''
        };
    };

    setType = (type: QueryStoreState['type']) => {
        this._queryStore.type = type;
    };

    setCategory = (category: QueryStoreState['category']) => {
        this._queryStore.category = category;
    };

    addFilter = (key: string, category: Exclude<QueryStoreState['category'], null>) => {
        this._filters.set(key, category);
    };

    removeFilter = (key: string) => {
        this._filters.delete(key);
    };

    clearFilters = () => {
        this._filters.clear();
    };
}