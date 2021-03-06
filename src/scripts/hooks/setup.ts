import { LocalizePF2e } from '@system/localize';
import { registerSheets } from '../register-sheets';
import { ActorPF2e } from '@actor/base';
import { CreaturePF2e } from '@actor/creature/index';
import { PF2CheckDC } from '@system/check-degree-of-success';
import { calculateXP } from '@scripts/macros/xp';
import { launchTravelSheet } from '@scripts/macros/travel/travel-speed-sheet';
import { rollActionMacro, rollItemMacro } from '@scripts/macros/hotbar';
import { raiseAShield } from '@scripts/macros/raise-a-shield';
import { restForTheNight } from '@scripts/macros/rest-for-the-night';
import { steelYourResolve } from '@scripts/macros/steel-your-resolve';
import { encouragingWords } from '@scripts/macros/encouraging-words';
import { earnIncome } from '@scripts/macros/earn-income';
import { DicePF2e } from '@scripts/dice';
import {
    AbilityModifier,
    CheckModifier,
    ModifierPF2e,
    MODIFIER_TYPE,
    ProficiencyModifier,
    StatisticModifier,
} from '@module/modifiers';
import { StatisticBuilder } from '@module/system/statistic';
import { CheckPF2e } from '@system/rolls';
import { RuleElementPF2e, RuleElements } from '@module/rules/rules';
import { ConditionManager } from '@module/conditions';
import { StatusEffects } from '@scripts/actor/status-effects';
import { EffectPanel } from '@module/system/effect-panel';
import { EffectTracker } from '@module/system/effect-tracker';
import { Rollable } from '@actor/data/base';
import { remigrate } from '@scripts/system/remigrate';
import { SKILL_EXPANDED } from '@actor/data/values';
import { GhostTemplate } from '@module/ghost-measured-template';
import { ActorImporter } from '@system/importer/actor-importer';
import { HomebrewElements } from '@module/settings/homebrew';

function resolveActors(): ActorPF2e[] {
    const actors: ActorPF2e[] = [];
    if (canvas.tokens.controlled.length) {
        actors.push(...(canvas.tokens.controlled.map((token) => token.actor) as ActorPF2e[]));
    } else if (game.user.character) {
        actors.push(game.user.character);
    }
    return actors;
}

function registerGlobalDCInjection() {
    const selectorShowDC = '[data-pf2-dc]:not([data-pf2-dc=""])[data-pf2-show-dc]:not([data-pf2-show-dc=""])';
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof HTMLElement)) return;
                node.querySelectorAll(selectorShowDC).forEach((element) => {
                    if (!(element instanceof HTMLElement)) return;
                    const dc = element.dataset.pf2Dc!.trim()!;
                    const role = element.dataset.pf2ShowDc!.trim();
                    if (['all', 'owner'].includes(role) || (role === 'gm' && game.user.isGM)) {
                        element.innerHTML = game.i18n.format('PF2E.DCWithValue', {
                            dc,
                            text: element.innerHTML,
                        });
                    }
                });
            });
        }
    });
    observer.observe(window.document.body, { childList: true, subtree: true });
}

