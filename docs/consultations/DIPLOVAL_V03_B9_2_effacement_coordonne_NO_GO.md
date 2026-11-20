# Diploval V0.3 — B9.2 : orchestration d'effacement multi-stockages
**19 novembre 2026 — prototype interne, jamais raccordé — NO GO**

## Objectif et limite
Modéliser une demande d'effacement autorisée, avec exécution **séquentielle**, vérifications, journal de reprise et arrêt si une étape n'est pas confirmée. Ce prototype n'est pas connecté à des données réelles, à un fournisseur de sauvegardes, à une route HTTP ou à Netlify Functions. L'API est désactivée par défaut. Le passage de `enabled=true` dans un test fictif n'est pas une autorisation d'usage réel.

## Livrables
- `netlify/lib/dialogue-erasure-coordinator.mjs` — moteur interne, piloté par adaptateurs injectés.
- `tests/dialogue-b9-erasure-coordinator.test.mjs` — 10 tests utilisant exclusivement des données en mémoire.
- **Exécution locale du prototype correspondant : 10 réussites sur 10 sous Node v22.16.0.** Le résultat ne certifie pas l'exécution du commit distant ni la sécurité de l'infrastructure de production.

## Sept étapes proposées et ordonnées
1. `blockPublication` — rendre les projections publiques indisponibles, avant effacement privé.
2. `revokeAccess` — révoquer les sessions et liens encore actifs.
3. `removeContactIndex` — désindexer le contact HMAC.
4. `erasePrivateRecords` — traiter textes, versions, recours, réponses et justificatifs selon la décision et la règle de conservation.
5. `removePublicReference` — supprimer ou invalider la correspondance publique.
6. `reconcileBackups` — traiter les sauvegardes et mécanismes de restauration pour empêcher la résurrection de données effacées.
7. `verifyAbsence` — vérifier les stockages, copies et projections relevant du système.

**Les sept adaptateurs ci-dessus ne sont pas implémentés pour un fournisseur réel.** Chaque adaptateur doit être idempotent, fournir une preuve durable et refuser la confirmation si le stockage n'est pas vérifiable. « Confirmed » dans un test ne constitue aucune preuve d'effacement réel.

## Conditions de contrôle
- Dossier d'effacement valide et **décision humaine approuvée**, après qualification juridique, vérification du demandeur et contrôle d'une éventuelle obligation de conservation.
- Autorisation serveur et journal durable obligatoires. Aucun argument venant du navigateur ne peut produire une habilitation.
- Si une étape échoue ou si son journal ne peut pas être confirmé, arrêt immédiat ; reprise contrôlée après analyse.
- Un journal durable doit être protégé des écritures concurrentes et utiliser des écritures conditionnelles/transactées, non encore codées.
- Si une action réussit mais que le checkpoint échoue, la reprise peut relancer cette action : **chaque adaptateur doit être idempotent** et les opérations ambiguës nécessitent réconciliation manuelle.
- Les identifiants de cas et données internes ne doivent pas être envoyés à des services externes non vérifiés.
- L'effacement complet n'est pas garanti lorsque subsistent obligations légales, copies hors contrôle, rétentions ou délais de sauvegardes ; communiquer précisément le périmètre réel et ses exceptions.

## Lacunes bloquantes avant tout branchement
- Politique de conservation et d'exception juridique par objet, signée ; rôle de validation humaine et traitement des litiges.
- Journal durable atomique, **verrou distribué / prévention des exécutions parallèles**, politique de reprise après panne et attestations.
- Adaptateurs effectifs : dépublication/caches, révocation, index HMAC, stockage et références, sauvegardes et restauration, vérification post-effacement.
- Gestion particulière des rectifications d'adresse, des tiers, des pièces, des identifiants dans les logs et des exports.
- Sécurité indépendante, tests de concurrence, injections de pannes, restauration et revue juridique AIPD.
- Ne pas exposer le moteur par une fonction Netlify et ne pas définir `enabled=true` en production.
- Conserver les 16 conditions B7 en état OPEN ; aucune fusion ni ouverture V0.3.

## Essais locaux réalisés
`node --test dialogue-b9-erasure-coordinator.test.mjs` dans un répertoire temporaire contenant le module et les tests correspondants. 10 tests passés, 0 échec. Cela vérifie la logique fictive : activation par défaut refusée, validation préalable, ordre, arrêt sur erreur, reprise, idempotence après clôture et refus d'un journal incohérent. Ce n'est ni un test complet du dépôt GitHub ni un essai d'effacement réel.

## Prochaine étape technique
B9.3 : adapter durable pour le registre, test de concurrence, implémentation de l'invalidation des projections publiques dans un environnement isolé, puis chaque stockage avec ses preuves ; seulement après ces étapes, exercer un scénario intégral fictif de bout en bout.
