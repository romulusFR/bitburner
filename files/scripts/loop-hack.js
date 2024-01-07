/** @param {NS} ns */
export async function main(ns) {
	if (!ns.args.length)
		throw new Error(`args[0] needed`)
	const target = ns.args[0];
	const waitLoop = (ns.args.length >= 2) ? ns.args[1] : 0
	const waitInit = (ns.args.length >= 3) ? ns.args[2] : 0
	const loops = (ns.args.length >= 4) ? ns.args[3] : Infinity
	let count = 0
	await ns.sleep(waitInit);
	while (count++ < loops) {
		await ns.sleep(waitLoop);
		await ns.hack(target);
	}
}