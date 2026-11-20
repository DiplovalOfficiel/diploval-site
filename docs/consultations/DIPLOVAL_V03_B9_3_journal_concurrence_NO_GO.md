# Diploval V0.3 — B9.3 : journal conditionnel et exclusion des traitements simultanés
**19 novembre 2026 — Prototype interne / NO GO**

## Livrables
- `netlify/lib/dialogue-erasure-journal-b9.mjs` : journal de demande et propriétaire exclusif, utilisant lecture forte et écritures conditionnelles par ETag.
- `tests/dialogue-b9-3-journal-concurrency.test.mjs` : 11 scénarios synthétiques, à exécuter sur le commit réel.
- Aucun endpoint HTTP ajouté ; aucune configuration de production ni modification de V0.2.

## Fonctionnement
Chaque dossier d'effacement dispose d'un objet contenant une révision, un état de verrouillage (`locked` ou `released`), un propriétaire serveur opaque et un checkpoint. `acquire` utilise une écriture conditionnelle `onlyIfNew` ou `onlyIfMatch`, puis relit la valeur. Une deuxième acquisition simultanée doit échouer. `scoped(token)` n'autorise la lecture et l'écriture du checkpoint que pour le propriétaire et la révision encore actifs. `release` marque la fin de l'exclusion ; la révision change lors de la prochaine acquisition. Après incident, un verrou actif demeure bloquant : aucun timeout ni reprise automatique.

## Limites importantes
**Ce journal n'est pas encore intégré au moteur B9.2.** Ce dernier accepte toujours un adaptateur journal injecté sans verrou obligatoire : le brancher directement à un stockage réel serait dangereux. Il faut imposer un protocole d'acquisition, exécution et clôture, avec barrières d'exécution côté adaptateurs et gestion des pannes.
- La fiabilité dépend des véritables garanties ETag, cohérence forte et conditionnalité du fournisseur. Aucun contrat ni test d'intégration fournisseur n'a été examiné.
- Le verrou propriétaire n'est pas un mécanisme distribué complet de fencing : les effets d'un ancien exécutant doivent être empêchés aussi **dans chaque adaptateur cible**.
- Le jeton d'ownership est un contrôle serveur interne, pas une authentification utilisateur ni une habilitation RGPD.
- La reprise après crash nécessite intervention et diagnostic humain : contrôler l'étape potentiellement effectuée sans checkpoint, confirmer l'idempotence, puis invalider le précédent exécutant avant de reprendre.
- Les données effacées, index, caches, sauvegardes et preuves ne sont pas réellement traitées par ce journal.
- Ne pas placer d'informations sensibles dans les identifiants, propriétaire ou logs.

## Tests proposés (non attestés sur GitHub)
Onze scénarios synthétiques : stockage absent, acquisition, contention simultanée, verrou exclusif, checkpoint écrit, isolement des dossiers, conservation après libération, rejet du détenteur précédent, verrou conservé après interruption, checkpoint invalide, cycle de libération. Leurs résultats **ne sont pas déclarés réussis** faute d'exécution du commit exact. Commande :
```bash
node --test tests/dialogue-b9-3-journal-concurrency.test.mjs
```

## Priorités B9.4
1. Intégrer un journal supervisé et le verrou exclusif au moteur, sans risque de double exécution ni déblocage automatique.
2. Étudier le fencing/lease adapté au fournisseur, et les réécritures interdites en cas d'échec du journal.
3. Implémenter dans un stockage d'essai la dépublication et les mécanismes de révocation, avec tests d'accès public concurrent.
4. Tester les interruptions avant/après chaque écriture, restaurations et reprises sur un environnement isolé.
5. Conserver les 16 verrous de préparation B7 jusqu'à preuves réelles et revue indépendante.

**Décision : B9.3 développé comme prototype isolé ; V0.3 NO GO, données citoyennes réelles interdites.**
