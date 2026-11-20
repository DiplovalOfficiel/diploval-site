# Diploval V0.3 — B9.7 : crash après mutation avant journalisation
**19 novembre 2026 — Prototype fictif / NO GO**

## Livrables
- `netlify/lib/dialogue-b9-7-incident-fixture.mjs` : banc d'intégration strictement en mémoire, dossier et contributeur fictifs, injection de panne du journal après masquage public.
- `tests/dialogue-b9-7-incident-recovery.test.mjs` : cinq tests décrivant le chemin nominal, la panne, la reprise refusée, l'échec d'adaptateur et l'absence de données réelles.
- `.github/workflows/consultations-v03-audit.yml` : mise à jour pour exécuter ces tests en plus des contrôles précédents.

## Cas essentiel simulé
1. Un cas d'effacement fictif est approuvé dans la simulation et acquiert un verrou.
2. L'adaptateur en mémoire exécute `blockPublication` : le contenu public n'est plus renvoyé.
3. L'écriture de checkpoint échoue avant que l'état du journal indique `blockPublication` terminé.
4. Le moteur signale une erreur ; le verrou reste actif et aucun succès d'effacement n'est annoncé.
5. Une deuxième exécution non supervisée est refusée. Le texte reste masqué.

Cette situation **ne démontre pas qu'un ancien exécutant est incapable d'écrire dans un stockage distant**. Le blocage public repose sur un double en mémoire synchrone, sans CDN, sauvegardes, sessions réelles ni fournisseur de données.

## Critères avant validation
- Tests B9.7 et B7–B9.5 verts sur le SHA exact de la PR (preuve GitHub Actions ou exécution reproductible).
- Étapes d'effacement atomiquement protégées par révision chez chaque véritable prestataire ; pas de simple vérification puis mutation.
- Procédure documentée de reprise supervisée, de reconnaissance d'effets déjà appliqués et de correction du checkpoint sans déverrouillage aveugle.
- Politique juridique de conservation et de suppression validée, restauration de sauvegarde testée sur données fictives, caches et projections vérifiés.
- Aucune activation de V0.3 ni collecte réelle ; conditions B7 P01–P16 toujours OPEN.

## Portée des tests
**Cinq scénarios de tests ont été ajoutés. Leur exécution sur le commit GitHub n'est pas présumée réussie.** Le workflow peut être consulté dans l'onglet Actions de la PR. Aucun résultat d'audit de production n'est revendiqué.

## Suite B9.8
Préparer une procédure explicite de réconciliation supervisée d'une opération à effet confirmé mais checkpoint manquant ; comparer ensuite les garanties transactionnelles réelles des prestataires et formaliser les limites de cache/sauvegarde.
