# Site Diploval — version 19 finale à publier

Cette version conserve l’identité visuelle validée et simplifie les derniers points avant mise en ligne :

- trois travaux seulement sont mis en avant ; la bibliothèque reste le point d’accès complet ;
- nomenclature des publications harmonisée ;
- échelles Territorial, National, Europe, International et mention Multi-échelles pour les documents transversaux ;
- agenda nettoyé des dates fictives, avec la première visioconférence indiquée sans inventer de date ;
- menu principal allégé ;
- adresse de contact remplacée partout par `contact@diploval.fr` ;
- statut indiqué : SASU en cours d’immatriculation, procédure engagée ;
- cadre éditorial raccourci ;
- préparation des métadonnées de partage pour `diploval.fr` ;
- configuration légère ajoutée pour un déploiement GitHub + Netlify.

## Ouvrir le site localement

Ouvrir `index.html` dans un navigateur. `styles.css`, `site.js` et le dossier `assets` doivent rester au même niveau.

## GitHub + Netlify

Le site est statique et ne nécessite pas de compilation.

1. Placer tous les fichiers de ce dossier à la racine du dépôt GitHub.
2. Connecter ce dépôt à Netlify.
3. Laisser la commande de build vide.
4. Le répertoire de publication est `.` ; il est déjà indiqué dans `netlify.toml`.
5. Une fois le domaine relié, vérifier les liens sociaux et les PDF avant publication.

Le fichier HTML autonome fourni séparément reste le plus pratique pour prévisualiser la version mobile sans hébergement.


## Publications (v12)

Les PDF publiés sont rangés dans `assets/documents/`. Les fiches sont définies dans `site.js` (`workData`) et peuvent être partagées avec un lien profond de la forme `?publication=charte`. Les boutons Facebook, Bluesky, LinkedIn, e-mail et copie de lien sont générés côté navigateur.


## Publications ajoutées dans cette version

Cinq documents uniques ont été intégrés : Égalité devant la loi ; Premier trimestre 2026 - état des lieux environnemental et climatique ; Terre, eau, faim et exil ; Cadmium, alimentation et confiance publique ; El Niño, climat et adaptation des communes. Le second fichier « droit d’usage vital » reçu était un doublon binaire exact et n’a pas été ajouté une seconde fois.


## Version 14 — architecture Charte / Référentiel / Codex Vitae
Le Codex Vitae est présenté comme le référentiel normatif du vivant. La Charte fixe le socle, le Référentiel Diploval fournit la méthode d’examen, et le Codex Vitae traduit les principes en lois modèles, protocoles, mécanismes de protection, procédures et outils d’application.


## Version 15 — bibliothèque compacte
La bibliothèque affiche 6 publications au chargement, puis un bouton « Voir 6 publications de plus ». Les recherches et filtres affichent directement tous les résultats correspondants. Le séparateur interne a été retiré pour garder une lecture fluide sur mobile.


## Réseaux sociaux

- Facebook : https://www.facebook.com/share/1JWdnWXggv/
- Bluesky : https://bsky.app/profile/diploval.bsky.social
- LinkedIn : à ajouter lors de l’ouverture de la page.


## Version 17 — derniers points avant ouverture

- compteur de bibliothèque clarifié : travaux référencés vs publications réellement consultables ;
- rubrique « Données personnelles » ajoutée, sans bannière cookies inutile tant qu’aucun traceur nécessitant consentement n’est installé ;
- mentions légales enrichies avec statut en cours d’immatriculation et hébergement Netlify ;
- règle « Indépendance & transparence » ajoutée au cadre éditorial ;
- image sociale `assets/diploval-partage.jpg` (1200 × 630) utilisée par Open Graph et Twitter cards ;
- ajout de `robots.txt`, `sitemap.xml` et d’une page `404.html` ;
- en-têtes Netlify renforcés avec CSP, anti-framing et politique de permissions ;
- les anciens PDF n’ont volontairement pas été modifiés dans cette version.

### À compléter avant / au moment de la mise en ligne

- informations légales définitives de la SASU dès attribution ;
- vérification finale de l’identité légale de l’éditeur / directeur de publication ;
- URL LinkedIn lorsqu’elle existera ;
- date définitive de la première visioconférence et, ensuite, fichier `.ics` « Ajouter à mon agenda » ;
- remplacement progressif des PDF contenant les anciennes coordonnées.


## Version 18 — identité légale et contrôle multi-écrans

- identité publique conservée : `Souix Nathorod — Fondateur de Diploval` ;
- identité civile ajoutée dans les mentions légales : `Franck Saubin`, nom public `Souix Nathorod` ;
- direction de publication et responsable de la rédaction : Franck Saubin ;
- statut harmonisé : `SASU en cours d’immatriculation — procédure engagée` ;
- politique de données personnelles précisée (responsable du traitement, bases de traitement des courriels, données techniques d’hébergement) ;
- menus et fenêtres modales sécurisés sur petits écrans et écrans de faible hauteur ;
- `sitemap.xml` daté du 11 août 2026 ;
- en-têtes Netlify légèrement renforcés ;
- cache des PDF limité à 5 minutes pour faciliter les remplacements de versions après publication.

### Dernier point juridique à renseigner avant ouverture publique

Les coordonnées de publication sont intégrées : **462 avenue Marc Seguin, Résidence Innoparc, 07000 Privas** et **07 67 32 04 84**. Les identifiants de la société (capital, SIREN/RCS/RNE et TVA le cas échéant) devront être ajoutés dès leur attribution.


## Version 19 — contrôle final technique

- les contenus ne dépendent plus d’une animation JavaScript pour être visibles : en cas de script bloqué ou lent, le site reste lisible ;
- le Référentiel Diploval n’est plus marqué comme « Publié » tant que son PDF n’est pas intégré ;
- métadonnée Open Graph `fr_FR` et icône Apple ajoutées ;
- contrôle des ancres internes, des ressources locales, des PDF et des identifiants HTML ;
- structure responsive contrôlée dans le CSS pour petits écrans, tablettes et ordinateurs ; le contrôle visuel final doit être fait sur le déploiement Netlify réel ;
- code JavaScript validé avec `node --check`.

Les coordonnées postales et téléphoniques sont intégrées. Après immatriculation, compléter les identifiants légaux de la société dès leur attribution.


## Inscription Zoom — Netlify Forms

Le formulaire `inscription-visioconference-diploval` est déjà intégré au HTML et sera détecté par Netlify au déploiement.

Après la première mise en ligne :
1. Dans Netlify, vérifier que la détection des formulaires est activée.
2. Ouvrir **Project configuration → Notifications → Emails and webhooks → Form submission notifications**.
3. Ajouter une notification e-mail pour le formulaire **inscription-visioconference-diploval** vers **contact@diploval.fr**.
4. Faire un test réel depuis le site public. Le champ du formulaire s’appelle `email`, ce qui permet à la notification Netlify d’utiliser l’adresse de la personne comme adresse de réponse.

Les inscriptions restent également consultables dans l’onglet **Forms** de Netlify.
