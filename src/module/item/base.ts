/**
 * Override and extend the basic :class:`Item` implementation
 */
import { Spell } from './spell';
import { getArmorBonus, getAttackBonus, getStrikingDice } from './runes';
import { addSign } from '../utils';
import {
    AbilityModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    StatisticModifier,
    ProficiencyModifier,
} from '../modifiers';
import { DicePF2e } from '../../scripts/dice';
import { ActorPF2e, TokenPF2e } from '../actor/base';
import { ItemData, ItemTraits, SpellcastingEntryData, TrickMagicItemCastData } from './data-definitions';
import { calculateTrickMagicItemCheckDC, canCastConsumable } from './spell-consumables';
import { TrickMagicItemPopup } from '@actor/sheet/trick-magic-item-popup';
import { AbilityString } from '@actor/data-definitions';
import { CheckPF2e } from '../system/rolls';
import { ConfigPF2e } from 'src/scripts/config';

interface ItemConstructorOptionsPF2e extends ItemConstructorOptions<ActorPF2e> {
    pf2e?: {
        ready?: boolean;
    };
}

/**
 * @category PF2
 */
export class ItemPF2e extends Item<ActorPF2e> {
    data!: ItemData;
    _data!: ItemData;

    constructor(data: ItemData, options: ItemConstructorOptionsPF2e = {}) {
        if (options.pf2e?.ready) {
            delete options.pf2e.ready;
            super(data, options);
        } else {
            try {
                const ready = { pf2e: { ready: true } };
                return new CONFIG.PF2E.Item.entityClasses[data.type](data, { ...ready, ...options });
            } catch (_error) {
                super(data, options); // eslint-disable-line constructor-super
                console.warn(`Unrecognized Item type (${data.type}): falling back to PF2EItem`);
            }
        }
    }

    /** The default sheet, token, etc. image of a newly created world item */
    static get defaultImg() {
        const [typeName] = Object.entries(CONFIG.PF2E.Item.entityClasses).find(([_key, cls]) => cls.name === this.name);
        return `systems/pf2e/icons/default-icons/${typeName}.svg`;
    }

    /** The sluggified name of the item **/
    get slug(): string {
        return this.data.data.slug;
    }

    /** @override */
    prepareData(): void {
        // Remove any empty-string traits that somehow got snuck their way in
        this._data.data.traits.value = this._data.data.traits.value.filter((trait) => !!trait);
        super.prepareData();
    }

    /**
     * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
     */
    async roll(event?: JQuery.TriggeredEvent): Promise<ChatMessage> {
        // Basic template rendering data
        const template = `systems/pf2e/templates/chat/${this.data.type}-card.html`;
        const { token } = this.actor;
        const nearestItem = event ? event.currentTarget.closest('.item') : {};
        const contextualData = nearestItem.dataset || {};
        const templateData = {
            actor: this.actor,
            tokenId: token ? `${token.scene._id}.${token.id}` : null,
            item: this.data,
            data: this.getChatData(undefined, contextualData),
        };

        // Basic chat message data
        const chatData: any = {
            user: game.user._id,
            speaker: {
                actor: this.actor._id,
                token: this.actor.token,
                alias: this.actor.name,
            },
            flags: {
                core: {
                    canPopout: true,
                },
            },
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        };

        // Toggle default roll mode
        const rollMode = game.settings.get('core', 'rollMode');
        if (['gmroll', 'blindroll'].includes(rollMode))
            chatData.whisper = ChatMessage.getWhisperRecipients('GM').map((u) => u._id);
        if (rollMode === 'blindroll') chatData.blind = true;

        // Render the template
        chatData.content = await renderTemplate(template, templateData);

        // Create the chat message
        return ChatMessage.create(chatData, { displaySheet: false });
    }

    /* -------------------------------------------- */
    /*  Chat Card Data
  /* -------------------------------------------- */

    getChatData(htmlOptions?, rollOptions?: any) {
        const itemType = this.data.type;
        const data = this[`_${itemType}ChatData`](rollOptions);
        if (data) {
            data.description.value = TextEditor.enrichHTML(data.description.value, htmlOptions);
        }
        return data;
    }

    getSpellInfo() {
        return this._spellChatData();
    }

    /* -------------------------------------------- */

    _armorChatData() {
        const localize = game.i18n.localize.bind(game.i18n);
        const data: any = duplicate(this.data.data);
        const properties = [
            CONFIG.PF2E.armorTypes[data.armorType.value],
            CONFIG.PF2E.armorGroups[data.group.value],
            `${addSign(getArmorBonus(data))} ${localize('PF2E.ArmorArmorLabel')}`,
            `${data.dex.value || 0} ${localize('PF2E.ArmorDexLabel')}`,
            `${data.check.value || 0} ${localize('PF2E.ArmorCheckLabel')}`,
            `${data.speed.value || 0} ${localize('PF2E.ArmorSpeedLabel')}`,
            ...data.traits.value,
            data.equipped.value ? localize('PF2E.ArmorEquippedLabel') : null,
        ];
        data.properties = properties.filter((property) => property);

        data.traits = null;
        return data;
    }

    /* -------------------------------------------- */

    _equipmentChatData() {
        const data: any = duplicate(this.data.data);
        const properties = [data.equipped.value ? game.i18n.localize('PF2E.EquipmentEquippedLabel') : null];
        data.properties = properties.filter((p) => p !== null);
        return data;
    }

    /* -------------------------------------------- */

    _weaponChatData() {
        const data: any = duplicate(this.data.data);
        const actorData = this.actor.data;
        const twohandedRegex = '(\\btwo-hand\\b)-(d\\d+)';
        const twohandedTrait = data.traits.value.find((trait: string) => trait.match(twohandedRegex)) !== undefined;
        data.traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.weaponTraits);

