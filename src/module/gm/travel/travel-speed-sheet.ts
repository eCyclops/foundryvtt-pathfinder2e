import {
    calculateNormalizedCharacterSpeed,
    calculateTravelDuration,
    DetectionMode,
    ExplorationActivities,
    ExplorationOptions,
    LengthUnit,
    speedToVelocity,
    Terrain,
    TravelDuration,
    Trip,
} from './travel-speed';
import { Fraction, zip } from '../../utils';
import { PF2EActor } from 'src/module/actor/actor';
import { PF2CheckModifier, PF2Modifier, PF2ModifierPredicate } from '../../modifiers';

type DetectionModeData = 'none' | 'everything' | 'before';
type SpeedUnitData = 'feet' | 'miles';
type TerrainData = 'normal' | 'difficult' | 'greaterDifficult';
type ExplorationActivitiesData =
    | 'AvoidNotice'
    | 'CoverTracks'
    | 'Defend'
    | 'DetectMagic'
    | 'Investigate'
    | 'RepeatASpell'
    | 'Scout'
    | 'Search'
    | 'Track'
    | 'None'
    | 'HalfSpeed';

/*
TODO:

// feats
https://2e.aonprd.com/Feats.aspx?ID=1439
https://2e.aonprd.com/Feats.aspx?ID=1987
https://2e.aonprd.com/Feats.aspx?ID=2138
https://2e.aonprd.com/Feats.aspx?ID=2126
https://2e.aonprd.com/Feats.aspx?ID=928
https://2e.aonprd.com/Feats.aspx?ID=2051
https://2e.aonprd.com/Feats.aspx?ID=547

effects
https://2e.aonprd.com/Spells.aspx?ID=588
https://2e.aonprd.com/Spells.aspx?ID=275
https://2e.aonprd.com/Spells.aspx?ID=105
https://2e.aonprd.com/Spells.aspx?ID=350
https://2e.aonprd.com/Spells.aspx?ID=368
 */

/*
Possible example of how we could implement modifiers
{
  "key": "PF2E.RuleElement.FlatModifier",
  "selector": "speed",
  "label": "Legendary Guide",
  "value": "10",
  "type": "circumstance",
  "predicate": {
    "all": ["group-travel"]
  } 
}
 */

interface FormActorData {
    detectionMode: DetectionModeData;
    explorationActivity: ExplorationActivitiesData;
    speed: number;
}

interface TravelFormData {
    actors: FormActorData[];
    distance: number;
    distanceUnit: SpeedUnitData;
    terrain: TerrainData;
    normalTerrainSlowdown: Fraction;
    difficultTerrainSlowdown: Fraction;
    greaterDifficultTerrainSlowdown: Fraction;
}

interface SheetActorData extends FormActorData {
    explorationSpeed: number;
    name: string;
    requiresDetectionMode: boolean;
}

interface SheetData extends TravelFormData {
    actors: SheetActorData[];
    travelDuration: TravelDuration;
    partySpeedInFeet: number;
}

