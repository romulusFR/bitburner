import constants from "/lib/constants.js"
import { getServerStats } from "/lib/stats.js"

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL")
    ns.tail()
    ns.clearLog()
    ns.moveTail(66, 50)
    ns.resizeTail(1624, 1280)
    
    const { attr: sortAttribute, link, loop, wait, help } = ns.flags([
        ["attr", "maxValueBySecByThread"], // maxValueBySec maxValueBySec maxValueBySecByThread
        ["link", "x => x"],
        ["loop", true],
        ["wait", 1],
        ["help", false]
    ]);
    const linkFunction = eval(link);

    if (help) {
        ns.tprint("This script display stats on all hackable money servers. Stats are from /lib/stats.js, wait is in min.");
        ns.tprint(`Usage: run ${ns.getScriptName()} --attr valueBySecByThread --link "x => x" --loops true --wait 1`);
        return;
    }

    const screenWidth = 140
    do {
        const title = `${ns.getScriptName()}@${ns.getHostname()}`
        ns.print(`${'#'.repeat(Math.floor((screenWidth - title.length) / 2))} ${title}/${sortAttribute} ${'#'.repeat(Math.round((screenWidth - title.length) / 2))}`)
        // filter out own servers and those with nothing or that cannot be hacked
        const servers = JSON.parse(ns.read(constants.serversListFilename))
            .filter(([_, infos]) => infos.rooted && !infos.owned && !infos.faction && infos.maxMoney)
        const stats = servers.map(([hostname, infos]) => {
            const stats = getServerStats(ns, hostname)
            stats.value = linkFunction(stats[sortAttribute])
            stats.link = link
            stats.attr = sortAttribute
            return { ...infos, ...stats }
        })

        // decreasing order on main stat
        stats.sort((x, y) => y.value - x.value)
        const totalValue = stats.reduce((acc, x) => (x.value + acc), 0);

        // print loop + relative infos
        let rank = 0
        for (const { hostname, ...infos } of stats) {
            // ns.print(JSON.stringify(infos, null, 2))
            infos.rank = ++rank
            infos.valuePc = infos.value / totalValue
            infos.valueFactor = stats[0].value / infos.value
            const moneyInfos = `${ns.nFormat(infos.moneyAvailable, "0.0a$").padStart(7)}/${ns.nFormat(infos.maxMoney, "0.0a$").padStart(7)} (${ns.nFormat(infos.moneyPc, "0%").padStart(4)})`
            const securityInfos = `${infos.minSecurityLevel.toFixed(0).padStart(2)}/${infos.securityLevel.toFixed(0).padStart(2)}`
            const timingInfos = `${ns.nFormat(infos.hackTime / 1000, "0a")}/${ns.nFormat(infos.growTime / 1000, "0a")}/${ns.nFormat(infos.weakTime / 1000, "0a")}`
            const valueBySecInfos = `${ns.nFormat(infos.valueBySec, "0.0a$").padStart(7)}/s of ${ns.nFormat(infos.maxValueBySec, "0.0a$").padStart(7)}/s`
            const hackInfos = `${ns.nFormat(infos.hackChance, "0%").padStart(4)} / +${ns.nFormat(infos.hackValue, "0.000%").padStart(5)}`
            const threadsInfos = `G=${ns.nFormat(infos.growOneHackThreads, "0.0a").padStart(5)}t, W=${ns.nFormat(infos.weakSecDecThreads, "0.0")}t, Σ=${ns.nFormat(infos.totalHGWThreads, "0.0a").padStart(4)}t`
            const valueBySecByThreadsInfos = `${ns.nFormat(infos.valueBySecByThread, "0.0a$").padStart(7)}/s of ${ns.nFormat(infos.maxValueBySecByThread, "0.0a$").padStart(7)}/s`
            // const pcInfos = `${ns.nFormat(infos.valuePc, "0%").padStart(4)} / x${ns.nFormat(infos.valueFactor, "0.0a").padEnd(5)}`
            ns.print(`#${ns.nFormat(infos.rank, "00")} ${hostname.padEnd(20)} ${moneyInfos} sec=${securityInfos} h/g/w=${timingInfos.padEnd(11)} [${valueBySecInfos}] (${hackInfos}) ${threadsInfos} [${valueBySecByThreadsInfos}]`) // =>${pcInfos}!
        }

        const content = JSON.stringify(stats, null, "    ")
        await ns.write(constants.serversStatsFilename, content, "w")
        await ns.sleep(wait * 1000);
        ns.clearLog()
    } while (loop)
}