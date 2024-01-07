const moneyReserve = 500_000//2**30
const moneyFactor = 0.2
const waitMinutes = 5;
const maxNodesNb = 24;
const maxNodePrice = 2 ** 30;

/** @param {NS} ns */
export async function main(ns) {
    function pretty(x) {
        return ns.nFormat(x, '0a');
    }

    const initialMoney = ns.getServerMoneyAvailable("home")
    const reserve = Math.max(moneyReserve, initialMoney * moneyFactor)

    function money(total = false) {
        const currentMoney = ns.getServerMoneyAvailable("home")
        if (total)
            return currentMoney
        return Math.max(currentMoney - reserve, 0)
    }

    ns.tprint(`#### ${ns.getScriptName()} with initial ${pretty(initialMoney)}\$ and ${pretty(reserve)}\$ reserve ####`)

    while (true) {
        const nbNodes = ns.hacknet.numNodes()
        ns.tprint(`INFO currently ${nbNodes} nodes`) // /${ns.hacknet.maxNumNodes()}

        // in this loop, update as much as possible existing machines
        let someUpgrade;
        do {
            someUpgrade = false;
            for (let i = 0; i < nbNodes; ++i) {
                const { level, ram, cores, totalProduction, hashCapacity, production } = ns.hacknet.getNodeStats(i)
                const lvlCost = ns.hacknet.getLevelUpgradeCost(i, 10)
                const ramCost = ns.hacknet.getRamUpgradeCost(i, 1)
                const coreCost = ns.hacknet.getCoreUpgradeCost(i, 1)

                // ns.tprint(`#${i}: lvl=${level} RAM=${ram}GB cores=${cores} total=${pretty(totalProduction)}\$ at ${pretty(production)}\$/sec`)
                // ns.tprint(`    lvl+10=${pretty(lvlCost)}, ram+1=${pretty(ramCost)}, core+1=${pretty(coreCost)}`)

                if (lvlCost < money()) {
                    someUpgrade ||= ns.hacknet.upgradeLevel(i, 10)
                }
                if (ramCost < money()) {
                    someUpgrade ||= ns.hacknet.upgradeRam(i, 1)
                }
                if (coreCost < money()) {
                    someUpgrade ||= ns.hacknet.upgradeCore(i, 1)
                }
            }
        } while (someUpgrade)
        ns.tprint(`nothing to upgrade anymore with available money ${pretty(money())}\$ out of ${pretty(money(true))}\$`)

        let allMaxed = true
        for (let i = 0; i < nbNodes; ++i) {
            const lvlMaxed = !Number.isFinite(ns.hacknet.getLevelUpgradeCost(i, 1))
            const ramMaxed = !Number.isFinite(ns.hacknet.getRamUpgradeCost(i, 1))
            const coreMaxed = !Number.isFinite(ns.hacknet.getCoreUpgradeCost(i, 1))
            if (lvlMaxed && ramMaxed && coreMaxed) {
                ns.tprint(`INFO bitnode #${i} is maxed`)
            }
            else {
                ns.tprint(`INFO bitnode #${i} is NOT maxed`)
                allMaxed = false
                break;
            }
        }
        const nextNodePrice = ns.hacknet.getPurchaseNodeCost()
        if (allMaxed && nextNodePrice <= maxNodePrice && nextNodePrice < money()) {
            const newNode = ns.hacknet.purchaseNode()
            ns.tprint(`bought machine ${newNode}`)
        }

        ns.tprint(`waiting for ${waitMinutes} min`)
        await ns.sleep(waitMinutes * 60 * 1000)
    }
}