# Navette

Émulation de l'installation (TypeScript, exécuté par `tsx`) + un WCS écrit en Rust dans `WCS-Rust/`.

## Commandes de validation

| Rôle | Commande | Répertoire |
| --- | --- | --- |
| Typecheck | `npm run check` | racine |
| Tests | `npm test` | racine |
| Build | `cargo build` | `WCS-Rust/` |

Le TypeScript n'a pas d'étape de build séparée : `tsx` exécute les sources directement, donc `npm run check` (`tsc --noEmit`) **est** la compilation côté TS. Le seul vrai build est celui du crate Rust.

## Boucle de validation automatique — OBLIGATOIRE

Après **chaque** modification de fichier (Edit ou Write), sans attendre qu'on le demande :

1. Lancer les trois commandes ci-dessus, dans cet ordre : typecheck → tests → build.
   - Si la modification ne touche que `src/`, `cargo build` peut être sauté.
   - Si elle ne touche que `WCS-Rust/`, `npm run check` et `npm test` peuvent être sautés.
   - Une modification qui ne touche que de la documentation (`*.md`) ne déclenche rien.
   - Au moindre doute sur la portée : tout lancer.
2. Si tout passe : appliquer le contrôle « vert ≠ correct » ci-dessous, puis continuer en indiquant en une ligne que la validation est verte.
3. Si quelque chose échoue : **c'est un blocker**. Ne pas enchaîner sur la tâche suivante, ne pas commiter, ne pas empiler une nouvelle modification par-dessus.

### Vert ≠ correct

Une suite verte prouve seulement que rien de ce qui était déjà surveillé n'a cassé. Elle ne prouve pas que la modification fait ce qu'elle prétend faire. Après chaque passage vert, poser explicitement la question :

> Quel test échouerait si j'annulais la modification que je viens d'écrire ?

- S'il y en a un : le nommer en une ligne dans la réponse. La boucle a réellement mordu.
- S'il n'y en a aucun : **la modification n'est pas couverte**. Le dire franchement, et écrire le test manquant avant de passer à la suite — pas plus tard, pas « dans un ticket ».

Interdits, parce qu'ils rendent la boucle verte sans rendre le code juste :

- assouplir une assertion pour qu'elle passe ;
- tester la fonction sur la seule entrée qu'elle sait déjà traiter ;
- mesurer un comportement inventé pour le test au lieu de celui de l'installation réelle (un convoyeur qui ne tombe jamais en panne, un carton toujours bien positionné).

Un test qui ne peut pas échouer n'est pas un test, c'est un thermomètre bloqué à 37 °C.

### Traitement d'un blocker

1. **Consigner d'abord** l'échec dans `BLOCKERS.md` (voir format ci-dessous) — avant toute tentative de correction, pour que la trace survive même si la correction part de travers.
2. Corriger la cause, pas le symptôme (ne jamais désactiver un test, ni ajouter un `any`, ni `@ts-ignore`, pour faire taire l'erreur).
3. Relancer la boucle complète.
4. Quand c'est vert : passer l'entrée de `BLOCKERS.md` en `Résolu` avec une ligne sur la correction réelle.
5. Ce n'est qu'à ce moment-là qu'on reprend la tâche interrompue.

Si le blocker ne peut pas être résolu (dépendance manquante, décision à prendre par Mattéo) : le laisser en `Ouvert` dans `BLOCKERS.md`, le signaler explicitement dans la réponse, et ne pas continuer comme si de rien n'était.

### Format d'une entrée `BLOCKERS.md`

```markdown
## AAAA-MM-JJ — <titre court>

- **Statut** : Ouvert | Résolu
- **Étape** : typecheck | tests | build
- **Commande** : `npm test`
- **Fichier(s)** : src/installation/flow.ts
- **Erreur** :
  ```
  <sortie brute, tronquée aux lignes utiles>
  ```
- **Cause** : <ce qui a réellement cassé>
- **Correction** : <ce qui a été fait — rempli à la résolution>
```

Les entrées résolues restent dans le fichier : c'est l'historique des pièges rencontrés, pas une file d'attente à vider.
