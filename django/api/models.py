from django.conf import settings
from django.db import models

from .crypto import decrypt_password, encrypt_password


class SipAccount(models.Model):
    """SIP account (PJSIP endpoint) linked to a Django user.

    The matching endpoint must already exist on the Asterisk side in
    asterisk/pjsip.conf (manual provisioning) — this model only stores and
    serves the credentials securely for the frontend's auto-connect once the
    user is authenticated.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sip_account',
    )
    extension = models.CharField(
        max_length=32,
        unique=True,
        help_text="Must match an endpoint declared in asterisk/pjsip.conf",
    )
    encrypted_password = models.TextField()

    class Meta:
        verbose_name = "SIP account"
        verbose_name_plural = "SIP accounts"

    def __str__(self):
        return f"{self.user} <{self.extension}>"

    def set_password(self, raw_password: str) -> None:
        self.encrypted_password = encrypt_password(raw_password)

    def get_password(self) -> str:
        return decrypt_password(self.encrypted_password)
