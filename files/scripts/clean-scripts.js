import constants from "/lib/constants.js";

/** @param {NS} ns */
export async function main(ns) {
    // ns.tail()
    const {
        host: hostname,
        target,
        help
    } = ns.flags([
        ["host", ns.getHostname()],
        ["target", undefined],
        ["help", false]
    ]
    );

    if (help) {
        ns.tprint("This script kills all processes on host with target in its arguments");
        ns.tprint(`Usage: run ${ns.getScriptName()} --host home --target omega-net`);
        return;
    }

    const owneds = ["home", ...ns.getPurchasedServers()]
    const currentScript = ns.getScriptName()
    const servers = JSON.parse(ns.read(constants.serversListFilename)).map(x => x[0]).filter(x => !owneds.includes(x))

    // --host -> server
    const hostToServer = new Map()
    for (const owned of owneds) {
        const processes = ns.ps(owned)
        for (const process of processes) {
            // only $-servers
            const serversArgs = process.args.filter(arg => servers.includes(arg))
            for (const serverArg of serversArgs) {
                const element = `${owned}@${process.filename}` // process.filename // { host: owned, script: process.filename }
                if (hostToServer.has(serverArg)) {
                    hostToServer.get(serverArg).add(element)
                }
                else {
                    hostToServer.set(serverArg, new Set([element]))
                }
                // ns.tprint(serverArg, process.filename, targetMap.size)
            }

        }

    }
    const sortedEntries = Array.from(hostToServer.entries())
    sortedEntries.sort((x, y) => x[0].localeCompare(y[0]))
    for (const [host, script] of sortedEntries) {
        const arr = [...script.keys()]
        ns.tprint(`${host.padEnd(20)}: ${arr.length} (${arr})`)
    }

    const processes = ns.ps(hostname)
    const processesWithTarget = processes.filter(process => process.args.includes(target) && process.filename != currentScript)
    ns.tprint(`INFO ${processes.length} processes ${processesWithTarget.length} with ${target}`)
    let freedRam = 0
    let killedCount = 0
    for (const process of processesWithTarget) {
        ns.tprint(process.filename, hostname, ...process.args)
        const killed = ns.kill(process.filename, hostname, ...process.args)
        if (killed) {
            freedRam += ns.getScriptRam(process.filename) * process.threads
            ++killedCount
        }
        else
            ns.tprint(`ERROR cannot kill ${process.filename} (${process.args}) on ${target}`)
    }
    ns.tprint(`INFO killed ${killedCount} scripts on ${hostname} with arg ${target} freeing ${ns.nFormat(freedRam, "0")}GB ram`)
}



export function autocomplete(data, args) {
    return data.servers;
}