/** Handlebars template subcomponents */
export function loadPF2ETemplates() {
    const templatePaths = [
        // effect panel
        'systems/pf2e/templates/system/effect-panel.html',

        // world clock
        'systems/pf2e/templates/system/world-clock.html',

        // Actor Sheets Partials (CRB-Style Tooltip)
        'systems/pf2e/templates/actors/crb-style/partials/modifiers-tooltip.html',

        // Actor Sheets Partials (CRB-Syle Sidebar)
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-armorclass.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-class-dc.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-health.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-stamina.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-resistances.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-perception.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-initiative.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-saves.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-ability-scores.html',

        // Actor Sheets Partials (CRB-Style Main Section)
        'systems/pf2e/templates/actors/crb-style/actor-header.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-character.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-actions.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-biography.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-effects.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-feats.html',
        'systems/pf2e/templates/actors/crb-style/tabs/inventory.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-pfs.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-skills.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-spellbook.html',
        'systems/pf2e/templates/actors/crb-style/tabs/item-line.html',
        'systems/pf2e/templates/actors/crb-style/character-traits.html',
        'systems/pf2e/templates/actors/crb-style/character-background.html',
        'systems/pf2e/templates/actors/crb-style/character-abilities.html',

        // Actor Sheet Partials (General)
        'systems/pf2e/templates/actors/spellcasting-spell-list.html',

        // NPC partials
        'systems/pf2e/templates/actors/npc/tabs/main.html',
        'systems/pf2e/templates/actors/npc/tabs/inventory.html',
        'systems/pf2e/templates/actors/npc/tabs/spells.html',
        'systems/pf2e/templates/actors/npc/tabs/notes.html',
        'systems/pf2e/templates/actors/npc/partials/header.html',
        'systems/pf2e/templates/actors/npc/partials/sidebar.html',
        'systems/pf2e/templates/actors/npc/partials/action.html',
        'systems/pf2e/templates/actors/npc/partials/attack.html',
        'systems/pf2e/templates/actors/npc/partials/item.html',

        // Item Sheet Partials
        'systems/pf2e/templates/items/ae-tab.html',
        'systems/pf2e/templates/items/rules-panel.html',
        'systems/pf2e/templates/items/action-details.html',
        'systems/pf2e/templates/items/action-sidebar.html',
        'systems/pf2e/templates/items/ancestry-details.html',
        'systems/pf2e/templates/items/ancestry-sidebar.html',
        'systems/pf2e/templates/items/armor-details.html',
        'systems/pf2e/templates/items/armor-sidebar.html',
        'systems/pf2e/templates/items/background-details.html',
        'systems/pf2e/templates/items/background-sidebar.html',
        'systems/pf2e/templates/items/backpack-details.html',
        'systems/pf2e/templates/items/backpack-sidebar.html',
        'systems/pf2e/templates/items/treasure-sidebar.html',
        'systems/pf2e/templates/items/class-details.html',
        'systems/pf2e/templates/items/consumable-details.html',
        'systems/pf2e/templates/items/consumable-sidebar.html',
        'systems/pf2e/templates/items/condition-details.html',
        'systems/pf2e/templates/items/condition-sidebar.html',
        'systems/pf2e/templates/items/effect-sidebar.html',
        'systems/pf2e/templates/items/equipment-details.html',
        'systems/pf2e/templates/items/equipment-sidebar.html',
        'systems/pf2e/templates/items/feat-details.html',
        'systems/pf2e/templates/items/feat-sidebar.html',
        'systems/pf2e/templates/items/kit-details.html',
        'systems/pf2e/templates/items/kit-sidebar.html',
        'systems/pf2e/templates/items/lore-details.html',
        'systems/pf2e/templates/items/lore-sidebar.html',
        'systems/pf2e/templates/items/mystify-panel.html',
        'systems/pf2e/templates/items/spell-details.html',
        'systems/pf2e/templates/items/spell-sidebar.html',
        'systems/pf2e/templates/items/melee-details.html',
        'systems/pf2e/templates/items/weapon-details.html',
        'systems/pf2e/templates/items/weapon-sidebar.html',

        // Loot partials
        'systems/pf2e/templates/actors/loot/inventory.html',
        'systems/pf2e/templates/actors/loot/sidebar.html',

        // Vehicle partials
        'systems/pf2e/templates/actors/vehicle/vehicle-sheet.html',
        'systems/pf2e/templates/actors/vehicle/vehicle-header.html',
        'systems/pf2e/templates/actors/vehicle/sidebar/vehicle-health.html',
        'systems/pf2e/templates/actors/vehicle/sidebar/vehicle-armorclass.html',
        'systems/pf2e/templates/actors/vehicle/sidebar/vehicle-saves.html',
        'systems/pf2e/templates/actors/vehicle/sidebar/vehicle-resistances.html',
        'systems/pf2e/templates/actors/vehicle/tabs/vehicle-details.html',
        'systems/pf2e/templates/actors/vehicle/tabs/vehicle-actions.html',
        'systems/pf2e/templates/actors/vehicle/tabs/vehicle-inventory.html',
        'systems/pf2e/templates/actors/vehicle/tabs/vehicle-description.html',

        // Compendium Browser Partials
        'systems/pf2e/templates/packs/action-browser.html',
        'systems/pf2e/templates/packs/bestiary-browser.html',
        'systems/pf2e/templates/packs/inventory-browser.html',
        'systems/pf2e/templates/packs/feat-browser.html',
        'systems/pf2e/templates/packs/hazard-browser.html',
        'systems/pf2e/templates/packs/spell-browser.html',
        'systems/pf2e/templates/packs/browser-settings.html',
    ];
    return loadTemplates(templatePaths);
}
