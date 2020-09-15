let applyChanges = false;
new Dialog({
    title: `Distribute Rewards`,
    content: `
        <div>Usage: Select all player tokens and input XP, Gold as Treasure Bundles, Fame, Rep, and Bonus Rep.<div>
        <hr/>
        <form>
            <div class="form-group">
                <label>XP</label>
                <input id="xp" name="xp" type="number"/>

                <label>Treasure Bundles</label>
                <input id="treasure" name="treasure" type="number"/>

                <label>Fame (PFS)</label>
                <input id="fame" name="fame" type="number"/>

                <label>Reputation for Slotted Faction (PFS)</label>
                <input id="rep" name="rep" type="number"/>

                <label>Faction for +2 Bonus Reputation (PFS)</label>
                <select id="faction" name="faction">
                    <option value="none">No Bonus Reputation</option>
                    <option value="EA">Envoy's Alliance</option>
                    <option value="GA">Grand Archive</option>
                    <option value="HH">Horizon Hunters</option>
                    <option value="VS">Vigilant Seal</option>
                    <option value="RO">Radiant Oath</option>
                    <option value="VW">Verdant Wheel</option>
                </select>
            </div>
        </form>
    `,
    buttons: {
        yes: {
            icon: "<i class='fas fa-check'></i>",
            label: `Apply to Selected Tokens`,
            callback: () => applyChanges = true
        },
        no: {
            icon: "<i class='fas fa-times'></i>",
            label: `Cancel`
        },
    },
    default: "yes",
    close: html => {
        if (applyChanges) {
            for ( let token of canvas.tokens.controlled ) {
                let xp = parseInt(html.find('[name="xp"]')[0].value) || 0;
                let treasure = parseInt(html.find('[name="treasure"]')[0].value) || 0;
                let fame = parseInt(html.find('[name="fame"]')[0].value) || 0;
                let rep = parseInt(html.find('[name="rep"]')[0].value) || 0;
                let bonusRep = html.find('[name="dc-type"]')[0].value || "none";
            }
        }
    }
}).render(true);