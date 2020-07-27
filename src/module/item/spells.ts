import {createRange, toNumber} from '../utils';

type ItemDataPlaceholder = any;
type ActorEntityPlaceholder = any;

export function getSignatureSpellCopies(items: ItemDataPlaceholder[], spellName: string): Array<Record<string, string>> {
    return items
        .filter(item => item.type === 'spell' && item.data?.isAutoLeveled?.value === true && item.name === spellName)
        .map(item => {
            return {
                _id: item._id,
            };
        });
}

export function createSignatureSpellCopies(items: ItemDataPlaceholder[], spellName: string, spellData: ItemDataPlaceholder): ItemDataPlaceholder {
    const spellExistsAtLevels = new Set(
        items
            .filter(item => item.type === 'spell' && item.name === spellName)
            .map(item => item.data?.spellSlotLevel?.value)
            .map(toNumber)
            .filter(level => level !== undefined),
    );
    const originalSpellLevel = spellData.data?.level?.value ?? 1;
    const spellSlotLevel = spellData.data?.spellSlotLevel?.value ?? 1;
    return createRange(originalSpellLevel, 11)
        .filter(level => !spellExistsAtLevels.has(level) && level !== spellSlotLevel)
        .map(level => {
            const duplicateSpell = JSON.parse(JSON.stringify(spellData));
            duplicateSpell.data.isAutoLeveled = {
                value: true  
            };
            duplicateSpell.data.spellSlotLevel = {
                value: level
            };
            return duplicateSpell;
        });
}

/**
 * Given an actor and a spell item id, remove all
 * @param actor
 * @param spellItemId
 */
export async function toggleSignatureSpell(actor: ActorEntityPlaceholder, spellItemId: string): Promise<void> {
    const spell = actor.getOwnedItem(spellItemId);
    if (spell.data.data?.isSignatureSpell?.value === true) {
        const copies = getSignatureSpellCopies(actor.data.items, spell.name);
        await actor.deleteEmbeddedEntity('OwnedItem', copies);
        await spell.update({
            'data.level.isSignatureSpell': false,
        });
    } else {
        const copies = createSignatureSpellCopies(actor.data.items, spell.name, spell.data);
        await actor.createEmbeddedEntity('OwnedItem', copies);
        await spell.update({
            'data.level.isSignatureSpell': true,
        });
    }
}


