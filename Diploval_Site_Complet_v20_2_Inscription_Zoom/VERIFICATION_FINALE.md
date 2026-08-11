# Vérification finale — Diploval v19

Date : 11 août 2026

## Contrôles réalisés
- HTML principal présent et structuré en français.
- `meta viewport`, titre, description, canonical, Open Graph, image sociale 1200 × 630 et favicon présents.
- Navigation interne et identifiants contrôlés.
- Ressources locales (CSS, JS, images, audio et PDF) présentes.
- Bibliothèque : 20 travaux référencés, 13 PDF consultables.
- Aucun doublon de document ajouté dans la dernière série.
- JavaScript : syntaxe validée.
- Les contenus restent visibles même si JavaScript ne s’exécute pas.
- Configuration Netlify : CSP, anti-framing, nosniff, politique de référent et permissions présentes.
- Cache des PDF limité à 5 minutes afin que leur remplacement après correction soit visible rapidement.
- Structure responsive contrôlée statiquement ; le contrôle visuel final sur appareils réels reste prévu juste après déploiement.
- `robots.txt`, `sitemap.xml` et `404.html` présents.
- Facebook et Bluesky renseignés ; LinkedIn reste volontairement indiqué « Bientôt ».
- Identité publique : Souix Nathorod. Identité civile et direction de publication : Franck Saubin.
- Codex Vitae présenté comme référentiel normatif du vivant, distinct de la Charte et du Référentiel Diploval.

## À faire juste avant ouverture publique
1. Coordonnées intégrées : 462 avenue Marc Seguin, Résidence Innoparc, 07000 Privas — 07 67 32 04 84.
3. Après déploiement : vérifier HTTPS, domaine principal `diploval.fr`, ouverture de trois PDF, lien Bluesky, lien Facebook, un lien profond `?publication=...` et l’aperçu social.

## Après immatriculation
Après immatriculation : ajouter capital, SIREN/RCS/RNE, TVA le cas échéant et mettre à jour le statut de la SASU.


## Correctif PDF v20.1
Les liens PDF utilisent désormais des liens HTML natifs (`<a href>`), et non `window.open()`, afin d'éviter les blocages de pop-up et l'affichage du curseur « interdit » sur certains navigateurs. Les 13 PDF ont été validés avec `pdfinfo`.
