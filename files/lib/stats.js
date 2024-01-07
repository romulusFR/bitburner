/** @param {NS} ns */
export function getServerStats(ns, hostname) {
    const ownedServers = ["home", ...ns.getPurchasedServers()]
    const factionServers = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "w0rld_d43m0n"]
    const { cpuCores } = ns.getServer(ns.getHostname());

    if (!ns.serverExists(hostname))
        throw new Error(`host '${hostname}' doest exist`)

    const infos = {}
    infos.timestamp = Date.now()
    infos.hostname = hostname

    // root / own status
    infos.isRooted = ns.hasRootAccess(hostname)
    infos.isOwned = ownedServers.includes(hostname)
    infos.isFaction = factionServers.includes(hostname)

    // all base stats
    infos.moneyAvailable = ns.getServerMoneyAvailable(hostname);
    infos.maxMoney = ns.getServerMaxMoney(hostname)
    infos.usedRam = ns.getServerUsedRam(hostname)
    infos.maxRam = ns.getServerMaxRam(hostname)

    infos.hackTime = ns.getHackTime(hostname);
    infos.growTime = ns.getGrowTime(hostname);
    infos.weakTime = ns.getWeakenTime(hostname);

    infos.securityLevel = ns.getServerSecurityLevel(hostname);
    infos.minSecurityLevel = ns.getServerMinSecurityLevel(hostname);

    infos.hackingLevel = ns.getServerRequiredHackingLevel(hostname)
    infos.hackValue = ns.hackAnalyze(hostname);
    infos.hackChance = ns.hackAnalyzeChance(hostname);
    infos.hackSecInc = ns.hackAnalyzeSecurity(1, hostname)

    // infos.growTwice = ns.growthAnalyze(hostname, 2, cpuCores)
    infos.growOneHackThreads = ns.growthAnalyze(hostname, 1 / (1 - infos.hackValue), cpuCores)
    infos.growthParameter = ns.getServerGrowth(hostname)

    // derived stats
    infos.referenceTime = (infos.weakTime / 1000)
    infos.moneyPc = infos.moneyAvailable / infos.maxMoney
    infos.securityDelta = infos.securityLevel - infos.minSecurityLevel

    // infos.hackToHalfMoney = .50 / infos.hackValue
    infos.growSecIncOneHack = ns.growthAnalyzeSecurity(infos.growOneHackThreads, hostname, cpuCores)
    infos.weakSecDecThreads = (infos.growSecIncOneHack + infos.hackSecInc) / ns.weakenAnalyze(1, cpuCores)
    infos.totalHGWThreads = 1 + infos.growOneHackThreads + infos.weakSecDecThreads

    infos.valueBySec = (infos.moneyAvailable * infos.hackChance * infos.hackValue) / infos.referenceTime;
    infos.maxValueBySec = (infos.maxMoney * infos.hackValue) / infos.referenceTime;
    infos.valueBySecByThread = infos.valueBySec / infos.totalHGWThreads
    infos.maxValueBySecByThread = infos.maxValueBySec / infos.totalHGWThreads

    return infos
}