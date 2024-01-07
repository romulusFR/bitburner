/** @param {NS} ns */
export async function main(ns) {
    ns.print(`running ${ns.args}`);
    if (!ns.args.length)
        return;
    const program = ns.args[0];
    const targets = ns.scan()
    const myHackingLvl = ns.getHackingLevel()
    for (const target of targets) {
        const targetHackingLvl = ns.getServerRequiredHackingLevel(target)
        ns.print(`server ${target} has level ${targetHackingLvl} (vs ${myHackingLvl})`)
        if (targetHackingLvl > myHackingLvl)
            continue

        const status = await ns.scp(program, target)
        if (status)
            ns.print(`  scp ${program} to ${target} is OK`)
        else
            ns.print(`  ERROR while scp ${program} to ${target}`)

        const bruteAvail = await ns.fileExists("BruteSSH.exe", "home");
        if (bruteAvail) {
            await ns.brutessh(target);
        }

        if (!ns.hasRootAccess(target))
            // Get root access to target server
            await ns.nuke(target);
    }

}