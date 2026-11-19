# Diploval V0.3 — B9.10 : audit de consolidation des lots B7 à B9.9
**19 novembre 2026 — audit technique documentaire et CI — NO GO**

## 1. Portée et règles
Audit de consolidation sur la PR GitHub #20, branche `audit/consultations-v03-b7-rgpd-cgu-2026-11-19`. Objectif : inventorier les preuves disponibles, repérer les écarts matériels et hiérarchiser les travaux sans prolonger indéfiniment la série de prototypes. **Ne pas fusionner, publier ni activer la V0.3. Ne pas modifier la V0.2.**

## 2. Éléments vérifiés
- PR #20 : ouverte, brouillon, non fusionnée, base `main`.
- Inventaire : 39 fichiers modifiés/ajoutés lors du premier contrôle B9.10.
- Grille B7 : `release=NO_GO`, `actual_processing_enabled=false`, `legal_docs_published=false`, **16 blocages P01–P16 encore OPEN**.
- Workflow `.github/workflows/consultations-v03-audit.yml` créé et présent sur la branche ; Node 22, tests fictifs, aucun déploiement.
- **Preuve CI GitHub Actions sur le commit `249dc8f64a5adfd52611e371bd6c43b70f294d44` : run `44563249387`, job `135697974422`, terminé en échec : 86 tests, 85 réussites, 1 échec.** Le contrôle B7 NO GO a réussi.
- Échec isolé au test B9.3 `un autre dossier ne peut être lu ou modifié` : message produit `Checkpoint invalide.` alors que l'assertion attendait `/Périmètre/`. Le système rejetait bien l'opération ; **l'assertion a été corrigée** sur le commit `7639b6fa013879dcf38e64f8191f8ff61da27451`. Aucun nouveau résultat CI n'était encore disponible au moment de ce bilan. N'annoncer **ni 86/86 réussis ni conformité** sans preuve d'un nouveau run.

## 3. Cartographie des modules
| Lot | Livrable | Portée constatée | Situation |
|---|---|---|---|
| B9.1 | `dialogue-data-rights.mjs` | Projection d'export partiel, demandes enregistrées par adaptateurs | Registre réel, suppression et export complet manquants |
| B9.2 | `dialogue-erasure-coordinator.mjs` | 7 étapes, arrêt sur échec, reprise par checkpoint | Adaptateurs physiques absents |
| B9.3 | `dialogue-erasure-journal-b9.mjs` | CAS/ETag, propriétaire exclusif, révision | Garantie du fournisseur non testée ; pas de reprise automatisée sûre |
| B9.4 | `dialogue-erasure-locked-runner.mjs` | Liaison expérimentale moteur/journal | Fencing atomique chez chaque cible non démontré |
| B9.5 | `dialogue-fenced-projection-fixture.mjs` | Blocage public en mémoire et refus de révision périmée | Aucun CDN/cache ou stockage durable |
| B9.6 | workflow CI | Tests sous Node 22, sans déploiement | 1 échec d'assertion corrigé, nouvelle preuve attendue |
| B9.7 | `dialogue-b9-7-incident-fixture.mjs` | Panne après dépublication avant checkpoint | Simulation seulement |
| B9.8 | `dialogue-erasure-reconciler.mjs` | Preuve, supervision et réparation CAS du journal | Neutralisation de l'exécutant non implémentée chez les fournisseurs |
| B9.9 | `dialogue-erasure-dual-review.mjs` | Relecteur distinct, preuve structurée, décision de passation | Décision à usage unique non garantie |

## 4. Écarts prioritaires avec conséquences
**S1 — Critique :** aucune preuve de fencing atomique aux points d'écriture des véritables fournisseurs. Un ancien exécutant peut, en théorie, produire un effet malgré un changement de révision du journal. Ne pas brancher le code à un stockage réel.

**S2 — Critique :** aucune chaîne complète d'effacement réel (dossiers, versions, réponses, recours, index de contacts, jetons, références, caches et sauvegardes), ni contrôle post-restauration. Les choix de conservation et exceptions légales restent ouverts.

