// killall; run scan-servers.js ; run servers-stats.js --attr maxValueBySecByThread; run ui-extension.js
import constants from "/lib/constants.js";




export function buildPrepare(ns, hostname, stepsCountArg, cpuCores, ramAvailable, log) {
        // const batchesInfos = buildBatch(ns, hostname, batchesCount, baseHackThreads, cpuCores, true)

        const logger = (log) ? ns.print : () => undefined

        // all stats
        const growTime = ns.getGrowTime(hostname);
        const weakTime = ns.getWeakenTime(hostname);
        const weakTimeFactor = weakTime / growTime
        const availableMoney = ns.getServerMoneyAvailable(hostname);
        const maxMoney = ns.getServerMaxMoney(hostname);

        let stepsCount = (stepsCountArg < 1) ? 1 : stepsCountArg
        const logGrowthMultiplier = Math.log(maxMoney / availableMoney)
        const growthMultiplier = Math.exp(logGrowthMultiplier / stepsCount)
        if (!isFinite(growthMultiplier) || growthMultiplier < 0) {
                ns.print(`ERROR growth is ${ns.nFormat(growthMultiplier, "0.0a")}.`)
                return;
        }

        const growThreads = ns.growthAnalyze(hostname, growthMultiplier, cpuCores)
        const growSecInc = ns.growthAnalyzeSecurity(growThreads, hostname, cpuCores)

        const secPreparation = ns.getServerSecurityLevel(hostname) - ns.getServerMinSecurityLevel(hostname)
        const totalSecDelta = growSecInc + secPreparation
        const weakThreads = weakTime * (totalSecDelta / ns.weakenAnalyze(1, cpuCores)) / (stepsCount * growTime)

        const totalGWThreads = Math.ceil(growThreads) + Math.ceil(weakThreads)

        const threadsInfos = `${totalGWThreads}t=${ns.nFormat(growThreads, "0.0")}/${ns.nFormat(weakThreads, "0.0")}`
        const growthInfos = `grow x${ns.nFormat(growthMultiplier, "0.000")}/batch, x${ns.nFormat(growthMultiplier ** stepsCount, "0.00e+0")}/round`
        const weakInfos = `weak -${ns.nFormat(totalSecDelta, "0.000")}/batch, -${ns.nFormat(totalSecDelta * stepsCount, "0.00")}/round`

        logger(`${hostname} needs ${threadsInfos} on ${stepsCount} steps in ${ns.nFormat(growTime * stepsCount / 1000, "0")}s`)
        logger(`${growthInfos}`)
        logger(`${weakInfos}`)

        const actionsInfos = [
                ["grow", { time: growTime, script: constants.scriptGrowLoop, threads: Math.ceil(growThreads), steps: stepsCount }],
                ["weak", { time: weakTime, script: constants.scriptWeakLoop, threads: Math.ceil(weakThreads), steps: stepsCount / weakTimeFactor }],
        ];
        // the ordered list of actions

        let ramCosts = actionsInfos.map(([_, infos]) => ns.getScriptRam(infos.script) * infos.threads)
        let totalRamCost = ramCosts.reduce((acc, x) => acc + x, 0)

        const threadsFactor = ramAvailable / totalRamCost
        if ((stepsCountArg < 1) && (threadsFactor < 1)) {
                logger(`INFO  automatic adjustement f=${ns.nFormat(threadsFactor, "0.000")}, 1/f=${ns.nFormat(1 / threadsFactor, "0.000")}`)
                stepsCount = Math.ceil(1 / threadsFactor)
                actionsInfos[0][1].steps = stepsCount
                actionsInfos[1][1].steps = stepsCount / weakTimeFactor
                actionsInfos[0][1].threads /= stepsCount
                actionsInfos[1][1].threads /= stepsCount / weakTimeFactor
                ramCosts = actionsInfos.map(([_, infos]) => ns.getScriptRam(infos.script) * infos.threads)
                totalRamCost = ramCosts.reduce((acc, x) => acc + x, 0)
        }

        // const { actions: actionsSequence, batchShiftDelay, maxTime, growthMultiplier, totalRamCostByBatchByThread, threadsByBatch } = batchesInfos
        const actions = actionsInfos.map(([action, infos], i) => ({ rank: i, action, ...infos, ram: ramCosts[i] }))
        return { hostname, stepsCount, threadsFactor, secDelta: totalSecDelta, growthMultiplier, totalRamCost, actions }
}

/** @param {NS} ns */
export async function main(ns) {
        const { host: hostname,
                steps: stepsCountArg,
                ram: ramPercent,
                dry: dryRun,

                help
        } = ns.flags([
                ["host", undefined],
                ["steps", 1],
                ["ram", 100],
                ["dry", false],
                ["help", false],
        ]
        );
        if (!hostname || help) {
                ns.tprint("This script prepares a target to 100% money and min security");
                ns.tprint(`Usage: run ${ns.getScriptName()} --host target --steps 1 [0=auto] --ram 100 [--dry]`);
                return;
        }

        ns.disableLog("ALL")
        // ns.tail()
        ns.clearLog()

        // host information
        const currentHostname = ns.getHostname();
        const { cpuCores, maxRam, ramUsed } = ns.getServer(currentHostname);
        // const ramAvailable = ramPercent * (maxRam - ramUsed) / 100
        const ramAvailable = Math.min(maxRam * ramPercent / 100, maxRam - ramUsed)
        ns.print(`#### ${ns.getScriptName()}@${currentHostname} (p=${stepsCountArg}) on ${hostname} w/ ${dryRun ? '--dry' : ''} ####`)

        if (!ns.serverExists(hostname)) {
                ns.tprint(`ERROR ${hostname} DOES NOT exist`)
                return;
        }


        const infos = buildPrepare(ns, hostname, stepsCountArg, cpuCores, ramAvailable, true)
        // ns.print(JSON.stringify(infos, null, 2))
        const { actions, totalRamCost } = infos
        const ramCosts = actions.map(x => x.ram)
        /////////////////////////////////////////////////////////

        ns.print(`needs ${ramCosts.map(x => `${ns.nFormat(x * 2 ** 30, "0.0ib")}`).join("/")}=${ns.nFormat(totalRamCost * 2 ** 30, "0.0ib")} (${ns.nFormat(totalRamCost / (ramAvailable + 1), "0.0%")} of ${ns.nFormat(ramAvailable * 2 ** 30, "0ib")} available)`)

        if (totalRamCost > ramAvailable) {
                ns.print(`ERROR ${ns.nFormat(totalRamCost * 2 ** 30, "0b")} needed >  ${ns.nFormat(ramAvailable * 2 ** 30, "0b")}`)
                return;
        }

        if (dryRun) {
                // ns.print(`details :`)
                return;
        }


        for (const infos of actions) {
                const { script, threads, steps } = infos
                const callArgs = [hostname, 0, 0, Math.ceil(steps)]
                if (!dryRun && threads) {
                        const pid = ns.run(script, threads, ...callArgs)
                        if (pid == 0) {
                                ns.print(`WARNING run ${script} -t ${threads} ${callArgs.join(" ")} (PID=${pid}, script already run?) `)
                        }
                }
        }

} // end main

export function autocomplete(data, args) {
        return data.servers;
}