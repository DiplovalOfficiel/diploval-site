# Diploval V0.3 — Intégration 07 : contestations et risque d'usurpation
**19 novembre 2026 — prototype fictif, NO GO**

## Preuve CI vérifiée avant ce lot
GitHub Actions run `44569723295`, commit `59885e28458ed36a01817ecf31707878c00a487a` : **8 contrôles B7 et 147 tests techniques réussis**, soit 155 sur 155. Ce résultat ne couvre pas le présent lot.

## Livrables ajoutés
- `netlify/lib/dialogue-disputed-access-review.mjs` : journal CAS/ETag de contestation, désactivé sans activation explicite, aucune route, aucun email, aucune modification de compte.
- `tests/dialogue-disputed-access-review.test.mjs` : 15 scénarios fictifs de validation, interdictions et conflits.
- `.github/workflows/consultations-v03-audit.yml` mis à jour.

## Procédure de contrôle proposée
1. Un dossier administratif `lost-access` doit être **effectivement** en statut `disputed` dans un stockage de confiance ; un numéro de dossier fourni librement ne suffit pas.
2. Une personne habilitée ouvre une revue contradictoire `pending`, avec une référence privée séparée.
3. Chaque décision requiert une preuve examinée individuellement et une trace d'audit.
4. Deux relecteurs **distincts** se prononcent. Un même relecteur ne peut valider deux fois.
5. Si les deux recommandent `refer_to_separate_resolution`, la revue se clôt et **oriente uniquement vers une procédure distincte**, sans accès ni jeton. Si les avis divergent ou demandent le blocage, `maintain_block` est retenu.
6. Les avis sont associés à une révision conditionnelle du journal ; un avis reposant sur une révision périmée est refusé.
7. Aucun mécanisme n'est autorisé à réactiver la session, modifier l'adresse email ou révéler le contenu de la contribution à ce stade.

## Points de vigilance
- Le module ne vérifie pas les identités réelles des relecteurs : `authenticateReviewer` est un contrat que seul un prestataire d'identité professionnel vérifié pourrait satisfaire.
- La trace d'audit et l'écriture du journal sont deux opérations séparées. Un incident entre les deux nécessite rapprochement humain.
- La vérification des preuves dépend d'un service externe `verifyEvidence` non implémenté en exploitation.
- Deux avis concordants ne suffisent pas à prouver l'identité du contributeur : confidentialité et minimisation des justificatifs restent prioritaires.
- Définir des voies de contestation, délais, recours, indépendance des décideurs et protocoles spécifiques pour les mineurs.
- Ce prototype ne valide pas les garanties transactionnelles du stockage, l'invalidation de cache ni le contrôle des anciennes sessions.
- Les **15 nouveaux tests** restent à attester sur le dernier commit dans GitHub Actions.

## Décision
PR #20 brouillon et non fusionnée ; 16 points B7 toujours `OPEN`. **V0.3 = NO GO**, aucune donnée citoyenne réelle, V0.2 inchangée.

## Suite recommandée
Ne pas multiplier indéfiniment les modules de contrôle : lancer une recette transversale sur données fictives (création, suivi, rectification, contestation, modération, réponses institutionnelles et droits RGPD), puis produire un registre consolidé des anomalies et prérequis d'ouverture.
