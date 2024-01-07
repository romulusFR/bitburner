/** @param {NS} ns */
export async function main(ns) {
    const locations = ns.infiltration.getPossibleLocations()
    const infiltrations = locations.map(loc => ({ ...loc, ...ns.infiltration.getInfiltration(loc.name) }))
    infiltrations.sort((x, y) => x.reward.sellCash - y.reward.sellCash)

    // ns.tprint(locations)
    // ns.tprint(infiltrations)
    
    for (const infiltration of infiltrations) {
        ns.tprint(`${infiltration.name}@${infiltration.city} (difficulty = ${ns.nFormat(infiltration.difficulty, "0")}):`)
        ns.tprint(`\t${ns.nFormat(infiltration.reward.sellCash, "0.00a")}\$ or +${ns.nFormat(infiltration.reward.tradeRep, "0.00a")} rep for trade (+${ns.nFormat(infiltration.reward.SoARep, "0.00a")} rep for Shadow of Anarchy)`)
    }
}