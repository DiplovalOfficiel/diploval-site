# Le Dico Diploval — fonctionnement V0.1

## Objet
Le Dico est un dictionnaire citoyen distinct des dossiers de recherche et de la future encyclopédie. Il explique les mots et expressions rencontrés dans les publications.

## Publication et accès
- Page publique prévue : `/dico/`, recherche sans accent et index de A à Z.
- Une page permanente par terme : `/dico/<identifiant>/`, référencée dans le sitemap.
- Administration : `/admin/` → « Le Dico Diploval » → « Mots et expressions ».
- Une entrée n'est publique que si **statut = Publié** ET **visible = oui**.
- Toute modification du fichier JSON par l'administration implique un nouveau déploiement Netlify.

## Création d'une fiche
1. Ajouter le mot ou l'expression, et choisir un identifiant permanent en minuscules non accentuées et avec des tirets.
2. Rédiger une définition courte claire et l'explication complémentaire ; préciser le sens juridique ou scientifique.
3. Ajouter les variantes non ambiguës (sigles compris) et, si nécessaire, des références vérifiables.
4. Vérifier les termes associés et les éventuels renvois vers des publications.
5. Mettre « Publié » et « Visible publiquement » après relecture. Conserver les brouillons invisibles.

## Liens automatiques
- Sur les pages HTML générées, le script `dico-links.js` lit les fiches publiées et transforme au plus 12 premières occurrences utiles en liens vers les définitions.
- Chaque entrée ne reçoit au plus qu'un lien par page ; aucun lien n'est ajouté dans les titres, les boutons, les liens existants, les sources ou les champs modifiables.
- Les variantes peuvent être associées à un mot. Les variantes ambiguës doivent être évitées.
- Les liens sont ajoutés seulement à l'affichage : **les textes sources ne sont pas réécrits**.
- Si le dictionnaire n'est pas accessible, le texte normal est conservé.

## Limites des PDF
Le script ne modifie jamais le texte interne des PDF. Les présentations HTML des publications peuvent être reliées au dictionnaire. Pour disposer de liens dans un PDF téléchargé, préparer une nouvelle édition du PDF, indiquer sa version et conserver l'original.

## Repérage des termes
Les fiches de définition peuvent renvoyer aux publications dont le titre, la présentation ou les mots-clés mentionnent le terme. Ce repérage **ne constitue pas une analyse du texte intégral des PDF**.

## Points de contrôle avant mise en production
- Test d'administration : créer un brouillon ; vérifier qu'il reste invisible.
- Publier une nouvelle définition ; vérifier sa présence, son URL et les liens automatiques.
- Vérifier navigation mobile, recherche A–Z, contraste, versions d'URL, PDF intégré et sitemap.
- Faire relire les définitions par un responsable éditorial avant leur mise en ligne.
- Ne pas publier la future encyclopédie comme si elle existait déjà.
