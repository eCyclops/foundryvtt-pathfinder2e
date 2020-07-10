import { ItemData } from "../item/dataDefinitions"

type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface AbilityData {
    value: number
    min: number
    mod: number
}

export interface SaveData {
    rank: number
    ability: Ability
    item: number
    value: number
    breakdown: string
    saveDetail: string
}

export interface SkillData {
    value: number
    ability: Ability
    armor: number
    rank: number
    item: number
    mod: number
    breakdown: string
}

export interface MartialData {
    rank: number
    value: number
    breakdown: string
}

export interface CommonActorData {
    abilities: {
        str: AbilityData
        dex: AbilityData
        con: AbilityData
        int: AbilityData
        wis: AbilityData
        cha: AbilityData
    }
    saves: {
        fortitude: SaveData
        reflex: SaveData
        will: SaveData
    }
    attributes: {
        ac: {
            min: number
            value: number
            dex: number
            item: number
            check: number
            details: string
        }
        allSaves: {
            value: string
        }
        shield: {
            value: number
            min: number
            max: number
            brokenThreshold: number
            hardness: number
            ac: number
        }
        hp: {
            value: number
            min: number
            max: number
            temp: number
            tempmax: number
            details: string
        }
        sp: {
            value: number
            min: number
            max: number
            details: string
        }
        flatbonushp: number
        levelbonushp: number
        flatbonussp: number
        levelbonussp: number
        ancestryhp: number
        classhp: number
        bonusLimitBulk: number
        bonusEncumbranceBulk: number
        resolve: {
            value: number
        }
        perception: {
            rank: number
            ability: Ability
            item: number
            value: number
            breakdown: string
        }
        classDC: {
            rank: number
            ability: Ability
            item: number
            value: number
            breakdown: string
        }
        initiative: {
            circumstance: number
            status: number
            ability: string
        }
        init: {
            bonus: number
            value: number
        }
        speed: {
            value: string
            special: string
            otherSpeeds: { type: string, label: string, value: string, exceptions: string }[]
        }
    }
    details: {
        alignment: {
            value: string
        }
        biography: {
            value: string
            public: string
        }
        class: {
            value: string
        }
        ancestry: {
            value: string
        }
        heritage: {
            value: string
        }
        deity: {
            value: string
            image: string
        }
        level: {
            value: number
            min: number
        }
        keyability: {
            value: Ability
        }
    }
    skills: {
        acr: SkillData
        arc: SkillData
        ath: SkillData
        cra: SkillData
        dec: SkillData
        dip: SkillData
        itm: SkillData
        med: SkillData
        nat: SkillData
        occ: SkillData
        prf: SkillData
        rel: SkillData
        soc: SkillData
        ste: SkillData
        sur: SkillData
        thi: SkillData
    }
    martial: {
        unarmored: MartialData
        light: MartialData
        medium: MartialData
        heavy: MartialData
        simple: MartialData
        martial: MartialData
        advanced: MartialData
        unarmed: MartialData
    }
    statusEffects: { type: string, label: string, value: string, exceptions: string }[]
    schema: {
        version: {
            value: string
        }
    }
    traits: {
        size: {
            value: string
        }
        senses: any[]
        traits: {
            value: string[]
            custom: string
        }
        languages: {
            value: string[]
            selected: any[]
            custom: string
        }
        di: {
            value: string[]
            custom: string
        }
        dr: { type: string, label: string, value: string, exceptions: string }[]
        dv: { type: string, label: string, value: string, exceptions: string }[]
    }
    currency: {
        pp: { value: number }
        gp: { value: number }
        sp: { value: number }
        cp: { value: number }
    }
    spells: {
        spell0: {
            max: number
        }
        spell1: {
            max: number
        }
        spell2: {
            max: number
        }
        spell3: {
            max: number
        }
        spell4: {
            max: number
        }
        spell5: {
            max: number
        }
        spell6: {
            max: number
        }
        spell7: {
            max: number
        }
        spell8: {
            max: number
        }
        spell9: {
            max: number
        }
        spell10: {
            max: number
        }
        spell11: {
            max: number
        }
    }
    customModifiers?: Record<CustomModifierStat, CustomModifier[]>
    damageDice?: {}
}


