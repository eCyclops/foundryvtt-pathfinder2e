import { DateTime } from 'luxon';

type SettingsKey = 'dateTheme' | 'playersCanView' | 'syncDarkness' | 'worldCreatedOn';

interface FormInputData extends ClientSettingsData {
    key: string;
    value: unknown;
    isSelect: boolean;
    isCheckbox: boolean;
    isDateTime: boolean;
}
type TemplateData = FormApplicationData & {
    settings: FormInputData[];
};

interface UpdateData {
    dateTheme: string;
    playersCanView: boolean;
    syncDarkness: boolean;
    worldCreatedOn: string;
}

export class WorldClockSettings extends FormApplication {
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: CONFIG.PF2E.SETTINGS.worldClock.name,
            id: 'world-clock-settings',
            template: 'systems/pf2e/templates/system/settings/world-clock.html',
            width: 550,
            height: 'auto',
            closeOnSubmit: true,
        });
    }

    /** @override */
    getData(): TemplateData {
        const settings: FormInputData[] = Object.entries(WorldClockSettings.settings).map(([key, setting]) => {
            const value = ((): unknown => {
                const rawValue = game.settings.get('pf2e', `worldClock.${key}`);

                // Present the world-creation timestamp as an HTML datetime-locale input
                if (key === 'worldCreatedOn' && typeof rawValue === 'string') {
                    return DateTime.fromISO(rawValue).toFormat("yyyy-MM-dd'T'HH:mm");
                }
                return rawValue;
            })();

            return {
                ...setting,
                key: key,
                value: value,
                user: game.user,
                isSelect: 'choices' in setting,
                isCheckbox: setting.type === Boolean,
                isDateTime: setting.type === String && !('choices' in setting),
            };
        });
        return mergeObject(super.getData(), { settings: settings });
    }

    /** Register World Clock settings */
    static registerSettings() {
        game.settings.register('pf2e', 'worldClock.dateTheme', this.settings.dateTheme);
        game.settings.register('pf2e', 'worldClock.playersCanView', this.settings.playersCanView);
        game.settings.register('pf2e', 'worldClock.syncDarkness', this.settings.syncDarkness);
        game.settings.register('pf2e', 'worldClock.worldCreatedOn', this.settings.worldCreatedOn);
    }

    /** @override */
    protected async _updateObject(_event: Event, data: UpdateData): Promise<void> {
        const keys: (keyof UpdateData)[] = ['dateTheme', 'playersCanView', 'syncDarkness', 'worldCreatedOn'];
        for await (const key of keys) {
            const settingKey = `worldClock.${key}`;
            const newValue = key === 'worldCreatedOn' ? DateTime.fromISO(data[key]) : data[key];
            await game.settings.set('pf2e', settingKey, newValue);
        }

        game.pf2e.worldClock!.render(false);
    }

    /** Settings to be registered and also later referenced during user updates */
    private static get settings(): Record<SettingsKey, ClientSettingsData> {
        // Advise the GM whether Global Illumination is enabled on the current scene.
        const syncDarknessFormatting: { globalLight: string } = Object.defineProperty({}, 'globalLight', {
            get: () =>
                canvas.lighting.globalLight
                    ? game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.syncDarkness.globalLightOn)
                    : game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.syncDarkness.globalLightOff),
        });

        return {
            // Date theme, currently one of Golarion (Absalom Reckoning), Earth (Material Plane, 95 years ago), or
            // Earth (real world)
            dateTheme: {
                name: CONFIG.PF2E.SETTINGS.worldClock.dateTheme.name,
                hint: CONFIG.PF2E.SETTINGS.worldClock.dateTheme.hint,
                scope: 'world',
                config: false,
                default: 'AR',
                type: String,
                choices: {
                    AR: CONFIG.PF2E.SETTINGS.worldClock.dateTheme.AR,
                    AD: CONFIG.PF2E.SETTINGS.worldClock.dateTheme.AD,
                    CE: CONFIG.PF2E.SETTINGS.worldClock.dateTheme.CE,
                },
            },
            // Players can view the World Clock
            playersCanView: {
                name: CONFIG.PF2E.SETTINGS.worldClock.playersCanView.name,
                hint: CONFIG.PF2E.SETTINGS.worldClock.playersCanView.hint,
                scope: 'world',
                config: false,
                default: false,
                type: Boolean,
            },
            // Synchronize a scene's Darkness Level with the time of day, given Global Illumination is turned on
            syncDarkness: {
                name: CONFIG.PF2E.SETTINGS.worldClock.syncDarkness.name,
                hint: game.i18n.format(CONFIG.PF2E.SETTINGS.worldClock.syncDarkness.hint, syncDarknessFormatting),
                scope: 'world',
                config: false,
                default: false,
                type: Boolean,
            },
            // The Unix timestamp of the world's creation date
            worldCreatedOn: {
                name: CONFIG.PF2E.SETTINGS.worldClock.worldCreatedOn.name,
                hint: CONFIG.PF2E.SETTINGS.worldClock.worldCreatedOn.hint,
                scope: 'world',
                config: false,
                default: DateTime.utc().toISO(),
                type: String,
            },
        };
    }
}