declare class RollTables extends EntityCollection<RollTable> {
    /** @override */
    get entity(): 'RollTable';
}

declare interface RollTableClassConfig extends EntityClassConfig<RollTable> {
    collection: RollTables;
    embeddedEntities: {
        TableResult: 'results';
    };
}

declare interface RollTableData extends Omit<BaseEntityData, 'type'> {
    displayRoll: boolean;
    formula: boolean;
    replacement: true;
    results: any[];
    sort: number;
}

declare class RollTable extends Entity {
    data: RollTableData;
    _data: RollTableData;

    /** @override */
    static get config(): RollTableClassConfig;

    /**
     * A convenience accessor for the array of TableResult embedded documents
     */
    get results(): any[];

    /* -------------------------------------------- */
    /*  Methods
    /* -------------------------------------------- */

    /**
     * Draw a result from the RollTable based on the table formula or a provided Roll instance
     * @param roll        An existing Roll instance to use for drawing from the table
     * @param results     One or more table results which have been drawn
     *
     * @param displayChat Whether to automatically display the results in chat
     * @param rollMode    The chat roll mode to use when displaying the result
     *
     * @return A Promise which resolves to an object containing the executed roll and the produced results
     */
    draw({
        roll,
        results,
        displayChat,
        rollMode,
    }?: {
        roll?: Roll;
        results?: any[];
        displayChat?: boolean;
        rollMode?: string;
    }): Promise<{ roll: Roll; results: any[] }>;

    /**
     * Draw multiple results from a RollTable, constructing a final synthetic Roll as a dice pool of inner rolls.
     * @param {number} number       The number of results to draw
     * @param {Roll} roll               An optional pre-configured Roll instance which defines the dice roll to use
     * @param {boolean} displayChat   Automatically display the drawn results in chat? Default is true
     * @param {string} rollMode       Customize the roll mode used to display the drawn results
     * @return {Promise<{roll: Roll, results: any[]}>}
     */
    drawMany(
        number?: number,
        { roll, displayChat, rollMode }?: { roll?: Roll; displayChat?: boolean; rollMode?: string },
    ): Promise<{ roll: Roll; results: any[] }>;

    /**
     * Display the result drawn from the table as a chat message
     * @param result
     * @param speaker
     * @param rollMode
     */
    protected _displayChatResult(result: object, speaker: object, rollMode: string): ChatMessage;

    /**
     * Normalize the probabilities of rolling each item in the RollTable based on their assigned weights
     */
    normalize(): Promise<RollTable>;

    /**
     * Reset the state of the RollTable to return any drawn items to the table
     */
    reset(): Promise<RollTable>;

    /**
     * Evaluate a RollTable, returning a the drawn result
     * @returns An Array, containing the Roll and the result
     */
    roll(): [Roll, any];

    /* -------------------------------------------- */
    /*  Table Result Management Methods             */
    /* -------------------------------------------- */

    /** @extends Entity.getEmbeddedEntity */
    getTableResult(id: string): any;
}