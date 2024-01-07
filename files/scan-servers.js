import constants from "/lib/constants.js"

/** @param {NS} ns */
async function nbRunAvailablePrograms(ns, hostname) {
    // programs that open ports and associated function
    const programs = [
        { name: "BruteSSH.exe", funct: ns.brutessh },
        { name: "FTPCrack.exe", funct: ns.ftpcrack },
        { name: "relaySMTP.exe", funct: ns.relaysmtp },
        { name: "HTTPWorm.exe", funct: ns.httpworm },
        { name: "SQLInject.exe", funct: ns.sqlinject }
    ];

    // check availability and open as many ports as possible
    let nb = 0
    for (const { name, funct } of programs) {
        if (await ns.fileExists(name, "home")) {
            ++nb;
            await funct(hostname);
        }
    }
    return nb
}

// hack and deploy scripts
/** @param {NS} ns */
async function hackDeploy(ns, hostname, depth = -1) {
    const myHackingLvl = ns.getHackingLevel();
    const targetHackingLvl = ns.getServerRequiredHackingLevel(hostname);

    if (targetHackingLvl > myHackingLvl) {
        return `WARN    ${hostname.padEnd(20)}@${String(depth).padEnd(3)} NOT HACKED lvl=${String(targetHackingLvl).padEnd(4)} > ${myHackingLvl}`;
    }

    const nbProgramsNeeded = ns.getServerNumPortsRequired(hostname)
    const nbProgramsAvailable = await nbRunAvailablePrograms(ns, hostname)
    if (nbProgramsNeeded > nbProgramsAvailable) {
        return `WARN    ${hostname.padEnd(20)}@${String(depth).padEnd(3)} NOT HACKED ${nbProgramsAvailable}/${nbProgramsNeeded} ports`;
    }

    await ns.nuke(hostname);
    if (!ns.hasRootAccess(hostname)) {
        return `ERROR   ${hostname.padEnd(20)}@${String(depth).padEnd(3)} NOT HACKED NUKE.exe FAILED`;
    }

    for (const script of ns.ls("home", "/scripts/")) {
        if (!await ns.scp(script, hostname, "home")) {
            return `ERROR   ${hostname.padEnd(20)}@${String(depth).padEnd(3)} CANNOT copy ${script}`
        }
    }
    return undefined
}

function breadthFirstScan(ns) {
    // first search of machines from current host, usually home
    const queue = [{ hostname: ns.getHostname(), depth: 0, trace: [] }]
    // information about machines
    const machines = new Map()
    // iterative host discovery using queue
    while (queue.length) {
        const { hostname, depth, trace } = queue.pop()
        if (!machines.has(hostname)) {
            const rooted = ns.hasRootAccess(hostname)
            const files = ns.ls(hostname)
            machines.set(hostname, { depth, trace, nodes: [], files, rooted })
        }

        const { nodes } = machines.get(hostname)
        const neighbours = ns.scan(hostname)
        for (const neighbour of neighbours) {
            if (!nodes.includes(neighbour))
                nodes.push(neighbour)
            if (!machines.has(neighbour)) {
                queue.unshift({ hostname: neighbour, depth: depth + 1, trace: [...trace, hostname] })
            }
        }
    }

    return machines
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL')
    ns.clearLog()
    ns.tail()
    ns.moveTail(1692, 50)
    ns.resizeTail(648, 760)


    const { wait: waitSeconds, help, warn: withWarning, exec: executeScript, host: targetHostname } = ns.flags([
        ["help", false],
        ['wait', 15],
        ['warn', false],
        ["exec", false],
        ["host", undefined]
    ]);

    if (help) {
        ns.tprint("This script scans for all servers and hacks when possible.");
        ns.tprint(`Usage: run ${ns.getScriptName()} --wait n --warn false --exec false`);
        return;
    }

    const screenWidth = 66
    let count = 0
    // main loop : discover and hack every x minutes
    while (true) {
        const title = `${ns.getScriptName()} (${waitSeconds} sec) run #${++count}`
        ns.print(`${'#'.repeat((screenWidth - title.length) / 2)} ${title} ${'#'.repeat((screenWidth - title.length) / 2)}`)
        const allServers = breadthFirstScan(ns)
        const ownedServers = ["home", ...ns.getPurchasedServers()]
        const factionServers = constants.factionServers

        for (const [hostname, infos] of allServers.entries()) {
            const { depth } = infos
            infos.moneyAvail = ns.getServerMoneyAvailable(hostname)
            infos.maxMoney = ns.getServerMaxMoney(hostname)
            infos.usedRam = ns.getServerUsedRam(hostname)
            infos.maxRam = ns.getServerMaxRam(hostname)
            infos.hackingLevel = ns.getServerRequiredHackingLevel(hostname)
            infos.owned = ownedServers.includes(hostname)
            infos.faction = factionServers.includes(hostname)

            if (infos.owned) {
                ns.print(`INFO    ${hostname.padEnd(20)}@${String(depth).padEnd(3)} ${ns.nFormat(infos.usedRam * 2 ** 30, "0ib")}/${ns.nFormat(infos.maxRam * 2 ** 30, "0ib")}`)
                continue;
            }
            const deployError = await hackDeploy(ns, hostname, depth)
            if (!deployError) {
                if (executeScript) {
                    const script = (infos.maxMoney) ? constants.scriptHackGrowWeaken : constants.scriptShare
                    const scriptRam = ns.getScriptRam(script, hostname)
                    const threadsCount = Math.floor((infos.maxRam - infos.usedRam) / scriptRam)
                    if (threadsCount) {
                        // const pid = ns.exec(script, hostname, threadsCount)
                        const pid = ns.exec(script, hostname, threadsCount, "--host", targetHostname ?? hostname)
                        if (!pid) {
                            ns.tprint(`WARN   ${script} returns pid=${pid}`)
                        }
                    }
                }

                const prefix = (infos.faction) ? "INFO   " : "SUCCESS"
                ns.print(`${prefix} ${hostname.padEnd(20)}@${String(depth).padEnd(3)} lvl=${String(infos.hackingLevel).padEnd(4)} ` +
                    `${ns.nFormat(infos.moneyAvail, "$0a").padStart(5)}/${ns.nFormat(infos.maxMoney, "$0a").padStart(5)} ` +
                    `${ns.nFormat(infos.usedRam * 2 ** 30, "0ib").padStart(6)}/${ns.nFormat(infos.maxRam * 2 ** 30, "0ib").padStart(6)}`)
            }
            else if (withWarning) {
                ns.print(`ERROR ${deployError}`)
                continue;
            }
        }

        // overwrite infos for other scripts
        const content = JSON.stringify([...allServers.entries()], null, "    ")
        await ns.write(constants.serversListFilename, content, "w")
        await ns.sleep(waitSeconds * 1000);
        ns.clearLog()
    }
}