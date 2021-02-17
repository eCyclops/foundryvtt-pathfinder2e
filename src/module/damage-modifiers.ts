import { Alignment, DamageImmunities, LabeledValue } from '@actor/actorDataDefinitions';
import { combineMaps, groupBy, max, sum, toNumber } from './utils';
import { isChaotic, isEvil, isGood, isLawful } from './alignment';

export type Alive = 'living' | 'undead' | 'neither';

export type DamageType =
    | 'acid'
    | 'bludgeoning'
    | 'cold'
    | 'fire'
    | 'force'
    | 'electricity'
    | 'sonic'
    | 'negative'
    | 'piercing'
    | 'poison'
    | 'positive'
    | 'bleed'
    | 'mental'
    | 'precision'
    | 'slashing'
    | 'chaotic'
    | 'lawful'
    | 'good'
    | 'evil'
    | 'untyped'; // overwritten by critical damage weaknesses if present

const allDamageTypes = new Set<string>();
allDamageTypes.add('acid');
allDamageTypes.add('bludgeoning');
allDamageTypes.add('cold');
allDamageTypes.add('fire');
allDamageTypes.add('force');
allDamageTypes.add('electricity');
allDamageTypes.add('sonic');
allDamageTypes.add('negative');
allDamageTypes.add('piercing');
allDamageTypes.add('poison');
allDamageTypes.add('positive');
allDamageTypes.add('bleed');
allDamageTypes.add('mental');
allDamageTypes.add('precision');
allDamageTypes.add('slashing');
allDamageTypes.add('chaotic');
allDamageTypes.add('lawful');
allDamageTypes.add('good');
allDamageTypes.add('evil');

export function isDamageType(value: string): value is DamageType {
    return allDamageTypes.has(value);
}

export function isPhysicalDamageType(value: string): boolean {
    return value === 'piercing' || value === 'bludgeoning' || value === 'slashing';
}

const physicalDamage: DamageType[] = ['piercing', 'bludgeoning', 'slashing'];

export function getMainDamageType(damage: Damage): DamageType {
    return physicalDamage.filter((type) => damage.has(type))[0] ?? damage.keys()[0] ?? 'untyped';
}

export type DamageExceptions = Set<AttackTrait & DamageType>[];

interface HasDamageExceptions {
    except: DamageExceptions;
}

export interface Resistance extends HasDamageExceptions {
    damageType: string;
    value: number;
    doubleResistanceVsNonMagical: boolean;
}

export interface Weakness extends HasDamageExceptions {
    damageType: string;
    value: number;
}

export interface Immunity extends HasDamageExceptions {
    damageType: string;
}

export type AttackTrait =
    | 'nonlethal'
    | 'magical'
    | 'adamantine'
    | 'coldiron'
    | 'ghostTouch'
    | 'darkwood'
    | 'mithral'
    | 'silver'
    | 'orichalcum'
    | 'vorpal'
    | 'unarmed';

const allAttackTraits = new Set<string>();
allAttackTraits.add('nonlethal');
allAttackTraits.add('magical');
allAttackTraits.add('adamantine');
allAttackTraits.add('coldiron');
allAttackTraits.add('ghostTouch');
allAttackTraits.add('darkwood');
allAttackTraits.add('mithral');
allAttackTraits.add('silver');
allAttackTraits.add('orichalcum');
allAttackTraits.add('vorpal');
allAttackTraits.add('unarmed');
allAttackTraits.add('spell');

const physicalAttackTraits: AttackTrait[] = [
    'adamantine',
    'coldiron',
    'darkwood',
    'mithral',
    'silver',
    'orichalcum',
    'vorpal',
    'unarmed',
];

export function isAttackTrait(value: string): value is DamageType {
    return allAttackTraits.has(value);
}

export interface SplashDamage {
    type: DamageType;
    value: number;
}

export type Damage = Map<DamageType, number>;

function sumDamage(damage: Damage): number {
    return sum(Array.from(damage.values()));
}

function combineDamages(damages: Damage[]): Damage {
    return damages.reduce((previous, current) => {
        return combineMaps(previous, current, (a, b) => a + b);
    }, new Map());
}

/**
 * A single trait or damage combination can disable all resistance/weaknesses/immunities.
 *
 * @param except
 * @param attackTraits
 * @param damageTypes
 * @return true if the current exception applies
 */
