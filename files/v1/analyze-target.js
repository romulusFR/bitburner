//https://github.com/danielyxie/bitburner/blob/5d2b81053d762111adb094849bf2d09f596b2157/src/Server/formulas/grow.ts#L6

export function autocomplete(data, args) {
    return data.servers;
}


/** @param {NS} ns */
export async function main(ns) {
    function pretty(x) {
        return ns.nFormat(x, '0a');
    }

    const { target, threads, money: targetMoneyFactor, loop, wait } = ns.flags([
        ["target", undefined],
        ["threads", 100],
        ["money", 20],
        ["loop", false],
        ["wait", 1000]

    ])

    const { cpuCores: cores, maxRam: ram } = ns.getServer("home")
    const me = ns.getPlayer()
    const hasFormulas = await ns.fileExists("Formulas.exe", "home")
    ns.tprint(`home: ${cores} cores ${ns.nFormat(ram, '0,0')} GB ram, analyzing h = ${target} with t = ${threads} and f = ${targetMoneyFactor}%, ${hasFormulas ? "w/" : "w/o"} formulas`)



    if (!ns.serverExists(target)) {
        throw new Error(`Server ${target} do not exists`)
    }
    if (!ns.hasRootAccess(target)) {
        throw new Error(`No root access to ${target}`)
    }
    const server = ns.getServer(target)

    do {

        // Get money available on a server.
        const availableMoney = await ns.getServerMoneyAvailable(target)
        // Get maximum money available on a server.
        const maxMoney = await ns.getServerMaxMoney(target)
        // Get a server growth parameter.
        const growthPC = await ns.getServerGrowth(target)
        // Get server security level.
        const securityLevel = await ns.getServerSecurityLevel(target)
        // Returns the minimum security level of the target server.
        const minSecurityLevel = await ns.getServerMinSecurityLevel(target)

        ns.tprint(`--------- ${target} ---------`)
        ns.tprint(`  server: ${ns.nFormat(securityLevel, '0.0')}(min=${minSecurityLevel}) ${ns.nFormat(availableMoney, "0.00a")}\$/${ns.nFormat(maxMoney, "0.00a")}\$ (${ns.nFormat(100 * availableMoney / maxMoney, '0.00')}%) (${targetMoneyFactor}%=${ns.nFormat(maxMoney * targetMoneyFactor / 100, "0.00a")})`)

        // Get the part of money stolen with a single thread.
        const hackValuePC = await ns.hackAnalyze(target);
        // Get the chance of successfully hacking a server.
        const hackChance = await ns.hackAnalyzeChance(target);
        // Get the security increase for a number of thread.
        const hackSecIncrease = await ns.hackAnalyzeSecurity(threads, target)
        // Get the execution time of a hack() call.
        const hackTime = await ns.getHackTime(target);
        // The number of threads needed to hack the server for hackAmount money : the part ABOVE max*0.5
        const targetMoney = Math.max(availableMoney - (maxMoney * targetMoneyFactor / 100), 0)
        // availableMoney// maxMoney
        const hackThreads = await ns.hackAnalyzeThreads(target, targetMoney)

        const valueBySec = 1000 * hackChance * hackValuePC * availableMoney / hackTime
        const maxValueBySec = 1000 * hackChance * hackValuePC * maxMoney / hackTime
        const hackAmount = hackValuePC * availableMoney * threads // Math.min(hackValuePC * availableMoney * threads, availableMoney)



        ns.tprint(`    hack: ${ns.nFormat(100 * hackChance, '0.00')}% chance for up to ${ns.nFormat(hackAmount, "0.00a")}\$ (${ns.nFormat(100 * hackValuePC, '0.00')}%/thread) for +${ns.nFormat(hackSecIncrease, "0.000")} security in ${Math.round(hackTime / 1000)} sec`)
        ns.tprint(`        : t=${ns.nFormat(hackThreads, "0.0")} for ${ns.nFormat(targetMoney, "0.00a")}\$ (${ns.nFormat(availableMoney, "0.00a")}\$ - ${ns.nFormat(maxMoney * targetMoneyFactor / 100, '0.00a')}\$)`)
        ns.tprint(`        : E=${ns.nFormat(hackAmount * hackChance, "0.00a")}\$ at ${ns.nFormat(valueBySec, "0.00a")}\$/sec/thread (max. ${ns.nFormat(maxValueBySec, "0.00a")}\$/sec/thread)`)
        // if (hasFormulas) {
        //     const hHackChance = ns.formulas.hacking.hackChance(server, me)
        //     const hHackValuePc = ns.formulas.hacking.hackPercent(server, me)
        //     const hHackTime = ns.formulas.hacking.hackTime(server, me)
        //     const hHackAmount = hackValuePC * availableMoney * threads
        //     ns.tprint(`        : ${ns.nFormat(100 * hHackChance, '0.00')}% ${ns.nFormat(100 * hHackValuePc, '0.00')}% of ${ns.nFormat(availableMoney, "0.00a")}\$ = ${pretty(hHackAmount)}\$ in  ${Math.round(hHackTime / 1000)} sec`)
        // }

        // /!\ ICI /!\ 
        // if (!hackThreads)
        //     return;

        // Calculate the security increase for a number of thread.
        const growthSecIncrease = await ns.growthAnalyzeSecurity(threads, target, cores)
        // Calculate the number of grow thread needed to grow a server by a certain multiplier.
        const growthFactor = maxMoney / (availableMoney - targetMoney)
        const growthThreads = await ns.growthAnalyze(target, growthFactor, cores)
        // Get the execution time of a grow() call.	
        const growthTime = await ns.getGrowTime(target)
        const hGrowPcManual = calculateServerGrowth(server, threads, me, cores) - 1
        ns.tprint(`    grow: (${ns.nFormat(growthPC, "0.00")}%) for +${ns.nFormat(growthSecIncrease, "0.000")} security in ${Math.round(growthTime / 1000)} sec`)
        ns.tprint(`        : t=${pretty(growthThreads)} to grow x${ns.nFormat(growthFactor / 100, "0.00")}% from ${ns.nFormat(availableMoney, "0.00a")}\$ to ${ns.nFormat(maxMoney, "0.00a")}\$ `)
        // ns.tprint(`        : +${pretty(hGrowPcManual * availableMoney)}\$ (${ns.nFormat(100 * hGrowPcManual, "0.00")}%, ${pretty(100 * hGrowPcManual * availableMoney / maxMoney)}% of total)`)
        if (hasFormulas) {
            const hGrowPc = ns.formulas.hacking.growPercent(server, threads, me, cores) - 1
            const hGrowTime = ns.formulas.hacking.growTime(server, me)
            ns.tprint(`        : +${pretty(hGrowPc * availableMoney)}\$ (${ns.nFormat(100 * hGrowPc, "0.00")}%) in ${Math.round(hGrowTime / 1000)} sec`)
        }

        //Predict the effect of weaken.
        const weakenSecDecrease = await ns.weakenAnalyze(threads, cores)
        // Get the execution time of a weaken() call.
        const weakenTime = await ns.getWeakenTime(target)
        ns.tprint(`    weak: -${weakenSecDecrease} security in ${Math.round(weakenTime / 1000)} sec`)
        // if (hasFormulas) {
        //     const hWeakenTime = ns.formulas.hacking.weakenTime(server, me)
        //     ns.tprint(`        : in ${Math.round(hWeakenTime / 1000)} sec`)
        // }

        const timings = [["hack", hackTime / 1000], ["grow", growthTime / 1000], ["weak", weakenTime / 1000]]
        timings.sort((x, y) => y[1] - x[1])
        const timingsMap = new Map(timings)
        ns.tprint(`    time: hack=${pretty(timingsMap.get("hack"))}sec grow=${pretty(timingsMap.get("grow"))}sec weak=${pretty(timingsMap.get("weak"))}sec`)

        // nb threads to have 50% of max money
        // hackThreads
        // nb of threads to get the money back
        // growthThreads

        if (hasFormulas) {

            const hackSecIncreaseTarget = await ns.hackAnalyzeSecurity(hackThreads, target)
            const checkGrowth = ns.formulas.hacking.growPercent(server, growthThreads, me, cores)
            const growthSecIncreaseTarget = await ns.growthAnalyzeSecurity(growthThreads, target, cores)
            const weakenSecDecreaseTarget = await ns.weakenAnalyze(hackThreads + growthThreads, cores)
            ns.tprint(`opt-time: h=${pretty(hackThreads)} to ${pretty(targetMoney)}, g=${pretty(growthThreads)} to get it back (x${ns.nFormat(maxMoney / targetMoney, "0.0%")} ~ x${ns.nFormat(checkGrowth, "0.0%")})`)
            ns.tprint(`opt-secu: h=+${ns.nFormat(hackSecIncreaseTarget, "0.000")} g=+${ns.nFormat(growthSecIncreaseTarget, "0.000")} sum=${ns.nFormat(hackSecIncreaseTarget + growthSecIncreaseTarget, "0.000")} weak=-${ns.nFormat(weakenSecDecreaseTarget, "0.000")}`)
            await ns.sleep(wait)
        }
    } while (loop)
}