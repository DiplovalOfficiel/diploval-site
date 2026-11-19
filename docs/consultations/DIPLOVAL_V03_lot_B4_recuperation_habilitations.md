# Diploval — Consultations V0.3, lot B4
## Retrouver une référence et sécuriser les habilitations de modération

**État : modules internes de développement, aucune API publique et aucune authentification réellement connectée.**

Le présent lot prolonge les lots A, B1, B2 et B3, ainsi que la demande validée de permettre à un citoyen de retrouver son numéro de dossier après perte de sa référence. L'interface envisagée est un **espace personnel sans compte obligatoire ni mot de passe**.

### Récupération de références

Modules : `netlify/lib/dialogue-contact-index.mjs` et `netlify/lib/dialogue-reference-recovery.mjs`.

1. Lorsqu'une contribution sera créée avec une adresse de suivi autorisée, un service serveur de confiance devra enregistrer l'identifiant interne dans un index privé par **empreinte HMAC de l'adresse normalisée**, lié à un stockage chiffré.
2. Une demande « J'ai perdu ma référence » ne renvoie qu'une **réponse générique**, que l'adresse soit connue ou inconnue. Ni référence ni identifiant de dossier n'apparaissent dans la réponse de demande.
3. Si un dossier est effectivement associé à l'adresse, un fournisseur d'e-mail dédié pourra envoyer un **lien de vérification à usage unique** (10 minutes). Le jeton est généré aléatoirement et seule son empreinte figure dans le stockage.
4. Après utilisation du lien, une session de récupération **valable 15 minutes** permet d'obtenir une liste minimale des références liées à cette adresse, de leur consultation et de leur état de suivi.
5. L'index **n'est jamais une preuve suffisante** : chaque dossier est rechargé et l'adresse figurant actuellement dans le dossier doit encore correspondre à l'empreinte vérifiée avant toute restitution.
6. La session peut être révoquée immédiatement. Elle ne donne accès **ni au texte intégral**, ni au journal interne, ni aux coordonnées d'autrui, ni aux fonctions de modération.

Le mécanisme fonctionne aussi avec **plusieurs dossiers associés à une adresse**, sans nécessiter un compte transversal. Pour consulter ou modifier le texte complet, le contributeur utilise ensuite le parcours B2 propre au dossier.

**À traiter avant usage réel :** maintenir l'index à chaque création, changement de coordonnées et demande d'effacement ; vérifier l'échec d'une création si l'index n'est pas mis à jour ; prévoir la procédure de récupération sans e-mail ; limiter les demandes par IP/empreinte de contact ; journaliser les abus sans conserver de secrets ; déterminer la durée de conservation des liens, des index et des données. Une rotation de la clé HMAC de l'index requiert une réindexation contrôlée ; ne jamais changer cette clé sans plan de migration. Les tests utilisent un transport e-mail fictif.

### Habilitations des collaborateurs

Module : `netlify/lib/dialogue-moderator-access.mjs`.

La session professionnelle et les habilitations proviennent de deux **dépendances serveur indépendantes** : `verifySession(request)` et `loadGrants(staffId)`. Aucun identifiant, rôle ou statut transmis par le navigateur ne constitue une autorisation.

| Rôle | Peut consulter les dossiers attribués | Peut examiner et publier/refuser | Peut retirer une publication |
|---|---|---|---|
| Observateur | Oui | Non | Non |
| Examinateur | Oui | Oui | Non |
| Superviseur | Oui | Oui | Oui |

- Les droits sont attribués **par consultation** ; l'accès transversal doit être donné explicitement à un superviseur.
- À chaque opération, le système doit revalider **la session** et **le registre des habilitations** : suspension de la session, désactivation du collaborateur et réduction du périmètre prennent effet sans nouvelle connexion.
- Une identité JavaScript forgée, même avec le mot « superviseur », ne crée aucun droit.
- Un utilisateur possédant le droit de lire les dossiers n'obtient pas automatiquement un droit de publication.
- Le système existant d'administration ne doit pas conférer implicitement des droits V0.3. Les rôles et sessions de test sont **fictifs**.

**Non développés dans ce lot :** comptes réels des collaborateurs, authentification forte éventuelle, affectation et retrait des rôles par un responsable, file de traitement sécurisée, mesures anti-abus, journal d'audit indépendant, réexamen des décisions, notification automatique de la personne concernée et contrôle contradictoire de la modération.

### Contrôles automatisés

```sh
node --test tests/dialogue-reference-recovery.test.mjs tests/dialogue-contact-index.test.mjs tests/dialogue-moderator-access.test.mjs
```

Les trois nouvelles suites sont ajoutées à la construction Netlify aux côtés des tests déjà présents. Elles utilisent exclusivement des données fictives, des clés d'essai et un stockage simulé/chiffré.

### Conditions d'ouverture inchangées

- Aucune nouvelle fonction Netlify n'importe les modules B4.
- Le parcours public, l'espace personnel et la file de modération ne sont **pas mis en service**.
- L'analyse RGPD reste essentielle, surtout si les débats peuvent révéler des opinions politiques. Définir les bases légales et mesures particulières **avant** une véritable collecte.
- Le choix du stockage, la protection des clés, les sauvegardes, la restauration et un examen indépendant de sécurité restent à finaliser.
- Les tests unitaires et la prévisualisation Netlify ne valent pas audit de conformité ni de sécurité.
- La consultation V0.2 demeure indépendante. Aucune publication de la V0.3 sans décision explicite.

**Suite recommandée :** préparer la configuration concrète des habilitations et des envois, ainsi qu'un environnement de test fermé ; concevoir une file de modération qui sépare les rôles et les réponses publiques. La demande de l'utilisateur de disposer d'un export des dossiers et de l'historique autorisé reste à développer ultérieurement.
