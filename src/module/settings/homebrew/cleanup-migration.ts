import { MigrationBase } from '@module/migrations/base';
import { ItemDataPF2e, WeaponCategoryKey } from '@item/data-definitions';
import { ActorDataPF2e, BaseWeaponProficiencyKey, WeaponGroupProficiencyKey } from '@actor/data-definitions';
import { ConfigPF2eListName } from './index';

export function prepareCleanup(listKey: ConfigPF2eListName, deletions: string[]) {
    return class extends MigrationBase {
        async updateActor(actorData: ActorDataPF2e) {
            if (!(actorData.type === 'character' || actorData.type === 'npc')) {
                return;
            }

            switch (listKey) {
                case 'creatureTraits': {
                    const traits = actorData.data.traits.traits;
                    traits.value = traits.value.filter((trait) => !deletions.includes(trait));
                    break;
                }
                case 'languages': {
                    const languages = actorData.data.traits.languages;
                    languages.value = languages.value.filter((language) => !deletions.includes(language));
                    break;
                }
                case 'weaponCategories': {
                    if (actorData.type === 'character') {
                        const proficiencyKeys = deletions.map(
                            (deletion) => `weapon-category-${deletion}`,
                        ) as WeaponCategoryKey[];
                        for (const key of proficiencyKeys) {
                            delete actorData.data.martial[key];
                        }
                    }
                    break;
                }
                case 'weaponGroups': {
                    if (actorData.type === 'character') {
                        const proficiencyKeys = deletions.map(
                            (deletion) => `weapon-group-${deletion}`,
                        ) as WeaponGroupProficiencyKey[];
                        for (const key of proficiencyKeys) {
                            delete actorData.data.martial[key];
                        }
                    }
                    break;
                }
                case 'baseWeapons': {
                    if (actorData.type === 'character') {
                        const proficiencyKeys = deletions.map(
                            (deletion) => `weapon-base-${deletion}`,
                        ) as BaseWeaponProficiencyKey[];
                        for (const key of proficiencyKeys) {
                            delete actorData.data.martial[key];
                        }
                    }
                    break;
                }
            }
        }

        async updateItem(itemData: ItemDataPF2e) {
            switch (listKey) {
                // Creature traits can be on almost any item
                case 'creatureTraits': {
                    const traits = itemData.data.traits;
                    traits.value = traits.value.filter((trait) => !deletions.includes(trait));
                    break;
                }
                case 'weaponCategories': {
                    if (itemData.type === 'weapon') {
                        const category = itemData.data.weaponType;
                        category.value = deletions.includes(category.value ?? '') ? null : category.value;
                    }
                    break;
                }
                case 'weaponGroups': {
                    if (itemData.type === 'weapon') {
                        const group: { value: string | null } = itemData.data.group;
                        group.value = deletions.includes(group.value ?? '') ? null : group.value;
                    }
                    break;
                }
                case 'baseWeapons': {
                    if (itemData.type === 'weapon') {
                        const base = itemData.data.baseItem;
                        itemData.data.baseItem = deletions.includes(base ?? '') ? null : base;
                    }
                    break;
                }
            }
        }
    };
}