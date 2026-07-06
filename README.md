# SIP Mini-Project — Softphone Web (Vue + Django + Asterisk)

Démo de softphone web basé sur SIP/WebRTC, composée de trois briques :

- **[vue-frontend/](vue-frontend/)** — interface Vue 3 + TypeScript + [sip.js](https://sipjs.com/) : écran de connexion (identifiant/mot de passe), clavier d'appel façon Zoiper (onglets Récents/Clavier/Contacts), gestion des appels entrants/sortants, mute micro/son, timer d'appel.
- **[django/](django/)** — API REST (Django REST Framework) : authentification par session (login/logout), gestion des utilisateurs et de leur compte SIP associé (modèle `SipAccount`, mot de passe SIP chiffré en base), liste de contacts.
- **[asterisk/](asterisk/)** — configuration PJSIP d'un serveur Asterisk (transport WebSocket pour le navigateur), lancé via Docker.

## Architecture

```
Navigateur (Vue + sip.js)
   │  HTTP /api/*  (proxy Vite → backend:8000, exposé sur :3000)
   ▼
Django REST API (conteneur backend:8000, publié sur :9090)
   │  authentifie l'utilisateur (session + cookie), puis renvoie les
   │  identifiants SIP de son propre compte (SipAccount)
   ▼
Navigateur ── WebSocket SIP (ws://localhost:8088/ws) ──▶ Asterisk (PJSIP)
```

## Prérequis

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) + Docker Compose (pour Django, Asterisk et le frontend)
- Un navigateur récent (Chrome, Edge, Firefox…) avec accès au micro — WebRTC requis
- [Node.js](https://nodejs.org/) ≥ 18 (LTS) et npm — uniquement si vous préférez lancer le frontend hors Docker (voir plus bas)

## 1. Cloner le projet

```bash
git clone https://github.com/rachid-chakir-developper/sip-client-mini-project.git
cd "sip-client-mini-project"
```

## 2. Démarrer l'application (Docker Compose)

```bash
docker-compose up --build
```

Cela démarre :

- **asterisk** — serveur PBX, WebSocket SIP exposé sur `ws://localhost:8088/ws`
- **backend** — API REST Django exposée sur `http://localhost:9090/api/`
- **frontend** — serveur de dev Vue/Vite exposé sur `http://localhost:3000`

Laissez ce terminal ouvert (`Ctrl+C` pour arrêter les conteneurs).

Lancez ensuite les migrations Django (nécessaires : elles créent les tables d'authentification et le modèle `SipAccount`) et créez un compte administrateur :

```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

L'application est accessible sur **http://localhost:3000**. Le serveur Vite (dans le conteneur `frontend`) proxifie les appels `/api` vers `http://backend:8000` (voir [vite.config.ts](vue-frontend/vite.config.ts) et les variables `VITE_API_PROXY_TARGET`/`VITE_WS_PROXY_TARGET` du [docker-compose.yml](docker-compose.yml)).

### Alternative — lancer le frontend hors Docker

Si vous préférez ne pas conteneuriser le frontend, retirez/arrêtez le service `frontend` (`docker-compose up --build backend asterisk`) et lancez-le en local :

```bash
cd vue-frontend
npm install
npm run dev
```

L'application est alors accessible sur **http://localhost:3000**, avec le proxy `/api` pointant par défaut sur `http://localhost:9090` (le port publié par le conteneur `backend`).

## 3. Créer des utilisateurs et leur compte SIP

Les comptes ne sont plus codés en dur : ils se créent dans l'admin Django, à
`http://localhost:9090/admin/` (connectez-vous avec le superuser créé
ci-dessus).

Pour chaque utilisateur, ouvrez **Utilisateurs → Ajouter**, renseignez
identifiant/mot de passe, puis dans le bloc **Compte SIP** de la même page :

- **Extension** : doit correspondre à un endpoint déjà déclaré dans
  `asterisk/pjsip.conf` (par défaut `004`, `005` ou `006`).
- **Mot de passe SIP** : doit correspondre au mot de passe `auth` de ce même
  endpoint dans `asterisk/pjsip.conf`.

Le mot de passe SIP est stocké chiffré en base (voir `django/api/models.py` /
`django/api/crypto.py`) — l'admin ne l'affiche jamais en clair après coup.

Trois endpoints de démo sont préconfigurés côté Asterisk
(`asterisk/pjsip.conf`), tous avec le mot de passe `my_password` :

| Extension | Mot de passe SIP |
|-----------|-------------------|
| 004       | my_password       |
| 005       | my_password       |
| 006       | my_password       |

## 4. Tester l'application

Pour simuler un appel entre deux comptes :

1. Ouvrez **http://localhost:3000** dans deux fenêtres/navigateurs différents (ex. une fenêtre normale + une fenêtre de navigation privée, pour éviter que les deux onglets partagent la même session).
2. Connectez-vous avec un utilisateur différent dans chaque fenêtre (ex. Alice dans l'une, Bob dans l'autre) — l'enregistrement SIP se fait automatiquement après la connexion.
3. Autorisez l'accès au micro quand le navigateur le demande.
4. Une fois les deux comptes affichés comme "Disponible", ouvrez le bouton d'appel flottant (FAB, en bas à droite) dans la fenêtre d'Alice : onglet **Contacts** pour appeler Bob directement, ou onglet **Clavier** pour composer son extension.
5. Dans la fenêtre de Bob, une notification d'appel entrant doit apparaître (popup en haut à droite + écran dédié dans le clavier) : décrochez.
6. Vérifiez le timer d'appel, les boutons mute micro/son, puis raccrochez depuis l'une ou l'autre fenêtre.

## 5. Tests

Il n'existe pas encore de suite de tests automatisés pour ce projet. Un test de démarrage minimal côté Django (le fichier `api/tests.py` est vide, mais la commande valide que le projet démarre correctement) :

```bash
docker-compose exec backend python manage.py test
```

## Notes / limites

- Authentification par session Django (cookie + CSRF) : les mots de passe SIP sont chiffrés en base (Fernet) et ne transitent jamais en clair côté admin. Le CORS est restreint à `http://localhost:3000` (voir `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` dans `django/core/settings.py`) — à adapter si le frontend est servi depuis un autre domaine.
- Le provisioning des endpoints Asterisk reste **manuel** : créer un `SipAccount` dans l'admin Django ne crée pas automatiquement l'endpoint correspondant dans `asterisk/pjsip.conf` — l'extension doit déjà y exister.
- Le transport WebSocket SIP n'est pas chiffré (`ws://`, pas `wss://`) — **à ne pas utiliser tel quel en production**.
- Pas encore d'historique d'appels : l'onglet "Récents" du clavier est un espace vide (aucun backend de journal d'appels pour l'instant).

## Dépannage

- **Pas de son / micro non détecté** : vérifiez que le navigateur a bien l'autorisation micro pour `localhost:3000` (ou `localhost:3000` en mode sans Docker).
- **L'appel ne passe pas** : vérifiez que le conteneur `asterisk` est démarré (`docker compose ps`) et que les ports UDP `5060` et `10000-10100` ne sont pas bloqués par un pare-feu.
- **Erreur réseau sur les appels `/api/...`** : vérifiez que Django tourne bien sur `http://localhost:9090` (`docker compose ps`, `docker compose logs backend`).
