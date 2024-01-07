// killall; run scan-servers.js ; run servers-stats.js --attr maxValueBySecByThread; run ui-extension.js

import { getServerStats } from "/lib/stats.js"
import constants from "/lib/constants.js";
const timeQuantum = constants.timeQuantum // δ=${timeQuantum}ms,

/** @param {NS} ns */
export function buildBatch(ns, hostname, batchesCount = 1, baseHackThreads = 1, cpuCores = 1, log = true) {
        const logger = (log) ? ns.print : () => undefined

        const infos = getServerStats(ns, hostname)
        const hackThreads = baseHackThreads
        const hackSecInc = ns.hackAnalyzeSecurity(hackThreads, hostname)

        const growthMultiplier = 1 / (1 - hackThreads * infos.hackValue)


        // TODO : la fraction doit s'adapter au batch et à l'évolution deu hacking level : lancer les batchs/round 1 à 1 sans boucle ?
        const growThreads = ns.growthAnalyze(hostname, growthMultiplier, cpuCores)
        const growSecInc = ns.growthAnalyzeSecurity(growThreads, hostname, cpuCores)

        const secDelta = hackSecInc + growSecInc
        const weakThreads = secDelta / ns.weakenAnalyze(1, cpuCores)

        const totalHGWThreads = Math.ceil(hackThreads) + Math.ceil(growThreads) + Math.ceil(weakThreads)

        const threadsInfos = `${ns.nFormat(hackThreads, "0.0")}/${ns.nFormat(growThreads, "0.0")}/${ns.nFormat(weakThreads, "0.0")}=${totalHGWThreads}t`
        const hackedMoneyAvailable = infos.moneyAvailable * hackThreads * infos.hackValue
        const hakcDetails = `(${ns.nFormat(hackThreads, "0a")}*${ns.nFormat(infos.hackValue, "0.00%")}=${ns.nFormat(hackThreads * infos.hackValue, "0.00%")})`
        const hackInfo = `hack   : +\$${ns.nFormat(hackedMoneyAvailable, "0.0a")}/batch, +\$${ns.nFormat(hackedMoneyAvailable * batchesCount, "0.0a")}/round`
        const growthInfos = `grow   : x${ns.nFormat(growthMultiplier, "0.000")}/batch, x${ns.nFormat(growthMultiplier ** batchesCount, "0.00e+0")}/round`
        const weakInfos = `weak   : -${ns.nFormat(secDelta, "0.000")}/batch, -${ns.nFormat(secDelta * batchesCount, "0.00")}/round`

        logger(`threads: ${threadsInfos} * ${batchesCount} batches => ${totalHGWThreads * batchesCount}t`)
        logger(`${hackInfo} ${hakcDetails}`)
        logger(`${growthInfos}`)
        logger(`${weakInfos}`)

        const actionsInfos = new Map([
                ["hack", { time: infos.hackTime, script: constants.scriptHackLoop, threads: Math.ceil(hackThreads) }],
                ["grow", { time: infos.growTime, script: constants.scriptGrowLoop, threads: Math.ceil(growThreads) }],
                ["weak", { time: infos.weakTime, script: constants.scriptWeakLoop, threads: Math.ceil(weakThreads) }],
        ]);

        // the ordered list of actions
        const actionsSequence = ["grow", "hack", "weak"]
        const maxTime = Math.max(...actionsSequence.map(a => actionsInfos.get(a).time))
        logger(`actions: ${actionsSequence.join("/")}`)
        // timings
        const startTimes = actionsSequence.map((t, i) => Math.round(maxTime - actionsInfos.get(t).time + i * timeQuantum))
        const batchShiftDelay = Math.round(maxTime / batchesCount);
        const timingInfos = `${ns.nFormat(infos.hackTime / 1000, "0a")}/${ns.nFormat(infos.growTime / 1000, "0a")}/${ns.nFormat(infos.weakTime / 1000, "0a")}`
        logger(`timings: ${timingInfos} δ=${startTimes.map(x => ns.nFormat(x / 1000, "0")).join('/')} shift=${ns.nFormat(batchShiftDelay / 1000, "0")}s round=${ns.nFormat((maxTime + batchesCount * batchShiftDelay) / 1000, "0")}s`)

        // threads and costs
        const threadsByBatch = actionsSequence.reduce((acc, action) => acc + Math.ceil(actionsInfos.get(action).threads), 0)
        const ramCostsByBatch = actionsSequence.map((action) => ns.getScriptRam(actionsInfos.get(action).script) * actionsInfos.get(action).threads)
        const totalRamCostByBatch = ramCostsByBatch.reduce((acc, x) => acc + x, 0)
        const totalRamCostByBatchByThread = totalRamCostByBatch / hackThreads
        const totalRamCost = totalRamCostByBatch * batchesCount
        logger(`memory : ${ramCostsByBatch.map(x => `${ns.nFormat(x * 2 ** 30, "0.0ib")}`).join("/")}=${ns.nFormat(totalRamCostByBatch * 2 ** 30, "0.0ib")}/batch`)

        const actions = actionsSequence.map((action, i) => ({ rank: i, action, ...actionsInfos.get(action), ram: ramCostsByBatch[i], startTime: startTimes[i] }))
        return { hostname, hackValue: infos.hackValue, batchesCount, baseHackThreads, maxTime, batchShiftDelay, secDelta, growthMultiplier, threadsByBatch, totalRamCostByBatchByThread, totalRamCostByBatch, totalRamCost, actions }
}

