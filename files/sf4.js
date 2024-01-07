import constants from "/lib/constants.js"

const DELAY = 2_500


/** @param {NS} ns */
export async function main(ns) {
    const sf4 = ns.singularity
    ns.disableLog('ALL')
    ns.tail()
    ns.clearLog()
    const { loop, help } = ns.flags([
        ["loop", false],
        ["help", false]
    ]);

    if (help) {
        ns.tprint("This script automates game using Source-File 4 (sf4=)");
        ns.tprint(`Usage: run ${ns.getScriptName()} --loop false`);
        return;
    }


    do {

        ns.print(`******* ${sf4.getCurrentServer()} doin' ${sf4.getCurrentWork()} *******`)

        ns.print(`Pending invites:`)
        for (const invitation of sf4.checkFactionInvitations()) {
            ns.print(`- ${invitation}`)
        }

        const tor = sf4.purchaseTor();
        ns.print(`TOR (purchased = ${tor}):`)
        for (const program of sf4.getDarkwebPrograms()) {
            const cost = sf4.getDarkwebProgramCost(program)
            ns.print(`- ${program} @ ${ns.nFormat(cost, "$0a")}: ${sf4.purchaseProgram(program)}`)
        }

        ns.print(`Main quest servers:`)
        const allServers = new Map(JSON.parse(ns.read(constants.serversListFilename)))
        for (const serverName of constants.factionServers) {
            if (!ns.serverExists(serverName))
                continue
            if (!ns.hasRootAccess(serverName))
                continue

            const server = allServers.get(serverName)

            // ns.print(server.trace)
            for (const node of [...server.trace, serverName]) {
                const connected = await sf4.connect(node)
                if (!connected) {
                    ns.print(`ERROR connecting to ${serverName} via ${node}`)
                    continue
                }
            }


            await sf4.installBackdoor()

            const serverInfos = ns.getServer(serverName)
            ns.print(`Backdooring ${serverName}/${sf4.getCurrentServer()} (${serverInfos.backdoorInstalled})`)
        }

        sf4.connect("home")
        await ns.sleep(DELAY)

    } while (loop)
}