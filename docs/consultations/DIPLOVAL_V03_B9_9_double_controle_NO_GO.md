# Diploval V0.3 — B9.9 : séparation validation/exécution, preuve structurée et revue
**19 novembre 2026 — PROJET INTERNE / NO GO**

## Portée
Préparer un mécanisme de double contrôle après une panne d'effacement. Un responsable de validation distinct de l'exécutant examine une preuve structurée avant toute éventuelle reprise. **Aucune sortie de verrou n'est exécutée par le lot B9.9**.

## Livrables
- `netlify/lib/dialogue-erasure-dual-review.mjs` : vérifications internes, désactivées par défaut et sans HTTP.
- `tests/dialogue-b9-9-dual-control.test.mjs` : 12 scénarios fictifs (à exécuter sur le commit).
- `.github/workflows/consultations-v03-audit.yml` : inclut les scénarios B9.9.

## Contrôles du prototype
- Habilitation du relecteur via un fournisseur côté serveur ; son identifiant doit être distinct de celui de l'exécutant désigné.
- Vérification du dossier d'effacement juridiquement approuvé, de son verrou actif et de sa révision attendue.
- Preuve structurée référencée (identifiant du dossier, numéro de révision et références des contrôles de stockage). Les contenus sensibles n'ont pas à être recopiés dans la décision.
- Vérification indépendante de la preuve et enregistrement d'une décision avant tout examen de passation.
- La demande de passation récupère la décision depuis un adaptateur serveur, jamais depuis un objet libre du navigateur.
- Résultat limité : `authorized: true`, `automaticResume: false`, `unlockPerformed: false`. **Aucun déverrouillage réel.**

## Risques et contrôles encore manquants
1. La décision enregistrée n'est **pas encore consommée atomiquement** à usage unique : un vrai mécanisme transactionnel est nécessaire pour empêcher les réutilisations et courses critiques.
2. Les identités du relecteur et de l'exécutant doivent être fondées sur une authentification professionnelle vérifiée (MFA, révocation, séparation des fonctions et journal d'accès), pas sur des libellés transmis par le navigateur.
3. En cas d'échec du journal d'audit après sauvegarde de la décision, celle-ci peut exister sans confirmation d'audit ; une reprise avec statut ambigu doit être bloquée et rapprochée.
4. Les pièces de preuve doivent être authentifiées, horodatées, protégées, stockées avec durée limitée et liées à la bonne révision ; le type `sources[]` seul n'est pas une preuve suffisante.
5. Ne pas faire confiance à la seule lecture du verrou : l'acquisition du droit d'exécuter et les modifications de chaque véritable stockage doivent être protégées contre les révisions périmées au moment de l'écriture.
6. Le mécanisme proposé ne vérifie pas encore techniquement que l'ancien exécutant a cessé tous ses travaux. Ce contrôle doit rester obligatoire avant reprise.
7. Dépublication, suppression des index et données, caches, sauvegardes et restauration ne sont pas opérationnels sur des prestataires réels.

## Tests à attester
Douze scénarios de refus/acceptation : désactivation, dépendances, double contrôle, identité non autorisée, même intervenant, preuve absente, preuve invalide, révision périmée, échec d'enregistrement, absence de déverrouillage, mauvais exécutant, absence de décision enregistrée.
L'ajout des tests **ne vaut pas test réussi** ; contrôler l'exécution CI sur le SHA exact du commit.

## Étape suivante
B9.10 : revoir l'architecture complète de reprise, rendre les décisions de passation à usage unique et proposer un plan de validation indépendant incluant la conformité RGPD. Éviter de multiplier les prototypes sans preuve d'intégration : prioriser l'exécution CI et le contrôle des véritables garanties du fournisseur.

## Statut
Aucun endpoint, aucune collecte réelle, aucune fusion de PR, aucune modification V0.2. Grille B7 P01–P16 toujours ouverte. **V0.3 : NO GO**.
