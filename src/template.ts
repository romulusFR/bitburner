import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
  const { host, help } = ns.flags([
    ["host", ns.getHostname()], 
    ["help", false]
]);

  ns.tprint("Hello Remote API!");
}

