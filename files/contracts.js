const contractTypes = new Map([
  // ["Merge Overlapping Intervals", solveOverlappingIntervals],
  ["Subarray with Maximum Sum", solveSubarrayMaximumSum],
  ["Unique Paths in a Grid I", solveUniquePathGridI],
  ["Array Jumping Game", solveArrayJumping],
  ["Find Largest Prime Factor", solveLargestPrimeFactor],
  ["Encryption I: Caesar Cipher", solveCaesarCipher],
  // ["Minimum Path Sum in a Triangle", solveMinPathTriangle],
  // ["HammingCodes: Integer to Encoded Binary", solveHamming]
  // ['Unique Paths in a Grid II', solveUniquePathInAGridII]
]);

// function solveMinPathTriangle(arr) {
//   // const ex = [[3], [7, 3], [6, 5, 9], [1, 1, 3, 3], [4, 4, 8, 1, 2]];
//   function *findPath(row, col){

//   }

// }

function solveCaesarCipher([words, n]) {
  function rotate(chars) {
    // console.debug(chars)
    return chars
      .split("")
      .map((char) => {
        const clear = char.charCodeAt(0) - "A".charCodeAt(0);
        const ciphered = ((26 + clear - n) % 26) + "A".charCodeAt(0);
        return String.fromCharCode(ciphered);
      })
      .join("");
  }

  return words.split(" ").map(rotate).join(" ");
}

// solveCaesarCipher(["CLOUD QUEUE VIRUS PRINT TRASH", 6]);

function solveLargestPrimeFactor(n) {
  // e.g., 420294951
  const primes = [];
  const divisors = [];
  const bound = Math.sqrt(n);
  for (let i = 2; i < bound; ++i) {
    const newPrime = primes.find((x) => i % x == 0) == null;
    if (newPrime) {
      primes.push(i);
      while (n % i == 0) {
        divisors.push(i);
        n = n / i;
      }
    }
  }

  if (n == 1) return divisors[divisors.length - 1];
  else return n;
}

// BUGGEEE
function solveOverlappingIntervals(intervals) {
  let pool = new Set(intervals);
  let fixedPoint;
  do {
    console.debug(">>", Array.from(pool));
    fixedPoint = true;
    const [one, _] = pool.entries().next().value;
    console.debug(one);
    const [a, b] = one;
    for (const other of pool) {
      const [c, d] = other;
      console.debug("   ", other);
      if (a == c && b == d) continue;
      if (c <= b && a < d) {
        pool.delete(one);
        pool.delete(other);
        console.debug("       ", one, other, [a, d]);
        pool.add([a, d]);
        fixedPoint = false;
        break;
      }
    }
  } while (!fixedPoint);
  return Array.from(pool).sort(([a, b], [c, d]) => a - c);
}

// OK (bug length +1)
function solveSubarrayMaximumSum(arr) {
  // arr = [-2,8,10,0,-1,8,-4,3,1,1,8,-9,-8,9,-7,10,-5,-1,-7,-10,-9,1,7,0,-5,3,-3,-1,3,-1,-10,2,7,-7,10]
  let max = 0;
  for (let i = 0; i < arr.length; ++i)
    for (let j = i + 1; j < arr.length + 1; ++j) {
      const total = arr.slice(i, j).reduce((x, y) => x + y, 0);
      max = Math.max(max, total);
    }

  return max;
}

// OK
function solveUniquePathGridI(arr) {
  const [w, l] = arr;
  function fact(n) {
    let r = 1;
    for (let i = 1; i <= n; ++i) r *= i;
    return r;
  }
  const n = w + l - 2;
  const p = Math.min(w, l) - 1;
  return Math.floor(fact(n) / (fact(n - p) * fact(p)));
}

// CHECK : Array Jumping Game  => Conversion Bopl -> int ?
function solveArrayJumping(arr) {
  //arr = [7,0,3,4,10,4,4,0,10,3,0,9,1,0,4]

  /*
    Each element in the array represents your MAXIMUM jump length at that position. This means that if you are at position i and your maximum jump length is n,
    you can jump to any position from i to i+n.
    
    Assuming you are initially positioned at the start of the array, determine whether you are able to reach the last index.
    Your answer should be submitted as 1 or 0, representing true and false respectively
    */

  const reachable = new Set([0]);
  const queue = [0];

  while (queue.length) {
    const idx = queue.pop();
    for (let delta = 0; delta < arr[idx]; delta++) {
      const maxIdx = Math.min(idx + delta, arr.length);
      if (!reachable.has(maxIdx)) {
        reachable.add(maxIdx);
        queue.unshift(maxIdx);
      }
    }
  }
  return Number(reachable.has(arr.length - 1));
}

// KO
function solveUniquePathInAGridII(grid) {
  // You are given a 2D array of numbers (array of array of numbers) representing
  // a grid. The 2D array contains 1’s and 0’s, where 1 represents an obstacle and

  // 0 represents a free space.

  // Assume you are initially positioned in top-left corner of that grid and that you
  // are trying to reach the bottom-right corner. In each step, you may only move down
  // or to the right. Furthermore, you cannot move onto spaces which have obstacles.

  // Determine how many unique paths there are from start to finish.

  let x = 0;
  let y = 0;
  function neighbours(x, y) {
    const xIn = x + 1 < grid[0].length;
    const yIn = y + 1 < grid.length;
    if (xIn && grid[x + 1][y] && yIn && grid[x][y + 1]) {
      return [
        [x + 1, y],
        [x, y + 1],
      ];
    }
    if (xIn && grid[x + 1][y]) {
      return [[x + 1, y]];
    }
    if (yIn && grid[x][y + 1]) {
      return [[x, y + 1]];
    }
    return [];
  }
}

const serverListFile = "/run/servers.txt";

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([["all", false]]);

  const { all: printAllContracts } = args;

  const content = ns.read(serverListFile);
  const machines = JSON.parse(content);

  for (const [host, { files, trace }] of machines) {
    const cctFiles = files.filter((x) => x.endsWith(".cct"));
    ns.tprint(`${host.padEnd(20)}: ${cctFiles}`);
    for (const cctFile of cctFiles) {
      const cctType = ns.codingcontract.getContractType(cctFile, host);
      const cctTries = ns.codingcontract.getNumTriesRemaining(cctFile, host);
      const cctData = ns.codingcontract.getData(cctFile, host);
      if (printAllContracts || contractTypes.has(cctType))
        ns.tprint(`${"".padEnd(20)}: ${cctType} (${cctTries} tries left) = ${cctData}`);
      if (contractTypes.has(cctType)) {
        // const cctDesc = ns.codingcontract.getDescription(cct, host)
        const solver = contractTypes.get(cctType);
        const answer = solver(cctData);
        const cctResult = ns.codingcontract.attempt(answer, cctFile, host, { returnReward: true });
        if (cctResult) ns.tprint(`SUCCESS ${"".padEnd(20)}: => ${cctResult}`);
        else ns.tprint(`WARN    ${"".padEnd(20)}: => ${answer} is WRONG`);
      }
    }
  }
}