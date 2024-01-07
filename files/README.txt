# README - red pilled

```term
run home-hack.js --ram 99 --nb 24 --strat batch --link "x => x + 1E8" --hack 1 --grow 3 --weak 4 --batch 2 --delta 200 --all
run home-hack.js --ram 5 --nb 16 --strat batch --link "x => x" --hack 1 --grow 100 --weak 100 --batch 2 --delta 100 --attr maxMoney
```

## TODO / 

- refactor du code, features
    - scanner les serveurs, dont les siens
    - deployer (detenu ou hacker) des scripts via scp 
    - exec à distance d'un script
- modules
- faire utiliser les logs et pas que tprint


## Scripts JS

- scan-deploy.js : Depth-First-Search du réseau, outputs serverlist.txt
    - [X] Breadth-First-Search
    - séparer scan / deploy / exec
- home-hack.js : lance HGW depuis home sur top-k machines triée par stat
- analyze-target.js : stats {hack, grow, weak} avec API Formulas.hacking() (EXPERIMENTAL)
    - **FACTORISER** toutes les stats / infos machines
    - [] intégrer à home-hack.js
    - le nb threads pour hack 0.5, son temps et déduire le reste
    - mettre ram en % utilisé
- server-buy-hack.js : hachete n machines et deploye (OBSOLETE? / START-ONLY)
    - [] factoriser deploy avec scan-deploy.js
- hacknet-upgrade.js : dépense $ pour hacknet toutes les 5 min (OBSOLETE? / START-ONLY)

## Automatisation init

### A refaire à check reset bitnode (Hard-Reset)
=> tour 1

- **obtenir de la RAM** pour lancer home-hack.js à large échelle
    - /!\ ATTENTION /!\ au fur et à mesure de l'augmentation de % de gain de hack, modifier les facteur sinon on assèche les serveur
- timeout plus courts/lancer home-hack.js plus régulièrement
- (DEBUT) utiliser hacknet-upgrade

### Phases (entre augmentations) 

1 phase par milestone augmentation (Soft-Reset) 

Stats à monter
1. CyberSec : hacking level ?, RAM ! => $ => hacknet en début. Prendre des scripts plus simples ?
2. NiteSec : reputation ?, RAM home OK pour flux en m$/sec =>
3. The Black Hand : reputation !
4. BitRunners
5. Daedalus



### A refaire après chaque augmentation (Soft-Reset) 

1. [] exécuter scan-deploy.js
2. [] exécuter home-hack.js
    - tweaker --hack 1 --grow 10 --weak 2 --nb x --attr maxValueBySec/maxMoney selon besoin / avancement
    - relancer période **longue**
    - si serveur saturé/ou pas => hack
    - calcul t_hack 50% max money, en supposant max d'abord (faire un tour manuel)
    - synchro des batchs de t_hack / t_grow / t_weak = f(t_hack)
3. [] achat du routeur TOR (GUI)
4. [] achat des programmes sur Darknet
    - `buy ServerProfiler.exe; buy DeepscanV2.exe; buy HTTPWorm.exe; buy SQLInject.exe`
    - les autres sont déjà là via les augmentations
    - `buy -a` si cash-flow
X. [] backdoor à installer (CSEC, avmnite-02h, I.I.I.I, run4the111lz) 
Y. [] hacknet-upgrade.js : upgrade max des noeuds (achat manuel) 
Z. [] achat serveurs supplémentaires (REVIEW)
    - quand/comment déclencher pour "manuellement" contrôler hgw of loop sur les cibles rentables (à terme)

## Factions Hackers Main-Quest

- CyberSec : csectest.lit : server CSEC (1 port) level=60
- NiteSec : nitesec-test.lit : server avmnite-02h (2 ports) level=217 
- The Black Hand : ??? : server I.I.I.I (3 ports) level=364
- BitRunners : 19dfj3l1nd.msg : server run4the111lz (4 ports) level=523 (depth > 10, au moins un rebond)
- Daedalus : fl1ght.exe (fichiers j${i}.lit) : lvl>=2500, $>=100b, implants>=30 (red pill augmentation), +7 Augmentations

## Autres Faction / Locations

- Géographique : Ishima, New Tokyo, Tian Di Hui ?
- Crime : Slum Snakes, Tetrads +4 Augmentations
- Hakcnet : Netburners
- Infiltration : Shadows of Anarchy (rep. uniquement infiltration), +9 Augmentations