function exceptionApplies(
    except: DamageExceptions,
    attackTraits: Set<AttackTrait>,
    damageTypes: Set<DamageType>,
): boolean {
    const combinedTraits = new Set(...attackTraits, ...damageTypes);
    return except.some((traitCombination) =>
        Array.from(traitCombination).every((trait) => {
            if (trait === 'non-magical') {
                return !combinedTraits.has('magical');
            } else {
                return combinedTraits.has(trait);
            }
        }),
    );
}

/**
 * This function is responsible for going through a list of possible modifiers, evaluating them against their
 * exceptions based on the given attackTraits and damage types present in the damage parameter, retrieving
 * the highest applicable value and calling the applyModifier callback
 *
 * @param modifiersByType immunties/resistances/weaknesses grouped by damage type
 * @param damage the dealt damage
 * @param attackTraits traits of the attack, only used to determine if an exception applies
 * @param applicableDamageTypes which values from the given modifiersByType map should be used to find the highest one
 * @param applyModifier callback that receives the highest applicable modifier
 * @param sortField callback that returns a number to sort all applicable modifiers by value, optional
 */
function ifModifierApplies<T extends HasDamageExceptions>({
    modifiersByType,
    damage,
    attackTraits,
    applicableModifierTypes,
    applyModifier,
    sortField = () => 0,
}: {
    modifiersByType: Map<string, T[]>;
    damage: Damage;
    attackTraits: Set<AttackTrait>;
    applicableModifierTypes: string[];
    applyModifier: (modifier: T) => void;
    sortField?: (modifier: T) => number;
}) {
    const modifiers = applicableModifierTypes.flatMap((damageType) => modifiersByType.get(damageType) ?? []);
    const damageTypes = new Set(damage.keys());
    const highestApplicableModifier = modifiers
        .filter((immunity) => !exceptionApplies(immunity.except, attackTraits, damageTypes))
        .sort((a, b) => sortField(a) - sortField(b))
        .reverse()[0];
    if (highestApplicableModifier !== undefined) {
        applyModifier(highestApplicableModifier);
    }
}

function applyImmunities({
    isCriticalHit,
    normalDamage,
    criticalDamage,
    additionalCriticalDamage,
    ignoreImmunities,
    attackTraits,
    immunities,
    splashDamage,
}: {
    isCriticalHit: boolean;
    normalDamage: Damage;
    splashDamage?: SplashDamage;
    criticalDamage: Damage; // separate parameter because you can double damage or just roll double dice
    additionalCriticalDamage: Damage; // damage which gets added after doubling the previous damage
    attackTraits: Set<AttackTrait>;
    immunities: Immunity[];
    ignoreImmunities: Set<string>;
}) {
    // replace object-immunities with their respective immunities
    const expandedImmunities = immunities.flatMap((immunity) => {
        if (immunity.damageType === 'object-immunities') {
            return ['bleed', 'poison', 'nonlethal attacks', 'mental'].map((type) => {
                return { damageType: type, except: immunity.except };
            });
        } else {
            return [immunity];
        }
    });
    const immunitiesByType = groupBy(expandedImmunities, (immunity: Immunity) => immunity.damageType);
    ignoreImmunities.forEach((ignoredImmunity) => immunitiesByType.delete(ignoredImmunity));

    // splash damage and additional critical damage like deadly always get added
    let damage = combineDamages([normalDamage, additionalCriticalDamage]);
    if (splashDamage !== undefined) {
        const splash = new Map();
        splash.set(splashDamage.type, splashDamage.value);
        damage = combineDamages([damage, splash]);
    }

    // check if critical damage is ignored otherwise combine it with normal damage
    if (isCriticalHit) {
        ifModifierApplies({
            modifiersByType: immunitiesByType,
            damage,
            attackTraits,
            applicableModifierTypes: ['critical-hits'],
            applyModifier: () => (criticalDamage = new Map()),
        });
    }
    damage = combineDamages([damage, criticalDamage]);

    // if nonlethal trait is present and monster is immune, throw away everything
    if (attackTraits.has('nonlethal')) {
        ifModifierApplies({
            modifiersByType: immunitiesByType,
            damage,
            attackTraits,
            applicableModifierTypes: ['nonlethal attacks'],
            applyModifier: () => damage.clear(),
        });
    }

    // check if precision damage is ignored, needed separately because weakness string is different from damage type
    ifModifierApplies({
        modifiersByType: immunitiesByType,
        damage,
        attackTraits,
        applicableModifierTypes: ['precision-damage'],
        applyModifier: () => damage.delete('precision'),
    });

    // apply normal damage immunities
    Array.from(damage.keys())
        .filter((damageType) => damageType !== 'precision')
        .forEach((damageType) => {
            ifModifierApplies({
                modifiersByType: immunitiesByType,
                damage,
                attackTraits,
                applicableModifierTypes: [damageType],
                applyModifier: () => damage.delete(damageType),
            });
        });

    return damage;
}

