from cryptography.fernet import Fernet
from django.conf import settings


def _fernet():
    return Fernet(settings.SIP_ENCRYPTION_KEY)


def encrypt_password(raw_password: str) -> str:
    return _fernet().encrypt(raw_password.encode()).decode()


def decrypt_password(encrypted_password: str) -> str:
    return _fernet().decrypt(encrypted_password.encode()).decode()