class TravelSpeedSheet extends FormApplication {
    private formData?: TravelFormData = undefined;

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'travel-duration';
        options.classes = ['travel-duration'];
        options.title = game.i18n.localize('PF2E.TravelSpeed.Title');
        options.template = 'systems/pf2e/templates/gm/travel/travel-speed-sheet.html';
        options.width = 'auto';
        options.submitOnChange = true;
        options.closeOnSubmit = false;
        return options;
    }

    async _updateObject(_event: Event, formData: FormData) {
        const data = expandObject(formData) as TravelFormData;
        data.actors = toArray(data.actors);
        this.formData = data;
        this.render(true);
    }

    private getActorSpeed(actor: PF2EActor, groupTravelModifiers: PF2Modifier[]): number {
        const travelSpeed = new PF2CheckModifier(
            'Land Travel Speed',
            actor.data.data.attributes.speed,
            groupTravelModifiers,
        );
        const options = actor.getRollOptions(['speed', 'land-speed', 'travel']).concat('travel');
        travelSpeed.modifiers.forEach((modifier) => {
            modifier.ignored = !PF2ModifierPredicate.test(modifier.predicate, options);
        });
        travelSpeed.applyStackingRules();
        console.log('a', groupTravelModifiers);
        console.log('b', travelSpeed);
        return Number(actor.data.data.attributes.speed.value) + travelSpeed.totalModifier;
    }

    private actorFormToSheetData(
        actor: PF2EActor,
        groupTravelModifiers: PF2Modifier[],
        data: FormActorData,
    ): SheetActorData {
        return {
            requiresDetectionMode: data.explorationActivity === 'Search' || data.explorationActivity === 'DetectMagic',
            detectionMode: data.detectionMode,
            explorationActivity: data.explorationActivity,
            explorationSpeed: parseFloat(
                calculateNormalizedCharacterSpeed(
                    data.speed,
                    parseExplorationActivity(data.explorationActivity),
                    parseDetectionModeData(data.detectionMode),
                    parseExplorationOptions(actor),
                ).toFixed(2),
            ),
            speed: this.getActorSpeed(actor, groupTravelModifiers),
            name: actor.name,
        };
    }

    private getInitialActorData(actor: PF2EActor, groupTravelModifiers: PF2Modifier[]): SheetActorData {
        return this.actorFormToSheetData(actor, groupTravelModifiers, {
            detectionMode: 'before',
            explorationActivity: 'Search',
            speed: actor.data.data.attributes.speed.total,
        });
    }

    private formToSheetData(actors: PF2EActor[], groupTravelModifiers: PF2Modifier[], data: TravelFormData): SheetData {
        const journey: Trip[] = [
            {
                terrainSlowdown: {
                    difficult: data.difficultTerrainSlowdown,
                    greaterDifficult: data.greaterDifficultTerrainSlowdown,
                    normal: data.normalTerrainSlowdown,
                },
                terrain: parseTerrainData(data.terrain),
                distance: {
                    value: data.distance,
                    unit: parseDistanceUnit(data.distanceUnit),
                },
            },
        ];
        const actorFormData = zip(actors, data.actors, (actor, actorData) =>
            this.actorFormToSheetData(actor, groupTravelModifiers, actorData),
        );
        const partySpeedInFeet = Math.min(...actorFormData.map((data) => data.explorationSpeed));
        const velocity = speedToVelocity(partySpeedInFeet);
        return {
            travelDuration: calculateTravelDuration(journey, velocity),
            distance: data.distance,
            actors: actorFormData,
            normalTerrainSlowdown: data.normalTerrainSlowdown,
            difficultTerrainSlowdown: data.difficultTerrainSlowdown,
            greaterDifficultTerrainSlowdown: data.greaterDifficultTerrainSlowdown,
            distanceUnit: data.distanceUnit,
            terrain: data.terrain,
            partySpeedInFeet,
        };
    }

    private getInitialFormData(actors: PF2EActor[], groupTravelModifiers: PF2Modifier[]): SheetData {
        return this.formToSheetData(actors, groupTravelModifiers, {
            actors: actors.map((actor) => this.getInitialActorData(actor, groupTravelModifiers)),
            terrain: 'normal',
            distanceUnit: 'miles',
            normalTerrainSlowdown: { denominator: 1, numerator: 1 },
            difficultTerrainSlowdown: { denominator: 1, numerator: 2 },
            greaterDifficultTerrainSlowdown: { denominator: 1, numerator: 3 },
            distance: 1,
        });
    }

    getData() {
        const actors: PF2EActor[] = this.options.actors;
        const groupTravelModifiers = actors.flatMap((actor) => {
            const modifier = new PF2CheckModifier('Land Travel Speed', actor.data.data.attributes.speed);
            return modifier.modifiers.filter((modifier) =>
                PF2ModifierPredicate.test(modifier.predicate, ['group-travel']),
            );
        });
        const sheetData = super.getData();
        let data: SheetData;
        if (this.formData === undefined) {
            data = this.getInitialFormData(actors, groupTravelModifiers);
        } else {
            data = this.formToSheetData(actors, groupTravelModifiers, this.formData);
        }
        Object.assign(sheetData, data);
        return sheetData;
    }
}

function parseDistanceUnit(unit: SpeedUnitData): LengthUnit {
    if (unit === 'feet') {
        return LengthUnit.FEET;
    } else {
        return LengthUnit.MILES;
    }
}

function parseTerrainData(terrain: TerrainData): Terrain {
    if (terrain === 'normal') {
        return Terrain.NORMAL;
    } else if (terrain === 'difficult') {
        return Terrain.DIFFICULT;
    } else {
        return Terrain.GREATER_DIFFICULT;
    }
}

function parseDetectionModeData(detectionMode: DetectionModeData): DetectionMode {
    if (detectionMode === 'none') {
        return DetectionMode.NONE;
    } else if (detectionMode === 'before') {
        return DetectionMode.DETECT_BEFORE_WALKING_INTO_IT;
    } else {
        return DetectionMode.DETECT_EVERYTHING;
    }
}

function parseExplorationActivity(activity: ExplorationActivitiesData): ExplorationActivities {
    if (activity === 'AvoidNotice') {
        return ExplorationActivities.AVOID_NOTICE;
    } else if (activity === 'Defend') {
        return ExplorationActivities.DEFEND;
    } else if (activity === 'DetectMagic') {
        return ExplorationActivities.DETECT_MAGIC;
    } else if (activity === 'Scout') {
        return ExplorationActivities.SCOUT;
    } else if (activity === 'Search') {
        return ExplorationActivities.SEARCH;
    } else if (activity === 'None') {
        return ExplorationActivities.NONE;
    } else {
        return ExplorationActivities.HALF_SPEED;
    }
}

function hasFeat(actor: PF2EActor, name: string): boolean {
    return actor.data.items.some((item) => item.type === 'feat' && item.name?.trim() === name);
}

function parseExplorationOptions(actor: PF2EActor): ExplorationOptions {
    // FIXME: instead of matching the name these should probably be rule toggles at some point
    return {
        practicedDefender: hasFeat(actor, 'Practiced Defender'),
        swiftSneak: hasFeat(actor, 'Swift Sneak'),
        legendarySneak: hasFeat(actor, 'Legendary Sneak'),
        expeditiousSearch: hasFeat(actor, 'Expeditious Search'),
        expeditiousSearchLegendary:
            hasFeat(actor, 'Expeditious Search') && actor.data.data.attributes?.perception?.rank === 4,
    };
}

/**
 * Turns {0: {...}, {1: {...}}} into [{...}, {...}]
 * @param data
 */
function toArray<T>(data: Record<number, T>): T[] {
    return Object.entries(data)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([_, a]) => a);
}

export function launchTravelSheet(actors: PF2EActor[]): void {
    new TravelSpeedSheet(null, { actors }).render(true);
}
