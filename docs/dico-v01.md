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
2. Indiquer la **nature de la définition de référence** : explication générale, repère juridique, scientifique ou institutionnel. Ne choisir « Fondement juridique identifié » qu'avec un titre de texte exact et un lien officiel vérifiable (deux champs dédiés obligatoires).
3. Rédiger la définition de référence et les précisions **sans y mélanger la lecture éditoriale propre à Diploval**. Lorsqu'une notion dispose d'un fondement légal, distinguer la citation normative d'une paraphrase.
4. Utiliser, si pertinent, le champ **« Lecture Diploval — fondements du vivant »** pour expliciter l'approche de Diploval. Ce champ est optionnel : ne pas forcer une lecture originale artificielle sur chaque terme. Les références à la Charte servent à expliciter nos valeurs, sans prétendre remplacer le droit positif.
5. Ajouter les variantes non ambiguës (sigles compris), les références vérifiables et les termes associés.
6. Mettre « Publié » et « Visible publiquement » après relecture. Conserver les brouillons invisibles.

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

## Présentation publique des deux niveaux
- La section « Définition de référence » est toujours affichée. Elle est étiquetée selon la nature de son fondement, avec renvoi au texte juridique lorsque disponible.
- La section « Lecture Diploval — fondements du vivant » apparaît uniquement si le champ est rempli. Elle porte une mention explicite d’interprétation éditoriale et un lien vers la Charte.
- Le contenu de Diploval n’est jamais publié sous l’étiquette « définition officielle ». Une source juridique précise est nécessaire pour qualifier une définition de « fondement juridique identifié ».
- Les pages du Dico gardent un affichage sobre, contrasté, lisible sur mobile, compatible avec la recherche alphabétique et les liens automatiques.