        if (this.data.type !== 'weapon') {
            throw new Error('tried to create a weapon chat data for a non-weapon item');
        }

        // calculate attackRoll modifier (for _onItemSummary)
        const isFinesse = data.traits.includes('finesse');
        const abl =
            isFinesse && actorData.data.abilities.dex.mod > actorData.data.abilities.str.mod
                ? 'dex'
                : data.ability.value || 'str';

        const prof = data.weaponType.value || 'simple';
        // if a default martial proficiency then lookup the martial value, else find the martialSkill item and get the value from there.
        const proficiency = {
            type: 'default',
            value: 0,
        };
        if (Object.keys(CONFIG.PF2E.weaponTypes).includes(prof)) {
            proficiency.type = 'martial';
            proficiency.value = (actorData.data as any).martial?.[prof]?.value || 0;
        } else {
            try {
                const martialSkill = this.actor.getOwnedItem(prof);
                if (martialSkill.data.type === 'martial') {
                    proficiency.type = 'skill';
                    const rank = martialSkill.data.data.proficient?.value || 0;
                    proficiency.value = ProficiencyModifier.fromLevelAndRank(
                        this.actor.data.data.details.level.value,
                        rank,
                    ).modifier;
                }
            } catch (err) {
                console.log(`PF2E | Could not find martial skill for ${prof}`);
            }
        }
        data.proficiency = proficiency;
        data.attackRoll = getAttackBonus(data) + (actorData.data.abilities?.[abl]?.mod ?? 0) + proficiency.value;

        const properties = [
            // (parseInt(data.range.value) > 0) ? `${data.range.value} feet` : null,
            // CONFIG.PF2E.weaponTypes[data.weaponType.value],
            // CONFIG.PF2E.weaponGroups[data.group.value]
        ];

        if (data.group.value) {
            data.critSpecialization = {
                label: CONFIG.PF2E.weaponGroups[data.group.value],
                description: CONFIG.PF2E.weaponDescriptions[data.group.value],
            };
        }

        data.isTwohanded = !!twohandedTrait;
        data.wieldedTwoHands = !!data.hands.value;
        data.isFinesse = isFinesse;
        data.properties = properties.filter((p) => !!p);

