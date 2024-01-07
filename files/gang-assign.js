/** @param {NS} ns */
export async function main(ns) {
    const g = ns.gang
    if (!g.inGang()) {

        // ns.exit()
        throw new Error("Not in gang")
    }
    // arguments mgmt
    const args = ns.flags([
        ["assign", null],
    ])

    // Unassigned,Ransomware,Phishing,Identity Theft,DDoS Attacks,Plant Virus,Fraud & Counterfeiting,Money Laundering,Cyberterrorism,Ethical Hacking,Vigilante Justice,Train Combat,Train Hacking,Train Charisma,Territory Warfare
    const {
        assign: assignTaskName
    } = args;

    const myGang = g.getGangInformation()
    const taskNames = g.getTaskNames()
    const memberNames = g.getMemberNames()
    ns.tprint(`In gang ${myGang.faction} (hack=${myGang.isHacking}): ${ns.nFormat(myGang.moneyGainRate, "0.0a")}\$/sec. ${ns.nFormat(myGang.respectGainRate, "0.0a")}resp/sec. ${ns.nFormat(myGang.wantedLevelGainRate, "0.0a")}level/sec.`)
    ns.tprint(`Available tasks:\n\t${taskNames}`)
    ns.tprint(`Members:\n\t${memberNames}`)

    if (assignTaskName != null) {
        //!taskNames.includes(assignTaskName)
        const foundTaskName = taskNames.find((name) => name.toLowerCase().startsWith(assignTaskName.toLowerCase().slice(0, 4)))
        if (!foundTaskName)
            throw new Error(`Task ${assignTaskName} invalid`)
        ns.tprint(`Assigning ${foundTaskName} to all ${memberNames.length} members`)
        memberNames.forEach(memberName => g.setMemberTask(memberName, foundTaskName))
    }
}