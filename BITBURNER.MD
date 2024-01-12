# Démo "Web" sur bitburner

- <https://danielyxie.github.io/bitburner/>
- <https://bitburner.readthedocs.io/en/latest/>
- <https://github.com/danielyxie/bitburner>

## Exploits

- <https://github.com/danielyxie/bitburner/tree/dev/src/Exploits>

### Unclickable

Comment accéder à un élément et faire une _function in the middle_

- <https://github.com/danielyxie/bitburner/blob/dev/src/Exploits/Unclickable.tsx>

```js
hidden = document.getElementById("unclickable");
old = hidden.onclick;
hidden.style.visibility = "visible";
hidden.style.display = "block";
hidden.onclick = function (evt) {
  this.style.visibility = "hidden";
  this.style.display = "none";
  old(evt);
};
```

### RealityAlteration

Jouer avec le debugger

- <https://github.com/danielyxie/bitburner/blob/2abc5687e14dadcd1fb867e2945fff563b5a7cc5/src/NetscriptFunctions/Extra.ts>

`nano exploits.js`

```js
/** @param {NS} ns */
export async function main(ns) {
  debugger;
  ns.alterReality();
}
```

Ensuite, breakpoint sur `console.warn("I am sure that this variable is false.");` dans Extra.ts ligne 59.

### YoureNotMeantToAccessThis

Accéder au router react.

```js
/** @param {NS} ns */
export async function main(ns) {
  ns.openDevMenu();
}
```

```js
box = document.querySelector(".jss2.MuiBox-root.css-0");
router = box.__reactProps$a91s2kgk5vf.children.props.router;
router.toDevMenu();
```

