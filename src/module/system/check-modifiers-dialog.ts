/* global game, CONFIG */
import { PF2Modifier, PF2StatisticModifier } from '../modifiers';
import { PF2EActor } from '../entities';

export interface CheckModifiersContext {
    /** Any options which should be used in the roll. */
    options?: string[];
    /** If true, this is a secret roll which should only be seen by the GM. */
    secret?: boolean;
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: string;
    /** Should this roll be rolled with 'fortune' (2 dice, keep higher) or 'misfortune' (2 dice, keep lower)? */
    fate?: string;
    /** The actor which initiated this roll. */
    actor?: PF2EActor;
    /** The type of this roll, like 'perception-check' or 'saving-throw'. */
    type?: string;
}

/**
 * Dialog for excluding certain modifiers before rolling a check.
 * @category Other
 */
export class CheckModifiersDialog extends Application {
    /** The check which is being edited. */
    check: PF2StatisticModifier;
    /** Relevant context for this roll, like roll options. */
    context: CheckModifiersContext;
    /** Callback called when the roll occurs. */
    callback?: (roll: Roll) => void;

    constructor(check: PF2StatisticModifier, context?: CheckModifiersContext, callback?: (roll: Roll) => void) {
        super({
            title: check.name,
            template: 'systems/pf2e/templates/chat/check-modifiers-dialog.html',
            classes: ['dice-checks', 'dialog'],
            popOut: true,
            width: 380,
        });

        this.check = check;
        this.context = context ?? {}; // might include a reference to actor, so do not do mergeObject or similar
        this.callback = callback;
        if (this.context.secret) {
            this.context.rollMode = 'blindroll';
        } else {
            this.context.rollMode = game.settings.get('core', 'rollMode') ?? 'roll';
        }
    }

    /** Roll the given check, rendering the roll to the chat menu. */
    static async roll(check: PF2StatisticModifier, context?: CheckModifiersContext, callback?: (roll: Roll) => void) {
        const options = [];
        const ctx = (context as any) ?? {};

        let dice = '1d20';
        if (ctx.fate === 'misfortune') {
            dice = '2d20kl';
            options.push('PF2E.TraitMisfortune');
        } else if (ctx.fate === 'fortune') {
            dice = '2d20kh';
            options.push('PF2E.TraitFortune');
        }

        let speaker: PF2EActor;
        if (ctx.actor) {
            speaker = ctx.actor;
            ctx.actor = ctx.actor._id;
        }
        if (ctx.token) {
            ctx.token = ctx.token._id;
        }
        if (ctx.user) {
            ctx.user = ctx.user._id;
        }
        if (ctx.item) {
            ctx.item = ctx.item._id;
        }

        ctx.rollMode =
            ctx.rollMode ?? (ctx.secret ? 'blindroll' : undefined) ?? game.settings.get('core', 'rollMode') ?? 'roll';

        const modifierBreakdown = check.modifiers
            .filter((m) => m.enabled)
            .map((m) => {
                const label = game.i18n.localize(m.label ?? m.name);
                return `<span class="tag tag_secondary">${label} ${m.modifier < 0 ? '' : '+'}${m.modifier}</span>`;
            })
            .join('');

        const optionStyle =
            'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #000000; border-radius: 3px; color: white; background: var(--secondary);';
        const optionBreakdown = options
            .map((o) => `<span style="${optionStyle}">${game.i18n.localize(o)}</span>`)
            .join('');

        const totalModifierPart = check.totalModifier === 0 ? '' : `+${check.totalModifier}`;
        const roll = new Roll(`${dice}${totalModifierPart}`, check).roll();

        await roll.toMessage(
            {
                speaker: ChatMessage.getSpeaker({ actor: speaker }),
                flavor: `<b>${check.name}</b><div class="tags">${modifierBreakdown}${optionBreakdown}</div>`,
                flags: {
                    core: {
                        canPopout: true,
                    },
                    pf2e: {
                        canReroll: !ctx.fate,
                        context: ctx,
                    },
                },
            },
            {
                rollMode: ctx.rollMode ?? 'roll',
            },
        );

        if (callback) {
            callback(roll);
        }
    }

    getData() {
        const fortune = this?.context?.fate === 'fortune';
        const misfortune = this?.context?.fate === 'misfortune';
        const none = fortune === misfortune;
        return {
            check: this.check,
            rollModes: CONFIG.Dice.rollModes,
            rollMode: this.context.rollMode,
            fortune,
            none,
            misfortune,
        };
    }

    activateListeners(html: JQuery) {
        html.find('.roll').click((event) => {
            this.context.fate = html.find('input[type=radio][name=fate]:checked').val() as string;
            CheckModifiersDialog.roll(this.check, this.context, this.callback);
            this.close();
        });

        html.find('.modifier-container').on('click', 'input[type=checkbox]', (event) => {
            const index = Number(event.currentTarget.getAttribute('data-modifier-index'));
            this.check.modifiers[index].ignored = event.currentTarget.checked;
            this.check.applyStackingRules();
            this.render();
        });

        html.find('.add-modifier-panel').on('click', '.add-modifier', (event) => this.onAddModifier(event));

        html.find('[name=rollmode]').change((event) => this.onChangeRollMode(event));
    }

    onAddModifier(event: JQuery.ClickEvent) {
        const parent = $(event.currentTarget).parents('.add-modifier-panel');
        const value = Number(parent.find('.add-modifier-value').val());
        const type = `${parent.find('.add-modifier-type').val()}`;
        let name = `${parent.find('.add-modifier-name').val()}`;
        const errors = [];
        if (Number.isNaN(value)) {
            errors.push('Modifier value must be a number.');
        } else if (value === 0) {
            errors.push('Modifier value must not be zero.');
        }
        if (!type || !type.trim().length) {
            errors.push('Modifier type is required.');
        }
        if (!name || !name.trim()) {
            name = game.i18n.localize(value < 0 ? `PF2E.PenaltyLabel.${type}` : `PF2E.BonusLabel.${type}`);
        }
        if (errors.length > 0) {
            ui.notifications.error(errors.join(' '));
        } else {
            this.check.push(new PF2Modifier(name, value, type));
            this.render();
        }
    }

    onChangeRollMode(event: JQuery.ChangeEvent) {
        this.context.rollMode = ($(event.currentTarget).val() ?? 'roll') as string;
    }
}
