// command line
// run home-hack.js --targets 32 --link "(x => x)" --hack 1 --weak 2 --grow 10 --reserve 1024

// globals
const serverListFile = "serverlist.txt";
const strategies = new Map([
    ["self-contained", { scripts: ["/scripts/hack-grow-weaken.js"] }],
    [
        "loop",
        {
            scripts: [
                "/scripts/loop-hack.js",
                "/scripts/loop-grow.js",
                "/scripts/loop-weak.js",
            ],
        },
    ],
    [
        "batch",
        {
            scripts: [
                "/scripts/loop-hack.js",
                "/scripts/loop-grow.js",
                "/scripts/loop-weak.js",
            ],
        },
    ],
]);

/** @param {NS} ns */
export async function main(ns) {
    function pretty(x) {
        return ns.nFormat(x, "0a");
    }

    // arguments mgmt
    const args = ns.flags([
        ["nb", 0],
        ["ram", 99],
        ["attr", "maxMoney"],
        ["link", "x => x"],
        ["hack", 1],
        ["grow", 10],
        ["weak", 2],
        ["dry", false],
        ["all", false],
        ["strat", "loop"], //See https://bitburner.readthedocs.io/en/latest/advancedgameplay/hackingalgorithms.html
        ["delta", 50],
        ["batch", 1],
    ]);

    const {
        attr: sortAttribute,
        nb: nbTargets,
        ram: allowedRamPc,
        hack: hackWeight,
        grow: growWeight,
        weak: weakWeight,
        dry,
        all,
        strat: strategy,
        delta: timeQuantum,
        batch: nbThreadsBatch,
    } = args;
    const link = eval(args.link);

    if (!strategies.has(strategy)) {
        ns.tprint(`ERROR Unkown strategy ${strategy}`);
        ns.exit();
    }
    const hackingScripts = strategies.get(strategy).scripts;

    // host information
    const currentHost = ns.getHostname();
    const { cpuCores, maxRam } = ns.getServer(currentHost);

    //cleaning
    if (!dry) {
        const processes = ns.ps(currentHost);
        for (const { filename, threads, pid } of processes) {
            if (hackingScripts.includes(filename)) {
                const killed = ns.kill(pid);
                if (!killed) ns.tprint(`${pid} is killed ${killed}`);
            }
        }
    }
    // update available ram
    const usedRam = ns.getServerUsedRam(currentHost);

    // compute max number of threads
    const freeRam = !dry ? maxRam - usedRam : usedRam;
    const avgRamNeededByScript =
        hackingScripts
            .map((s) => ns.getScriptRam(s, currentHost))
            .reduce((acc, x) => acc + x, 0) / hackingScripts.length;
    const nbThreadsMax = Math.floor(
        Math.min((maxRam * allowedRamPc) / 100, freeRam) / avgRamNeededByScript
    );

    ns.tprint(``);
    ns.tprint(`#### ${ns.getScriptName()}@${currentHost} ####`);
    // ns.tprint(`${ns.nFormat(ramNeededByScript, "0.00")}GB/thread with ${askedRam}GB ram (${maxRam}GB total ram, ${cpuCores} cores): up to ${nbThreadsMax} threads for ${hackingScript}`)
    ns.tprint(
        `${ns.nFormat(avgRamNeededByScript, "0.00")}GB/thread (${ns.nFormat(
            maxRam,
            "0,0"
        )}GB total ram, ${cpuCores} cores)`
    );
    ns.tprint(
        `up to ${pretty(nbThreadsMax)} threads with ${pretty(
            freeRam
        )}GB available ram for scripts ${hackingScripts.join(", ")} with strategy "${strategy}" (batch=${nbThreadsBatch})`
    );

    // read file obtained regularly (5min) by scan-deploy.js
    const content = ns.read(serverListFile);
    const machines = JSON.parse(content);

    // update potential targets statistics
    const targets = [];
    for (const [machine] of machines) {
        // revérifie hacked depuis l'enregistrement
        if (!ns.hasRootAccess(machine)) {
            // ns.tprint(`/!\\ no root access to ${machine}`)
            continue;
        }

        // /!\  TODO ICI LES STATS
        const hackLevel = ns.getServerRequiredHackingLevel(machine);
        const secLevel = ns.getServerSecurityLevel(machine);
        const minSecLevel = ns.getServerMinSecurityLevel(machine);
        const hackValue = ns.hackAnalyze(machine);
        const hackTime = ns.getHackTime(machine);
        const hackChance = ns.hackAnalyzeChance(machine);
        const availableMoney = ns.getServerMoneyAvailable(machine);
        const maxMoney = ns.getServerMaxMoney(machine);
        const valueBySec =
            (1000 * hackChance * hackValue * availableMoney) / hackTime;
        const maxValueBySec =
            (1000 * hackChance * hackValue * maxMoney) / hackTime;
        const nbThreadsAvailableMoney = ns.hackAnalyzeThreads(
            machine,
            availableMoney * 0.8
        );

        if (maxMoney == 0) {
            continue;
        }

        targets.push({
            machine,
            valueBySec,
            maxValueBySec,
            nbThreadsAvailableMoney,
            maxMoney,
            availableMoney,
            hackChance,
            hackLevel,
            secLevel,
            minSecLevel,
        });
        // ns.tprint(`${machine} (${pretty(maxMoney)}\$): ${ns.nFormat(100 * hackValue, '0.00')}% of ${pretty(available)}\$ (${pretty(hackValue * available)}\$) in ${pretty(hackTime / 1000)}s (${pretty(100 * hackChance)}%) ${pretty(valueBySec)}\$/sec (of ${pretty(maxValueBySec)}\$/sec) @${pretty(nbThreads)} threads`)
    } // loop machines

    // decreasing order
    // const orderFactor = (reversed)?-1:1
    targets.sort((x, y) => link(y[sortAttribute]) - link(x[sortAttribute]));
    const totalValue = targets.reduce(
        (acc, tgt, i) => (i < nbTargets ? link(tgt[sortAttribute]) + acc : acc),
        0
    );
    ns.tprint(
        `${targets.length} targets for totalValue=${ns.nFormat(
            totalValue,
            "0.00a"
        )} on "${sortAttribute}" with link ${link.name}`
    );
    ns.tprint(``);

    const actionWeightsDefault = new Map([
        ["hack", { script: "/scripts/loop-hack.js", weight: hackWeight }],
        ["grow", { script: "/scripts/loop-grow.js", weight: growWeight }],
        ["weak", { script: "/scripts/loop-weak.js", weight: weakWeight }],
    ]);
    const actionTotalWeightDefault = Array.from(
        actionWeightsDefault.values()
    ).reduce((acc, x) => acc + x.weight, 0);

    if (strategy === "self-contained") {
        for (let i = 0; i < targets.length; ++i) {
            const {
                machine,
                valueBySec,
                maxValueBySec,
                nbThreadsAvailableMoney,
                maxMoney,
                availableMoney,
                hackChance,
                hackLevel,
                secLevel,
                minSecLevel,
            } = targets[i];
            const nbThreads =
                i < nbTargets
                    ? Math.floor(
                        (nbThreadsMax * link(targets[i][sortAttribute])) /
                        totalValue
                    )
                    : 0;
            const threadsDetails = [];

            for (const script of hackingScripts) {
                const actionThreads = nbThreads / hackingScripts.length;
                if (actionThreads > 0 && !dry) {
                    threadsDetails.push(actionThreads);
                    ns.run(script, actionThreads, "--target", machine);
                }
            }

            if (all | (nbThreads > 0)) {
                // const threadsInfos = `t = ${nbThreads} =  ${actionWeights.get("hack").weight * nbThreads / actionTotalWeight} / ${actionWeights.get("grow").weight * nbThreads / actionTotalWeight} / ${actionWeights.get("weak").weight * nbThreads / actionTotalWeight} `
                ns.tprint(
                    `${ns.nFormat(i + 1, "00")}. ${machine.padEnd(20)} ${ns
                        .nFormat(hackChance * 100, "0.0")
                        .padStart(5)}% sec-lvl=${ns.nFormat(
                            minSecLevel,
                            "00"
                        )}/${ns.nFormat(secLevel, "00")} [${pretty(
                            valueBySec
                        ).padStart(4)}\$/sec of ${pretty(maxValueBySec).padStart(
                            4
                        )}\$/sec] (${pretty(availableMoney).padStart(4)}\$/${pretty(
                            maxMoney
                        ).padStart(4)}\$) ${threadsDetails.join("/")} = ${pretty(
                            nbThreads
                        )}`
                );
            }
        }
    } else if (strategy === "loop") {
        for (let i = 0; i < targets.length; ++i) {
            const {
                machine,
                valueBySec,
                maxValueBySec,
                nbThreadsAvailableMoney,
                maxMoney,
                availableMoney,
                hackChance,
                hackLevel,
                secLevel,
                minSecLevel,
            } = targets[i];
            const actionWeights = new Map(actionWeightsDefault);
            const actionTotalWeight = Array.from(actionWeights.values()).reduce(
                (acc, x) => acc + x.weight,
                0
            );
            // /!\ attention au poids != si plusieurs scripts : ici une moyenne /!\
            const nbThreads =
                i < nbTargets
                    ? Math.floor(
                        (nbThreadsMax * link(targets[i][sortAttribute])) /
                        totalValue
                    )
                    : 0;
            const threadsDetails = [];

            for (const [
                action,
                { script, weight },
            ] of actionWeights.entries()) {
                const actionThreads = Math.round(
                    (weight * nbThreads) / actionTotalWeight
                );
                const waitMin = 0;
                const waitMax = 0;
                threadsDetails.push(actionThreads);
                if (actionThreads > 0 && !dry)
                    ns.run(script, actionThreads, machine, waitMin, waitMax);
            }

            if (all | (nbThreads > 0)) {
                // const threadsInfos = `t = ${nbThreads} =  ${actionWeights.get("hack").weight * nbThreads / actionTotalWeight} / ${actionWeights.get("grow").weight * nbThreads / actionTotalWeight} / ${actionWeights.get("weak").weight * nbThreads / actionTotalWeight} `
                ns.tprint(
                    `${ns.nFormat(i + 1, "00")}. ${machine.padEnd(20)} ${ns
                        .nFormat(hackChance * 100, "0.0")
                        .padStart(5)}% sec-lvl=${ns.nFormat(
                            minSecLevel,
                            "00"
                        )}/${ns.nFormat(secLevel, "00")} [${pretty(
                            valueBySec
                        ).padStart(4)}\$/sec of ${pretty(maxValueBySec).padStart(
                            4
                        )}\$/sec] (${pretty(availableMoney).padStart(4)}\$/${pretty(
                            maxMoney
                        ).padStart(4)}\$) ${threadsDetails.join("/")} = ${pretty(
                            nbThreads
                        )}`
                );
            }
        }
    } else if (strategy === "batch") {
        for (let i = 0; i < targets.length; ++i) {
            const {
                machine,
                valueBySec,
                maxValueBySec,
                nbThreadsAvailableMoney,
                maxMoney,
                availableMoney,
                hackChance,
                hackLevel,
                secLevel,
                minSecLevel,
            } = targets[i];
            const nbThreads =
                i < nbTargets
                    ? Math.floor(
                        (nbThreadsMax * link(targets[i][sortAttribute])) /
                        totalValue
                    )
                    : 0;
            // const maxMoneyFraction = 0.5
            // const hackAmount = (availableMoney >= maxMoney * maxMoneyFraction) ? (availableMoney - maxMoney * maxMoneyFraction) : 0
            // const hackThreads = ns.hackAnalyzeThreads(machine, hackAmount)
            // const growThreads = ns.growthAnalyze(machine, hackAmount / availableMoney, cpuCores)
            // const weakThreads = hackThreads + growThreads

            const times = [
                ["hack", ns.getHackTime(machine)],
                ["grow", ns.getGrowTime(machine)],
                ["weak", ns.getWeakenTime(machine)],
            ];
            times.sort((x, y) => y[1] - x[1]);
            const maxTime = times[0][1] + 3 * timeQuantum;
            const timesMap = new Map(times);
            const threadsDetails = [];
            const nbActionThreads = Math.round(
                nbThreads / (nbThreadsBatch * actionTotalWeightDefault)
            );
            const batchShiftDelay = Math.round(maxTime / nbActionThreads);
            if (nbActionThreads > 0 && !dry) {
                for (let t = 0; t < nbActionThreads; ++t) {
                    const deltaHack = Math.round(
                        maxTime - timesMap.get("hack") - 3 * timeQuantum
                    );
                    const deltaWeakHack = Math.round(
                        maxTime - timesMap.get("weak") - 2 * timeQuantum
                    );
                    const deltaGrow = Math.round(
                        maxTime - timesMap.get("grow") - 1 * timeQuantum
                    );
                    const deltaWeakGrow = Math.round(
                        maxTime - timesMap.get("weak") - 0 * timeQuantum
                    );

                    if (actionWeightsDefault.get("hack").weight)
                        ns.run(
                            actionWeightsDefault.get("hack").script,
                            nbThreadsBatch *
                            actionWeightsDefault.get("hack").weight,
                            machine,
                            deltaHack,
                            deltaHack + timeQuantum / 2,
                            t * batchShiftDelay
                        );
                    if (actionWeightsDefault.get("weak").weight / 2)
                        ns.run(
                            actionWeightsDefault.get("weak").script,
                            (nbThreadsBatch *
                                actionWeightsDefault.get("weak").weight) /
                            2,
                            machine,
                            deltaWeakHack,
                            deltaWeakHack + timeQuantum / 2,
                            t * batchShiftDelay
                        );
                    if (actionWeightsDefault.get("grow").weight)
                        ns.run(
                            actionWeightsDefault.get("grow").script,
                            nbThreadsBatch *
                            actionWeightsDefault.get("grow").weight,
                            machine,
                            deltaGrow,
                            deltaGrow + timeQuantum / 2,
                            t * batchShiftDelay
                        );
                    if (actionWeightsDefault.get("weak").weight / 2)
                        ns.run(
                            actionWeightsDefault.get("weak").script,
                            (nbThreadsBatch *
                                actionWeightsDefault.get("weak").weight) /
                            2,
                            machine,
                            deltaWeakGrow,
                            deltaWeakGrow + timeQuantum / 2,
                            t * batchShiftDelay
                        );
                }
            }
            threadsDetails.push(
                nbThreadsBatch *
                nbActionThreads *
                actionWeightsDefault.get("hack").weight
            );
            threadsDetails.push(
                nbThreadsBatch *
                nbActionThreads *
                actionWeightsDefault.get("grow").weight
            );
            threadsDetails.push(
                nbThreadsBatch *
                nbActionThreads *
                actionWeightsDefault.get("weak").weight
            );

            if (all | (nbThreads > 0)) {
                // const threadsInfos = `t = ${nbThreads} =  ${actionWeights.get("hack").weight * nbThreads / actionTotalWeight} / ${actionWeights.get("grow").weight * nbThreads / actionTotalWeight} / ${actionWeights.get("weak").weight * nbThreads / actionTotalWeight} `
                ns.tprint(
                    `${ns.nFormat(i + 1, "00")}. ${machine.padEnd(20)} ${ns
                        .nFormat(hackChance * 100, "0.0")
                        .padStart(5)}% sec-lvl=${ns.nFormat(
                            minSecLevel,
                            "00"
                        )}/${ns.nFormat(secLevel, "00")} [${pretty(
                            valueBySec
                        ).padStart(4)}\$/sec of ${pretty(maxValueBySec).padStart(
                            4
                        )}\$/sec] (${pretty(availableMoney).padStart(4)}\$/${pretty(
                            maxMoney
                        ).padStart(4)}\$) ${threadsDetails.join("/")} = ${pretty(
                            nbThreadsBatch *
                            nbActionThreads *
                            actionTotalWeightDefault
                        )}`
                );
            }
        }
    } else {
        ns.exit();
    }
}