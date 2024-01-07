// killall; run scan-servers.js ; run servers-stats.js --attr maxValueBySecByThread; run ui-extension.js

import constants from "/lib/constants.js";
const timeQuantum = constants.timeQuantum // δ=${timeQuantum}ms,


/** @param {NS} ns */
export async function main(ns) {
        const { host: hostname,
                prep: prepareOnly,
                threads: threadsMultiplier,
                dry: dryRun,
                hack: hackWeight,
                grow: growWeight,
                weak: weakWeight,
                help
        } = ns.flags([
                ["host", undefined],
                ["threads", 1],
                ["hack", 1],
                ["grow", 10],
                ["weak", 2],
                ["prep", false],
                ["dry", false],
                ["help", false],]
        );
        if (!hostname || help) {
                ns.tprint("This script launches parallels GHW loops on a target");
                ns.tprint(`Usage: run ${ns.getScriptName()} --host target --hack 1 --grow 10 --weak 2 --threads 1 [--prep] [--dry]`);
                return;
        }

        ns.disableLog("ALL")
        ns.tail()
        ns.clearLog()

        // host information
        const currentHostname = ns.getHostname();
        const { cpuCores, maxRam, ramUsed } = ns.getServer(currentHostname);
        const ramAvailable = maxRam - ramUsed
        const weigths = [hackWeight, growWeight, weakWeight].map(w => ns.nFormat(w, "0a")).join("/")
        ns.print(`#### ${ns.getScriptName()}@${currentHostname} (t=${threadsMultiplier}, δ=${timeQuantum}ms) with ${weigths} on "${hostname}" w/ ${prepareOnly ? '--prep ' : ''}${dryRun ? '--dry ' : ''}####`)

        if (!ns.serverExists(hostname)) {
                ns.tprint(`ERROR ${hostname} DOES NOT exist`)
                return;
        }

        // all stats
        // const hackValue = ns.hackAnalyze(hostname);

        // const hackTime = ns.getHackTime(hostname);
        // const growTime = ns.getGrowTime(hostname);
        // const weakTime = ns.getWeakenTime(hostname);

        // const growHackRatio = hackTime / growTime;
        // const weakHackRatio = weakTime / growTime;
        // const weakGrowRatio = weakTime / growTime;

        // const growthMultiplier = 1 / (1 - threadsMultiplier * hackValue)
        // if (!isFinite(growthMultiplier) || growthMultiplier < 0) {
        //         ns.print(`ERROR too many threads (${threadsMultiplier}), growth is ${ns.nFormat(growthMultiplier, "0.0a")}. Max is ${ns.nFormat(1 / hackValue, "0.0a")}`)
        //         return;
        // }

        // // TODO : la fraction doit s'adapter au batch : lancer les batchs/round 1 à 1 sans boucle ?
        // const growThreads = growHackRatio * ns.growthAnalyze(hostname, growthMultiplier, cpuCores) 
        // const growSecInc = ns.growthAnalyzeSecurity(growThreads, hostname, cpuCores)
        // const weakThreads = growThreads*


        const actionsInfos = [
                ["hack", { weight: hackWeight, script: "/scripts/loop-hack.js" }],
                ["grow", { weight: growWeight, script: "/scripts/loop-grow.js" }],
                ["weak", { weight: weakWeight, script: "/scripts/loop-weak.js" }],
        ]
        actionsInfos.forEach(([a, i]) => i.ram = ns.getScriptRam(i.script, currentHostname));
        const totalWeightedRamCost = threadsMultiplier * actionsInfos.reduce((acc, [a, i]) => acc + i.weight * i.ram, 0)
        ns.print(`needs ${actionsInfos.map(([s, i]) => `${ns.nFormat(i.ram, "0.0a")}GB`).join("/")} * ${actionsInfos.map(([s, i]) => `x${ns.nFormat(i.weight, "0a")}`).join("/")} * ${threadsMultiplier} = ${ns.nFormat(totalWeightedRamCost * 2 ** 30, "0b")} (${ns.nFormat(totalWeightedRamCost / ramAvailable, "0.0%")} of ${ns.nFormat(ramAvailable * 2 ** 30, "0b")} available)`)

        if (!dryRun && totalWeightedRamCost > ramAvailable) {
                ns.print(`ERROR ${ns.nFormat(totalWeightedRamCost * 2 ** 30, "0b")} needed >  ${ns.nFormat(ramAvailable * 2 ** 30, "0b")} available`)
                return;
        }

        for (const [_, infos] of actionsInfos) {
                const { script, weight } = infos
                const threadsCount = threadsMultiplier * weight
                if (!dryRun && weight) {
                        const callArgs = [hostname, 0, 0, true]
                        const pid = ns.run(script, threadsCount, ...callArgs)
                        if (pid == 0) {
                                ns.print(`FAIL run ${script} -t ${threadsCount} ${callArgs.join(" ")} (PID=${pid}) `)
                        }
                }
        }
} // end main


export function autocomplete(data, args) {
        return data.servers;
}