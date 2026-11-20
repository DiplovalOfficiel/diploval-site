# Diploval V0.3 — Intégration 04 : créations et rectifications interrompues
**19 novembre 2026 — Prototype interne de journalisation / NO GO**

## Preuve CI antérieure
Run `44567414399` sur le commit `f4eef43cb160a4902cbba2808c60488919174d6a` : 8/8 contrôles B7 et 116/116 tests techniques réussis, soit **124 tests réussis sur 124**. Cette preuve ne couvre pas les fichiers de la présente étape.

## Livrables
- `netlify/lib/dialogue-mutation-recovery-journal.mjs` : journal de suivi CAS/ETag désactivé par défaut, sans route HTTP ni écriture dans les dossiers de citoyens.
- `tests/dialogue-mutation-recovery-journal.test.mjs` : onze scénarios fictifs de création, rectification, ordre, preuve et autorisation.
- Workflow CI étendu pour ces onze tests.

## États
Deux types d'opérations sont distingués :
1. `create` : réservation de la référence, enregistrement du dossier privé, confirmation de l'index du contact.
2. `rectify_contact` : vérification du nouveau contact, modification du dossier, confirmation du nouvel index, retrait de l'ancien index et révocation des sessions précédentes.

La mutation démarre en `pending`. Chaque étape est confirmée exclusivement par un adaptateur `verifyStep` injecté, avec identifiant de preuve, puis sauvegardée conditionnellement. L'opération passe à `complete` seulement une fois toutes les étapes prévues enregistrées. L'ordre ne peut être modifié, les demandes concurrentes sont protégées au niveau de l'objet journal par ETag, les demandes sans habilitation sont refusées.

## Limites et risques non résolus
- Les adaptateurs de vérification sont des contrats fictifs ; leur intégrité, la preuve des effets et leur rattachement à une identité authentifiée ne sont **pas démontrés en production**.
- Le journal n'est **pas transactionnel avec les dossiers, références et index**. Si une mutation échoue avant écriture du journal, une intervention et une preuve indépendante restent nécessaires.
- Le schéma `rectify_contact` n'effectue **aucune** correction d'adresse ; de plus, l'ancien index ne doit pas demeurer utilisable pendant une transition. Il faudra un protocole de transition sécurisé avec blocage des récupérations anciennes.
- Le journal porte des identifiants et des références, mais aucune donnée sensible supplémentaire ; les durées de conservation et son propre effacement doivent être établis.
- Une écriture confirmée dans le journal n'établit pas qu'une mutation réelle ne peut être annulée ou reconstituée par une restauration ultérieure.
- Le stockage fournisseur, les garanties de CAS, la résistance aux pannes et à la concurrence, la restauration et le fencing ne sont pas encore attestés.
- Les nouveaux tests doivent passer sur le SHA exact avant de pouvoir être déclarés réussis.

## Décision
Préparation de la traçabilité des mutations, sans correction ni suppression automatique. **NO GO maintenu** : 16 points B7 encore ouverts, aucune collecte V0.3 ni fusion PR #20, V0.2 inchangée.

## Étape utile suivante
Faire vérifier les nouveaux tests, puis consolider la politique de « création en cours » et la récupération d'un dossier privé (preuve par email, gestion de session et procédures de rupture/rectification) avant le raccordement réel.
