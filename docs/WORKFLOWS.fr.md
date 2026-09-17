# Cinq workflows prêts à importer

[English guide](WORKFLOWS.md)

**Migration 0.4.0 :** le registre Aurentia a retiré la ressource publique
**Feature Requests** (liste, création, vote). Remplacez les suggestions par
**Feedback → Send Product Feedback**, catégorie `idea`. Les autres identifiants
d’opérations restent stables. L’action Support récupère l’identité du profil
authentifié et reste compatible avec l’ancienne API comme avec la nouvelle.

Installez `@aurentiaai/n8n-nodes-aurentia`, puis choisissez **Import from File**
dans n8n et sélectionnez un fichier JSON ci-dessous. Les modèles sont inactifs
et ne contiennent aucun identifiant de connexion. Sélectionnez votre credential
Aurentia sur **chaque** action ou déclencheur Aurentia, remplacez les identifiants
d’exemple dans **Configuration** (ou choisissez le projet dans le déclencheur),
testez puis activez. Les identifiants commençant par `00000000-` sont à remplacer.
Pour OAuth, choisissez Authentication → OAuth2 puis votre credential OAuth.

Commencez par les sept ressources principales : Account, Contact, Deal,
Project, Record, Social Post et Task. Elles proposent des sélecteurs recherchables
et la pagination. Les autres ressources exposent les opérations avancées de
l’API ; leurs champs JSON acceptent du JSON valide ou une expression n8n renvoyant
un objet/tableau. Sélectionnez uniquement les champs optionnels à transmettre.
Dans une écriture générée, une chaîne vide ou `null` explicitement sélectionnée
est envoyée à l’API et peut effacer un champ si cette API l’autorise. Ne pas
sélectionner un champ conserve sa valeur existante.

| Modèle | À configurer | Résultat |
| --- | --- | --- |
| [Formulaire → CRM](../examples/01-lead-to-crm.json) | Projet, tableau de tâches, colonne ; credentials sur les trois actions | Une soumission crée un contact, une opportunité liée et une tâche de suivi. |
| [Contact → suivi](../examples/02-contact-follow-up.json) | Projet du déclencheur ; tableau et colonne | Chaque nouveau contact observé crée une tâche de suivi. |
| [Pipeline hebdomadaire](../examples/03-weekly-pipeline.json) | Projet ; credentials sur les deux actions | Chaque lundi à 9 h, heure de Paris, toutes les opportunités sont récapitulées dans une note du wiki projet, y compris si le pipeline est vide. Les devises restent distinctes. |
| [Publication → notification](../examples/04-post-notification.json) | Projet ; webhook acceptant `{ "text": "…" }` | Notifie un service d’équipe, par exemple un webhook entrant Slack, à la première observation d’un post publié. |
| [Table → JSON](../examples/05-table-export.json) | Identifiants de la base et de la table | Chaque lundi, exporte toutes les lignes dans `aurentia-records.json` en conservant les identifiants des champs. Téléchargez le fichier depuis l’exécution ou branchez votre stockage. Une table vide ne produit pas de fichier. |

Pour un webhook confidentiel, placez l’URL dans le stockage de secrets n8n avant
de partager/exporter le workflow. Ces cinq modèles n’utilisent aucun modèle IA.
D’autres opérations IA Aurentia peuvent consommer des crédits.

## Déclenchement et reprises

- À l’activation, le déclencheur mémorise les éléments existants sans les rejouer.
  Un test manuel renvoie l’échantillon le plus récent parmi toutes les pages,
  sans modifier l’état du déclencheur actif.
- Chaque interrogation lit toutes les pages, puis émet les identifiants encore
  inconnus dans l’ordre chronologique. Les identifiants observés sont conservés,
  même s’ils disparaissent temporairement. Les gros lots et les dates anciennes
  ou retardées ne sont plus ignorés silencieusement.
- Une page erronée ou illisible fait échouer la lecture sans avancer l’état.
  Après correction, l’interrogation suivante reprend. Les anciens workflows
  utilisant un curseur temporel migrent à leur première lecture complète.
- Changer de projet, tableau, table ou événement établit une nouvelle référence.
- Le polling n’est pas un journal d’événements : un objet créé puis supprimé
  entre deux interrogations reste invisible. Republier un post dont l’identifiant
  a déjà été observé ne le déclenche pas à nouveau. La lecture des pages ne
  constitue pas un instantané transactionnel.
- Le nombre d’appels API est proportionnel au volume et l’état conservé croît
  avec les identifiants observés. Adaptez l’intervalle à votre volume. Une limite
  de débit provoque une erreur visible sans perte de progression. La limite de
  sécurité de 10 000 pages provoque une erreur, jamais une troncature silencieuse.
- Les erreurs des étapes suivantes se reprennent depuis les exécutions n8n.
  Rejouer une création réussie peut produire un doublon : ce paquet ne relance
  pas automatiquement les écritures. Reprenez à l’étape échouée si possible.

## Vérification

`npm run build && npm test` vérifie le catalogue, les filtres optionnels, les
valeurs JSON, la pagination, les déclencheurs, les liens entre éléments et les
modèles. `npm run test:e2e` importe les workflows et des credentials clé API/OAuth
dans une instance n8n 2.39.7 temporaire et exécute leurs étapes métier face à un
simulateur HTTP local. Les entrées formulaire/planification/polling sont simulées ;
les expressions et les actions livrées s’exécutent telles quelles. L’authentification
Bearer OAuth est testée, pas le parcours interactif d’autorisation/renouvellement.
Aucun compte réel, envoi externe ou génération payante n’est utilisé.

La [checklist réelle](e2e-checklist.md) couvre connexion, consentement,
renouvellement et API Aurentia avant publication. Des tests locaux verts ne
publient pas de version npm et ne valent pas approbation n8n Cloud.
