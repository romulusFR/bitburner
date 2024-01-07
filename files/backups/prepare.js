/** @param {NS} ns */
export async function main(ns) {
    // ns.disableLog("ALL")
    const args = ns.flags([
        ['target', ns.getHostname()],
        ['script', ["minimal_hack.js", "basic_hack.js"]]
    ]);

    const target = args.target
    const programs = args.script

    const myHackingLvl = ns.getHackingLevel()
    const targetHackingLvl = ns.getServerRequiredHackingLevel(target)
    ns.print(`preparing ${target}: hackable=${targetHackingLvl <= myHackingLvl}`)

    if (targetHackingLvl > myHackingLvl)
        return;

    if (!await ns.fileExists("BruteSSH.exe", "home"))
        await ns.brutessh(target);

    if (!await ns.fileExists("FTPCrack.exe", "home"))
        await ns.ftpcrack(target)

    if (!ns.hasRootAccess(target))
        await ns.nuke(target);


    await ns.scp(programs, target)
    // for (const program of programs) {
    //     if (!await ns.fileExists(program, target))
    //         await ns.scp(program, target)
    // }


}