export function removeAlignmentDamage(damage: Damage, alignment: Alignment) {
    if (!isEvil(alignment)) {
        damage.delete('good');
    }
    if (!isGood(alignment)) {
        damage.delete('evil');
    }
    if (!isLawful(alignment)) {
        damage.delete('chaotic');
    }
    if (!isChaotic(alignment)) {
        damage.delete('lawful');
    }
}

export function removeUndeadLivingDamage(damage: Damage, alive: Alive) {
    if (alive === 'living') {
        damage.delete('positive');
    } else if (alive === 'undead') {
        damage.delete('negative');
        // Another special type of physical damage is bleed damage.
        // This is persistent damage that represents loss of blood. As such, it has
        // no effect on nonliving creatures or living creatures that don't need blood to live.
        damage.delete('bleed');
    } else {
        damage.delete('negative');
        damage.delete('positive');
    }
}

/**
 * This method needs to deal with the following string value crap:
 * * except magical silver
 * * except force, ghost touch, or positive; double resistance vs. non-magical
 * * except adamantine or bludgeoning
 * * except cold iron
 * * except magical
 * * except unarmed attacks
 * * except non-magical
 * * except force or ghost touch
 * @param exceptions string as listed above
 */
export function parseExceptions(
    exceptions: string | undefined,
): { doubleResistanceVsNonMagical: boolean; except: DamageExceptions } {
    if (exceptions === undefined) {
        return {
            doubleResistanceVsNonMagical: false,
            except: [],
        };
    } else {
        const sanitizedExceptions = exceptions
            .toLocaleLowerCase()
            .replace('except', '')
            .replace(', or ', ' or ')
            .replace(', ', ' or ')
            .replace('unarmed attacks', 'unarmed')
            .replace('ghost touch', 'ghostTouch')
            .replace('cold iron', 'coldiron') // needed to match trait
            .trim();

        // double-resistance is trailing after the ; normal resistances are before that
        const traitExceptions = sanitizedExceptions.split(';');
        const traitCombinations = traitExceptions[0].split(' or ').map((value) => value.trim());
        const doubleResistanceVsNonMagical = traitExceptions[1]?.trim() === 'double resistance vs. non-magical';
        return {
            doubleResistanceVsNonMagical,
            except: traitCombinations.map((traitCombination) => {
                // assume traits to be separated by space
                return new Set(traitCombination.split(' '));
            }) as DamageExceptions,
        };
    }
}

export function parseResistances(values: LabeledValue[]): Resistance[] {
    return values.map((value) => {
        const { doubleResistanceVsNonMagical, except } = parseExceptions(value.exceptions);
        return {
            damageType: value.type,
            value: toNumber(value.value) ?? 0,
            doubleResistanceVsNonMagical,
            except,
        };
    });
}

export function parseWeakness(values: LabeledValue[]): Weakness[] {
    return values.map((value) => {
        const { except } = parseExceptions(value.exceptions);
        return {
            damageType: value.type,
            value: toNumber(value.value) ?? 0,
            except,
        };
    });
}

export function parseImmunities(values: LabeledValue[]): Immunity[] {
    return values.map((value) => {
        const { except } = parseExceptions(value.exceptions);
        return {
            damageType: value.type,
            except,
        };
    });
}

/**
 * Applies a weakness or resistance to an existing damage value
 *
 * @param damage complete damage
 * @param value increases damage of positive, reduces damage if negative. If the result
 * value is ever 0 or negative, the damage type will be removed from the damage
 * map
 * @param damageTypes a list of types to increase damage; usually an array with 1 element
 * but can be multiple in case of slashing, bludgeoning or piercing
 */
function addDamageIfPresent(damage: Damage, value: number, damageTypes: DamageType[]) {
    for (const damageType of damageTypes) {
        const damageValue = damage.get(damageType);
        if (damageValue !== undefined) {
            const targetValue = damageValue + value;
            if (targetValue > 0) {
                damage.set(damageType, targetValue);
            } else {
                damage.delete(damageType);
            }
        }
    }
}

