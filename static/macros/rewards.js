const treasureBundleValue = {
    1: 1.4,
    2: 2.2,
    3: 3.8,
    4: 6.4,
    5: 10,
    6: 15,
    7: 22,
    8: 30,
    9: 44,
    10: 60,
    11: 86,
    12: 124,
    13: 188,
    14: 274,
    15: 408,
    16: 620,
    17: 960,
    18: 1560,
    19: 2660,
    20: 3680
};

const questValue = {
    1: 3.5,
    2: 5.5,
    3: 9.5,
    4: 16,
    5: 25,
    6: 37.5,
    7: 55,
    8: 75,
    9: 110,
    10: 150,
    11: 215,
    12: 310,
    13: 470,
    14: 685,
    15: 1020,
    16: 1550,
    17: 2440,
    18: 3900,
    19: 6650,
    20: 9200
}

const goldToAward = (args) => {
    console.log('blarg args', args);
    const {currentLevel, quest, treasure, gold} = args;
    if (gold) {
        return gold;
    } else if (quest) {
        return questValue[currentLevel] || 0;
    } 

    return (treasureBundleValue[currentLevel]*treasure) || 0;
}

const calculateXPDelta = (args) => {
    let {currentLevel, tokenXP, xp, maxXP} = args;

    tokenXP += xp;
    while (tokenXP >= maxXP) {
        tokenXP -= maxXP;
        currentLevel++;
    }
    return {tokenXP, currentLevel}
}

let applyChanges = false;
new Dialog({
    title: `Distribute Rewards`,
    content: `
        <div>
            Usage: Select all player tokens and input XP, Gold as Treasure Bundles, Fame, Rep, and Bonus Rep. If this is a quest, check the quest checkbox. 
            <hr/>
            If you're using this for normal play you can simply input the gold per player you would like to distribute. 
            <hr/>
            Will also generate a chronicle sheet item which can be printed to pdf.
        <div>
        <hr/>
        <form>
            <label>XP</label>
            <input id="xp" name="xp" type="number"/>
            <hr/>

            <label>Raw Gold (non-PFS) - If present will ignore Treasure Bundles and Quest</label>
            <input id="gold" name="gold" type="number"/>
            <hr/>

            <label>Treasure Bundles (PFS)</label>
            <input id="treasure" name="treasure" type="number"/>

            <label>Is Quest? (PFS) - If present will ignore Treasure Bundles</label>
            <input type="checkbox" id="quest" name="quest" value="quest">
            <hr/>

            <label>Fame (PFS)</label>
            <input id="fame" name="fame" type="number"/>
            <hr/>

            <label>Reputation for Slotted Faction (PFS)</label>
            <input id="rep" name="rep" type="number"/>
            <hr/>

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
            <hr/>
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
            let xp = parseInt(html.find('[name="xp"]')[0]?.value) || 0;
            let treasure = parseInt(html.find('[name="treasure"]')[0]?.value) || 0;
            let fame = parseInt(html.find('[name="fame"]')[0]?.value) || 0;
            let rep = parseInt(html.find('[name="rep"]')[0]?.value) || 0;
            let bonusRep = html.find('[name="faction"]')[0]?.value || "none";
            let quest = html.find('[name="quest"]')[0].checked;
            let gold = parseInt(html.find('[name="gold"]')[0]?.value) || 0;
            console.log('blarg xp', xp);
            console.log('blarg treasure', treasure);
            console.log('blarg fame', fame);
            console.log('blarg rep', rep);
            console.log('blarg bonusRep', bonusRep);
            console.log('blarg quest', quest);
            console.log('blarg gold', gold);
            for ( let token of canvas.tokens.controlled ) {
                const data = token.actor.data.data;
                console.log('blarg data', data);
                let tokenXP = data.details.xp.value;
                let tokenFame = data.pfs.fame;
                let slottedFaction = data.pfs.currentFaction;
                let currentRep = data.pfs.reputation[slottedFaction];
                let currentLevel = data.details.level.value;
                let maxXP = data.details.xp.max;
                console.log('blarg tokenXP', tokenXP);
                console.log('blarg tokenFame', tokenFame);
                console.log('blarg slottedFaction', slottedFaction);
                console.log('blarg currentRep', currentRep);
                console.log('blarg currentLevel', currentLevel);
                console.log('blarg maxXP', maxXP);
                console.log(goldToAward({currentLevel,treasure,quest,gold}));
                console.log(calculateXPDelta({currentLevel,tokenXP,xp, maxXP}));

            }
        }
    }
}).render(true);