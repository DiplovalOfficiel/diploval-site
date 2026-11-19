# Diploval V0.3 — Intégration 05 : récupération de dossier et changement de contact
**19 novembre 2026 — audit des accès personnels / NO GO**

## Résultat d'entrée attesté
CI GitHub Actions `44567883023` sur le commit `9824839cd5edf710b7ce6817ae1d3149b914a523` : **127 tests techniques réussis + 8 contrôles B7 réussis**, sans échec. Cette preuve est antérieure aux modifications de cette étape.

## Modification ciblée et raison
Le mécanisme `dialogue-author-access.mjs` valide un lien temporaire par rapport au contact autorisé lors de sa consommation, et `authenticate()` relit le contact actuel. Cependant, la méthode `authorize()` pouvait accepter un objet principal déjà authentifié pour `lookup_private` sans relire le contact courant. Après changement d'adresse, ce principal opaque risquait donc de conserver un accès jusqu'à la révocation/expiration de session.

**Correctif :** `authorize()` charge désormais le dossier autoritaire depuis le serveur et compare le contact courant à l'empreinte de session à **chaque** autorisation, y compris `lookup_private`. Une session liée à l'ancienne adresse perd son autorisation si l'adresse a changé.

## Tests ajoutés
`tests/dialogue-author-contact-recovery-synthetic.test.mjs` : huit scénarios sans SMTP ni accès réel, couvrant :
1. Lien opaque et session pour l'adresse actuelle.
2. Réponse générique pour l'adresse non reconnue.
3. Refus de consommer un ancien lien après changement de contact.
4. Refus d'authentifier ou d'autoriser un ancien principal après changement.
5. Nouvelle demande depuis le nouveau contact.
6. Lien à usage unique.
7. Expiration du lien.
8. Révocation de la session.

La suite a été ajoutée au workflow GitHub Actions. **Les résultats CI du nouveau commit doivent être observés avant de la déclarer réussie.**

## Limites bloquantes
- Les vérifications portent sur un double de stockage local. Aucun prestataire de messagerie, facteur secondaire, support humain ni contrôle de prévention du vol de boîte mail n'a été validé.
- **Perte définitive d'accès à la boîte email** : aucune récupération alternative automatique n'est autorisée. Il faut définir un protocole de vérification d'identité proportionné, anti-usurpation, avec intervention humaine, puis étudier le droit à un accès sans sacrifier la confidentialité.
- Le changement de contact doit être coordonné avec l'index HMAC, la révocation des sessions, l'état des mutations, le stockage des dossiers et la conservation des preuves. Ces opérations ne sont pas transactionnelles.
- Risque de délai et de concurrence entre lecture du contact et mutation : la défense contre les écritures périmées des autres composants dépend toujours de leur contrôle atomique de révision.
- Réduire la divulgation de l'existence d'une contribution (réponses uniformes, protection anti-abus distribuée, emails neutres, limitation de fréquence).
- Les conditions des articles 6 et 9 du RGPD, l'information des personnes, les durées de conservation et les garanties des mineurs attendent une validation juridique et opérationnelle.

## État de publication
Aucune route activée, aucun email réel, aucune collecte V0.3, aucune fusion. PR #20 toujours brouillon ; B7 P01–P16 ouverts ; **NO GO maintenu**.

## Priorité suivante
Après preuve CI du correctif : conception d'un parcours de récupération d'accès perdu sous contrôle humain, sans accès automatique à partir d'une simple référence de dossier ; analyse des cas d'usurpation et de contestation.
