# Portail DSI Hotel — structure découpée

```
index.html                 en-tête, CDN, styles + chargeur des scripts (DSI_VERSION)
js/core.js                 constantes, utilitaires, Supabase, composants partagés
js/pages/<page>.js         une fonction Page_<page>(ctx) par écran (34 pages)
js/app.js                  composant App : états, actions, navigation — chargé en dernier
```

Aucun outil de build : ce sont des scripts classiques, chargés dans l'ordre par index.html.
Les déclarations de haut niveau (core.js, Page_xxx) sont visibles depuis tous les fichiers.

## Déployer
1. Pousser tous les fichiers modifiés **dans le même commit** (GitHub Desktop).
2. À chaque déploiement, changer `window.DSI_VERSION` dans index.html (ex. `2026-11-09-2`),
   sinon un navigateur peut garder un ancien fichier en cache.
3. Premier déploiement : vérifier sur l'établissement « Client Test », puis Ctrl+F5.

## Modifier une page
- L'affichage d'une page est dans `js/pages/<page>.js`.
- Les états (`useState`) et les actions (`loadXxx`, `saveXxx`…) restent dans `js/app.js`.
- Une page reçoit de App uniquement les variables listées dans son `const { … } = ctx;`.
  **Si une page doit utiliser une nouvelle variable de App, l'ajouter à deux endroits** :
  dans ce `const { … } = ctx;` et dans l'appel `Page_<page>({ … })` de app.js.
  Oublier l'un des deux donne « X is not defined » à l'ouverture de la page.
- Ajouter une page : créer `js/pages/nouvelle.js`, l'ajouter dans la liste de index.html
  (avant `js/app.js`), et ajouter l'appel `if (page === "nouvelle" …) content = Page_nouvelle({ … });` dans app.js.

## Pour une session de correctifs avec Claude
Envoyer le ou les fichiers concernés (ex. `js/pages/sophos.js` + `js/app.js` si un état ou une action change).
