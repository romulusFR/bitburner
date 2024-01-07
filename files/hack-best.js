import { getServerStats } from "/lib/stats.js"
import { buildBatch } from "/scripts/batch.js"
import { buildPrepare } from "/scripts/prepare.js"

import constants from "/lib/constants.js";

/** @param {NS} ns */
export async function main(ns) {
    const {
        count: targetsCount,
        skip: skipTargets,
        ram: ramPercent,
        attr: sortAttribute,
        link: linkFunctionDef,
        prepare: prepareMode,
        loop: loopsCount,
        dry: dryRun,
        help
    } = ns.flags([
        ["count", 0],
        ["skip", 0],
        ["ram", 100],
        ["attr", "maxValueBySecByThread"], //maxMoney
        ["link", "x => x"],
        //        ["strat", "batch"], //See https://bitburner.readthedocs.io/en/latest/advancedgameplay/hackingalgorithms.html
        ["prepare", false],
        ["loop", Infinity],
        ["dry", false],
        ["help", false],
    ]
    );
    const linkFunction = eval(linkFunctionDef);
    if (help) {
        ns.tprint("This script launches a HGW batches on top targets");
        ns.tprint(`Usage: run ${ns.getScriptName()} --count 0 --skip 0 --ram 100 --attr maxMoney --link "x => x" [--prepare] [--loop] [--dry]`);
        return;
    }

    ns.disableLog("ALL")
    ns.tail()
    ns.clearLog()

    const currentHostname = ns.getHostname();
    const { cpuCores, maxRam, ramUsed } = ns.getServer(currentHostname);
    const ramAvailable = Math.min(maxRam * ramPercent / 100, maxRam - ramUsed)
    const servers = JSON.parse(ns.read(constants.serversStatsFilename))
    // ns.print(JSON.stringify(servers, null,2))
    // decreasing order on main stat
    servers.sort((x, y) => linkFunction(y[sortAttribute]) - linkFunction(x[sortAttribute]))
    // top n targets
    const targets = servers.filter((_, i) => !(i < skipTargets) && (i < targetsCount + skipTargets));
    const totalValue = servers.reduce((acc, x) => (linkFunction(x[sortAttribute]) + acc), 0);
    const targetsValue = targets.reduce((acc, x) => (linkFunction(x[sortAttribute]) + acc), 0);
    // ns.print(JSON.stringify(targets, null, 2))
    ns.print(`${ns.nFormat(targetsValue, "0a")}/${ns.nFormat(totalValue, "0a")}`)
    for (const infos of targets) {

        const attributeFractionTarget = infos[sortAttribute] / targetsValue
        ns.print(`${infos.hostname.padEnd(20)} ${ns.nFormat(infos[sortAttribute], "0a")} : ${ns.nFormat(attributeFractionTarget, "0.00%")}`)
        //const infos = action()


        const ramPercentTarget = ramPercent * attributeFractionTarget
        //prepare
        if (infos.moneyPc < 0.5 &&  prepareMode) {
            // if (infos.moneyPc > 0.5) {
            //     ns.print(`WARN ${infos.hostname} money ${infos.moneyPc} > 0.5`)
            //     continue;
            // }

            const argsPrepare = `--host ${infos.hostname} --steps ${0} --ram ${ns.nFormat(ramPercentTarget, "0.000")}${dryRun ? ' --dry' : ''}`.split(" ")
            ns.print(argsPrepare)
            const pidPrep = ns.exec(constants.scriptPrepare, currentHostname, 1, ...argsPrepare)
            if (!pidPrep) {
                ns.print(`ERROR running "${constants.scriptPrepare}" ${argsPrepare}`)
                continue;
            }
            ns.closeTail(pidPrep)
        }
        //hack
        else {
            // if (infos.moneyPc < 0.5) {
            //     ns.print(`WARN ${infos.hostname} money ${infos.moneyPc} < 0.5`)
            //     continue;
            // }

            const maxThreadsThreshold = 2 ** 8
            const possibleCounts = [1, 2, 5, 10, 20, 50, 100, 200].map(v => infos.referenceTime / v).filter(v => v < maxThreadsThreshold)
            const batchesCount = Math.floor(Math.max(...possibleCounts))
            const argsBatch = `--host ${infos.hostname} --threads 0 --batches ${batchesCount} --ram ${ns.nFormat(ramPercentTarget, "0.000")} --loops ${loopsCount}${dryRun ? ' --dry' : ''}`.split(" ")
            ns.print(argsBatch)
            const pidBatch = ns.exec(constants.scriptBatch, currentHostname, 1, ...argsBatch)
            if (!pidBatch) {
                ns.print(`ERROR running "${constants.scriptBatch}" ${argsBatch}`)
                continue;
            }
            ns.closeTail(pidBatch)
        }
        await ns.sleep(constants.timeQuantum)
    }
}