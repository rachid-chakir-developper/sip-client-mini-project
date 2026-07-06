# Sonnerie

> Doc du widget d'appel SIP : [`phone/README.md`](../../README.md).

Déposez un fichier nommé `ringtone.mp3` dans ce dossier pour remplacer la
sonnerie d'appel entrant par défaut (voir [useRingtone.ts](../useRingtone.ts)).

Si `ringtone.mp3` est absent, ou ne peut pas être chargé/décodé, le module
bascule automatiquement sur une tonalité générée — aucune modification de
code n'est nécessaire dans un cas comme dans l'autre.
