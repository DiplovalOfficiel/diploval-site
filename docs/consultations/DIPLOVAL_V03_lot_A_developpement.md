# Diploval — V0.3 : première étape de réalisation

**Statut : noyau métier et tests en cours de vérification. Aucune activation publique.**

Ce lot démarre le développement de la plateforme de dialogue après validation de la maquette et du principe d'échanges publics avec modération préalable.

## Ce qui est effectivement codé dans ce lot

- Un modèle de contribution, de réponse et de proposition pour la charte.
- Des **références de contribution** lisibles mais ne donnant aucun droit d'accès privé.
- Le choix entre absence de nom affiché, pseudonyme ou nom public.
- Une autorisation de traitement distincte de la décision de publication publique.
- Une première version **privée par défaut**, en attente de modération.
- Une validation humaine nécessaire avant tout affichage.
- Une nouvelle version en attente qui **ne remplace pas** une version déjà publiée.
- Un lien explicite entre une réponse et le **numéro de version précis** de l'argument auquel elle répond.
- Un retrait de publication qui retire immédiatement la contribution de la projection publique et ne permet pas une remise en ligne automatique par validation tardive.
- Des signalements transmis à examen sans suppression automatique du contenu concerné.
- Une **projection publique à liste blanche** qui ne diffuse jamais la fiche privée intégrale, les adresses, les consentements ou les journaux de décisions.
- 18 tests automatiques exécutés avant la construction des pages Netlify.

Les exemples de la maquette V0.3 restent fictifs. Ce lot n'ajoute **ni API publique**, ni nouveau formulaire opérationnel, ni accès auteur, ni service d'envoi d'e-mail, ni stockage des nouveaux contenus.

## Règles métier importantes

1. Une référence affichée de type `CE-2026-...` ne constitue **jamais une clé d'authentification**. Sa génération aléatoire doit être suivie d'une vérification atomique d'unicité à la persistance.
2. Toutes les opérations de création, de modification et de modération devront être vérifiées **sur le serveur** ; aucun bouton ou contrôle JavaScript côté navigateur ne fait autorité.
3. Le modèle utilise une version de mutation permettant de rejeter les enregistrements obsolètes. Lors de la future mise en stockage, les écritures devront être conditionnelles et relues pour confirmation.
4. La mise à disposition publique exige une décision humaine et une autorisation de diffusion appropriée, distincte de la simple participation.
5. Seules les données explicitement choisies par une projection publique peuvent sortir par l'API de lecture. L'historique complet et l'identité des agents de modération restent dans le stockage privé.
6. Les versions antérieures **ne sont pas publiées par défaut** : la possibilité de les consulter publiquement dépendra d'une politique juridique/éditoriale et des droits des contributeurs.
7. La suppression définitive, les rectifications et la gestion des demandes RGPD ne sont **pas encore implémentées** ; le modèle de retrait ne suffit pas pour une mise en production.

## Étapes restant à construire

| Lot | Domaine | Condition avant ouverture |
|---|---|---|
| B | API publique filtrée + stockage protégé et chiffré, protections anti-abus et limitation des envois | Séparation physique et logique du public/privé ; tests d'accès et sauvegardes |
| C | Accès auteur vérifié (jetons temporaires, non visibles sur le site), historique contrôlé et notifications facultatives | Vérification de l'adresse, rotation/expiration des secrets, droit au retrait |
| D | Interface modération sécurisée, appels/réexamens des décisions et signalements ; rapprochement avec l'existant | Habilitations, audit immuable, modération de bout en bout |
| E | Validation juridique, RGPD, droits des personnes, accessibilité et tests de sécurité | Autorisation expresse d'ouvrir en production |

**La consultation électorale V0.2 reste indépendante du calendrier de la V0.3.** Aucun nouveau canal public de débat ne sera ouvert tant que les contrôles de sécurité, de confidentialité et de modération n'auront pas été validés.

## Essais reproductibles

Exécuter à la racine du dépôt :

```bash
node --test tests/dialogue-model.test.mjs
```

Le build Netlify de cette branche exécute automatiquement cette commande **avant** de générer les pages. Un test en échec arrête le déploiement de prévisualisation. Une construction réussie ne constitue pas à elle seule un audit de sécurité ou un test du service complet.

## Décisions encore à instruire

Les points suivants ne sont pas figés par ce premier lot : modalités exactes de vérification des personnes sans adresse e-mail, durée de conservation, publication éventuelle des anciennes versions, consentement et base légale finale, sélection du système de stockage, plan de sauvegarde, moyens de réexamen et politique de modération détaillée.
