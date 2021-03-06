/**
 * A shared pattern for the sidebar directory which Actors, Items, and Scenes all use
 */
declare class SidebarDirectory extends SidebarTab {
    /**
     * References to the set of Entities which are displayed in the Sidebar
     */
    entities: foundry.abstract.Document[];

    /**
     * Reference the set of Folders which exist in this Sidebar
     */
    folders: Folder[];

    /**
     * The search string currently being filtered for
     */
    searchString: string;

    initialize(): void;

    /**
     * Activate this SidebarTab, switching focus to it
     */
    activate(): void;

    /**
     * Given an entity type and a list of entities, set up the folder tree for that entity
     * @param folders   The Array of Folder objects to organize
     * @param entities  The Array of Entity objects to organize
     * @param sortMode  How should entities or Folders be sorted? (a)lphabetic or (n)umeric
     * @return          A tree structure containing the folders and entities
     */
    static setupFolders(
        folders: Folder[],
        entities: foundry.abstract.Document[],
        sortMode: string,
    ): { root: boolean; content: foundry.abstract.Document[]; children: any[] };

    static get entity(): foundry.abstract.Document;

    static get entityLower(): foundry.abstract.Document;

    static get collection(): foundry.utils.Collection<foundry.abstract.Document>;

    /**
     * Collapse all subfolders in this directory
     */
    collapseAll(): void;
}
