import { ActionsPF2e, SkillActionOptions } from '../actions';

export function swim(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'athletics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Swim.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:swim'],
        ['action:swim'],
        ['move'],
        checkType,
        options.event,
        undefined,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.Swim', 'criticalSuccess'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Swim', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Swim', 'criticalFailure'),
        ],
    );
}
