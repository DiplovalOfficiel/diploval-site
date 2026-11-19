# Diploval V0.3 — Intégration 06 : perte totale de la boîte email
**19 novembre 2026 — prototype de revue humaine / NO GO**

## Preuve antérieure
GitHub Actions `44569146559`, commit `6c7a413477a5645f1c6615853710450617b5a1a7` : **8 contrôles B7 et 135 tests techniques réussis**, soit 143/143. Ne couvre pas les nouveaux fichiers.

## Développement
- `netlify/lib/dialogue-lost-access-review.mjs` : dossier de revue administratif, désactivé par défaut, stockage CAS/ETag, authentification et contrôle de preuves injectés exclusivement côté serveur.
- `tests/dialogue-lost-access-review.test.mjs` : douze tests fictifs, ajoutés à GitHub Actions.
- Aucun endpoint public, envoi d'email, émission de session, modification de contact, suppression ni rétablissement d'accès.

## Chemin de traitement proposé
1. Réception confidentielle d'une demande ; réponse publique neutre, sans confirmation de l'existence du dossier.
2. Enregistrement d'un numéro **interne de revue**, indépendant de la référence citoyenne. Pas de copie de pièces d'identité ou d'allégations libres dans le journal minimal.
3. Authentification du personnel habilité avant de créer, consulter ou faire avancer une revue.
4. Examen proportionné des éléments que le contributeur peut présenter ; aucune règle automatique qui considérerait le numéro de dossier, une ancienne adresse ou une capture d'écran comme une preuve suffisante.
5. Mise en suspens si identité contestée, risque d'usurpation ou éléments insuffisants ; recours et escalade humaine.
6. Même après validation de la revue, l'état `approved_for_separate_action` **n'accorde pas l'accès** : une procédure distincte, juridiquement et techniquement validée, devra éventuellement réattribuer un contact, révoquer les anciennes sessions, mettre à jour l'index HMAC et enregistrer les preuves.
7. Information du demandeur et de la personne concernée si approprié, sans divulgation du dossier à un tiers.

## Précautions importantes
- **Ne pas exiger systématiquement une pièce d'identité** : choix des justificatifs à minimiser et adapter aux risques ; attention au traitement des opinions, mineurs et secrets.
- Le module ne peut pas authentifier par lui-même les intervenants ; `authorize`, `verifyReview` et `evidenceRecord` sont de simples contrats d'intégration.
- La sauvegarde d'une preuve d'audit puis la mutation de l'état ne forment pas une transaction inter-objets ; états ambigus possibles en cas de panne.
- La revue n'empêche pas une réutilisation malveillante d'une ancienne session si le stockage fournisseur ou les autres services n'appliquent pas les vérifications attendues.
- Aucun protocole complet de prévention des usurpations, intervention humaine à deux niveaux, délais de traitement, notifications neutres, procédure pour mineurs et conservation des preuves n'a été approuvé.
- La récupération après perte totale de l'email n'est **pas opérationnelle**, et les douze nouveaux tests restent à attester par CI sur le SHA final.

## Décision et prochaine étape
**NO GO maintenu**, PR #20 brouillon/non fusionnée, V0.2 inchangée, B7 P01–P16 OPEN.
Après preuve CI : définir un parcours de récupération par étapes avec validation humaine contradictoire, gestion des contestations, et synchronisation sécurisée des index/sessions, puis évaluer la protection et l'accessibilité du service avant toute ouverture.
