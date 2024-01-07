const commandChannel = 19
const reportChannel = 20
const delay = 20
const NO_MSG = "NULL PORT DATA"

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("sleep")
    ns.tail()
    ns.clearLog()
    ns.print(`${'#'.repeat(8)} ${ns.getScriptName()}@${ns.getHostname()} ${'#'.repeat(8)}`)
    const commandHandle = ns.getPortHandle(commandChannel);
    const reportHandle = ns.getPortHandle(reportChannel);
    // handle.clear()
    let count = 0
    do {
        // const message = { dest: "home", command: "ping" }
        // const written = handle.tryWrite(JSON.stringify(message))
        // ns.print(`INFO #${++count}: written=${written} ${JSON.stringify(message)}`)
        const message = reportHandle.read()
        if (message != NO_MSG) {
            const { host, status, script, args, action, target, value } = JSON.parse(message)
            ns.print(`INFO [${host}] ${script} <${args.join(" ")}> ${action}/${target} ${status}=${value}`)
        }
        await ns.sleep(delay)
    } while (true)
}

export function autocomplete(data, args) {
    return data.servers;
}