function registerPF2ActionClickListener() {
    $<HTMLBodyElement>('body').on('click', (event) => {
        let target = event.target;
        if (target?.matches('[data-pf2-repost], [data-pf2-repost] *')) {
            repostPF2Action(event.target.parentElement!);
        } else if (
            target?.matches(
                '[data-pf2-action]:not([data-pf2-action=""]), [data-pf2-action]:not([data-pf2-action=""]) *',
            )
        ) {
            target = target.closest('[data-pf2-action]:not([data-pf2-action=""])')!;
            const { pf2Action, pf2Glyph, pf2Variant } = target.dataset ?? {};
            const action = game.pf2e.actions[pf2Action ?? ''];
            if (pf2Action && action) {
                action({
                    event,
                    glyph: pf2Glyph,
                    variant: pf2Variant,
                });
            } else {
                console.warn(`PF2e System | Skip executing unknown action '${pf2Action}'`);
            }
        } else if (
            target?.matches('[data-pf2-check]:not([data-pf2-check=""]), [data-pf2-check]:not([data-pf2-check=""]) *')
        ) {
            target = target.closest('[data-pf2-check]:not([data-pf2-check=""])')!;

            const { pf2Check, pf2Dc, pf2Traits, pf2Label } = target.dataset ?? {};
            const actors = resolveActors();

            switch (pf2Check) {
                case 'perception': {
                    if (actors.length) {
                        actors.forEach((actor) => {
                            if (actor instanceof CreaturePF2e) {
                                const perceptionCheck = actor.data.data.attributes.perception as Rollable | undefined;
                                if (perceptionCheck) {
                                    const dc = Number.isInteger(Number(pf2Dc))
                                        ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                                        : undefined;
                                    const options = actor.getRollOptions(['all', 'perception']);
                                    if (pf2Traits) {
                                        const traits = pf2Traits
                                            .split(',')
                                            .map((trait) => trait.trim())
                                            .filter((trait) => !!trait);
                                        options.push(...traits);
                                    }
                                    perceptionCheck.roll({ event, options, dc });
                                } else {
                                    console.warn(`PF2e System | Skip rolling perception for '${actor}'`);
                                }
                            }
                        });
                    }
                    break;
                }
                case 'flat': {
                    if (actors.length) {
                        actors.forEach((actor) => {
                            if (actor instanceof CreaturePF2e) {
                                const flatCheck = StatisticBuilder.from(actor, {
                                    name: '',
                                    modifiers: [],
                                    check: { type: 'flat-check' },
                                });
                                if (flatCheck) {
                                    const dc = Number.isInteger(Number(pf2Dc))
                                        ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                                        : undefined;
                                    const options = actor.getRollOptions(['all', 'flat-check']);
                                    if (pf2Traits) {
                                        const traits = pf2Traits
                                            .split(',')
                                            .map((trait) => trait.trim())
                                            .filter((trait) => !!trait);
                                        options.push(...traits);
                                    }
                                    flatCheck.check.roll({ event, options, dc, modifiers: [] });
                                } else {
                                    console.warn(`PF2e System | Skip rolling flat check for '${actor}'`);
                                }
                            }
                        });
                    }
                    break;
                }
                case 'will':
                case 'fortitude':
                case 'reflex': {
                    if (actors.length) {
                        actors.forEach((actor) => {
                            const savingThrow = actor.data.data.saves[pf2Check ?? ''] as Rollable | undefined;
                            if (pf2Check && savingThrow) {
                                const dc = Number.isInteger(Number(pf2Dc))
                                    ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                                    : undefined;
                                const options = actor.getRollOptions(['all', 'saving-throw', pf2Check]);
                                if (pf2Traits) {
                                    const traits = pf2Traits
                                        .split(',')
                                        .map((trait) => trait.trim())
                                        .filter((trait) => !!trait);
                                    options.push(...traits);
                                }
                                savingThrow.roll({ event, options, dc });
                            } else {
                                console.warn(`PF2e System | Skip rolling unknown saving throw '${pf2Check}'`);
                            }
                        });
                    }
                    break;
                }
                default: {
                    if (actors.length) {
                        const skill = SKILL_EXPANDED[pf2Check!]?.shortform ?? pf2Check!;
                        actors.forEach((actor) => {
                            const skillCheck = actor.data.data.skills[skill ?? ''] as Rollable | undefined;
                            if (skill && skillCheck) {
                                const dc = Number.isInteger(Number(pf2Dc))
                                    ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                                    : undefined;
                                const options = actor.getRollOptions(['all', 'skill-check', skill]);
                                if (pf2Traits) {
                                    const traits = pf2Traits
                                        .split(',')
                                        .map((trait) => trait.trim())
                                        .filter((trait) => !!trait);
                                    options.push(...traits);
                                }
                                skillCheck.roll({ event, options, dc });
                            } else {
                                console.warn(
                                    `PF2e System | Skip rolling unknown skill check or untrained lore '${skill}'`,
                                );
                            }
                        });
                    }
                    break;
                }
            }
        } else if (
            target?.matches(
                '[data-pf2-saving-throw]:not([data-pf2-saving-throw=""]), [data-pf2-saving-throw]:not([data-pf2-saving-throw=""]) *',
            )
        ) {
            console.warn(
                `Deprecation warning | data-pf2-saving-throw is deprecated, use data-pf2-check="savename" instead.`,
            );
            target = target.closest('[data-pf2-saving-throw]:not([data-pf2-saving-throw=""])')!;
            const actors = resolveActors();
            if (actors.length) {
                const { pf2SavingThrow, pf2Dc, pf2Traits, pf2Label } = target.dataset ?? {};
                actors.forEach((actor) => {
                    const savingThrow = actor.data.data.saves[pf2SavingThrow ?? ''] as Rollable | undefined;
                    if (pf2SavingThrow && savingThrow) {
                        const dc = Number.isInteger(Number(pf2Dc))
                            ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                            : undefined;
                        const options = actor.getRollOptions(['all', 'saving-throw', pf2SavingThrow]);
                        if (pf2Traits) {
                            const traits = pf2Traits
                                .split(',')
                                .map((trait) => trait.trim())
                                .filter((trait) => !!trait);
                            options.push(...traits);
                        }
                        savingThrow.roll({ event, options, dc });
                    } else {
                        console.warn(`PF2e System | Skip rolling unknown saving throw '${pf2SavingThrow}'`);
                    }
                });
            }
        } else if (
            target?.matches(
                '[data-pf2-skill-check]:not([data-pf2-skill-check=""]), [data-pf2-skill-check]:not([data-pf2-skill-check=""]) *',
            )
        ) {
            console.warn(
                `Deprecation warning | data-pf2-skill-check is deprecated, use data-pf2-check="skillname" instead.`,
            );
            target = target.closest('[data-pf2-skill-check]:not([data-pf2-skill-check=""])')!;
            const actors = resolveActors();
            if (actors.length) {
                const { pf2SkillCheck, pf2Dc, pf2Traits, pf2Label } = target.dataset ?? {};
                const skill = SKILL_EXPANDED[pf2SkillCheck!]?.shortform ?? pf2SkillCheck!;
                actors.forEach((actor) => {
                    const skillCheck = actor.data.data.skills[skill ?? ''] as Rollable | undefined;
                    if (skill && skillCheck) {
                        const dc = Number.isInteger(Number(pf2Dc))
                            ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                            : undefined;
                        const options = actor.getRollOptions(['all', 'skill-check', skill]);
                        if (pf2Traits) {
                            const traits = pf2Traits
                                .split(',')
                                .map((trait) => trait.trim())
                                .filter((trait) => !!trait);
                            options.push(...traits);
                        }
                        skillCheck.roll({ event, options, dc });
                    } else {
                        console.warn(`PF2e System | Skip rolling unknown skill check or untrained lore '${skill}'`);
                    }
                });
            }
        } else if (target?.matches('[data-pf2-perception-check], [data-pf2-perception-check] *')) {
            console.warn(
                `Deprecation warning | data-pf2-perception is deprecated, use data-pf2-check="perception" instead.`,
            );
            target = target.closest('[data-pf2-perception-check]')!;
            const actors = resolveActors();
            if (actors.length) {
                const { pf2Dc, pf2Traits, pf2Label } = target.dataset ?? {};
                actors.forEach((actor) => {
                    if (actor instanceof CreaturePF2e) {
                        const perceptionCheck = actor.data.data.attributes.perception as Rollable | undefined;
                        if (perceptionCheck) {
                            const dc = Number.isInteger(Number(pf2Dc))
                                ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                                : undefined;
                            const options = actor.getRollOptions(['all', 'perception']);
                            if (pf2Traits) {
                                const traits = pf2Traits
                                    .split(',')
                                    .map((trait) => trait.trim())
                                    .filter((trait) => !!trait);
                                options.push(...traits);
                            }
                            perceptionCheck.roll({ event, options, dc });
                        } else {
                            console.warn(`PF2e System | Skip rolling perception for '${actor}'`);
                        }
                    }
                });
            }
        } else if (target?.matches('[data-pf2-flat-check], [data-pf2-flat-check] *')) {
            console.warn(`Deprecation warning | data-pf2-flat-check is deprecated, use data-pf2-check="flat" instead.`);
            target = target.closest('[data-pf2-flat-check]')!;
            const actors = resolveActors();
            if (actors.length) {
                const { pf2Dc, pf2Traits, pf2Label } = target.dataset ?? {};
                actors.forEach((actor) => {
                    if (actor instanceof CreaturePF2e) {
                        const flatCheck = StatisticBuilder.from(actor, {
                            name: '',
                            modifiers: [],
                            check: { type: 'flat-check' },
                        });
                        if (flatCheck) {
                            const dc = Number.isInteger(Number(pf2Dc))
                                ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                                : undefined;
                            const options = actor.getRollOptions(['all', 'flat-check']);
                            if (pf2Traits) {
                                const traits = pf2Traits
                                    .split(',')
                                    .map((trait) => trait.trim())
                                    .filter((trait) => !!trait);
                                options.push(...traits);
                            }
                            flatCheck.check.roll({ event, options, dc, modifiers: [] });
                        } else {
                            console.warn(`PF2e System | Skip rolling flat check for '${actor}'`);
                        }
                    }
                });
            }
        } else if (
            target?.matches(
                '[data-pf2-effect-area]:not([data-pf2-effect-area=""]), [data-pf2-effect-area]:not([data-pf2-effect-area=""]) *',
            )
        ) {
            target = target.closest('[data-pf2-effect-area]')!;
            const { pf2EffectArea, pf2TemplateData } = target.dataset ?? {};
            const templateConversion: Record<string, string> = {
                burst: 'circle',
                emanation: 'circle',
                line: 'ray',
                cone: 'cone',
                rect: 'rect',
            };
            if (pf2TemplateData && typeof pf2EffectArea === 'string') {
                const templateData = JSON.parse(pf2TemplateData);
                templateData.t = templateConversion[pf2EffectArea];
                templateData.user = game.user.id;
                const measuredTemplateDoc = new MeasuredTemplateDocument(templateData, { parent: canvas.scene });
                const ghostTemplate = new GhostTemplate(measuredTemplateDoc);
                ghostTemplate.drawPreview();
            } else {
                console.warn(`PF2e System | Could not create template'`);
            }
        }
    });
}