        const map = this.calculateMap();
        data.map2 = map.map2;
        data.map3 = map.map3;
        return data;
    }

    /* -------------------------------------------- */

    _meleeChatData() {
        const data: any = duplicate(this.data.data);
        data.traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.weaponTraits);

        const isAgile = data.traits.includes('agile');
        data.map2 = isAgile ? '-4' : '-5';
        data.map3 = isAgile ? '-8' : '-10';

        return data;
    }

    /* -------------------------------------------- */

    _consumableChatData() {
        const localize = game.i18n.localize.bind(game.i18n);
        const data: any = duplicate(this.data.data);
        data.consumableType.str = CONFIG.PF2E.consumableTypes[data.consumableType.value];
        data.properties = [
            data.consumableType.str,
            `${data.charges.value}/${data.charges.max} ${localize('PF2E.ConsumableChargesLabel')}`,
        ];
        data.hasCharges = data.charges.value >= 0;
        return data;
    }

    _treasureChatData() {
        const data: any = duplicate(this.data.data);
        return data;
    }

    /* -------------------------------------------- */

    _toolChatData() {
        const data: any = duplicate(this.data.data);
        const abl = this.actor.data.data.abilities[data.ability.value].label;
        const prof = data.proficient?.value || 0;
        const properties = [abl, CONFIG.PF2E.proficiencyLevels[prof]];
        data.properties = properties.filter((p) => p !== null);
        return data;
    }

    /* -------------------------------------------- */

    _loreChatData() {
        const data: any = duplicate(this.data.data);
        if (this.actor.data.type !== 'npc') {
            const abl = this.actor.data.data.abilities[data.ability.value].label;
            const prof = data.proficient.value || 0;
            const properties = [abl, CONFIG.PF2E.proficiencyLevels[prof]];
            data.properties = properties.filter((p) => p !== null);
        }
        return data;
    }

    /* -------------------------------------------- */

    static traitChatData(
        itemTraits: ItemTraits,
        traitList: Record<string, string>,
    ): { label: string; description: string }[] {
        let traits = itemTraits.value;
        const customTraits = itemTraits.custom ? itemTraits.custom.trim().split(/\s*[,;|]\s*/) : [];

        if (customTraits.length > 0) {
            traits = traits.concat(customTraits);
        }

        const traitChatLabels = traits.map((trait) => {
            const label = traitList[trait] || trait.charAt(0).toUpperCase() + trait.slice(1);
            return {
                label,
                description:
                    CONFIG.PF2E.traitsDescriptions[trait as keyof ConfigPF2e['PF2E']['traitsDescriptions']] ?? '',
            };
        });

        return traitChatLabels;
    }

    /* -------------------------------------------- */

    _backpackChatData() {
        const data: any = duplicate(this.data.data);
        data.properties = [];
        return data;
    }

    /* -------------------------------------------- */

    _spellChatData(rollOptions?: any) {
        const localize: Localization['localize'] = game.i18n.localize.bind(game.i18n);
        if (this.data.type != 'spell')
            throw new Error("Tried to create spell chat data from an item that wasn't a spell");
        const data = duplicate(this.data.data);

        const spellcastingEntry =
            this.actor?.data?.items?.find((item) => item._id === data.location.value) ??
            this.actor?.getOwnedItem(data.location.value)?.data;

        if (!spellcastingEntry || spellcastingEntry.type !== 'spellcastingEntry') return {};

        const spellDC = spellcastingEntry.data.dc?.value ?? spellcastingEntry.data.spelldc.dc;
        const spellAttack = spellcastingEntry.data.attack?.value ?? spellcastingEntry.data.spelldc.value;

        // Spell saving throw text and DC
        data.isSave = data.spellType.value === 'save' || data.save.value !== '';

        if (data.isSave) {
            data.save.dc = spellDC;
        } else data.save.dc = spellAttack;
        data.save.str = data.save.value ? CONFIG.PF2E.saves[data.save.value.toLowerCase()] : '';

        // Spell attack labels
        data.damageLabel =
            data.spellType.value === 'heal' ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');
        data.isAttack = data.spellType.value === 'attack';

        // Combine properties
        const props: (number | string)[] = [
            CONFIG.PF2E.spellLevels[data.level.value],
            `${localize('PF2E.SpellComponentsLabel')}: ${data.components.value}`,
            data.range.value ? `${localize('PF2E.SpellRangeLabel')}: ${data.range.value}` : null,
            data.target.value ? `${localize('PF2E.SpellTargetLabel')}: ${data.target.value}` : null,
            data.area.value
                ? `${localize('PF2E.SpellAreaLabel')}: ${CONFIG.PF2E.areaSizes[data.area.value]} ${
                      CONFIG.PF2E.areaTypes[data.area.areaType]
                  }`
                : null,
            data.areasize?.value ? `${localize('PF2E.SpellAreaLabel')}: ${data.areasize.value}` : null,
            data.time.value ? `${localize('PF2E.SpellTimeLabel')}: ${data.time.value}` : null,
            data.duration.value ? `${localize('PF2E.SpellDurationLabel')}: ${data.duration.value}` : null,
        ];
        data.spellLvl = (rollOptions || {}).spellLvl ?? data.heightenedLevel?.value;
        if (data.level.value < parseInt(data.spellLvl, 10)) {
            props.push(`Heightened: +${parseInt(data.spellLvl, 10) - data.level.value}`);
        }
        data.properties = props.filter((p) => p !== null);
        data.traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.spellTraits) as any;

        return data;
    }

    /* -------------------------------------------- */

    /**
     * Prepare chat card data for items of the "Feat" type
     */
    _featChatData() {
        const data: any = duplicate(this.data.data);

        // Feat properties
        const props = [
            `Level ${data.level.value || 0}`,
            data.actionType.value ? CONFIG.PF2E.actionTypes[data.actionType.value] : null,
        ];

        data.properties = props.filter((p) => p);
        data.traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.featTraits);

        return data;
    }

    _actionChatData() {
        const data: any = duplicate(this.data.data);

        let associatedWeapon: ItemPF2e | null = null;
        if (data.weapon.value) associatedWeapon = this.actor.getOwnedItem(data.weapon.value);

        // Feat properties
        const props = [CONFIG.PF2E.actionTypes[data.actionType.value], associatedWeapon ? associatedWeapon.name : null];

        data.properties = props.filter((p) => p);
        data.traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.featTraits);

        return data;
    }

    _conditionChatData() {
        const data: any = duplicate(this.data.data);
        data.properties = [];
        return data;
    }

    _effectChatData() {
        const data: any = duplicate(this.data.data);
        data.properties = [];
        return data;
    }

    /* -------------------------------------------- */
    /*  Roll Attacks
  /* -------------------------------------------- */

    /**
     * Roll a Weapon Attack
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollWeaponAttack(event?: JQuery.TriggeredEvent, multiAttackPenalty?: number) {
        if (this.type === 'action') {
            throw new Error('Wrong item type!');
        }
        if (this.type !== 'weapon' && this.type !== 'melee') throw new Error('Wrong item type!');

        // Prepare roll data
        // let itemData = this.data.data,
        const itemData = this.getChatData();
        const rollData = duplicate(this.actor.data.data) as any;
        const isFinesse = itemData.isFinesse;
        const abl =
            isFinesse && rollData.abilities.dex.mod > rollData.abilities.str.mod
                ? 'dex'
                : itemData.ability.value || 'str';
        const prof = itemData.weaponType.value || 'simple';
        let parts = ['@itemBonus', `@abilities.${abl}.mod`];

        const title = `${this.name} - Attack Roll${multiAttackPenalty ?? 1 > 1 ? ` (MAP ${multiAttackPenalty})` : ''}`;

        if (this.actor.data.type === 'npc') {
            parts = ['@itemBonus'];
        } else if (itemData.proficiency && itemData.proficiency.type === 'skill') {
            parts.push(itemData.proficiency.value);
        } else {
            parts.push(`@martial.${prof}.value`);
        }

        rollData.item = itemData;
        rollData.itemBonus = getAttackBonus(itemData);
        // if ( !itemData.proficient.value ) parts.pop();

        if (multiAttackPenalty === 2) parts.push(itemData.map2);
        else if (multiAttackPenalty === 3) parts.push(itemData.map3);

        // TODO: Incorporate Elven Accuracy

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            actor: this.actor,
            data: rollData,
            rollType: 'attack-roll',
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event && event.clientY ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    /* -------------------------------------------- */

    /**
     * Roll Weapon Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollWeaponDamage(event: JQuery.TriggeredEvent, critical = false) {
        const localize: Function = game.i18n.localize.bind(game.i18n);

        const item: ItemData = this.data;
        // Check to see if this is a damage roll for either: a weapon, a NPC attack or an action associated with a weapon.
        if (item.type !== 'weapon') throw new Error('Wrong item type!');
        const itemData = item.data;

        // Get item and actor data and format it for the damage roll
        const rollData = duplicate(this.actor.data.data) as any;
        let rollDie = itemData.damage.die;
        const abl = 'str';
        let abilityMod: number = rollData.abilities[abl].mod;
        let parts: (string | number)[] = [];
        const partsCritOnly: string[] = [];
        const dtype: string = CONFIG.PF2E.damageTypes[itemData.damage.damageType];

        // Get detailed trait information from item
        const traits = itemData.traits.value;
        let critTrait = '';
        let critDie = '';
        let bonusDamage = 0;
        let twohandedTrait = false;
        let twohandedDie = '';
        let thrownTrait = false;
        const critRegex = /\b(deadly|fatal)-(d\d+)/;
        const twohandedRegex = /\b(two-hand)-(d\d+)/;
        const thrownRegex = /\b(thrown)-(\d+)/;
        const hasThiefRacket =
            this.actor.data.items.filter((e) => e.type === 'feat' && e.name === 'Thief Racket').length > 0;
        const strikingDice = getStrikingDice(itemData);

        if (hasThiefRacket && rollData.abilities.dex.mod > abilityMod) abilityMod = rollData.abilities.dex.mod;

        // Find detailed trait information
        for (const trait of traits) {
            const critMatch = critRegex.exec(trait);
            const twoHandedMatch = twohandedRegex.exec(trait);
            const thrownMatch = thrownRegex.exec(trait);
            if (Array.isArray(critMatch) && typeof critMatch[1] === 'string' && typeof critMatch[2] === 'string') {
                critTrait = critMatch[1];
                critDie = critMatch[2];
            } else if (Array.isArray(twoHandedMatch) && typeof twoHandedMatch[2] === 'string') {
                twohandedTrait = true;
                twohandedDie = twoHandedMatch[2];
            } else if (Array.isArray(thrownMatch)) {
                thrownTrait = true;
            }
        }

        // If weapon has two-hand trait and wielded in two hands, apply the appropriate damage die
        if (twohandedTrait && itemData.hands.value) {
            rollDie = twohandedDie;
        }

        // Add bonus damage
        if (itemData.bonusDamage && itemData.bonusDamage.value) bonusDamage = parseInt(itemData.bonusDamage.value, 10);

        // Join the damage die into the parts to make a roll (this will be overwriten below if the damage is critical)
        const damageDice = itemData.damage.dice ?? 1;
        let weaponDamage = damageDice + strikingDice + rollDie;
        parts = [weaponDamage, '@itemBonus'];
        rollData.itemBonus = bonusDamage;

        // Apply critical damage and effects
        if (critTrait === 'deadly') {
            // Deadly adds 3 dice with major Striking, 2 dice with greater Striking
            // and 1 die otherwise
            const deadlyDice = strikingDice > 0 ? strikingDice : 1;
            const deadlyDamage = deadlyDice + critDie;
            partsCritOnly.push(deadlyDamage);
        } else if (critTrait === 'fatal') {
            if (critical === true) {
                weaponDamage = damageDice + strikingDice + critDie;
                parts = [weaponDamage, '@itemBonus'];
            }
            partsCritOnly.push(1 + critDie);
        }

        // Add abilityMod to the damage roll.
        if (itemData.range.value === 'melee' || itemData.range.value === 'reach' || itemData.range.value === '') {
            // if a melee attack
            parts.push(abilityMod);
        } else if (itemData.traits.value.includes('propulsive')) {
            if (Math.sign(this.actor.data.data.abilities.str.mod) === 1) {
                const halfStr = Math.floor(this.actor.data.data.abilities.str.mod / 2);
                parts.push(halfStr);
            }
        } else if (thrownTrait) {
            parts.push(abilityMod);
        }

        // Add property rune damage

        // add strike damage
        if (itemData.property1.dice && itemData.property1.die && itemData.property1.damageType) {
            const propertyDamage = Number(itemData.property1.dice) + itemData.property1.die;
            parts.push(propertyDamage);
        }
        // add critical damage
        if (itemData.property1.critDice && itemData.property1.critDie && itemData.property1.critDamageType) {
            const propertyDamage = Number(itemData.property1.critDice) + itemData.property1.critDie;
            partsCritOnly.push(propertyDamage);
        }

        // Set the title of the roll
        const critTitle = critTrait ? critTrait.toUpperCase() : '';
        let title = critical
            ? `${localize('PF2E.CriticalDamageLabel')} ${critTitle} ${localize('PF2E.DamageLabel')}: ${this.name}`
            : `${localize('PF2E.DamageLabel')}: ${this.name}`;
        if (dtype) title += ` (${dtype})`;

        // Call the roll helper utility
        rollData.item = itemData;
        DicePF2e.damageRoll({
            event,
            parts,
            partsCritOnly,
            critical,
            actor: this.actor ? this.actor : undefined,
            data: rollData,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor ? this.actor : undefined }),
            dialogOptions: {
                width: 400,
                top: event.clientY ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    /* -------------------------------------------- */

    /**
     * Roll a NPC Attack
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollNPCAttack(event, multiAttackPenalty?) {
        if (this.type !== 'melee') throw new Error('Wrong item type!');

        // Prepare roll data
        // let itemData = this.data.data,
        const itemData = this.getChatData();
        const rollData = duplicate(this.actor.data.data) as any;
        const parts = ['@itemBonus'];
        const title = `${this.name} - Attack Roll${multiAttackPenalty > 1 ? ` (MAP ${multiAttackPenalty})` : ''}`;

        rollData.item = itemData;
        // rollData.itemBonus = getAttackBonus(itemData); // @putt1 rolling this change back as getAttackBonus does not handle NPCs correctly - hooking
        rollData.itemBonus = itemData.bonus.value;

        if (multiAttackPenalty === 2) parts.push(itemData.map2);
        else if (multiAttackPenalty === 3) parts.push(itemData.map3);

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            actor: this.actor,
            data: rollData,
            rollType: 'attack-roll',
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    /**
     * Roll NPC Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollNPCDamage(event, critical = false) {
        const item: ItemData = this.data;
        if (item.type !== 'melee') throw new Error('Wrong item type!');

        // Get item and actor data and format it for the damage roll
        const itemData = item.data;
        const rollData = duplicate(this.actor.data.data) as any;
        let parts = [];
        const partsType = [];
        const dtype = []; // CONFIG.PF2E.damageTypes[itemData.damage.damageType];

        // If the NPC is using the updated NPC Attack data object
        if (itemData.damageRolls && typeof itemData.damageRolls === 'object') {
            Object.keys(itemData.damageRolls).forEach((key) => {
                if (itemData.damageRolls[key].damage) parts.push(itemData.damageRolls[key].damage);
                partsType.push(`${itemData.damageRolls[key].damage} ${itemData.damageRolls[key].damageType}`);
            });
        } else if (itemData.damageRolls && itemData.damageRolls.length) {
            // this can be removed once existing NPCs are migrated to use new damageRolls object (rather than an array)
            itemData.damageRolls.forEach((entry) => {
                parts.push(entry.damage);
                partsType.push(`${entry.damage} ${entry.damageType}`);
            });
        } else {
            parts = [(itemData as any).damage.die];
        }

        // Set the title of the roll
        let title = `${this.name}: ${partsType.join(', ')}`;
        if (dtype.length) title += ` (${dtype})`;

        // do nothing if no parts are provided in the damage roll
        if (parts.length === 0) {
            console.log('PF2e System | No damage parts provided in damage roll');
            parts = ['0'];
        }

        // Call the roll helper utility
        rollData.item = itemData;
        DicePF2e.damageRoll({
            event,
            parts,
            critical,
            actor: this.actor,
            data: rollData,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event.clientY - 80,
                left: window.innerWidth - 710,
            },
        });
    }

    /* -------------------------------------------- */

    /**
     * Roll Spell Damage
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollSpellcastingEntryCheck(event) {
        // Prepare roll data
        const itemData: ItemData = this.data;
        if (itemData.type !== 'spellcastingEntry') throw new Error('Wrong item type!');
        const rollData = duplicate(this.actor.data.data);
        const modifier = itemData.data.spelldc.value;
        const parts = [modifier];
        const title = `${this.name} - Spellcasting Check`;

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: rollData,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event.clientY - 80,
                left: window.innerWidth - 710,
            },
        });
    }

    /**
     * Roll Spell Damage
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollSpellAttack(event, multiAttackPenalty?) {
        let item: ItemData = this.data;
        if (item.type === 'consumable' && item.data.spell?.data) {
            item = item.data.spell.data;
        }
        if (item.type !== 'spell') throw new Error('Wrong item type!');
        if (!this.actor) throw new Error('Attempted to cast a spell without an actor');

        // Prepare roll data
        const trickMagicItemData = item.data.trickMagicItemData;
        const itemData = item.data;
        const rollData = duplicate(this.actor.data.data);
        const spellcastingEntry =
            (this.actor.data.items.find((item) => item._id === itemData.location.value) as SpellcastingEntryData) ??
            (this.actor.getOwnedItem(itemData.location.value)?.data as SpellcastingEntryData);
        let useTrickData = false;
        if (spellcastingEntry?.type !== 'spellcastingEntry') useTrickData = true;

        if (useTrickData && !trickMagicItemData)
            throw new Error('Spell points to location that is not a spellcasting type');

        // calculate multiple attack penalty
        const map = this.calculateMap();

        if (spellcastingEntry.data?.attack?.roll) {
            const options = this.actor.getRollOptions(['all', 'attack-roll', 'spell-attack-roll']);
            const modifiers: ModifierPF2e[] = [];
            if (multiAttackPenalty > 1) {
                modifiers.push(new ModifierPF2e(map.label, map[`map${multiAttackPenalty}`], 'untyped'));
            }
            spellcastingEntry.data.attack.roll({ event, options, modifiers });
        } else {
            const spellAttack = useTrickData
                ? trickMagicItemData?.data.spelldc.value
                : spellcastingEntry?.data.spelldc.value;
            const parts: number[] = [spellAttack ?? 0];
            const title = `${this.name} - Spell Attack Roll`;

            if (multiAttackPenalty > 1) {
                parts.push(map[`map${multiAttackPenalty}`]);
            }

            // Call the roll helper utility
            DicePF2e.d20Roll({
                event,
                parts,
                data: rollData,
                rollType: 'attack-roll',
                title,
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                dialogOptions: {
                    width: 400,
                    top: event.clientY - 80,
                    left: window.innerWidth - 710,
                },
            });
        }
    }

    /* -------------------------------------------- */

    /**
     * Roll Spell Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollSpellDamage(event) {
        let item: ItemData = this.data;
        if (item.type === 'consumable' && item.data.spell?.data) {
            item = item.data.spell.data;
        }
        if (item.type !== 'spell') throw new Error('Wrong item type!');

        const localize: Function = game.i18n.localize.bind(game.i18n);

        const button = event.currentTarget;
        const card = button.closest('*[data-spell-lvl]');
        const cardData = card ? card.dataset : {};

        // Get data
        const itemData = item.data;
        const rollData = duplicate(this.actor.data.data) as any;
        const isHeal = itemData.spellType.value === 'heal';
        const dtype = CONFIG.PF2E.damageTypes[itemData.damageType.value];

        const spellLvl = parseInt(cardData.spellLvl, 10);
        const spell = new Spell(item, { castingActor: this.actor, castLevel: spellLvl });
        const parts = spell.damageParts;

        // Append damage type to title
        const damageLabel: string = isHeal ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');
        let title = `${this.name} - ${damageLabel}`;
        if (dtype && !isHeal) title += ` (${dtype})`;

        // Add item to roll data
        if (!spell.spellcastingEntry.data && spell.data.data.trickMagicItemData) {
            rollData.mod = rollData.abilities[spell.data.data.trickMagicItemData.ability].mod;
        } else {
            rollData.mod = rollData.abilities[spell.spellcastingEntry.ability].mod;
        }
        rollData.item = itemData;

        // Call the roll helper utility
        DicePF2e.damageRoll({
            event,
            parts,
            data: rollData,
            actor: this.actor,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event.clientY - 80,
                left: window.innerWidth - 710,
            },
        });
    }

    /**
     * Roll Counteract check
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollCounteract(event) {
        let item: ItemData = this.data;
        if (item.type === 'consumable' && item.data.spell?.data) {
            item = item.data.spell.data;
        }
        if (item.type !== 'spell') throw new Error('Wrong item type!');

        const itemData = item.data;
        const spellcastingEntry = this.actor?.getOwnedItem(itemData.location.value);
        if (!spellcastingEntry || spellcastingEntry.data.type !== 'spellcastingEntry')
            throw new Error('Spell points to location that is not a spellcasting type');

        const modifiers: ModifierPF2e[] = [];
        const ability: AbilityString = item.data.ability?.value || 'int';
        const score = this.actor.data.data.abilities[ability]?.value ?? 0;
        modifiers.push(AbilityModifier.fromAbilityScore(ability, score));

        const proficiencyRank = spellcastingEntry.data.data.proficiency.value ?? 0;
        modifiers.push(ProficiencyModifier.fromLevelAndRank(this.actor.data.data.details.level.value, proficiencyRank));

        const rollOptions = ['all', 'counteract-check'];
        const extraOptions = [];
        const traits = item.data.traits.value;

        let flavor = '<hr/>';
        flavor += `<h3>${game.i18n.localize('PF2E.Counteract')}</h3>`;
        flavor += `<hr/>`;

        const addFlavor = (success: string, level: number) => {
            const title = game.i18n.localize(`PF2E.${success}`);
            const desc = game.i18n.format(`PF2E.CounteractDescription.${success}`, {
                level: level,
            });
            flavor += `<b>${title}</b> ${desc}<br>`;
        };
        flavor += `<p>${game.i18n.localize('PF2E.CounteractDescription.Hint')}</p>`;
        flavor += '<p>';
        addFlavor('CritSuccess', itemData.level.value + 3);
        addFlavor('Success', itemData.level.value + 1);
        addFlavor('Failure', itemData.level.value);
        addFlavor('CritFailure', 0);
        flavor += '</p>';
        const check = new StatisticModifier(flavor, modifiers);
        const finalOptions = this.actor.getRollOptions(rollOptions).concat(extraOptions).concat(traits);
        ensureProficiencyOption(finalOptions, proficiencyRank);
        CheckPF2e.roll(
            check,
            {
                actor: this.actor,
                type: 'counteract-check',
                options: finalOptions,
                traits,
            },
            event,
        );
    }

    /* -------------------------------------------- */

    /**
     * Use a consumable item
     */
    async rollConsumable(ev) {
        const item: ItemData = this.data;
        if (item.type !== 'consumable') throw Error('Tried to roll consumable on a non-consumable');
        if (!this.actor) throw Error('Tried to roll a consumable that has no actor');

        const itemData = item.data;
        // Submit the roll to chat
        if (
            ['scroll', 'wand'].includes(item.data.consumableType.value) &&
            item.data.spell?.data &&
            this.actor instanceof ActorPF2e
        ) {
            if (canCastConsumable(this.actor, item)) {
                this._castEmbeddedSpell();
            } else {
                const DC = calculateTrickMagicItemCheckDC(item);
                const popup = new TrickMagicItemPopup(this.actor, DC);
                popup.render(true);
                const trickMagicItemData = await popup.result;
                if (trickMagicItemData) this._castEmbeddedSpell(trickMagicItemData);
                else return;
            }
        } else {
            const cv = itemData.consume.value;
            const content = `Uses ${this.name}`;
            if (cv) {
                new Roll(cv).toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: content,
                });
            } else {
                ChatMessage.create({
                    user: game.user._id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    content,
                });
            }
        }

        // Deduct consumed charges from the item
        if (itemData.autoUse.value) this.consume();
    }

    consume() {
        const item: ItemData = this.data;
        if (item.type !== 'consumable') throw Error('Tried to consume non-consumable');

        const itemData = item.data;
        const qty = itemData.quantity;
        const chg = itemData.charges;

        if (!this.actor) return;

        // Optionally destroy the item
        if (chg.value <= 1 && qty.value <= 1 && itemData.autoDestroy.value) {
            this.actor.deleteEmbeddedEntity('OwnedItem', this.data._id);
        }
        // Deduct one from quantity
        else if (chg.value <= 1) {
            const options = {
                _id: this.data._id,
                'data.quantity.value': Math.max(qty.value - 1, 0),
                'data.charges.value': chg.max,
            };
            this.actor.updateEmbeddedEntity('OwnedItem', options);
        }
        // Deduct one charge
        else {
            this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: this.data._id,
                'data.charges.value': Math.max(chg.value - 1, 0),
            });
        }
    }

    protected async _castEmbeddedSpell(trickMagicItemData?: TrickMagicItemCastData) {
        if (this.data.type !== 'consumable' || !this.actor) return;
        if (!(this.data.data.spell?.data && this.data.data.spell?.heightenedLevel)) return;
        const actor = this.actor;
        const spellData = this.data.data.spell.data.data;
        let spellcastingEntries: SpellcastingEntryData[] | TrickMagicItemCastData[] = actor.data.items.filter(
            (i) => i.type === 'spellcastingEntry',
        ) as SpellcastingEntryData[];
        // Filter to only spellcasting entries that are eligible to cast this consumable
        spellcastingEntries = spellcastingEntries
            .filter((i) => ['prepared', 'spontaneous'].includes(i.data.prepared.value))
            .filter((i) => spellData.traditions.value.includes(i.data.tradition.value));
        if (spellcastingEntries.length === 0 && trickMagicItemData) spellcastingEntries = [trickMagicItemData];
        if (spellcastingEntries.length > 0) {
            const localize: Localization['localize'] = game.i18n.localize.bind(game.i18n);
            let maxBonus = 0;
            let bestEntry = 0;
            for (let i = 0; i < spellcastingEntries.length; i++) {
                if (spellcastingEntries[i].data.spelldc.value > maxBonus) {
                    maxBonus = spellcastingEntries[i].data.spelldc.value;
                    bestEntry = i;
                }
            }
            this.data.data.spell.data.data.trickMagicItemData = trickMagicItemData;
            this.data.data.spell.data.data.location.value = spellcastingEntries[bestEntry]._id;
            spellData.isSave = spellData.spellType.value === 'save' || spellData.save.value !== '';
            if (spellData.isSave) {
                spellData.save.dc = spellcastingEntries[bestEntry].data.spelldc.dc;
            } else spellData.save.dc = spellcastingEntries[bestEntry].data.spelldc.value;
            spellData.save.str = spellData.save.value ? CONFIG.PF2E.saves[spellData.save.value.toLowerCase()] : '';
            spellData.damageLabel =
                spellData.spellType.value === 'heal' ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');
            spellData.isAttack = spellData.spellType.value === 'attack';

            const props: (number | string)[] = [
                CONFIG.PF2E.spellLevels[spellData.level.value],
                `${localize('PF2E.SpellComponentsLabel')}: ${spellData.components.value}`,
                spellData.range.value ? `${localize('PF2E.SpellRangeLabel')}: ${spellData.range.value}` : null,
                spellData.target.value ? `${localize('PF2E.SpellTargetLabel')}: ${spellData.target.value}` : null,
                spellData.area.value
                    ? `${localize('PF2E.SpellAreaLabel')}: ${CONFIG.PF2E.areaSizes[spellData.area.value]} ${
                          CONFIG.PF2E.areaTypes[spellData.area.areaType]
                      }`
                    : null,
                spellData.areasize?.value ? `${localize('PF2E.SpellAreaLabel')}: ${spellData.areasize.value}` : null,
                spellData.time.value ? `${localize('PF2E.SpellTimeLabel')}: ${spellData.time.value}` : null,
                spellData.duration.value ? `${localize('PF2E.SpellDurationLabel')}: ${spellData.duration.value}` : null,
            ];
            spellData.spellLvl = this.data.data.spell.heightenedLevel.toString();
            if (spellData.level.value < parseInt(spellData.spellLvl, 10)) {
                props.push(`Heightened: +${parseInt(spellData.spellLvl, 10) - spellData.level.value}`);
            }
            spellData.properties = props.filter((p) => p !== null);
            spellData.traits = ItemPF2e.traitChatData(spellData.traits, CONFIG.PF2E.spellTraits) as any;

            spellData.item = JSON.stringify(this.data);

            const template = `systems/pf2e/templates/chat/spell-card.html`;
            const { token } = actor;
            const templateData = {
                actor: actor,
                tokenId: token ? `${token.scene._id}.${token.id}` : null,
                item: this,
                data: spellData,
            };

            // Basic chat message data
            const chatData: any = {
                user: game.user._id,
                speaker: {
                    actor: actor._id,
                    token: actor.token,
                    alias: actor.name,
                },
                flags: {
                    core: {
                        canPopout: true,
                    },
                },
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            };

            // Toggle default roll mode
            const rollMode = game.settings.get('core', 'rollMode');
            if (['gmroll', 'blindroll'].includes(rollMode))
                chatData.whisper = ChatMessage.getWhisperRecipients('GM').map((u) => u._id);
            if (rollMode === 'blindroll') chatData.blind = true;

            // Render the template
            chatData.content = await renderTemplate(template, templateData);

            // Create the chat message
            return ChatMessage.create(chatData, { displaySheet: false });
        }
    }

    calculateMap(): { label: string; map2: number; map3: number } {
        return ItemPF2e.calculateMap(this.data);
    }

    static calculateMap(item: ItemData): { label: string; map2: number; map3: number } {
        if (['melee', 'weapon'].includes(item.type)) {
            // calculate multiple attack penalty tiers
            const agile = item.data.traits.value.includes('agile');
            const alternateMAP = ((item.data as any).MAP || {}).value;
            switch (alternateMAP) {
                case '1':
                    return { label: 'PF2E.MultipleAttackPenalty', map2: -1, map3: -2 };
                case '2':
                    return { label: 'PF2E.MultipleAttackPenalty', map2: -2, map3: -4 };
                case '3':
                    return { label: 'PF2E.MultipleAttackPenalty', map2: -3, map3: -6 };
                case '4':
                    return { label: 'PF2E.MultipleAttackPenalty', map2: -4, map3: -8 };
                case '5':
                    return { label: 'PF2E.MultipleAttackPenalty', map2: -5, map3: -10 };
                default: {
                    if (agile) return { label: 'PF2E.MultipleAttackPenalty', map2: -4, map3: -8 };
                    else return { label: 'PF2E.MultipleAttackPenalty', map2: -5, map3: -10 };
                }
            }
        }
        return { label: 'PF2E.MultipleAttackPenalty', map2: -5, map3: -10 };
    }

    /* -------------------------------------------- */

    /* -------------------------------------------- */

    static chatListeners(html) {
        // Chat card actions
        html.on('click', '.card-buttons button', (ev) => {
            ev.preventDefault();

            // Extract card data
            const button = $(ev.currentTarget);
            const messageId = button.parents('.message').attr('data-message-id');
            const senderId = game.messages.get(messageId).user._id;
            const card = button.parents('.chat-card');
            const action = button.attr('data-action');

            // Confirm roll permission
            if (!game.user.isGM && game.user._id !== senderId && action !== 'save') return;

            // Get the Actor from a synthetic Token
            let actor: ActorPF2e | null;
            const tokenKey = card.attr('data-token-id');
            if (tokenKey) {
                const [sceneId, tokenId] = tokenKey.split('.');
                let token: TokenPF2e | undefined;
                if (sceneId === canvas.scene?._id) token = canvas.tokens.get(tokenId);
                else {
                    const scene = game.scenes.get(sceneId);
                    if (!scene) return;
                    const tokenData = scene.data.tokens.find((t) => t._id === tokenId);
                    if (tokenData) token = new Token(tokenData);
                }
                if (!token) return;
                actor = ActorPF2e.fromToken(token);
            } else actor = game.actors.get(card.attr('data-actor-id'));

            // Get the Item
            if (!actor) return;
            const itemId = card.attr('data-item-id') ?? '';
            let item: ItemPF2e | null = null;
            let itemData: ItemData | undefined = undefined;
            const embeddedItem = $(ev.target).parents('.item-card').attr('data-embedded-item');
            if (embeddedItem) {
                itemData = JSON.parse(embeddedItem) as ItemData | undefined;
                if (itemData) {
                    item = actor.items.get(itemData._id);
                }
            } else {
                item = actor.getOwnedItem(itemId);
                itemData = item?.data;
            }
            if (item && itemData) {
                const strike: StatisticModifier = actor.data.data?.actions?.find(
                    (a: StatisticModifier) => a.item === itemId,
                );
                const rollOptions = (actor as ActorPF2e)?.getRollOptions(['all', 'attack-roll']);

                if (action === 'weaponAttack') {
                    if (strike && rollOptions) {
                        strike.variants[0].roll({ event: ev, options: rollOptions });
                    } else {
                        item.rollWeaponAttack(ev);
                    }
                } else if (action === 'weaponAttack2') {
                    if (strike && rollOptions) {
                        strike.variants[1].roll({ event: ev, options: rollOptions });
                    } else {
                        item.rollWeaponAttack(ev, 2);
                    }
                } else if (action === 'weaponAttack3') {
                    if (strike && rollOptions) {
                        strike.variants[2].roll({ event: ev, options: rollOptions });
                    } else {
                        item.rollWeaponAttack(ev, 3);
                    }
                } else if (action === 'weaponDamage') {
                    if (strike && rollOptions) {
                        strike.damage({ event: ev, options: rollOptions });
                    } else {
                        item.rollWeaponDamage(ev);
                    }
                } else if (action === 'weaponDamageCritical' || action === 'criticalDamage') {
                    if (strike && rollOptions) {
                        strike.critical({ event: ev, options: rollOptions });
                    } else {
                        item.rollWeaponDamage(ev, true);
                    }
                } else if (action === 'npcAttack') item.rollNPCAttack(ev);
                else if (action === 'npcAttack2') item.rollNPCAttack(ev, 2);
                else if (action === 'npcAttack3') item.rollNPCAttack(ev, 3);
                else if (action === 'npcDamage') item.rollNPCDamage(ev);
                else if (action === 'npcDamageCritical') item.rollNPCDamage(ev, true);
                // Spell actions
                else if (action === 'spellAttack') item.rollSpellAttack(ev);
                else if (action === 'spellAttack2') item.rollSpellAttack(ev, 2);
                else if (action === 'spellAttack3') item.rollSpellAttack(ev, 3);
                else if (action === 'spellDamage') item.rollSpellDamage(ev);
                else if (action === 'spellCounteract') item.rollCounteract(ev);
                // Consumable usage
                else if (action === 'consume') item.rollConsumable(ev);
                else if (action === 'save') ActorPF2e.rollSave(ev, item);
            } else {
                const strikeIndex = card.attr('data-strike-index');
                const strikeName = card.attr('data-strike-name');
                const strikeAction = actor.data.data.actions[Number(strikeIndex)];

                if (strikeAction && strikeAction.name === strikeName) {
                    const options = (actor as ActorPF2e).getRollOptions(['all', 'attack-roll']);
                    if (action === 'strikeAttack') strikeAction.variants[0].roll({ event: ev, options });
                    else if (action === 'strikeAttack2') strikeAction.variants[1].roll({ event: ev, options });
                    else if (action === 'strikeAttack3') strikeAction.variants[2].roll({ event: ev, options });
                    else if (action === 'strikeDamage') strikeAction.damage({ event: ev, options });
                    else if (action === 'strikeCritical') strikeAction.critical({ event: ev, options });
                }
            }
        });
    }
}