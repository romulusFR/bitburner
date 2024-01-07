/** @param {NS} ns */
export async function main(ns) {
    const { host: hostname, money: maxMoneyFactor, security: minSecurityDelta, hack: doHack, help } = ns.flags([
        ["host", ns.getHostname()],
        ["money", 0.9],
        ["security", 5],
        ["hack", true],
        ["help", false]
    ])

    if (help) {
        ns.tprint("This script launch simple weak/grow/hack loop.");
        ns.tprint(`Usage: run ${ns.getScriptName()} --host ${hostname} --security 5 --money 0.9 --hack true`);
        return;
    }

    const moneyThreshold = await ns.getServerMaxMoney(hostname) * maxMoneyFactor;
    const securityThreshold = await ns.getServerMinSecurityLevel(hostname) + minSecurityDelta;

    if (moneyThreshold == 0) {
        // throw new Error(`Nothing to hack on ${hostname}`)
        ns.print(`WARN Nothing to hack on ${hostname}`)
        return;
    }

    // Infinite loop that continously hacks/grows/weakens the target server
    while (true) {
        if (await ns.getServerSecurityLevel(hostname) > securityThreshold) {
            // If the server's security level is above our threshold, weaken it
            await ns.weaken(hostname);
        } else if (await ns.getServerMoneyAvailable(hostname) < moneyThreshold) {
            // If the server's money is less than our threshold, grow it
            await ns.grow(hostname);
        } else {
            // Otherwise, hack it or sleep for 1 sec
            if (doHack)
                await ns.hack(hostname);
            else
                await ns.sleep(1000)
        }
    }
}

export function autocomplete(data, args) {
    return data.servers;
}