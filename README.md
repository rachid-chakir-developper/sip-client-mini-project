# SIP Mini-Project — Softphone Web (Vue + Django + Asterisk)

Démo de softphone web basé sur SIP/WebRTC, composée de trois briques :

- **[vue-frontend/](vue-frontend/)** — interface Vue 3 + TypeScript + [sip.js](https://sipjs.com/) : sélection de compte, clavier d'appel façon Zoiper (onglets Récents/Clavier/Contacts), gestion des appels entrants/sortants, mute micro/son, timer d'appel.
- **[django/](django/)** — API REST (Django REST Framework) qui expose la liste des comptes de démo et leurs identifiants SIP.
- **[asterisk/](asterisk/)** — configuration PJSIP d'un serveur Asterisk (transport WebSocket pour le navigateur), lancé via Docker.

## Architecture

```
Navigateur (Vue + sip.js)
   │  HTTP /api/*  (proxy Vite → :9090)
   ▼
Django REST API (:9090 → conteneur :8000)
   │  renvoie les identifiants SIP du compte choisi
   ▼
Navigateur ── WebSocket SIP (ws://localhost:8088/ws) ──▶ Asterisk (PJSIP)
```

## Prérequis

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) + Docker Compose (pour Asterisk + Django)
- [Node.js](https://nodejs.org/) ≥ 18 (LTS) et npm (pour le frontend)
- Un navigateur récent (Chrome, Edge, Firefox…) avec accès au micro — WebRTC requis

## 1. Cloner le projet

```bash
git clone <url-du-repo>
cd "Nouveau dossier (2)"
```

## 2. Démarrer le backend (Django + Asterisk)

```bash
docker-compose up --build
```

Cela démarre :

- **asterisk** — serveur PBX, WebSocket SIP exposé sur `ws://localhost:8088/ws`
- **django** — API REST exposée sur `http://localhost:9090/api/`

Laissez ce terminal ouvert (`Ctrl+C` pour arrêter les conteneurs).

Optionnel — lancer les migrations Django (utile pour `/admin/`, pas nécessaire pour l'API de démo qui ne touche pas la base) :

```bash
docker-compose exec django python manage.py migrate
```

## 3. Démarrer le frontend (Vue)

Dans un second terminal :

```bash
cd vue-frontend
npm install
npm run dev
```

L'application est accessible sur **http://localhost:3000**. Le serveur Vite proxifie les appels `/api` vers `http://localhost:9090` (voir [vite.config.ts](vue-frontend/vite.config.ts)).

## 4. Tester l'application

Trois comptes de démo sont préconfigurés à l'identique côté Django (`django/api/users.py`) et Asterisk (`asterisk/pjsip.conf`) :

| Compte           | Extension | Mot de passe SIP |
|------------------|-----------|-------------------|
| Alice Dupont     | 004       | my_password       |
| Bob Martin       | 005       | my_password       |
| Charlie Bernard  | 006       | my_password       |

Pour simuler un appel entre deux comptes :

1. Ouvrez **http://localhost:3000** dans deux fenêtres/navigateurs différents (ex. une fenêtre normale + une fenêtre de navigation privée, pour éviter que les deux onglets partagent la même session).
2. Dans chaque fenêtre, choisissez un compte différent (ex. Alice dans l'une, Bob dans l'autre).
3. Autorisez l'accès au micro quand le navigateur le demande.
4. Une fois les deux comptes affichés comme "Disponible", ouvrez le bouton d'appel flottant (FAB, en bas à droite) dans la fenêtre d'Alice : onglet **Contacts** pour appeler Bob directement, ou onglet **Clavier** pour composer l'extension `005`.
5. Dans la fenêtre de Bob, une notification d'appel entrant doit apparaître (popup en haut à droite + écran dédié dans le clavier) : décrochez.
6. Vérifiez le timer d'appel, les boutons mute micro/son, puis raccrochez depuis l'une ou l'autre fenêtre.

Il n'existe pas encore de suite de tests automatisés pour ce projet. Un test de démarrage minimal côté Django (le fichier `api/tests.py` est vide, mais la commande valide que le projet démarre correctement) :

```bash
docker-compose exec django python manage.py test
```

## Notes / limites

- Projet de démonstration : identifiants SIP en clair, `CORS_ALLOW_ALL_ORIGINS = True`, transport WebSocket non chiffré (`ws://`) — **à ne pas utiliser tel quel en production**.
- La liste des comptes est codée en dur dans `django/api/users.py` (pas de base de données).
- Pas encore d'historique d'appels : l'onglet "Récents" du clavier est un espace vide (aucun backend de journal d'appels pour l'instant).

## Dépannage

- **Pas de son / micro non détecté** : vérifiez que le navigateur a bien l'autorisation micro pour `localhost:3000`.
- **L'appel ne passe pas** : vérifiez que le conteneur `asterisk` est démarré (`docker compose ps`) et que les ports UDP `5060` et `10000-10100` ne sont pas bloqués par un pare-feu.
- **Erreur réseau sur les appels `/api/...`** : vérifiez que Django tourne bien sur `http://localhost:9090` (`docker compose ps`, `docker compose logs django`).
