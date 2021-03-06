import { ActionsPF2e, SkillActionOptions } from '../actions';

export function lie(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'deception');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph,
        'PF2E.Actions.Lie.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:lie'],
        ['action:lie'],
        ['auditory', 'concentrate', 'linguistic', 'mental', 'secret'],
        checkType,
        options.event,
        (target) => target.perception,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.Lie', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Lie', 'failure'),
        ],
    );
}