**S3 — Élevé :** B9.9 doit garantir que la décision serveur `caseId + revision + evidenceId + executorId` est strictement égale à la demande de passation, consommée atomiquement une seule fois ; contrôle durable, traçabilité et gestion des collisions à prévoir. Les contrôles actuels sont seulement un préexamen, **sans permission d'exécution**.

**S4 — Élevé :** la coexistence de `approve` et `audit` peut entraîner un état ambigu si la décision est sauvegardée et que l'audit échoue ; des opérations transactionnelles et une procédure de compensation sont nécessaires.

**S5 — Élevé :** la reprise B9.8 avance une révision de journal après appel à des vérifications injectées, mais ne garantit pas à elle seule l'arrêt physique du processus précédent ; revue indépendante et protocole serveur explicite indispensables.

**S6 — Élevé :** aucune identité professionnelle réelle avec MFA, droits fins, séparation des fonctions et révocation testés ; aucune preuve d'AIPD, sous-traitants, transferts, traitement des opinions sensibles, notice des articles 6/9/13 ni politique de durées approuvée.

**S7 — Vérification :** le workflow CI est disponible, mais un run rouge a été observé. Le correctif de l'assertion n'est pas une preuve d'un nouveau run vert.

## 5. Ordre de résolution recommandé
1. **Ne plus ajouter de nouveaux modules de production** avant revue de l'architecture, exécution CI verte et correction des écarts S1–S7.
2. Obtenir un résultat CI vert sur le SHA courant, conserver un lien vers run et logs ; ajouter tests négatifs pour cas/revision/preuve de B9.9.
3. Décider du véritable système de stockage et vérifier contractuellement/techniquement son CAS, la cohérence, les transactions ou un modèle de tombstone global ; documenter la cacheabilité du public.
4. Écrire un protocole de réconciliation et de reprise avec preuve durable, mécanisme à usage unique et séparation des identités.
5. Développer une chaîne d'effacement isolée avec réels adaptateurs sur données de test, y compris simulation de restauration, sans aucune information personnelle.
6. Finaliser les décisions RGPD et contractuelles avant rédaction définitive et validation humaine des textes.
7. Faire une revue indépendante de sécurité et du RGPD ; seul le responsable habilité peut autoriser l'ouverture, après fermeture **avec preuves** des 16 portes B7.

## 6. Décision de l'audit B9.10
**NO GO MAINTENU.** La V0.3 ne doit pas traiter de données réelles, ni être intégrée à une route publique, ni faire l'objet d'une publication juridique. L'audit B9.10 est un bilan de consolidation, **pas** un certificat de sécurité ou de conformité.

## Sources internes de preuve
- PR : https://github.com/DiplovalOfficiel/diploval-site/pull/20
- Run CI en échec : https://github.com/DiplovalOfficiel/diploval-site/actions/runs/44563249387
- Grille : `docs/consultations/DIPLOVAL_V03_B7_gate_NO_GO.json`
- Workflow : `.github/workflows/consultations-v03-audit.yml`
- Test corrigé : `tests/dialogue-b9-3-journal-concurrency.test.mjs`


## 7. Complément vérifié : CI verte et contrôle de liaison B9.9
- Le workflow GitHub Actions `44563826993` exécuté sur le commit `2e7a6721b319e920786e09b51a2a262261b10649` s'est terminé en succès : **8/8 tests B7 et 86/86 tests B8–B9 réussis**. Cela ferme l'écart **de vérification de la suite unitaire** pour ce SHA, et **non** les conditions RGPD/sécurité d'ouverture.
- Correction ciblée B9.9 : la décision chargée depuis le serveur doit avoir exactement les mêmes valeurs `caseId`, `expectedRevision`, `evidenceId` que la demande courante.
- Trois tests de régression ajoutés : refus d'une décision provenant d'un autre dossier, d'une autre révision ou d'une autre preuve.
- Les trois nouveaux tests et le correctif doivent recevoir une **nouvelle preuve CI** sur leur propre commit. Ne pas attribuer à ce dernier le résultat vert antérieur.
- L'usage unique transactionnel de la décision, l'audit atomique, le fencing des adaptateurs, les stockages réels et les validations juridiques sont **toujours non résolus**. **NO GO inchangé.**

Preuve du run : https://github.com/DiplovalOfficiel/diploval-site/actions/runs/44563826993
