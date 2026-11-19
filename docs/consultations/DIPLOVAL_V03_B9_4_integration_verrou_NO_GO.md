# Diploval V0.3 — B9.4 : intégration isolée du moteur d'effacement et du journal exclusif
**19 novembre 2026 — Travail interne / NO GO**

## Livrables
- `netlify/lib/dialogue-erasure-locked-runner.mjs` : adaptateur expérimental du moteur B9.2 avec le journal B9.3.
- `tests/dialogue-b9-4-locked-runner.test.mjs` : neuf scénarios fictifs de refus, exclusion, interruption et reprise sur un dossier terminé.
- Aucune route HTTP ou Netlify Function, aucun changement de V0.2 ni manipulation de données citoyennes.

## Invariants visés
- Désactivation par défaut et refus si les dépendances requises sont absentes.
- Contrôle d'habilitation et décision humaine approuvée **avant** l'acquisition du verrou ; les contrôles sont répétés dans le moteur B9.2.
- Acquisition CAS avant tout adaptateur ; journal lié à un propriétaire opaque et à une révision.
- Lecture du journal avant chaque étape ; les adaptateurs reçoivent le propriétaire/révision pour pouvoir effectuer leur propre contrôle.
- Échec d'une étape ou du checkpoint => aucun déverrouillage automatique et aucune affirmation de succès.
- Dossier terminé => pas de répétition des sept étapes, sous réserve de cohérence du journal.

## Limites de sûreté importantes
**Attention : la lecture du journal avant un geste et le jeton transmis à l'adaptateur ne constituent pas un fencing atomique.** Un opérateur ancien peut redevenir actif entre vérification et modification. Il faudra que chaque adaptateur de stockage refuse les opérations portant une révision obsolète dans la même unité transactionnelle que la modification, ou employer un mécanisme équivalent garanti par le fournisseur.
- Le moteur B9.2 non intégré demeure disponible à l'import : il ne doit pas être raccordé directement à des données réelles.
- Le verrou B9.3 n'a pas de protocole de reprise supervisée après crash. En cas de verrou abandonné, l'intervention humaine doit examiner toutes les opérations possiblement exécutées.
- Les adaptateurs fictifs des tests retournent `confirmed:true`, ce qui ne démontre aucune suppression ni aucune garantie sur les sauvegardes.
- Le mécanisme de journal n'est pas encore éprouvé sur un fournisseur de stockage réel, ni contre un processus malveillant ou une panne réseau.
- Une véritable dépublication doit précéder tout effacement et être garantie lors de tout accès public concurrent.
- Les politiques de conservation, obligations légales de maintien, purge, AIPD, sous-traitants et revue indépendante restent non validées.

## Tests et preuves
Neuf tests unitaires ont été ajoutés au dépôt. **Aucun résultat de test sur le commit distant n'était disponible à la rédaction** ; ne pas présenter ces neuf scénarios comme certifiés réussis sur GitHub. Commande prévue :
```bash
node --test tests/dialogue-b9-4-locked-runner.test.mjs
```
La validation de ces tests ne suffirait de toute façon pas à permettre des suppressions réelles : il faudra des tests d'intégration avec un stockage isolé et des restaurations fictives.

## Décision
B9.4 : **implémentation expérimentale enregistrée, validation opérationnelle refusée**. Les 16 conditions du lot B7 restent OPEN ; `release: NO_GO`. Ne pas fusionner la PR #20, ne pas publier les CGU, ne pas ouvrir la V0.3.

## Suite recommandée B9.5
- Valider l'exécution CI des scénarios B9.3/B9.4.
- Créer des adaptateurs de publication et révocation en environnement de test avec contrôle atomique de la révision.
- Simuler une opération achevée sans checkpoint puis procéder à une reprise **supervisée**.
- Ajouter des tests de stockage concurrent, de caches et de restauration sans résurrection.
