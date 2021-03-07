import { PF2EAncestry } from '@item/ancestry';
import { ABCSheetPF2e } from './abc';
import { AncestrySheetData } from './data-types';

export class AncestrySheetPF2e extends ABCSheetPF2e<PF2EAncestry> {
    /** @override */
    getData(): AncestrySheetData {
        const data = super.getData();
        const itemData = data.item;

        return {
            ...data,
            selectedBoosts: Object.fromEntries(
                Object.entries(itemData.data.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)]),
            ),
            selectedFlaws: Object.fromEntries(
                Object.entries(itemData.data.flaws).map(([k, b]) => [k, this.getLocalizedAbilities(b)]),
            ),
            rarities: this.prepareOptions(CONFIG.PF2E.rarityTraits, { value: [itemData.data.traits.rarity.value] }),
            sizes: this.prepareOptions(CONFIG.PF2E.actorSizes, { value: [itemData.data.size] }),
            traits: this.prepareOptions(CONFIG.PF2E.ancestryItemTraits, itemData.data.traits),
            languages: this.prepareOptions(CONFIG.PF2E.languages, itemData.data.languages),
            additionalLanguages: this.prepareOptions(CONFIG.PF2E.languages, itemData.data.additionalLanguages),
        };
    }
}