import {createSignatureSpellCopies, getSignatureSpellCopies} from '../../../src/module/item/spells';

describe('Signature Spells', () => {
    test('should retrieve signature spell copies to delete', () => {
        const spells = [
            {
                _id: 'autoleveled',
                type: 'spell',
                name: 'ray of frost',
                data: {
                    isAutoLeveled: {
                        value: true,
                    },
                },
            },
            {
                _id: 'not a spell',
                type: 'weapon',
                name: 'ray of frost',
                data: {
                    isAutoLeveled: {
                        value: true,
                    },
                },
            },
            {
                _id: 'wrong spell name',
                type: 'spell',
                name: 'different name',
                data: {
                    isAutoLeveled: {
                        value: true,
                    },
                },
            },
            {
                _id: 'not autoleveled',
                type: 'spell',
                name: 'ray of frost',
                data: {
                    isAutoLeveled: {
                        value: false,
                    },
                },
            },
        ];
        const copies = getSignatureSpellCopies(spells, 'ray of frost');
        expect(copies.length).toBe(1);
        expect(copies[0]).toBe('autoleveled');
    });

    test('should create signature spells', () => {
        // prepared in spell slot 3 with original spell level 2
        // should create the original spell level, skip the spell lv 3
        // and 4 which are prepared separately
        const spellToDuplicate = {
            _id: 'original',
            type: 'spell',
            name: 'ray of frost',
            data: {
                level: {
                    value: 2
                },
                spellSlotLevel: {
                    value: 3
                }
            },
        };
        const spells = [
            {
                _id: 'heightenedlv4',
                type: 'spell',
                name: 'ray of frost',
                data: {
                    level: {
                        value: 2
                    },
                    spellSlotLevel: {
                        value: 4
                    }
                },
            },
            {
                _id: 'different spell',
                type: 'spell',
                name: 'different name',
                data: {
                    isAutoLeveled: {
                        value: true,
                    },
                },
            }
        ];
        
        const copies = createSignatureSpellCopies(spells, 'ray of frost', spellToDuplicate);
        
        expect(copies.length).toBe(7);
        expect(copies[0].data.level.value).toBe(2);
        expect(copies[0].data.isAutoLeveled.value).toBe(true);
        expect(copies[0].data.spellSlotLevel.value).toBe(2);
        expect(copies[1].data.level.value).toBe(2);
        expect(copies[1].data.isAutoLeveled.value).toBe(true);
        expect(copies[1].data.spellSlotLevel.value).toBe(5);
        expect(copies[2].data.level.value).toBe(2);
        expect(copies[2].data.isAutoLeveled.value).toBe(true);
        expect(copies[2].data.spellSlotLevel.value).toBe(6);
        expect(copies[3].data.level.value).toBe(2);
        expect(copies[3].data.isAutoLeveled.value).toBe(true);
        expect(copies[3].data.spellSlotLevel.value).toBe(7);
        expect(copies[4].data.level.value).toBe(2);
        expect(copies[4].data.isAutoLeveled.value).toBe(true);
        expect(copies[4].data.spellSlotLevel.value).toBe(8);
        expect(copies[5].data.level.value).toBe(2);
        expect(copies[5].data.isAutoLeveled.value).toBe(true);
        expect(copies[5].data.spellSlotLevel.value).toBe(9);
        expect(copies[6].data.level.value).toBe(2);
        expect(copies[6].data.isAutoLeveled.value).toBe(true);
        expect(copies[6].data.spellSlotLevel.value).toBe(10);
    });
});