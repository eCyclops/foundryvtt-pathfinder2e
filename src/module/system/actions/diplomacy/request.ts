import { ActionsPF2e, SkillActionOptions } from '../actions';

export function request(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'diplomacy');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Request.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:request'],
        ['action:request'],
        ['auditory', 'concentrate', 'linguistic', 'mental'],
        checkType,
        options.event,
        undefined,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.Request', 'criticalSuccess'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Request', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Request', 'failure'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Request', 'criticalFailure'),
        ],
    );
}
