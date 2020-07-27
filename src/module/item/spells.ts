import {createRange, toNumber} from '../utils';

type ItemDataPlaceholder = any;
type ActorEntityPlaceholder = any;

async function getSignatureSpellCopies(items: ItemDataPlaceholder[], spellName: string) {
    console.log(items);
    return items
        .filter(item => item.type === 'spell' && item.data?.isAutoLeveled?.value === true && item.name === spellName)
        .map(item => {
            return {
                _id: item._id,
            };
        });
}

async function createSignatureSpellCopies(items: any[], spellName: string, spellData: ItemDataPlaceholder) {
    console.log(items);
    const spellExistsAtLevels = new Set(
        items
            .filter(item => item.type === 'spell' && item.name === spellName)
            .map(item => item.data?.level?.value)
            .map(toNumber)
            .filter(level => level === undefined),
    );
    const originalSpellLevel = spellData?.level?.value ?? 1;
    return createRange(originalSpellLevel + 1, 11)
        .filter(level => !spellExistsAtLevels.has(level))
        .map(level => {
            const duplicateSpell = duplicate(spellData);
            duplicateSpell.data.isAutoLeveled.value = true;
            duplicateSpell.data.spellSlotLevel.value = level;
            return duplicateSpell;
        });
}

/**
 * Given an actor and a spell item id, remove all
 * @param actor
 * @param spellItemId
 */
export async function toggleSignatureSpell(actor: ActorEntityPlaceholder, spellItemId: string): Promise<void> {
    console.log(actor);
    const spell = actor.getOwnedItem(spellItemId);
    if (spell.data.data?.isSignatureSpell?.value === true) {
        const copies = getSignatureSpellCopies(actor, spell.name);
        await actor.deleteEmbeddedEntity('OwnedItem', copies);
        await spell.update({
            'data.level.isSignatureSpell': false,
        });
    } else {
        const copies = createSignatureSpellCopies(actor, spell.data, spell.name);
        await actor.createEmbeddedEntity('OwnedItem', copies);
        await spell.update({
            'data.level.isSignatureSpell': true,
        });
    }
}


