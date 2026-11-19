# Diploval — Consultations citoyennes V0.3
## Registre unique de préparation à l'ouverture — NO GO
**Version de synthèse : 1.0 — 19 novembre 2026**  
**Dossier de référence : PR GitHub #20, branche `audit/consultations-v03-b7-rgpd-cgu-2026-11-19`**

> Ce document consolide les preuves de tests et les 16 conditions de la grille B7. Ce n'est ni une autorisation de publication, ni une certification de sécurité ou de conformité. Aucune modification de la V0.2, aucune fusion, aucune collecte réelle V0.3.

### 1. Preuves techniques vérifiées

- **GitHub Actions** : [exécution 44573529219](https://github.com/DiplovalOfficiel/diploval-site/actions/runs/44573529219), statut `success`, commit `64dede6fbd47451b9529c8586191838f87db3fbf`.
- **Résultat** : 213 tests techniques réussis / 213 et 8 contrôles B7 réussis / 8, soit **221 / 221**, aucun échec dans cette exécution.
- La grille `DIPLOVAL_V03_B7_gate_NO_GO.json` indique `release=NO_GO`, `actual_processing_enabled=false`, `legal_docs_published=false`, **P01–P16 tous `OPEN`**, `approval_date=null`.
- Les tests d'intégration utilisent des stockages, identités, mandats et transport de messages simulés. Ils ne prouvent pas l'intégrité des prestataires réels ni la disponibilité en production.
- La PR #20 demeure brouillon/non fusionnée. Une fusion ne constituerait **jamais** en elle-même une autorisation d'ouverture.

### 2. Inventaire des fonctions et niveau de preuve

| Domaine | Ce qui existe dans la branche V0.3 | Preuve actuellement disponible | Limite bloquante |
|---|---|---|---|
| Dépôt et références | Modèle, stockage privé injectable, référence publique de suivi | Recettes simulées création/lecture et tests d'écriture conditionnelle | Pas de transaction multi-objets ni de fournisseur validé |
| Consultation publique | Projection filtrée ; consentement de publication distinct | Tests de refus de publication, publication modérée et retrait | Cache/CDN, version et effacement réel non validés |
| Espace personnel | Lien email à usage unique, session opaque, lecture privée et révision | Tests d'expiration, révocation, changement de contact | Envoi réel, anti-abus, récupération de boîte perdue non opérationnels |
| Index des contacts | Index HMAC et diagnostics lecture seule | Tests fictifs d'incohérence et d'orphelins | Pas de synchronisation transactionnelle avec dossier et sessions |
| Modération Diploval | Décisions humaines simulées, file et contrôleur privé | Tests de contrôle de versions, refus, approbation et retrait | Identités professionnelles, procédures réelles et audit externe à établir |
| Recours | Réexamen privé, escalade, suivi de statut | Recette transversale phase 2 réussie | Équipe indépendante, règles et délais d'exploitation non attestés |
| Réponses personnelles | Brouillon privé, seconde approbation distincte, révocation | Tests simulés de double validation et confidentialité | Transport et stockage de production non vérifiés |
| Participation institutionnelle | Contrôle de mandat par organisation/consultation, projet de réponse et revue Diploval séparée | 13 tests de périmètre et 10 tests de parcours institutionnel réussis | Mandats réels et identité professionnelle non vérifiés ; aucune publication autonome |
| Droits RGPD | Exports privés et demandes de droits ; prototypes de coordination d'effacement | Tests de demandes, accès, journalisation et garde-fous | Effacement effectif de tous les supports, délais et sauvegardes non attestés |
| Sécurité HTTP | Contrôleur interne désactivé, vérifications Origin, cookie, quota injecté | 15 tests HTTP fictifs réussis | Aucun essai sur application déployée, CDN/proxy, navigateur réel ou quotas distribués |
| Incident et reprise | Journaux CAS, diagnostics, revues humaines à deux intervenants | Tests de panne et de concurrence simulées | Fournisseur réel, fencing, reprises après panne, supervision et crise non testés |
| Interface et accessibilité | Parcours applicatifs décrits en code | Pas de recette utilisateur complète documentée dans ce registre | Mobile, accessibilité, langage clair et ergonomie à évaluer |

**Attention aux libellés** : « développé » et « réussi en simulation » ne signifient pas « opérationnel », « conforme » ou « prêt à recevoir des données ».

### 3. Registre de décision — les 16 conditions de blocage officielles

Les intitulés et responsables ci-dessous sont repris de la grille B7. **Aucun point n'est clôturé** ; les preuves attendues constituent des critères de sortie proposés, à valider avec les personnes compétentes.

| Point | Objet / responsable | État | Preuve ou décision attendue pour sortir du blocage |
|---|---|---|---|
| **P01** | Base art. 6 et conditions art. 9 RGPD par finalité — Juridique / responsable de traitement | OPEN | Tableau des finalités, bases légales, données sensibles, exceptions applicables, décision juridique motivée |
| **P02** | Information art. 13 et consentements éventuels — Responsable de traitement | OPEN | Notice V0.3 exacte au point de collecte, versionnée, vérifiée, lisible et approuvée |
| **P03** | CGU, charte, licences et publication — Diploval / juridique | OPEN | Textes consolidés et signés, protocole contradictoire et règles de diffusion approuvés |
| **P04** | Âge, tiers et minimisation des textes libres — Responsable de traitement | OPEN | Arbitrages documentés, garde-fous pour mineurs/tiers et tests de minimisation |
| **P05** | Registre art. 30 et AIPD — Responsable de traitement / conseil RGPD | OPEN | Registre complété et décision AIPD documentée ; AIPD réalisée si requise, mesures suivies |
| **P06** | Sous-traitants art. 28, localisation, transferts — Diploval / prestataires | OPEN | Inventaire des fournisseurs, contrats et garanties de localisation/transferts effectivement vérifiés |
| **P07** | Conservation et purge, sauvegardes incluses — Technique / juridique | OPEN | Durées par objet, purge/expiration et restauration sans réapparition testées |
| **P08** | Accès, export, rectification, retrait, effacement — Technique / RGPD | OPEN | Parcours effectifs des droits, refus motivés, effacement multi-stockages et traçabilité vérifiés |
| **P09** | Stockage chiffré, clés, rotation, restauration — Technique / sécurité | OPEN | Tests d'intégration du fournisseur réel, chiffrement, rotation et restauration documentés |
| **P10** | Authentification professionnelle, MFA, rôles — Administrateur sécurité | OPEN | Fournisseur d'identité, MFA, gestion des mandats institutionnels, révocation et audit des accès |
| **P11** | HTTP, quotas, CSRF, journaux, essais adversariaux — Technique / sécurité | OPEN | Recette de sécurité sur environnement isolé réaliste, limites distribuées et revue indépendante |
| **P12** | Emails facultatifs et suivi — Technique / responsable | OPEN | Transport sécurisé, consentement adapté, délivrabilité, indisponibilité et réponses neutres testés |
| **P13** | Modération, impartialité et recours — Responsable éditorial | OPEN | Règlement applicable, personnel habilité, escalade, recours et contrôles réels démontrés |
| **P14** | Responsable de traitement et mentions légales — Juridique | OPEN | Identité et statut juridique exacts, mentions mises à jour et approuvées |
| **P15** | Incidents, violations, réversibilité et suspension — Responsable sécurité | OPEN | Procédure d'incident et exercice de crise avec restauration, suspension, délais et responsabilités |
| **P16** | Pilote fictif intégral et test indépendant — Technique / responsable | OPEN | Recette de bout en bout sur environnement isolé, avis indépendant, corrections et décision datée |

**Note P08 :** la preuve historique de la grille B7 évoque l'absence de fonctions d'export/purge ; depuis, certains prototypes de demandes/export et de coordination ont été développés. Cela **ne justifie pas la clôture de P08**, faute de preuve d'exécution opérationnelle. Mettre à jour la preuve lors de la prochaine revue formelle, pas le statut de manière anticipée.

### 4. Ordre de levée des risques

**Vague A — Cadrage juridique et responsabilités.** P01, P02, P03, P04, P05, P06, P14. Responsables : direction du traitement, relecture juridique et prestataires. Produire des décisions datées et des textes complets.

**Vague B — Socle technique vérifiable.** P07, P08, P09, P10, P11, P12, P15. Installer un environnement de test isolé avec des fournisseurs réellement contractés, une authentification de test et des jeux fictifs. Éprouver concurrents, sauvegardes, purge, journaux, changements de rôles et incidents.

**Vague C — Gouvernance éditoriale, accessibilité et pilote indépendant.** P13, P16. Tester une consultation fictive complète : dépôt, consentement, modération, invitation d'une institution autorisée, proposition et réponse, recours, exercice des droits, incidents et clôture. Réaliser une revue indépendante ainsi que des essais mobiles et d'accessibilité.

Ces vagues peuvent avancer en parallèle, mais **aucune ne doit être considérée achevée à partir des seules simulations**.

### 5. Priorités opérationnelles non closes

| Priorité | Travail à produire | Livrable attendu |
|---|---|---|
| 1 — Critique | Désigner le responsable du traitement et le relecteur de conformité, arbitrer art. 6/9 et mineurs | Décisions juridiques et notice/CGU finalisées |
| 2 — Critique | Prouver les garanties du fournisseur stockage, secrets, CAS et détection des incohérences | Rapport de tests fournisseur et plan d'incident |
| 3 — Critique | Concevoir l'authentification professionnelle et la preuve des mandats | Matrice de rôles réelle, protocole de vérification et révocation |
| 4 — Critique | Tester effacement, rectification et conservation sur tous les supports, y compris sauvegardes | Procès-verbal contradictoire des droits RGPD |
| 5 — Élevée | Valider l'envoi facultatif de liens et la prévention de l'énumération | Tests de confidentialité, quotas et sécurité du transport |
| 6 — Élevée | Formaliser la modération, les recours et le traitement des réponses institutionnelles | Charte éditoriale, habilitations et dossiers d'essais |
| 7 — Élevée | Exécuter un pilote complet avec testeur indépendant et essais d'accessibilité | Rapport d'anomalies, corrections et procès-verbal de recette |

### 6. Registre des anomalies / limites ouvertes

| Référence | Gravité provisoire | Constat | Action nécessaire |
|---|---|---|---|
| INT-01 | Critique | Création dossier/référence/index sans transaction multi-objets | Protocole durable, reprise idempotente et test de panne |
| INT-02 | Critique | Aucun fournisseur d'identité institutionnelle réel | Vérification des mandats, MFA, séparation des organisations |
| INT-03 | Critique | Effacement et restauration globale non attestés | Essai d'effacement et non-réapparition après restauration |
| INT-04 | Élevée | Contrôleur HTTP non vérifié sur proxy, navigateur et infrastructure cible | Recette HTTP en environnement test isolé |
| INT-05 | Élevée | Énumération possible via écarts de durée ou d'erreurs lors de l'envoi de liens | Conception anti-énumération et tests adversariaux |
| INT-06 | Élevée | Publication de réponse institutionnelle non développée avec un contrôle final autonome | Circuit juridique/éditorial complet et revalidation de la version source |
| INT-07 | Élevée | Contrôle de suppression des caches publics non vérifié | Éprouver invalidation et absence de réapparition |
| INT-08 | Élevée | Absence d'essai usager et accessibilité documentés | Tests lecteurs d'écran, mobile, formulaires et langage clair |
| INT-09 | Critique | Bases juridiques et conditions du traitement de données sensibles non validées | Avis juridique, arbitrage documenté et AIPD si requise |

La gravité est **provisoire et conservatrice**, non la conclusion d'un audit indépendant. Ces anomalies ne doivent pas être supprimées du registre avant preuve de résolution.

### 7. Règles de décision de publication

La bascule vers `GO` exige **tous les points P01–P16 à `VERIFIED` avec preuves accessibles**, une relecture indépendante adaptée et **une décision humaine explicite, datée et enregistrée**. Une validation de tests, une fusion de branche ou un simple accord verbal n'y suffisent pas.

À ce jour : **NO GO — aucune activation, aucun traitement réel V0.3, aucune publication des textes juridiques V0.3 — PR #20 en brouillon — V0.2 préservée.**

### 8. Prochaine mise à jour de ce registre

Ne plus ouvrir de nouveaux « lots » de contrôle sans besoin identifié. Chaque travail suivant doit renseigner directement, dans ce registre : identifiant de condition, preuve, date, responsable, résultat du test, anomalie résiduelle, avis humain et nouveau statut. Les statuts de la grille JSON ne changent qu'après revue et attestation.
