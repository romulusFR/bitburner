import { getServerStats } from "/lib/stats.js"
import constants from "/lib/constants.js"
// import { serversListFilename } from "/lib/constants.js"

/** @param {NS} ns */
export async function main(ns) {
    // ns.tprint(serversListFilename)
    ns.tprint(Object.keys(constants))

    if (!ns.args.length)
        throw new Error(`argument needed`)
    const hostname = ns.args[0]
    const infos = getServerStats(ns, hostname)
    ns.tprint(JSON.stringify(infos, null, 4))
    ns.tprint(Object.keys(infos))
}