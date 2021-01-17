import { ConsumableData, EquipmentData, SpellData } from './dataDefinitions';

export const scrollCompendiumIds = {
    1: 'RjuupS9xyXDLgyIr',
    2: 'Y7UD64foDbDMV9sx',
    3: 'ZmefGBXGJF3CFDbn',
    4: 'QSQZJ5BC3DeHv153',
    5: 'tjLvRWklAylFhBHQ',
    6: '4sGIy77COooxhQuC',
    7: 'fomEZZ4MxVVK3uVu',
    8: 'iPki3yuoucnj7bIt',
    9: 'cFHomF3tty8Wi1e5',
    10: 'o1XIHJ4MJyroAHfF',
};

export async function scrollFromSpell(spellData: SpellData, heightenedLevel?: number): Promise<ConsumableData> {
    heightenedLevel = heightenedLevel ?? spellData.data.level.value;
    const pack = game.packs.find((p) => p.collection === 'pf2e.equipment-srd');
    const scroll = (await pack.getEntry(scrollCompendiumIds[heightenedLevel])) as ConsumableData;
    scroll.name = game.i18n.format('PF2E.ScrollFromSpell', { name: spellData.name, level: heightenedLevel });
    scroll.data.spell = {
        data: duplicate(spellData),
        heightenedLevel: heightenedLevel,
    };
    return scroll;
}

export const wandCompendiumIds = {
    1: 'UJWiN0K3jqVjxvKk',
    2: 'vJZ49cgi8szuQXAD',
    3: 'wrDmWkGxmwzYtfiA',
    4: 'Sn7v9SsbEDMUIwrO',
    5: '5BF7zMnrPYzyigCs',
    6: 'kiXh4SUWKr166ZeM',
    7: 'nmXPj9zuMRQBNT60',
    8: 'Qs8RgNH6thRPv2jt',
    9: 'Fgv722039TVM5JTc',
};

export async function wandFromSpell(spellData: SpellData, heightenedLevel?: number): Promise<EquipmentData> {
    heightenedLevel = heightenedLevel ?? spellData.data.level.value;
    const pack = game.packs.find((p) => p.collection === 'pf2e.equipment-srd');
    const wand = (await pack.getEntry(wandCompendiumIds[heightenedLevel])) as EquipmentData;
    wand.name = game.i18n.format('PF2E.WandFromSpell', { name: spellData.name, level: heightenedLevel });
    wand.data.spell = {
        data: duplicate(spellData),
        heightenedLevel: heightenedLevel,
    };
    return wand;
}