const commandChannel = 19
const reportChannel = 20
const delay = 500
const NO_MSG = "NULL PORT DATA"
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("sleep")
    ns.tail()
    ns.clearLog()
    const cmdHandle = ns.getPortHandle(commandChannel);
    const host = ns.getHostname()
    let done = false
    do {
        const message = cmdHandle.peek()
        if (message != NO_MSG) {
            const { dest, command } = JSON.parse(message)
            if (dest == host) {
                command.read()
                ns.print(`INFO ${command}@${dest}`)
            }
        }

        await ns.sleep(delay)
    } while (!done)
}