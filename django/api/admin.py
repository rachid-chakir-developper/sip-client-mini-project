from django import forms
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import SipAccount

User = get_user_model()


class SipAccountInlineForm(forms.ModelForm):
    password = forms.CharField(
        label="SIP password",
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text="Leave blank to keep the current password.",
    )

    class Meta:
        model = SipAccount
        fields = ['extension', 'password']

    def clean(self):
        cleaned_data = super().clean()
        if not self.instance.pk and not cleaned_data.get('password'):
            raise forms.ValidationError(
                "A SIP password is required when creating the account."
            )
        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        raw_password = self.cleaned_data.get('password')
        if raw_password:
            instance.set_password(raw_password)
        if commit:
            instance.save()
        return instance


class SipAccountInline(admin.StackedInline):
    model = SipAccount
    form = SipAccountInlineForm
    can_delete = True
    extra = 0
    max_num = 1
    verbose_name = "SIP account"
    verbose_name_plural = "SIP account"


class UserAdmin(DjangoUserAdmin):
    inlines = [SipAccountInline]
    list_display = DjangoUserAdmin.list_display + ('sip_extension',)

    @admin.display(description="SIP extension")
    def sip_extension(self, obj):
        return getattr(getattr(obj, 'sip_account', None), 'extension', '—')


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
