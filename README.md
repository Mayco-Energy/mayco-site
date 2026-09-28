# mayco-site

Site vitrine de Mayco Energy, publié sur [maycoenergy.com](https://maycoenergy.com) via GitHub Pages. HTML, CSS et JavaScript statiques, sans dépendance ni étape de build.

## Structure

```
index.html              page d'accueil (FR)
en/index.html           version anglaise
mentions-legales.html   mentions légales et confidentialité
404.html                page d'erreur (servie automatiquement par GitHub Pages)
assets/css/site.css     styles (jetons de couleur en tête de fichier)
assets/js/site.js       graphique « journée type », menu mobile, formulaire, CTA mobile
assets/fonts/           Archivo et IBM Plex Mono auto-hébergées (licence SIL OFL)
assets/img/             favicon, icône Apple, images de partage (og-fr.png, og-en.png)
robots.txt, sitemap.xml, CNAME
```

## Modifier le site

- **Textes** : directement dans `index.html` et `en/index.html`. Les deux versions sont indépendantes : penser à répercuter une modification dans l'autre langue.
- **Graphique du hero** : les données (prix spot, profils de charge, températures) sont en tête de `assets/js/site.js`, objet `DAY`. Elles sont illustratives et le signalent sur la page.
- **Couleurs** : variables CSS en tête de `assets/css/site.css`. Orange = chaud / cher, ambre = moyen, bleu = froid / bon marché, comme le point du logo.
- **Contact** : le formulaire ne stocke rien, il ouvre la messagerie du visiteur avec un e-mail pré-rempli vers `contact@maycoenergy.com`.

## Tester en local

```
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000.
