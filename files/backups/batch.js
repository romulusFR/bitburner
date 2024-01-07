// killall; run scan-servers.js ; run servers-stats.js --attr maxValueBySecByThread; run ui-extension.js

/** @param {NS} ns */
export async function main(ns) {
        const timeQuantum = 50
        const { host: hostname,
                prep: prepSteps,
                batch: batchesNb,
                threads: hackThreadsByBatch,
                dry: dryRun,
                loop: loopBatch,
                help
        } = ns.flags([
                ["host", undefined],
                ["batch", 1],
                ["threads", 1],
                ["prep", 0],
                ["dry", false],
                ["loop", Infinity],
                ["help", false]]
        );
        if (!hostname || help) {
                ns.tprint("This script launches a HGW batch on a target");
                ns.tprint(`Usage: run ${ns.getScriptName()} --host target --delta 50 --batch 1 --threads 1 --prep 0 --loop Infinity [--dry]`);
                return;
        }

        ns.disableLog("ALL")
        ns.tail()
        ns.clearLog()

        // host information
        const currentHostname = ns.getHostname();
        const { cpuCores, maxRam, ramUsed } = ns.getServer(currentHostname);
        const ramAvailable = maxRam - ramUsed
        ns.print(`#### ${ns.getScriptName()}@${currentHostname} (b=${batchesNb}, t=${hackThreadsByBatch}, δ=${timeQuantum}ms, p=${prepSteps}/l=${loopBatch}) on ${hostname} w/ ${dryRun ? '--dry' : ''}####`)

        if (!ns.serverExists(hostname)) {
                ns.tprint(`ERROR ${hostname} DOES NOT exist`)
                return;
        }

        // all stats
        const hackTime = ns.getHackTime(hostname);
        const growTime = ns.getGrowTime(hostname);
        const weakTime = ns.getWeakenTime(hostname);

        const availableMoney = ns.getServerMoneyAvailable(hostname);
        const maxMoney = ns.getServerMaxMoney(hostname);

        const hackValue = ns.hackAnalyze(hostname);
        const hackThreads = (prepSteps ? 0 : 1) * hackThreadsByBatch
        const hackSecInc = ns.hackAnalyzeSecurity(hackThreads, hostname)

        const growPreparation = Math.exp(Math.log(maxMoney / availableMoney) / (batchesNb * prepSteps))
        const growthMultiplier = prepSteps ? growPreparation : 1 / (1 - hackThreads * hackValue)
        if (!isFinite(growthMultiplier) || growthMultiplier < 0) {
                ns.print(`ERROR too many threads (${hackThreads}), growth is ${ns.nFormat(growthMultiplier, "0.0a")}. Max is ${ns.nFormat(1 / hackValue, "0.0a")}`)
                return;
        }

        // TODO : la fraction doit s'adapter au batch : lancer les batchs/round 1 à 1 sans boucle ?
        const growThreads = ns.growthAnalyze(hostname, growthMultiplier, cpuCores)
        const growSecInc = ns.growthAnalyzeSecurity(growThreads, hostname, cpuCores)

        const secPreparation = (ns.getServerSecurityLevel(hostname) - ns.getServerMinSecurityLevel(hostname)) / (batchesNb * prepSteps)
        const secDelta = prepSteps ? secPreparation : 0
        const totalSecDelta = hackSecInc + growSecInc + secDelta
        const weakThreads = totalSecDelta / ns.weakenAnalyze(1, cpuCores)

        const totalHGWThreads = Math.ceil(hackThreads) + Math.ceil(growThreads) + Math.ceil(weakThreads)

        const threadsInfos = `${totalHGWThreads}t=(${ns.nFormat(hackThreads, "0.0")}/${ns.nFormat(growThreads, "0.0")}/${ns.nFormat(weakThreads, "0.0")})`
        const hackInfo = `hack +\$${ns.nFormat(availableMoney * hackThreads * hackValue, "0.0a")}/batch (${ns.nFormat(hackThreads, "0.0a")}*${ns.nFormat(hackValue, "0.00%")}=${ns.nFormat(hackThreads * hackValue, "0.00%")}), +\$${ns.nFormat(availableMoney * hackThreads * hackValue * batchesNb, "0.0a")}/round of \$${ns.nFormat(maxMoney, "0a")}`
        const growthInfos = `grow x${ns.nFormat(growthMultiplier, "0.000")}/batch, x${ns.nFormat(growthMultiplier ** batchesNb, "0.00e+0")}/round`
        const weakInfos = `weak -${ns.nFormat(totalSecDelta, "0.000")}/batch, -${ns.nFormat(totalSecDelta * batchesNb, "0.00")}/round`

        ns.print(`${hostname} needs ${threadsInfos} x${batchesNb} batches=${totalHGWThreads * batchesNb}t`)
        ns.print(`${hackInfo}`)
        ns.print(`${growthInfos}`)
        ns.print(`${weakInfos}`)

        const maxTime = Math.max(hackTime, growTime, weakTime)
        const actionsInfos = new Map([
                ["hack", { time: hackTime, script: "/scripts/loop-hack.js", threads: Math.ceil(hackThreads) }],
                ["grow", { time: growTime, script: "/scripts/loop-grow.js", threads: Math.ceil(growThreads) }],
                ["weak", { time: weakTime, script: "/scripts/loop-weak.js", threads: Math.ceil(weakThreads) }],
        ]);

        // the ordered list of actions
        const actionsSequence = ["grow", "hack", "weak"]
        ns.print(`actions=${actionsSequence.join("/")}`)
        // timings
        const startTimes = actionsSequence.map((t, i) => maxTime - actionsInfos.get(t).time + i * timeQuantum)
        const batchShiftDelay = Math.floor(maxTime / batchesNb);
        const timingInfos = `${ns.nFormat(hackTime / 1000, "0a")}/${ns.nFormat(growTime / 1000, "0a")}/${ns.nFormat(weakTime / 1000, "0a")}`
        ns.print(`timings=${timingInfos} deltas=${startTimes.map(x => ns.nFormat(x / 1000, "0")).join('/')} shift=${ns.nFormat(batchShiftDelay / 1000, "0")}s round=${ns.nFormat((maxTime + batchesNb * batchShiftDelay) / 1000, "0")}s`)

        // threads and costs
        const threadsByBatch = actionsSequence.reduce((acc, action) => acc + Math.ceil(actionsInfos.get(action).threads), 0)
        const ramCostsByBatch = actionsSequence.map((action) => ns.getScriptRam(actionsInfos.get(action).script) * actionsInfos.get(action).threads)
        const totalRamCostByBatch = ramCostsByBatch.reduce((acc, x) => acc + x, 0)
        const totalRamCost = totalRamCostByBatch * batchesNb
        ns.print(`needs ${ramCostsByBatch.map(x => `${ns.nFormat(x, "0.0a")}GB`).join("/")}=${totalRamCostByBatch}GB, total ${ns.nFormat(totalRamCost * 2 ** 30, "0b")} (${ns.nFormat(totalRamCost / ramAvailable, "0.0%")} of ${ns.nFormat(ramAvailable * 2 ** 30, "0b")} available)`)

        if (!dryRun && totalRamCost > ramAvailable) {
                ns.print(`ERROR ${ns.nFormat(totalRamCost * 2 ** 30, "0b")} needed >  ${ns.nFormat(ramAvailable * 2 ** 30, "0b")}`)
                return;
        }

        for (let batch = 0; batch < batchesNb; ++batch) {
                const initTime = Math.round(batch * batchShiftDelay)
                // ns.print(`#${ns.nFormat(batch, "000")} @ shift=${ns.nFormat(initTime / 1000, "0")} `)
                for (let i = 0; i < actionsSequence.length; ++i) {
                        const action = actionsSequence[i]
                        const { script, threads } = actionsInfos.get(action)
                        const startTime = Math.floor(startTimes[i])
                        //ns.print(`\t${action}: "${script}" t=${ceilThreads} @${ns.nFormat((startTime + initTime) / 1000, "0")}`)
                        const loopCount = (prepSteps) ? prepSteps : loopBatch
                        const callArgs = [hostname, startTime, initTime, loopCount]
                        if (!dryRun && threads) {
                                const pid = ns.run(script, threads, ...callArgs)
                                if (pid == 0) {
                                        ns.print(`WARNING run ${script} -t ${threads} ${callArgs.join(" ")} (PID=${pid}, script already run) `)
                                }
                        }
                }
        }
} // end main

export function autocomplete(data, args) {
        return data.servers;
}