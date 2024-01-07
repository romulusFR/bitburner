// information about machines
const machines = new Map()

/** @param {NS} ns */
export async function main(ns) {
    // ns.disableLog("ALL")
    const args = ns.flags([
        ['depth', 2 ** 8],
        ['script', "/scripts/hack-grow-weaken.js"], //self contained loop hgw "/scripts/hack-grow-weaken.js" "/scripts/loop-weaken.js"
        ['wait', 5],
        ['killall', false],
        ['hack', false]
    ]);

    const { wait: waitMinutes, killall: killAll, depth: maxDepth, script: hackScript, hack: hackOnTarget } = args

    function pretty(x) {
        return ns.nFormat(x, '0a');
    }

    function getScripts() {
        return ns.ls(ns.getHostname(), "/scripts/")
    }

    const logger = ns.print
    ns.disableLog('ALL')
    ns.tail()

    // programs that open ports
    const programs = [
        { name: "BruteSSH.exe", funct: ns.brutessh },
        { name: "FTPCrack.exe", funct: ns.ftpcrack },
        { name: "relaySMTP.exe", funct: ns.relaysmtp },
        { name: "HTTPWorm.exe", funct: ns.httpworm },
        { name: "SQLInject.exe", funct: ns.sqlinject }
    ];

    // hack and deploy scripts
    async function hackDeploy(target) {
        // ns.tprint(`hackDeploy(${target})`)
        const myHackingLvl = ns.getHackingLevel();
        const targetHackingLvl = ns.getServerRequiredHackingLevel(target);

        if (targetHackingLvl > myHackingLvl) {
            logger(`WARN    ${target}: NOT hackable: level ${targetHackingLvl} > ${myHackingLvl}`)
            return false;
        }

        // check availability and open as many ports as possible
        let nbProgramsAvailable = 0
        for (const { name, funct: hackFunct } of programs) {
            if (await ns.fileExists(name, "home")) {
                ++nbProgramsAvailable;
                await hackFunct(target);
            }
        }

        // if it is enough, exploit then copy scripts
        const nbProgramsNeeded = ns.getServerNumPortsRequired(target)
        if (nbProgramsNeeded > nbProgramsAvailable) {
            logger(`WARN    ${target}: NOT hackable: ${nbProgramsAvailable}/${nbProgramsNeeded} ports`)
            return false;
        }

        await ns.nuke(target);
        if (!ns.hasRootAccess(target)) {
            logger(`WARN    ${target}: NOT hackable: NUKE.exe FAILED`)
            return false;
        }

        for (const script of getScripts()) {
            if (!await ns.scp(script, target, "home")) {
                logger(`WARN     ${target}: ${script} CANNOT be copied`)
                return false
            }
        }
        // ns.tprint(`     ${target}: ROOTED, scripts COPIED`)
        return true
    }

    logger(`#### ${ns.getScriptName()} ####`)
    logger(`Loop every ${waitMinutes}min for searching @${maxDepth} and deploying ${hackScript}`)

    // depth first search of machines from current host
    const queue = []
    // main loop : discover and deploy every x minutes
    while (true) {

        // clear known host, re-discover
        machines.clear()
        await ns.write("serverlist.txt", "", "w")

        // start with curren host
        queue.push({ host: ns.getHostname(), depth: 0, trace: [] })
        // host discovery
        while (queue.length) {
            const { host, depth, trace } = queue.pop()
            // ns.tprint(`poping ${host}@${depth}`)
            if (!machines.has(host)) {
                // ns.print(`host ${host} discovered`)
                const money = ns.getServerMoneyAvailable(host)
                const maxMoney = ns.getServerMaxMoney(host)
                const root = ns.hasRootAccess(host)
                const totalRam = ns.getServerMaxRam(host)
                const files = ns.ls(host)
                machines.set(host, { nodes: [], trace, depth, money, maxMoney, root, totalRam, files })
            }

            const { nodes } = machines.get(host)
            const tgts = ns.scan(host)
            for (const tgt of tgts) {
                if (!nodes.includes(tgt))
                    nodes.push(tgt)
                if ((!machines.has(tgt)) && (depth < maxDepth)) {
                    queue.unshift({ host: tgt, depth: depth + 1, trace: [...trace, host] })
                    // queue.push({ host: tgt, depth: depth + 1 })
                }
            }
        } // host discovery ok

        // sort found machines by money, deploy and execute script
        function compByMoney([h1, p1], [h2, p2]) { return p2.maxMoney - p1.maxMoney }
        const sortedMachines = new Map([...machines.entries()].sort(compByMoney));
        for (const [target, { nodes, depth, money, maxMoney, totalRam }] of sortedMachines.entries()) {
            if (target == "home")
                continue;

            // on successfull deploy
            if (await hackDeploy(target)) {
                // ns.tprint(`>>>${target}`)
                if (killAll) {
                    ns.killall(target, true)
                }

                const neededRam = ns.getScriptRam(hackScript, target)
                const usedRam = ns.getServerUsedRam(target)
                const nbThreads = Math.floor((totalRam - usedRam) / neededRam)
                const availableMoney = Math.round(ns.getServerMoneyAvailable(target))

                // run script with as many instances as possible
                if (nbThreads > 0 && availableMoney > 0) {
                    ns.exec(hackScript, target, nbThreads, "--hack", hackOnTarget)
                }
                logger(`SUCCESS ${target}: run ${hackScript} (t=${nbThreads})  (${pretty(availableMoney)}\$/${pretty(maxMoney)}\$) (${usedRam}GB/${totalRam}GB)`)
            }
        }

        // write infos for other scripts
        const content = JSON.stringify([...machines.entries()], null, "    ")
        await ns.write("serverlist.txt", content, "w")
        logger(`#### waiting for ${waitMinutes} minutes ####`)
        await ns.sleep(waitMinutes * 60 * 1000);
    }
}