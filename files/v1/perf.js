/** @param {NS} ns */
export async function main(ns) {
    // const startMarker = "start-money-by-sec"
    // const moneyBySecTiming = "money-by-sec"
    // performance.clearMarks(startMarker);
    // performance.clearMeasures()
    // performance.mark(startMarker);

    const args = ns.flags([
        ["count", 2 ** 4],
        ["delay", 1],
    ])

    let {
        count,
        delay
    } = args;

    const hostname = ns.getHostname()
    let money = ns.getServerMoneyAvailable(hostname);
    const deltas = []
    const total = count
    ns.tprint(`INFO ${ns.nFormat(total - count, "000")}/${ns.nFormat(total, "000")}: δ =        0\$ (${ns.nFormat(money, "000.0a")}\$ -      0\$). avg. speed = ${ns.nFormat(0, "0.0a")}\$/sec.`)
    while (count) {
        await ns.sleep(delay * 1000)
        const newMoney = ns.getServerMoneyAvailable(hostname)
        const delta = (newMoney - money) / delay
        deltas.push(delta)
        const averageSpeed = deltas.reduce((acc, x) => acc + x, 0) / deltas.length
        ns.tprint(`INFO ${ns.nFormat(total - count + 1, "000")}/${ns.nFormat(total, "000")}: δ = ${ns.nFormat(newMoney - money, "000.000a")}\$ (${ns.nFormat(newMoney, "000.0a")}\$ - ${ns.nFormat(money, "000.0a")}\$). avg. speed = ${ns.nFormat(averageSpeed, "0.0a")}\$/sec.`)
        money = newMoney
        count--
    }
}