export interface CharacterDetailsData {
    attributes: {
        dying: {
            value: number
            max: number
        }
        wounded: {
            value: number
            max: number
        }
        doomed: {
            value: number
            max: number
        }
        heroPoints: {
            rank: number
            max: number
        }
    }
    details: {
        background: {
            value: string
        }
        xp: {
            value: number
            min: number
            max: number
            pct: number
        }
        age: {
            value: string
        }
        height: {
            value: string
        }
        weight: {
            value: string
        }
        gender: {
            value: string
        }
        ethnicity: {
            value: string
        }
        nationality: {
            value: string
        }
    }
}


export interface NpcDetailsData {
    traits: {
        rarity: {
            value: string
        }
    }
    details: {
        source: {
            value: string
        }
        flavourText: string
        nethysUrl: string
        recallKnowledgeText: string
        sidebarText: string
        creatureType: string
    }
}
export interface HazardDetailsData {
    source: {
        value: string
    }
    flavourText: string
    nethysUrl: string
    recallKnowledgeText: string
    sidebarText: string
    creatureType: string
    saves: {
        fortitude: {
            rank: number
            saveDetail: string
        }
        reflex: {
            rank: number
            saveDetail: string
        }
        will: {
            rank: number
            saveDetail: string
        }
    }
    attributes: {
        hasHealth: true
        ac: {
            value: number
        }
        hp: {
            value: number
            max: number
            temp: number
            tempmax: number
            details: string
        }
        hardness: number
        stealth: {
            value: number
            details: string
        }
    }
    details: {
        isComplex: boolean
        level: number
        disable: string
        description: string
        reset: string
        routine: string
    }
    statusEffects: any[]
    schema: {
        version: {
            value: string
        }
    }
    traits: {
        traits: {
            value: any[]
            custom: string
        }
        di: {
            custom: string
            value: any[]
            selected: any
        }
        dr: any[]
        dv: any[]
        ci: any[]
    }
}

type CustomModifierStat =
    'all' |
    'str-based' | 'dex-based' | 'con-based' | 'int-based' | 'wis-based' | 'cha-based' |
    'attack' | 'str-attack' | 'dex-attack' | 'con-attack' | 'int-attack' | 'wis-attack' | 'cha-attack' |
    'fortitude' | 'reflex' | 'will' |
    'initiative' | 'perception' |
    'class' | 'ac' |
    'acrobatics' | 'arcana' | 'athletics' | 'crafting' |
    'deception' | 'diplomacy' | 'intimidate' | 'medicine' | 'nature' | 'occultism' |
    'perform' |'religion' | 'society' | 'stealth' | 'survival' | 'thievery'

export interface CustomModifier {
    name: string
    modifier: number
    type: string
    enabled: boolean
    source: string
    notes: string
    ignored: boolean
    deleted: boolean
    custom: boolean
    damageType: string
    predicate: any
}

export interface LootDetailsData {
    isShop: boolean
}

export interface ActorEntityData<T> extends BaseEntityData<T> {
    items: ItemData[]
    token: any
}

export interface CharacterData extends ActorEntityData<CharacterDetailsData & CommonActorData> {
    type: 'character'
}

export interface NpcData extends ActorEntityData<NpcDetailsData & CommonActorData> {
    type: 'npc'
}

export interface HazardData extends ActorEntityData<HazardDetailsData> {
    type: 'hazard'
}

export interface LootData extends ActorEntityData<LootDetailsData> {
    type: 'loot'
}

export type ActorData = CharacterData | NpcData | HazardData | LootData
