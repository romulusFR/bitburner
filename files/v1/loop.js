/** @param {NS} ns */
export async function main(ns) {
	// ns.disableLog("ALL")
	// depth first search of machines from current host
	const args = ns.flags([
		['target', ns.getHostname()],
		['action', "grow"],
		['waitMin', 0],
		['waitMax', 0]
	]);

	const {target, waitMin, waitMax} = args
	let action = () => { throw new Error("No defined action"); };
	// ns.tprint(args.action.slice(0, 4))
	switch (args.action.slice(0, 4)) {
		case "weak":
			action = ns.weaken;
			break;
		case "grow":
			action = ns.grow;
			break;
		case "hack":
			action = ns.hack;
			break;
		default:
			throw new Error(`No such action ${args.action}`);
	}

	while (true) {
		const delay = waitMin + Math.random() * (waitMax - waitMin)
		await ns.sleep(delay);
		const amount = await action(target);
		ns.print(`${target} ${args.action} for ${amount}`)
	}
}