function repostPF2Action(target: HTMLElement) {
    if (
        target?.matches('[data-pf2-action]:not([data-pf2-action=""]), [data-pf2-action]:not([data-pf2-action=""]) *') ||
        target?.matches(
            '[data-pf2-saving-throw]:not([data-pf2-saving-throw=""]), [data-pf2-saving-throw]:not([data-pf2-saving-throw=""]) *',
        ) ||
        target?.matches(
            '[data-pf2-skill-check]:not([data-pf2-skill-check=""]), [data-pf2-skill-check]:not([data-pf2-skill-check=""]) *',
        ) ||
        target?.matches('[data-pf2-perception-check], [data-pf2-perception-check] *') ||
        target?.matches('[data-pf2-flat-check], [data-pf2-flat-check] *') ||
        target?.matches('[data-pf2-check], [data-pf2-check] *')
    ) {
        const flavor = target.attributes.getNamedItem('data-pf2-repost-flavor')?.value ?? '';
        target.setAttributeNS(
            null,
            'data-pf2-show-dc',
            target.attributes.getNamedItem('data-pf2-repost-show-dc')?.value ?? 'gm',
        );
        ChatMessage.create({
            content:
                flavor +
                ' ' +
                target.outerHTML
                    .replace(/>DC \d+ /gi, '>')
                    .replace(/<[^>]+data-pf2-repost(="")?[^>]*>[^<]*<\s*\/[^>]+>/gi, ''),
        });
    }
}

