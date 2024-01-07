// kill ui-extension.js; run ui-extension.js
import constants from "/lib/constants.js";

const doc = eval("document");
const hook0 = doc.getElementById('overview-extra-hook-0');
const hook1 = doc.getElementById('overview-extra-hook-1');
const hook2 = doc.getElementById('overview-extra-hook-2');
const delay = 1000

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('ALL')
    ns.tail()
    ns.moveTail(2300, 906)
    ns.resizeTail(252, 420)
    

    ns.atExit(() => { hook1.innerText = ""; hook0.innerText = ""; hook2.innerText = '' })
    const hostname = ns.getHostname()
    const moneyHistory = [];
    const windowSize = Math.ceil(60 * (1000 / delay)) + 1
    function addMoney(val) {
        moneyHistory.push(val)
        if (moneyHistory.length > windowSize)
            moneyHistory.shift()
    }

    function moneyAvg() {
        let deltas = 0
        for (let i = 0; i < moneyHistory.length - 1; i++) {
            deltas += (moneyHistory[i + 1] - moneyHistory[i])
        }
        ns.print(`δ${ns.nFormat(moneyHistory.length - 1, "00")} ${ns.nFormat(deltas, "0.00a").padStart(7)} ${ns.nFormat((moneyHistory.length > 1) ? moneyHistory[moneyHistory.length - 1] - moneyHistory[moneyHistory.length - 2] : 0, "0.00a")}`)
        return 1000 * deltas / (Math.max(moneyHistory.length - 1, 1) * delay)
    }

    const sumBy = (by, arr) => arr.map(by).reduce((acc, x) => acc + x, 0)
    const totalUsedRam = (servers) => sumBy(host => ns.getServerUsedRam(host), servers)
    const totalMaxRam = (servers) => sumBy(host => ns.getServerMaxRam(host), servers)
    const totalScriptsNb = (servers) => sumBy(host => ns.ps(host).length, servers)
    const serverThreads = (host) => sumBy(proc => proc.threads, ns.ps(host))
    const totalThreads = (servers) => sumBy(host => serverThreads(host), servers)

    while (true) {
        const serversListFilename = constants.serversListFilename
        const servers = JSON.parse(ns.read(serversListFilename))
        const boughtServers = servers.filter(([h, i]) => i.owned && h != "home").map(x => x[0])
        const rootedServers = servers.filter(([h, i]) => i.rooted && !i.owned).map(x => x[0])

        const statistics = [
            { name: "🦉", funct: () => `${ns.nFormat(ns.getTotalScriptExpGain(), "0.00a")}XP/s` },
            { name: "💲", funct: () => `\$${ns.nFormat(ns.getTotalScriptIncome()[0], "0.00a")}/s` },
            {
                name: "💰", funct: () => {
                    addMoney(ns.getServerMoneyAvailable("home"));
                    return `\$${ns.nFormat(moneyAvg(), "0.00a")}/s`
                }
            },

            { name: "📜", funct: () => `${ns.ps().length}` },
            // { name: "", funct: () => `${serverThreads(hostname)}t` },
            { name: "🧠", funct: () => `${ns.nFormat(ns.getServerUsedRam(hostname) * 2 ** 30, "0ib")}/${ns.nFormat(ns.getServerMaxRam(hostname) * 2 ** 30, "0ib")}` },
            { name: "", funct: () => `${ns.nFormat(ns.getServerUsedRam(hostname) / ns.getServerMaxRam(hostname), "0.00%")}` },

            { name: "📒", funct: () => `${totalScriptsNb(boughtServers)}` },
            // { name: "", funct: () => `${totalThreads(servers)}t` },
            { name: "💭", funct: () => `${ns.nFormat(totalUsedRam(boughtServers) * 2 ** 30, "0ib")}/${ns.nFormat(totalMaxRam(boughtServers) * 2 ** 30, "0ib")}` },
            { name: "", funct: () => `${totalMaxRam(boughtServers) ? ns.nFormat(totalUsedRam(boughtServers) / totalMaxRam(boughtServers), "0.00%") : "∞"}` },

            { name: "🖥️", funct: () => `${ns.getPurchasedServers().length} / ${rootedServers.length}` },

            { name: "🍀", funct: () => `${ns.nFormat(ns.getHackingMultipliers().chance, "0.00%")}` },
            { name: "📈", funct: () => `${ns.nFormat(ns.getHackingMultipliers().growth, "0.00%")}` },
            { name: "☯️", funct: () => `${ns.nFormat(ns.heart.break(), "0.00a")}` },
            { name: "☠️", funct: () => `${ns.getPlayer().numPeopleKilled}` },
            { name: "🤝", funct: () => `${ns.nFormat(ns.getSharePower(), "0.00%")}` },
            { name: "🏙️", funct: () => `${ns.getPlayer().city}` },
            { name: "🧅", funct: () => `${ns.getPlayer().tor}` },
            { name: "Since", funct: () => `${ns.nFormat(ns.getTimeSinceLastAug() / 1000, "0")}s` }
        ];

        try {
            const names = []
            const values = []
            for (const { name, funct } of statistics) {
                names.push(name)
                values.push(funct())
            }

            hook0.innerText = names.join("\n");
            hook1.innerText = values.join("\n");
        } catch (err) { // This might come in handy later
            ns.print(`ERROR: Update Skipped: ${err}`);
        }
        await ns.asleep(delay);
    }
}