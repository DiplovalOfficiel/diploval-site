# Diploval V0.3 — B8.1 : matrice juridique et décisions de gouvernance
**Projet interne — 19 novembre 2026 — NON ADOPTÉ / NO GO**
Ce document complète B7 sans modifier la V0.2, sans publier de textes juridiques et sans ouvrir la V0.3.

## Principes
- Dissocier participation, information sur les données, éventuel consentement RGPD et autorisation éditoriale de publication.
- Pas de publication automatique ; contrôle humain et choix distinct de présentation de l'identité.
- Une référence de suivi ne confère pas de droit d'accès privé.
- Le désaccord et le changement d'avis ne constituent pas en eux-mêmes des motifs de refus.
- Ne pas présenter les options ci-dessous comme des bases légales déjà validées.

## Matrice préalable des finalités
| Finalité | Base article 6 à étudier | Condition article 9 | Garanties et décision restante |
|---|---|---|---|
| Réception et instruction de contribution | 6(1)(a) ou 6(1)(f), selon qualification, nécessité et attentes | Si opinion ou autre catégorie sensible identifiable : examiner 9(2)(a), consentement explicite valable, ou autre exception réellement applicable | Mention pré-collecte, libre choix, minimisation, preuve ; avis juridique nécessaire |
| Publication volontaire | 6(1)(a) ou autre base motivée, selon montage | 9(2)(a) si approprié lorsque du sensible identifiable est publié ; ne pas présumer 9(2)(e) du seul dépôt volontaire | Permission éditoriale distincte, choix nom/pseudonyme/sans nom, vérification humaine de réidentification |
| Espace de suivi, lien de connexion, récupération | 6(1)(f) envisageable avec test de mise en balance, ou base alternative | Évaluer si association contact–dossier révèle une donnée sensible et sécuriser en conséquence | HMAC, accès limité, anti-énumération, limitation de durée |
| Modération, décisions et recours | 6(1)(f) envisageable si nécessaire et proportionné | Exception art. 9 à documenter si instruction de données sensibles | Accès minimaux, impartialité, motifs, recours, durée |
| Sécurité et lutte contre les abus | 6(1)(f) sous réserve de nécessité/proportionnalité | Éviter les contenus sensibles dans les logs | Journalisation minimale, conservation limitée |
| Notifications facultatives de suivi | Base à qualifier séparément | Pas d'opinion ni de texte sensible dans l'e-mail | Pas d'inscription marketing ni notification imposée |
| Statistiques publiques | Hors RGPD seulement si anonymisation effective ; sinon base à qualifier | Éviter tout résultat identifiable | Seuils et contrôle de réidentification |
| Exercice des droits RGPD | 6(1)(c) pour obligations légales applicables à qualifier | Données sensibles parfois nécessaires pour instruire la demande ; limiter | Procédure vérification proportionnée, réponse et purge |

**Remarque :** l'article 6(1)(f) n'autorise pas en soi le traitement des données de l'article 9. Le consentement explicite peut être inadapté si sa liberté ou son retrait effectif ne sont pas assurés. La qualification repose sur la réalité des traitements et un conseil juridique.

## Arbitrages proposés — soumis à approbation
1. **Mineurs :** première activation limitée aux adultes, tant que l'accueil des mineurs n'est pas spécifiquement conçu et évalué. Le seuil français de 15 ans de l'article 45 de la loi Informatique et Libertés concerne certaines offres directes de services de la société de l'information fondées sur le consentement ; il ne représente pas une autorisation générale de traiter toute donnée sensible de mineurs.
2. **Versions :** historiques privés par défaut ; une version retirée ou corrigée n'est jamais automatiquement réaffichée.
3. **Identité publique :** nom affiché uniquement sur choix distinct ; absence de nom ≠ anonymat.
4. **Contributeurs institutionnels :** aucune qualité institutionnelle affichée comme vérifiée avant contrôle de provenance et d'habilitation.
5. **Courrier :** consultations@diploval.fr pour le suivi, procédure RGPD formelle et responsable à identifier ; ne pas présumer qu'une boîte est une désignation de DPO.
6. **AIPD :** évaluation écrite approfondie avant toute activation ; AIPD complète préalable si risque élevé établi.
7. **Conservation :** arrêter les durées distinctes après cartographie et preuve de purge, y compris index/sauvegardes.
8. **Réutilisation :** ni licence CC BY Diploval ni autorisation de citation externe par défaut sur les contributions de tiers.

## Questions en suspens
Identité juridique réelle ; bases finales et validité des consentements ; alternative de participation sans email ; durées et procédures techniques ; sous-traitants/transferts ; AIPD et DPO éventuel ; signalement et obligations DSA selon qualification ; relecture juridique et approbation humaine.

## Conditions de sortie B8.1
Table finalisée par finalité, mise en balance si 6(1)(f), preuve des options art. 9, revue juridique, décision écrite du responsable. **La grille B7 P01–P16 demeure entièrement OPEN ; V0.3 NO GO.**

## Sources
- RGPD : https://eur-lex.europa.eu/eli/reg/2016/679/oj/fra
- CNIL bases : https://www.cnil.fr/fr/les-bases-legales/liceite-essentiel-sur-les-bases-legales
- CNIL intérêt légitime : https://www.cnil.fr/fr/les-bases-legales/interet-legitime
- CNIL données sensibles : https://www.cnil.fr/fr/definition/donnee-sensible
- CNIL consentement : https://www.cnil.fr/fr/les-bases-legales/consentement
- Article 45 loi Informatique et Libertés : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037823135/