function applyWeaknesses({
    damage,
    isCriticalHit,
    splashDamage,
    weaknesses,
    attackTraits,
    areaDamage,
}: {
    damage: Damage;
    isCriticalHit: boolean;
    areaDamage?: DamageType;
    splashDamage?: SplashDamage;
    attackTraits: Set<AttackTrait>;
    weaknesses: Weakness[];
}) {
    // weaknesses don't trigger if all damage was reduced
    if (sumDamage(damage) === 0) {
        return;
    }

    const modifiersByType = groupBy(weaknesses, (weakness: Weakness) => weakness.damageType);

    if (attackTraits.has('vorpal')) {
        ifModifierApplies({
            modifiersByType,
            damage,
            attackTraits,
            applicableModifierTypes: ['vorpal weapons'],
            sortField: (modifier) => modifier.value,
            applyModifier: (modifier) => addDamageIfPresent(damage, modifier.value, physicalDamage),
        });
    }

    if (isCriticalHit) {
        ifModifierApplies({
            modifiersByType,
            damage,
            attackTraits,
            applicableModifierTypes: ['critical hits'],
            sortField: (modifier) => modifier.value,
            applyModifier: (modifier) => damage.set('untyped', modifier.value),
        });
    }

    if (splashDamage !== undefined) {
        ifModifierApplies({
            modifiersByType,
            damage,
            attackTraits,
            applicableModifierTypes: ['splash-damage'],
            sortField: (modifier) => modifier.value,
            applyModifier: (modifier) => addDamageIfPresent(damage, modifier.value, [splashDamage.type]),
        });
    }

    if (areaDamage !== undefined) {
        ifModifierApplies({
            modifiersByType,
            damage,
            attackTraits,
            applicableModifierTypes: ['area-damage'],
            sortField: (modifier) => modifier.value,
            applyModifier: (modifier) => addDamageIfPresent(damage, modifier.value, [areaDamage]),
        });
    }

    Array.from(damage.keys()).forEach((damageType) => {
        const applicableTypes = [damageType, 'all'];
        if (isPhysicalDamageType(damageType)) {
            applicableTypes.push('physical');
            // physical attacks also trigger weaknesses for materials if present
            physicalAttackTraits.filter((type) => attackTraits.has(type)).forEach((type) => applicableTypes.push(type));
        }
        ifModifierApplies({
            modifiersByType,
            damage,
            attackTraits,
            applicableModifierTypes: applicableTypes,
            sortField: (modifier) => modifier.value,
            applyModifier: (modifier) => addDamageIfPresent(damage, modifier.value, [damageType]),
        });
    });
}

function reduceResistance(
    reduceResistances: Map<string, number>,
    applicableResistanceTypes: string[],
    resistanceValue: number,
): number {
    const ignoreResistanceBy = Math.max(...applicableResistanceTypes.map((type) => reduceResistances.get(type) ?? 0));
    return Math.max(0, resistanceValue - ignoreResistanceBy);
}

function addDoubleResistanceIfRequired(modifier: Resistance, attackTraits: Set<AttackTrait>): number {
    if (modifier.doubleResistanceVsNonMagical && !attackTraits.has('magical')) {
        return modifier.value * 2;
    } else {
        return modifier.value;
    }
}