/** @param {NS} ns */
export async function main(ns) {
        const printRam = (value) => ns.nFormat(value * 2 ** 30, "0.0ib")
        const { host: hostname,
                batches: batchesCountArg,
                threads: baseHackThreadsArg,
                loops: loopsCount,
                ram: ramPercent,
                dry: dryRun,
                help
        } = ns.flags([
                ["host", undefined],
                ["batches", 1],
                ["threads", 1],
                ["loops", Infinity],
                ["ram", 100],
                ["dry", false],
                ["help", false],
        ]
        );
        if (!hostname || help) {
                ns.tprint("This script launches a HGW batch on a target");
                ns.tprint(`Usage: run ${ns.getScriptName()} --host target --batches 1 [0=auto] --threads 1 [0=auto] --ram 100 --loops Infinity [--dry]`);
                return;
        }
        if (!ns.serverExists(hostname)) {
                ns.print(`ERROR ${hostname} DOES NOT exist`)
                return;
        }

        ns.disableLog("ALL")
        // ns.tail()
        ns.clearLog()

        // host information
        const currentHostname = ns.getHostname();
        const { maxRam, ramUsed, cpuCores } = ns.getServer(currentHostname);
        const ramAvailable = Math.min(maxRam * ramPercent / 100, maxRam - ramUsed)
        let batchesCount = (batchesCountArg < 1) ? 1 : batchesCountArg;
        let baseHackThreads = (baseHackThreadsArg < 1) ? 1 : baseHackThreadsArg;
        if (batchesCountArg < 1 && baseHackThreadsArg < 1) {
                ns.print(`ERROR only one of {--batches=${batchesCountArg}, --threads=${baseHackThreadsArg}} can be auto`)
                return;
        }

        ns.print(`## ${ns.getScriptName()}@${currentHostname}/${hostname} (b=${batchesCountArg}, t=${baseHackThreadsArg}, l=${loopsCount}, r=${ns.nFormat(ramPercent, "0")}%) ##`)
        // call external function that sets up bacthes from stats
        const batchesInfos = buildBatch(ns, hostname, batchesCount, baseHackThreads, cpuCores, true)
        // ns.print(JSON.stringify(batchesInfos, null, 2))
        const { actions: actionsSequence, batchShiftDelay, maxTime, growthMultiplier, totalRamCostByBatchByThread, threadsByBatch, hackValue } = batchesInfos

        if (batchesCountArg < 1) {
                batchesCount = Math.floor(ramAvailable / (totalRamCostByBatchByThread * baseHackThreads))
                ns.print(`INFO   : batches auto mode`)
        }
        // threads auto mode
        if (baseHackThreadsArg < 1) {
                baseHackThreads = Math.floor(ramAvailable / (totalRamCostByBatchByThread * batchesCount))
                ns.print(`INFO   : threads auto mode`)
        }

        // 50% of maxmoney
        const maxThreads = Math.round(0.5 / hackValue)
        if (baseHackThreads > maxThreads) {
                ns.print(`WARN   : ${ns.nFormat(baseHackThreads, "0a")}t > ${ns.nFormat(maxThreads, "0a")}t MAX`)
        }
        baseHackThreads = Math.min(baseHackThreads, maxThreads)

        const totalRamCost = totalRamCostByBatchByThread * batchesCount * baseHackThreads
        const duration = (1 + (batchesCount - 1) / batchesCount) * maxTime




        // ns.print([totalRamCostByBatchByThread, batchesCount, baseHackThreads, totalRamCost].map(x => `${x}`).join("/"))
        // ${threadsByBatch}t*${batchesCount}=${threadsByBatch * batchesCount}t, 
        // ns.print(baseHackThreads, "/", totalRamCost, "/", totalRamCostByBatchByThread, "/", duration)
        ns.print(`total  : ${printRam(totalRamCostByBatchByThread)}*${ns.nFormat(batchesCount, "0a")}b*${baseHackThreads}t=${printRam(totalRamCost)} (${ns.nFormat(totalRamCost / (ramAvailable + 1), "0.00%")} of ${printRam(ramAvailable)}), ${Math.round(duration)}s/round`)

        if (!isFinite(growthMultiplier) || growthMultiplier < 0) {
                ns.print(`ERROR too many threads (${hackThreads}), growth is ${ns.nFormat(growthMultiplier, "0.0a")}. Max is ${ns.nFormat(maxThreads, "0.0a")}`)
                return;
        }

        if (totalRamCost > ramAvailable) {
                ns.print(`ERROR ${printRam(totalRamCost)} needed >  ${printRam(ramAvailable)}`)
                return;
        }

        if (dryRun) {
                // ns.print(`details :`)
                // ns.print(JSON.stringify(batchesInfos, null, 2));
                return;
        }

        for (let batch = 0; batch < batchesCount; ++batch) {
                for (const action of actionsSequence) {
                        const { script, threads, startTime } = action
                        const initTime = batch * batchShiftDelay
                        const callArgs = [hostname, startTime, initTime, loopsCount]
                        if (threads * baseHackThreads) {
                                const pid = ns.run(script, threads * baseHackThreads, ...callArgs)
                                if (pid == 0) {
                                        ns.print(`WARNING run ${script} -t ${threads * baseHackThreads} ${callArgs.join(" ")} (PID=${pid}, script already run?) `)
                                }
                        }
                }
        }
} // end main

export function autocomplete(data, args) {
        return data.servers;
}