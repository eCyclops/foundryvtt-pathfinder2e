import {
    Bulk,
    BulkConfig,
    BulkItem,
    calculateBulk,
    defaultBulkConfig,
    formatBulk,
    weightToBulk,
} from '../physical/bulk';
import { PhysicalItemData } from '../data';
import { groupBy } from '@module/utils';
import { Size } from '@module/data';

/**
 * Datatype that holds container information for *every* item, even non containers
 * @category Other
 */
class ContainerData {
    item: PhysicalItemData;
    heldItems: PhysicalItemData[];
    negateBulk: Bulk;
    heldItemBulk: Bulk;
    isInContainer: boolean;
    formattedHeldItemBulk: string;
    formattedNegateBulk: string;
    formattedCapacity: string;
    capacity: Bulk;

    constructor({
        item,
        heldItems,
        negateBulk,
        capacity,
        heldItemBulk,
        isInContainer,
        formattedNegateBulk,
        formattedHeldItemBulk,
        formattedCapacity,
    }: {
        item: PhysicalItemData;
        heldItems: PhysicalItemData[];
        negateBulk: Bulk;
        heldItemBulk: Bulk;
        isInContainer: boolean;
        formattedHeldItemBulk: string;
        formattedNegateBulk: string;
        formattedCapacity: string;
        capacity: Bulk;
    }) {
        this.item = item;
        this.heldItems = heldItems;
        this.negateBulk = negateBulk;
        this.heldItemBulk = heldItemBulk;
        this.isInContainer = isInContainer;
        this.formattedHeldItemBulk = formattedHeldItemBulk;
        this.formattedNegateBulk = formattedNegateBulk;
        this.formattedCapacity = formattedCapacity;
        this.capacity = capacity;
    }

    get isContainer(): boolean {
        return !this.capacity.isNegligible;
    }

    get isCollapsed(): boolean {
        return this.item?.data?.collapsed?.value ?? false;
    }

    get isNotInContainer(): boolean {
        return !this.isInContainer;
    }

    _getLightBulkCapacityThreshold(): number {
        if (this.capacity.normal > 0) {
            // light bulk don't count towards bulk limit
            return this.capacity.toLightBulk() + 10;
        }
        // but do if the container only stores light bulk
        return this.capacity.light;
    }

    get fullPercentage(): number {
        const capacity = this._getLightBulkCapacityThreshold();
        if (capacity === 0) {
            return 0;
        }
        const heldLightBulk = this.heldItemBulk.toLightBulk();
        return Math.floor((heldLightBulk / capacity) * 100);
    }

    get fullPercentageMax100(): number {
        const percentage = this.fullPercentage;
        if (percentage > 100) {
            return 100;
        }
        return percentage;
    }

    get isOverLoaded(): boolean {
        if (this.capacity.normal > 0) {
            return this.heldItemBulk.toLightBulk() >= this.capacity.toLightBulk() + 10;
        }
        return this.heldItemBulk.toLightBulk() > this.capacity.light;
    }
}

/**
 * Creates container meta data
 * @param item
 * @param heldItems
 * @param heldBulkItems
 * @param isInContainer
 * @param stackDefinitions
 * @param bulkConfig
 * @return
 */
function toContainer({
    item,
    heldItems = [],
    heldBulkItems = [],
    isInContainer,
    bulkConfig,
    actorSize,
}: {
    item: PhysicalItemData;
    heldItems: PhysicalItemData[];
    heldBulkItems: BulkItem[];
    isInContainer: boolean;
    bulkConfig: BulkConfig;
    actorSize: Size;
}): ContainerData {
    const negateBulk = weightToBulk(item.data?.negateBulk?.value) ?? new Bulk();
    const [heldItemBulk] = calculateBulk({
        items: heldBulkItems,
        bulkConfig,
        actorSize,
    });
    const capacity = weightToBulk(item.data?.bulkCapacity?.value) ?? new Bulk();
    return new ContainerData({
        item,
        heldItems,
        negateBulk,
        capacity,
        heldItemBulk,
        isInContainer,
        formattedNegateBulk: formatBulk(negateBulk),
        formattedHeldItemBulk: formatBulk(heldItemBulk),
        formattedCapacity: formatBulk(capacity),
    });
}

function detectCycle(itemId: string, containerId = '', idIndexedItems: Map<string, PhysicalItemData>): boolean {
    const currentItem = idIndexedItems.get(containerId);
    if (currentItem) {
        if (itemId === currentItem?._id) {
            return true;
        }
        return detectCycle(itemId, currentItem.data.containerId.value!, idIndexedItems);
    }
    return false;
}

/**
 * Detect if a new container id would produce a cycle
 * @param itemId
 * @param containerId
 * @param items
 * @returns
 */
export function isCycle(itemId: string, containerId: string, items: PhysicalItemData[]): boolean {
    const idIndexedItems = new Map();
    for (const item of items) {
        idIndexedItems.set(item._id, item);
    }
    return detectCycle(itemId, containerId, idIndexedItems);
}

/**
 * Returns a map where the key is an item id and the value is the container data.
 * Every item has container data, even if it's not a container. The relevant
 * values for non container items are just empty in that case. This is useful
 * in the templates, because you don't have a lot of leeway there
 * @param items all items on the actor
 * @param bulkItemsById all items on the actor transformed into bulk items; used to look up how much bulk a container stores
 * @param bulkConfig used to calculated bulk
 * @param actorSize
 * @return
 */
export function getContainerMap({
    items = [],
    bulkItemsById = new Map(),
    bulkConfig = defaultBulkConfig,
    actorSize = 'med',
}: {
    items?: PhysicalItemData[];
    bulkItemsById?: Map<string, BulkItem>;
    bulkConfig?: BulkConfig;
    actorSize?: Size;
} = {}): Map<string, ContainerData> {
    const allIds = groupBy(items, (itemData) => itemData._id);

    const containerGroups = groupBy(items, (itemData) => {
        const containerId = itemData.data.containerId.value ?? '';
        return allIds.has(containerId) ? containerId : null;
    });

    const idIndexedContainerData = new Map();
    for (const item of items) {
        const isInContainer = item.data.containerId.value !== null && containerGroups.has(item.data.containerId.value);
        const heldItems = containerGroups.get(item._id) || [];

        idIndexedContainerData.set(
            item._id,
            toContainer({
                item: allIds.get(item._id)![0],
                heldItems,
                heldBulkItems: bulkItemsById.get(item._id)?.holdsItems ?? [],
                isInContainer,
                bulkConfig,
                actorSize,
            }),
        );
    }

    return idIndexedContainerData;
}