function applyResistances({
    damage,
    isCriticalHit,
    attackTraits,
    reduceResistances,
    resistances,
    mainDamageType,
}: {
    damage: Damage;
    isCriticalHit: boolean;
    attackTraits: Set<AttackTrait>;
    reduceResistances: Map<string, number>;
    resistances: Resistance[];
    mainDamageType: DamageType;
}): number {
    const modifiersByType = groupBy(resistances, (resistance: Resistance) => resistance.damageType);

    // precision damage resistance applies first because it spills into the damage afterwards
    ifModifierApplies({
        modifiersByType: modifiersByType,
        damage,
        attackTraits,
        applicableModifierTypes: ['precision-damage'],
        sortField: (modifier) => addDoubleResistanceIfRequired(modifier, attackTraits),
        applyModifier: (modifier) => {
            const resistance = addDoubleResistanceIfRequired(modifier, attackTraits);
            const value = reduceResistance(reduceResistances, ['precision-damage'], resistance);
            addDamageIfPresent(damage, value, [mainDamageType]);
            damage.delete('precision');
        },
    });

    Array.from(damage.keys()).forEach((damageType) => {
        const applicableTypes = [damageType, 'all'];
        if (isPhysicalDamageType(damageType)) {
            applicableTypes.push('physical');
            // physical attacks also trigger resistances for materials if present
            physicalAttackTraits.filter((type) => attackTraits.has(type)).forEach((type) => applicableTypes.push(type));
        }
        ifModifierApplies({
            modifiersByType,
            damage,
            attackTraits,
            applicableModifierTypes: applicableTypes,
            sortField: (modifier) => addDoubleResistanceIfRequired(modifier, attackTraits),
            applyModifier: (modifier) => {
                const resistance = addDoubleResistanceIfRequired(modifier, attackTraits);
                const value = reduceResistance(reduceResistances, applicableTypes, resistance);
                addDamageIfPresent(damage, value, [damageType]);
            },
        });
    });

    let totalDamage = sumDamage(damage);

    // critical hits resistance
    if (isCriticalHit) {
        ifModifierApplies({
            modifiersByType,
            damage,
            attackTraits,
            applicableModifierTypes: ['critical-hits'],
            sortField: (modifier) => addDoubleResistanceIfRequired(modifier, attackTraits),
            applyModifier: (modifier) => {
                const value = reduceResistance(reduceResistances, ['critical-hits'], modifier.value);
                totalDamage = Math.max(0, totalDamage - value);
            },
        });
    }
    return totalDamage;
}

/**
 * Implementation of https://2e.aonprd.com/Rules.aspx?ID=342
 */
export function calculateDamage({
    areaDamage,
    normalDamage,
    splashDamage,
    criticalDamage,
    additionalCriticalDamage,
    reduceResistances,
    ignoreImmunities,
    attackTraits,
    alive,
    alignment,
    immunities,
    resistances,
    weaknesses,
}: {
    areaDamage?: DamageType;
    normalDamage: Damage;
    splashDamage?: SplashDamage;
    criticalDamage: Damage; // separate parameter because you can double damage or just roll double dice
    additionalCriticalDamage: Damage; // damage which gets added after doubling the previous damage, e.g. deadly
    reduceResistances: Map<string, number>; // oracle and druid have metamagic that allows them to ignore resistance up to a value
    ignoreImmunities: Set<string>;
    attackTraits: Set<AttackTrait>;
    alive: Alive;
    immunities: Immunity[];
    resistances: Resistance[];
    weaknesses: Weakness[];
    alignment: Alignment;
}): number {
    const isCriticalHit = criticalDamage.size > 0;
    const mainDamageType = getMainDamageType(normalDamage);
    const damage = applyImmunities({
        isCriticalHit,
        normalDamage,
        criticalDamage,
        additionalCriticalDamage,
        attackTraits,
        immunities,
        ignoreImmunities,
        splashDamage,
    });
    removeUndeadLivingDamage(damage, alive);
    removeAlignmentDamage(damage, alignment);
    applyWeaknesses({ isCriticalHit, damage, weaknesses, attackTraits, splashDamage, areaDamage });
    return applyResistances({ damage, resistances, reduceResistances, isCriticalHit, attackTraits, mainDamageType });
}

/**
 * Looks through all values and only keeps the highest ones. In case of exceptions,
 * only the exact same exception will be grouped together, e.g.
 * physical 5 (except silver) and physical 5 (except silver) will be collapsed but not
 * physical 5 (except silver) and physical 5 (except adamantine)
 *
 * This function is mainly used to render the actual values into the character sheet.
 * The actual damage reduction code can deal with multiple labels of the same category.
 *
 * @param values immunities, resistances or weaknesses
 */
export function mergeLabeledValues(values: LabeledValue[]): LabeledValue[] {
    const valuesByType = groupBy(values, (value) => value.type);
    return Array.from(valuesByType.entries()).flatMap(([, value]) => {
        const groupedByException = groupBy(value, (value) => value.exceptions ?? null);
        return Array.from(groupedByException.entries()).map(([, value]) => {
            return max(value, (val) => toNumber(val.value) ?? 0);
        });
    });
}

/**
 * Immunities aren't LabeledValue[] atm but they should be. This function transforms an immunity
 * into a LabeledValue
 *
 * @param values
 */
export function immunityToLabeledValue(values: DamageImmunities): LabeledValue[] {
    return values.value.map((value) => {
        return {
            type: value,
            value: 0,
            label: value,
        };
    });
}