function registerPF2ActionRightClickListener() {
    if (BUILD_MODE === 'development') {
        $<HTMLBodyElement>('body').on('contextmenu', (event) => {
            repostPF2Action(event.target);
        });
    }
}

/**
 * This runs after game data has been requested and loaded from the servers, so entities exist
 */
export function listen() {
    Hooks.once('setup', () => {
        LocalizePF2e.ready = true;

        // Register actor and item sheets
        registerSheets();

        // register global DC injection
        registerGlobalDCInjection();

        // register click listener for elements with a data-pf2-action attribute
        registerPF2ActionClickListener();
        registerPF2ActionRightClickListener();

        // Exposed objects for macros and modules
        Object.defineProperty(globalThis.game, 'pf2e', { value: {} });
        game.pf2e.actions = {
            earnIncome,
            raiseAShield,
            restForTheNight,
            steelYourResolve,
            encouragingWords,
        };
        game.pf2e.importer = {
            actor: ActorImporter,
        };
        game.pf2e.rollItemMacro = rollItemMacro;
        game.pf2e.rollActionMacro = rollActionMacro;
        game.pf2e.gm = {
            calculateXP,
            launchTravelSheet,
        };
        game.pf2e.system = {
            remigrate,
        };
        game.pf2e.Dice = DicePF2e;
        game.pf2e.StatusEffects = StatusEffects;
        game.pf2e.ConditionManager = ConditionManager;
        game.pf2e.ModifierType = MODIFIER_TYPE;
        game.pf2e.Modifier = ModifierPF2e;
        game.pf2e.AbilityModifier = AbilityModifier;
        game.pf2e.ProficiencyModifier = ProficiencyModifier;
        game.pf2e.StatisticModifier = StatisticModifier;
        game.pf2e.CheckModifier = CheckModifier;
        game.pf2e.Check = CheckPF2e;
        game.pf2e.RuleElements = RuleElements;
        game.pf2e.RuleElement = RuleElementPF2e;

        // Start system sub-applications
        game.pf2e.effectPanel = new EffectPanel();
        game.pf2e.effectTracker = new EffectTracker();

        // Assign the homebrew elements to their respective `CONFIG.PF2E` objects
        HomebrewElements.refreshTags();
    });
}
