# Blockers

Échecs de la boucle de validation (typecheck / tests / build). Format et règles : voir `CLAUDE.md`.

## 2026-08-16 — Les postes d'entrée et de sortie étaient dessinés aux deux bouts de l'allée

- **Statut** : Résolu
- **Étape** : tests
- **Commande** : `npm test`
- **Fichier(s)** : src/installation/site.ts, src/installation/net/view.html
- **Erreur** :
  ```
  not ok 28  - the crane is nearly across the aisle while it is only halfway up
    + x: 15.645   - x: 16.166
  not ok 106 - the first level sits on the floor and the twelfth is at the top
    + x: 0.7      - x: 1.4
  ```
- **Cause** : défaut signalé par Mattéo — le transstockeur semblait téléporter ses palettes.
  `positionOf` place `IN-A01` **et** `OUT-A01` à la tête d'allée (0 m), ce qui est juste : sur un
  magasin grande hauteur les deux postes de transfert sont du même côté. Mais le plan dessinait
  l'entrée à gauche du rack et la sortie à droite. Le modèle était bon, la représentation mentait.
  En corrigeant, `slotPosition` a été recentré sur la case — `(colonne − 0,5) × 1,4` au lieu de
  `colonne × 1,4` — pour que le mât s'arrête au milieu de l'emplacement et non sur son arête.
- **Correction** : postes redessinés tous les deux à la tête d'allée, et les deux attentes recalculées
  à partir du nouveau centre de case. Aucune assertion assouplie : elles restent des égalités exactes.

## 2026-08-16 — Test d'accumulation parti d'un état impossible

- **Statut** : Résolu
- **Étape** : tests
- **Commande** : `npm test`
- **Fichier(s)** : src/installation/conveyor.test.ts
- **Erreur** :
  ```
  not ok 10 - two pallets keep their headway all the way down the run
    error: 'pallets got 0 m apart at 0 ms'
  ```
- **Cause** : le balayage commençait à t = 0 alors que la deuxième palette n'entre qu'à t = 4666 ms.
  Avant son entrée, `positionOf` la donne à 0 m — comme la première. Deux palettes au même endroit,
  mais l'une des deux n'existe pas encore sur le convoyeur. État inatteignable en vrai : une palette
  n'entre que par `submit`, donc `enteredAt <= now` toujours.
- **Correction** : le balayage démarre à l'instant d'entrée de la deuxième palette. Le seuil de
  `PALLET_PITCH` n'a pas été touché — c'est la fenêtre d'observation qui était fausse, pas le critère.

## 2026-08-16 — La suite de tests ne rend plus la main

- **Statut** : Résolu
- **Étape** : tests
- **Commande** : `npm test`
- **Fichier(s)** : src/installation/net/telegram-server.ts
- **Erreur** :
  ```
  Command did not complete within its 120s timeout
  ```
- **Cause** : `startTelegramServer` renvoyait le port *demandé* et non le port réellement attribué.
  Le test appelle `startTelegramServer(runtime, 0)` — port 0 signifie « choisis-en un libre » — donc
  le client se connectait au port 0 et attendait une réponse qui ne viendrait jamais.
- **Correction** : le serveur lit `server.address()` après `listen` et publie le port réel. Ce n'était
  pas un défaut de test : un appelant qui demande le port 0 recevait une adresse fausse.

## 2026-08-16 — Deux attentes de test calculées à la main, fausses

- **Statut** : Résolu
- **Étape** : tests
- **Commande** : `npm test`
- **Fichier(s)** : src/installation/crane.test.ts
- **Erreur** :
  ```
  not ok 8 - the twelfth level costs more time than the far end of the aisle
    + actual   15.333333333333334
    - expected 15.277777777777777

  not ok 15 - the crane is nearly across the aisle while it is only halfway up
    + x: 16.166
    - x: 16.168
  ```
- **Cause** : les deux valeurs attendues avaient été posées de tête, pas dérivées du profil trapézoïdal.
  Traversée de 28 m : rampe 12 s (2v/a) + 10 m de croisière à 3 m/s = 46/3 s, pas 55/3,6.
  Position à 10 s d'un trajet triangulaire de 16,8 m : 16,8 − 0,25 × (11,5931 − 10)² = 16,166 m, pas 16,168.
- **Correction** : attentes remplacées par les valeurs dérivées de la formule. Aucune assertion assouplie —
  les deux restent des égalités exactes, et `travelTime` / `distanceCovered` n'ont pas été touchés.

## 2026-08-17 — Le report du reste d'horloge perd des pas

- **Statut** : Résolu
- **Étape** : tests
- **Commande** : `npm test`
- **Fichier(s)** : src/installation/clock.ts
- **Erreur** :
  ```
  not ok 3 - le reste est reporté au lieu d'être perdu
    + actual   1
    - expected 2
  ```
- **Cause** : `drawTicks` gardait le reste en secondes puis le redivisait par `TICK_SECONDS`.
  0,03 − 1 × 0,02 = 0,009999999999999998 en flottant ; 0,009999999999999998 + 0,03 = 0,039999999999999994,
  divisé par 0,02 donne 1,9999999999999996, dont le plancher vaut 1 et non 2. Un pas était perdu
  à chaque fois qu'un multiple exact tombait juste en dessous. Sur une longue exécution, le temps
  simulé prenait un retard silencieux sur le temps réel, d'autant plus vite que le facteur est élevé.
- **Correction** : le reste est désormais compté en pas (nombre fractionnaire de ticks) et non en secondes,
  et le plancher est pris avec une tolérance de 1e-9. Le reste reste borné dans [0, 1) pas, donc l'erreur
  ne peut plus s'accumuler. Aucune assertion n'a été touchée.
