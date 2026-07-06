# `phone/` — widget d'appel SIP portable

Module Vue 3 + TypeScript + [sip.js](https://sipjs.com/) autonome : un unique
bouton d'action flottant (en bas à droite) qui ouvre un clavier d'appel
(onglets clavier / contacts / récents), gère les appels entrants et sortants,
le mute micro/haut-parleur, le chronomètre d'appel, les tonalités de
sonnerie/rappel/occupé/raccroché, et un journal des 30 derniers appels
(entrants/sortants/manqués) stocké localement dans le navigateur. Il ne rend
aucune mise en page propre — c'est une surcouche flottante, qu'on peut monter
une seule fois à la racine d'une application hôte et laisser visible sur tous
les écrans/routes.

Le journal d'appels (onglet « Récents ») est **entièrement côté front** :
persisté dans `localStorage`, sous une clé propre à l'extension SIP de
l'utilisateur connecté (`sip-phone:history:{extension}`), plafonné aux 30
dernières entrées, sans aucun appel réseau ni backend impliqué. Cliquer sur
une entrée rappelle directement ce numéro ; chaque entrée peut aussi être
supprimée individuellement, ou tout le journal effacé en un clic.

Le FAB reflète en permanence l'état de santé de l'enregistrement SIP, pour
que l'utilisateur ait un retour visuel sans avoir à ouvrir le clavier :

| État                          | FAB                                    |
|-------------------------------|------------------------------------------|
| Connexion initiale            | Gris, spinner de chargement              |
| Enregistré, au repos          | Icône téléphone verte                    |
| Appel actif (sonnerie/appel/en cours) | Bleu, pulsation                   |
| Reconnexion (coupure transport, nouvelle tentative auto) | Orange, pulsation + spinner |
| Erreur (identifiants invalides, serveur ayant rejeté/résilié l'enregistrement) | Rouge, icône point d'exclamation |

`SoftphoneWidget.vue` lui-même n'a **aucune connaissance de votre backend, de
votre système d'authentification, ou de votre table d'utilisateurs** — tout
ce dont il a besoin arrive via des props. `SoftphoneWidgetContainer.vue`,
juste à côté, est l'exception : c'est le seul fichier de ce dossier qui *sait*
parler à un backend (l'API Django de cette application). Voir
« Intégrer `<SoftphoneWidgetContainer />` dans une application déjà
existante » plus bas pour savoir comment le traiter.

## Utilisation dans cette application

`App.vue` se contente de monter le conteneur une fois l'utilisateur
authentifié :

```vue
<SoftphoneWidgetContainer />
```

`SoftphoneWidgetContainer.vue` récupère `sipServerUri` / `currentUser` /
`contacts` depuis l'API propre à cette application, puis rend le widget
proprement dit :

```vue
<SoftphoneWidget
  v-if="sipUser"
  :sip-server-uri="sipServerUri"
  :current-user="sipUser"
  :contacts="contacts"
/>
```

Le montage/démontage de `SoftphoneWidget` pilote son cycle de vie : il
s'enregistre auprès du serveur SIP dans `onMounted`, et coupe proprement la
session quand Vue le démonte (par exemple quand le conteneur disparaît à la
déconnexion).

## Intégrer `<SoftphoneWidgetContainer />` dans une application déjà existante

C'est le cas le plus réaliste : vous avez déjà une application Vue (son
propre routeur, sa propre mise en page, sa propre authentification) et vous
voulez simplement y greffer la fonctionnalité d'appel.

### 1. Copier les fichiers

Copiez tout le dossier `phone/` dans le projet cible, par exemple sous
`src/components/phone/`. Tout ce qu'il contient (`SoftphoneWidget.vue`,
`hooks/`, `components/`, `sound/`, `icons/`, `locales/`) est indépendant du
backend et peut être copié tel quel — inutile d'y toucher.
`SoftphoneWidgetContainer.vue` est la seule exception (voir étape 3).

### 2. Installer l'unique dépendance nécessaire

```bash
npm install sip.js
```

Ce module a été développé avec `sip.js@^0.21`.

### 3. Brancher le conteneur sur votre propre backend

`SoftphoneWidgetContainer.vue` est un adaptateur léger, pas une pièce
générique du module — réécrivez son `loadPhoneData()` pour appeler **votre**
API plutôt que `/api/sip/me/` et `/api/sip/contacts/`, et utilisez le client
HTTP déjà présent dans votre application (n'importez pas l'instance axios
`@/api/index` de ce dépôt). La seule chose qui compte, c'est qu'il remplisse
au final `sipServerUri`, `sipUser` et `contacts` dans les formes attendues
par `SoftphoneWidget` :

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SoftphoneWidget from './SoftphoneWidget.vue'
import type { PhoneUser, PhoneContact } from './SoftphoneWidget.vue'
import myHttpClient from '@/lib/http' // le client déjà utilisé par votre application

// Configuration statique propre au déploiement — pas besoin d'être récupérée.
const sipServerUri = 'wss://sip.mycompany.com:8089/ws'

const sipUser  = ref<PhoneUser | null>(null)
const contacts = ref<PhoneContact[]>([])

async function loadPhoneData() {
  const me = await myHttpClient.get('/me/sip-credentials')
  sipUser.value = {
    displayName: me.data.fullName,
    extension:   me.data.sipExtension,
    password:    me.data.sipPassword,
  }

  const directory = await myHttpClient.get('/team/directory')
  contacts.value = directory.data.map((person: any) => ({
    displayName: person.fullName,
    extension:   person.sipExtension,
  }))
}

onMounted(loadPhoneData)
</script>

<template>
  <SoftphoneWidget
    v-if="sipUser"
    :sip-server-uri="sipServerUri"
    :current-user="sipUser"
    :contacts="contacts"
  />
</template>
```

Voir « Ce que votre backend doit fournir » plus bas pour savoir ce que cette
API doit renvoyer.

### 4. Le monter une seule fois, globalement

Placez `<SoftphoneWidgetContainer />` près de la racine de votre application
— dans votre composant de mise en page principal, pas dans une route/page
particulière — puisqu'il rend une surcouche en position fixe sans aucun
impact sur la mise en page, il cohabite sans problème avec le routage/layout
déjà en place :

```vue
<!-- ex. votre Layout.vue / App.vue de haut niveau -->
<template>
  <router-view />
  <SoftphoneWidgetContainer v-if="currentUser" />
</template>
```

Protégez-le avec votre propre condition « cet utilisateur est-il connecté /
autorisé à passer des appels » (`v-if`, comme ci-dessus) — le montage/
démontage est ce qui pilote le cycle de vie de la session SIP du widget (il
s'enregistre au montage, se désenregistre et coupe tout au démontage, par
exemple quand votre `v-if` bascule à la déconnexion).

### 5. Points à vérifier

- **Conflit de z-index / position** : le FAB et ses popups utilisent
  `position: fixed` avec un `z-index` autour de 1085–1200 (coin bas-droit).
  Si votre application a déjà quelque chose épinglé à cet endroit (un widget
  de chat, un autre FAB), ajustez les décalages/z-index dans le `<style>` de
  `SoftphoneWidget.vue`.
- **CORS/cookies** : si votre frontend et votre backend vivent sur des
  origines différentes, assurez-vous que votre client HTTP envoie les
  identifiants et que votre backend l'autorise — voir le
  `django/core/settings.py` de ce dépôt (`CORS_ALLOWED_ORIGINS`,
  `CORS_ALLOW_CREDENTIALS`, `CSRF_TRUSTED_ORIGINS`) pour un exemple concret
  si vous êtes aussi en authentification par session.
- **Permission microphone** : comme toute application WebRTC, le navigateur
  demandera l'accès au micro la première fois qu'un appel est passé/décroché
  — rien à configurer, ne soyez simplement pas surpris lors d'un premier
  test.

## Props

| Prop           | Type            | Description |
|----------------|-----------------|--------------|
| `sipServerUri` | `string`        | URI WebSocket du transport du serveur SIP, ex. `wss://sip.example.com:8089/ws`. Même valeur pour tous les utilisateurs d'un déploiement donné — généralement une valeur de configuration statique/variable d'environnement côté application hôte, pas quelque chose à récupérer à chaque requête. |
| `currentUser`  | `PhoneUser`     | L'identité SIP utilisée pour enregistrer **cette** session : `{ displayName, extension, password }`. |
| `contacts`     | `PhoneContact[]`| Les autres postes SIP joignables, affichés dans l'onglet Contacts du clavier : `{ displayName, extension }[]`. |
| `locale`       | `string?`       | Forçage optionnel de la langue de l'interface (`'fr' \| 'en' \| 'es' \| 'de'`). Auto-détectée depuis le navigateur sinon. |

`PhoneUser` et `PhoneContact` sont exportés depuis `SoftphoneWidget.vue` —
importez-les pour bénéficier du typage :

```ts
import type { PhoneUser, PhoneContact } from '@/components/phone/SoftphoneWidget.vue'
```

Le widget n'émet aucun événement — il est autonome une fois monté. La
déconnexion / le changement de compte se gère simplement en le retirant du
DOM côté hôte (`v-if`).

## Ce que votre backend doit fournir

Ce module n'appelle aucune API HTTP — c'est à l'application hôte de récupérer
ces deux éléments (comme elle le souhaite) et de les transmettre en props :

1. **Les identifiants SIP propres à l'utilisateur connecté** — `extension` +
   `password` d'un endpoint PJSIP (ou compatible) déjà provisionné sur votre
   serveur SIP, plus un `displayName`. Stockez le mot de passe chiffré en
   base (jamais en clair), et ne le servez jamais qu'à son propriétaire
   authentifié, en HTTPS. Implémentation de référence dans ce dépôt :
   - Modèle : [`django/api/models.py`](../../../../django/api/models.py) (`SipAccount`, mot de passe chiffré via Fernet)
   - Endpoint : `GET /api/sip/me/` dans [`django/api/views.py`](../../../../django/api/views.py)
2. **Un annuaire de contacts** — la liste des autres postes que cet
   utilisateur est autorisé à appeler, sous la forme
   `{ displayName, extension }`. Implémentation de référence :
   `GET /api/sip/contacts/` dans le même fichier.

N'importe quel backend convient, du moment qu'il peut fournir ces deux formes
à l'application hôte pour un utilisateur authentifié ; rien ici n'est
spécifique à Django.

## Structure interne (pour référence, ne fait pas partie de l'API publique)

- `SoftphoneWidgetContainer.vue` — **le seul fichier spécifique au backend
  ici** ; voir « Intégrer `<SoftphoneWidgetContainer />` dans une application
  déjà existante » plus haut.
- `hooks/useSIP.ts` — encapsulation de sip.js : enregistrement, appels, mute,
  tonalités, et le journal d'appels (`history`, persisté en `localStorage`,
  voir plus haut).
- `hooks/usePhoneI18n.ts` + `locales/*.json` — i18n propre à ce module
  (volontairement séparée de l'i18n de l'application hôte, pour que ce
  dossier reste copiable tel quel).
- `components/` — clavier, statut d'appel, écrans d'appel entrant, journal
  d'appels (`CallHistory.vue`), l'UI du popup du FAB.
- `sound/` — générateurs de tonalités sonnerie/rappel/occupé/raccroché/
  reconnexion + le fichier `ringtone.mp3` fourni.
- `icons/` — composants SVG inline utilisés par l'UI ci-dessus.
