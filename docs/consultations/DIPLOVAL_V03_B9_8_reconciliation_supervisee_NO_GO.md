# Diploval V0.3 — B9.8 : réconciliation supervisée après incident
**19 novembre 2026 — Prototype interne / NO GO**

## Objet
Suite au scénario B9.7 (dépublication réellement appliquée dans une simulation, mais checkpoint non écrit), prévoir un mécanisme qui **n'assimile jamais une écriture de journal à la preuve d'un effacement**. Une personne habilitée doit vérifier l'effet observé et neutraliser l'ancien exécutant avant toute correction.

## Livrables
- `netlify/lib/dialogue-erasure-journal-b9.mjs` : ajout d'une opération `reconcileLocked` utilisant CAS/ETag ; elle augmente la révision, remplace le propriétaire et conserve `lockStatus: locked`.
- `netlify/lib/dialogue-erasure-reconciler.mjs` : composant interne exigeant habilitation de supervision, décision juridique, vérification de la neutralisation de l'ancien exécutant, preuve de l'effet, piste d'audit et stricte continuité des étapes.
- `tests/dialogue-b9-8-supervised-reconciliation.test.mjs` : onze scénarios fictifs.
- `.github/workflows/consultations-v03-audit.yml` : tests B9.8 inclus dans les vérifications prévues.

## Sûretés recherchées
1. **Pas de preuve, pas de correction** : l'affirmation qu'une étape a eu lieu doit être confirmée par une vérification indépendante du stockage concerné et une référence de preuve.
2. **Neutralisation préalable** : le superviseur doit garantir que l'ancien exécutant n'agit plus ; la seule expiration d'un lien ou le seul changement de variable ne le garantissent pas.
3. **Journal monotone** : seule l'étape suivant exactement le checkpoint déjà confirmé peut être réconciliée. Aucune étape intermédiaire ne peut être sautée.
4. **CAS atomique du journal** : si la révision a changé entre inspection et correction, l'écriture échoue.
5. **Fencing et maintien du verrou** : révision augmentée et ancien propriétaire invalidé ; jamais de déverrouillage automatique ni de relance automatique.
6. **Trace d'audit avant correction** : si sa persistance échoue, le journal n'est pas modifié.

## Limites résiduelles
- Les fonctions injectées `verifyQuiescence`, `verifyEffect`, `authorizeSupervisor` et `recordAudit` sont des **contrats abstraits** ; les vrais mécanismes ne sont pas développés.
- Le remplacement du propriétaire du journal n'est pas, à lui seul, une neutralisation d'un ancien processus encore capable de muter le stockage. Chaque adaptateur devra effectuer un contrôle atomique de sa propre révision, ou une protection équivalente vérifiée.
- Le workflow ne propose aucun déblocage après réconciliation : le dossier reste verrouillé et une reprise supervisée ultérieure nécessite un protocole distinct, validé et testé.
- La preuve d'exécution ne doit pas contenir de textes citoyens ni de données sensibles. Une simple référence `evidenceId` n'est pas une preuve juridiquement suffisante sans stockage sûr des pièces et règles de conservation.
- Les onze tests ne démontrent rien sur la robustesse des opérations Netlify, sur les CDN, sur les caches ou sur les sauvegardes. Il faut des essais d'intégration et une revue indépendante.

## État des essais
Onze scénarios de tests ont été ajoutés pour les cas autorisé, non autorisé, preuve absente, ancien exécutant actif, audit en erreur, continuité des étapes, révision obsolète, verrou maintenu et absence de reprise automatique.
**Leur exécution sur le commit distant reste non attestée à la date du présent document.** Ne pas confondre tests créés et tests réussis.

## Suite de travail recommandée (B9.9)
Revoir la conception à deux personnes (séparation validation et exécution), ajouter les preuves structurées conservées de façon minimisée, puis tester le protocole de déverrouillage supervisé dans un banc d'essai reproduisant les garanties réelles de stockage. Ne jamais automatiser une reprise tant que le fencing des adaptateurs n'est pas démontré.

## Statut
La PR #20 reste un brouillon de préparation. **Aucune activation V0.3, aucune suppression réelle, aucune fusion, aucun changement de V0.2.** Les seize points bloquants P01–P16 du B7 restent ouverts.
