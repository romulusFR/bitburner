/** @param {NS} ns */
export async function main(ns) {
    const scripts = [...ns.ls("home", "/scripts/"), ...ns.ls("home", "/v1/"), ...ns.ls("home", "/lib/")]
    // ns.tprint(scripts)
    // Returns an array with the hostnames of all of the servers you have purchased.
    let servers = ns.getPurchasedServers()
    // Returns the maximum number of servers you can purchase.
    const limit = ns.getPurchasedServerLimit()
    // Returns the maximum RAM that a purchased server can have.
    const maxRam = ns.getPurchasedServerMaxRam()

    const { nb: targetNbServers, ram: ramFactor, prices, list, kill: killallProcesses, help } = ns.flags([
        ['nb', servers.length],
        ['ram', Math.log2(ns.getServerMaxRam("home"))],
        ['prices', false],
        ['list', true],
        ['kill', false],
        ["help", false]
    ]);

    if (help) {
        ns.tprint("This script buys and prepares extra servers");
        ns.tprint(`Usage: run ${ns.getScriptName()} --nb 0 --ram 16 (exponent) [--prices] [--list] [--kill]`);
        return;
    }


    ns.disableLog("ALL")
    ns.tail()
    ns.clearLog()

    const homeMaxRam = ns.getServerMaxRam("home")
    const targetRam = 2 ** ramFactor
    ns.print(`#### ${ns.getScriptName()} (home = ${ns.nFormat(homeMaxRam * 2 ** 30, "0ib")}) to have ${targetNbServers} with ${ns.nFormat(targetRam * 2 ** 30, "0ib")} (with MAX ${ns.nFormat(maxRam * 2 ** 30, "0ib")}=2**${ns.nFormat(Math.log2(maxRam), "0")}GB ram) ####`)
    if (prices) {
        for (let i = 1; i <= Math.log2(maxRam); ++i) {
            ns.print(`${ns.nFormat(i, "00")} needs ${ns.nFormat(ns.getPurchasedServerCost(2 ** i), "0.00a")}\$ for ${ns.nFormat((2 ** i) * (2 ** 30), "0ib")} ram`)
        }
    }

    // buy if needed
    const baseNb = servers.length
    for (let s = 0; s < (targetNbServers - baseNb); ++s) {
        const name = `srv-${ns.nFormat(s + baseNb + 1, "00")}`
        const answer = await ns.prompt(`R U sure to buy extra ${name} with ${targetRam}GB ram for ${ns.nFormat(ns.getPurchasedServerCost(targetRam), "0a")}\$?`)
        if (!answer)
            break;
        const host = ns.purchaseServer(name, targetRam)
        const bought = (host != "")
        ns.print(`SUCCESS server ${host} bought with success as ${bought}`)
    }

    if (list) {
        for (const server of servers) {
            const { maxRam, ramUsed, hostname } = ns.getServer(server)
            ns.print(`${hostname}: ${ns.nFormat(ramUsed, "0ib")}/${ns.nFormat(maxRam, "0ib")}`)
        }
    }

    // updated with new ones
    servers = ns.getPurchasedServers()
    for (const server of servers) {
        const copied = await ns.scp(scripts, server, "home")
        if (!copied) {
            ns.print(`ERROR while copying ${scripts} on ${server}`)
            return;
        }

        if (killallProcesses)
            ns.killall(server)
        const { maxRam, ramUsed } = ns.getServer(server)
        // const listenerPID = ns.exec("/scripts/listener.js", server, 1, server)
        const listenerPID = null
        ns.print(`INFO copied ${scripts.length} files on ${server} (${ns.nFormat(ramUsed * 2 ** 30, "0ib")}/${ns.nFormat(maxRam * 2 ** 30, "0ib")}) listening w/ PID=${listenerPID}`)
        const processes = ns.ps(server)
        const maxProcesses = 10
        const processesInfos = processes.slice(0, maxProcesses).map(x => `${x.filename} (t=${x.threads})`).join(", ")
        ns.print(`INFO ${processes.length} processes: ${processesInfos} ${(processes.length > maxProcesses) ? "..." : ""}`)

        // if (runScript) {
        //     const scriptArgs = `--attr maxValueBySec --hack 1 --grow 3 --weak 4 --strat batch --ram 100 --nb ${Math.log2(maxRam)}`.split(" ")
        //     ns.exec("home-hack.js", hostname, 1, ...scriptArgs)
        // }
    }
}