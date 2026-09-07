import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'telescope_ui.entries': { paramsTuple?: []; params?: {} }
    'telescope_ui.entry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'telescope_ui.trace': { paramsTuple: [ParamValue]; params: {'traceId': ParamValue} }
    'telescope_ui.stats': { paramsTuple?: []; params?: {} }
    'telescope_ui.retention': { paramsTuple?: []; params?: {} }
    'telescope_ui.replay': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'telescope_ui.diagnose': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'telescope_ui.profiles_status': { paramsTuple?: []; params?: {} }
    'telescope_ui.profiles': { paramsTuple?: []; params?: {} }
    'telescope_ui.profile': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'telescope_ui.profiles_arm': { paramsTuple?: []; params?: {} }
    'telescope_ui.schedules_live': { paramsTuple?: []; params?: {} }
    'telescope_ui.queues_live': { paramsTuple?: []; params?: {} }
    'telescope_ui.queues_live_job': { paramsTuple: [ParamValue,ParamValue]; params: {'queue': ParamValue,'id': ParamValue} }
    'telescope_ui.queues_live_retry': { paramsTuple: [ParamValue,ParamValue]; params: {'queue': ParamValue,'id': ParamValue} }
    'telescope_ui.queues_live_enqueue': { paramsTuple: [ParamValue]; params: {'queue': ParamValue} }
    'telescope_ui.metrics_stats': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_timeseries': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_traces': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_screens': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_waterfall': { paramsTuple: [ParamValue]; params: {'traceId': ParamValue} }
    'telescope_ui.metrics_n_plus_one': { paramsTuple: [ParamValue]; params: {'traceId': ParamValue} }
    'telescope_ui.metrics_pulse': { paramsTuple?: []; params?: {} }
    'telescope_ui.stream': { paramsTuple?: []; params?: {} }
    'telescope_ui.meta': { paramsTuple?: []; params?: {} }
    'media.dashboard.me': { paramsTuple?: []; params?: {} }
    'media.dashboard.login': { paramsTuple?: []; params?: {} }
    'media.dashboard.session': { paramsTuple?: []; params?: {} }
    'media.dashboard.logout': { paramsTuple?: []; params?: {} }
    'media.dashboard.topology': { paramsTuple?: []; params?: {} }
    'media.dashboard.disks': { paramsTuple?: []; params?: {} }
    'media.dashboard.objects': { paramsTuple?: []; params?: {} }
    'media.dashboard.object': { paramsTuple?: []; params?: {} }
    'media.dashboard.object.upload': { paramsTuple?: []; params?: {} }
    'media.dashboard.object.raw': { paramsTuple?: []; params?: {} }
    'media.dashboard.object.insights': { paramsTuple?: []; params?: {} }
    'media.dashboard.uploads': { paramsTuple?: []; params?: {} }
    'media.dashboard.uploads.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'media.dashboard.uploads.abort': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'media.dashboard.collections': { paramsTuple?: []; params?: {} }
    'media.dashboard.collections.summary': { paramsTuple?: []; params?: {} }
    'media.dashboard.media_record': { paramsTuple?: []; params?: {} }
    'media.dashboard.media_record.delete': { paramsTuple?: []; params?: {} }
    'media.dashboard.copy': { paramsTuple?: []; params?: {} }
    'media.dashboard.move': { paramsTuple?: []; params?: {} }
    'media.dashboard.delete': { paramsTuple?: []; params?: {} }
    'media.dashboard.folder.create': { paramsTuple?: []; params?: {} }
    'media.dashboard.folder.delete': { paramsTuple?: []; params?: {} }
    'media.dashboard.folder.copy': { paramsTuple?: []; params?: {} }
    'media.dashboard.folder.move': { paramsTuple?: []; params?: {} }
    'media.dashboard.index': { paramsTuple?: []; params?: {} }
    'media.dashboard.assets': { paramsTuple: [ParamValue]; params: {'file': ParamValue} }
    'authkit.assets.webauthn': { paramsTuple?: []; params?: {} }
    'authkit.assets.logout': { paramsTuple?: []; params?: {} }
    'authkit.assets.passkeyAutofill': { paramsTuple?: []; params?: {} }
    'authkit.assets.passkeyButton': { paramsTuple?: []; params?: {} }
    'authkit.assets.passkeyRegister': { paramsTuple?: []; params?: {} }
    'authkit.assets.webauthnConfirm': { paramsTuple?: []; params?: {} }
    'authkit.assets.submitLock': { paramsTuple?: []; params?: {} }
    'authkit.oidc.wildcard': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'authkit.oidc.root': { paramsTuple?: []; params?: {} }
    'interaction.show': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.identifier': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.login': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.mfa_verify': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.change_expired_password': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.passkey_options': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.passkey_verify': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.magic_link_request': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.magic_link_consume': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.otp_verify': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.consent': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.switch_identifier': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.otp_unlock': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'registration.show_signup': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'registration.signup': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'registration.show_forgot': { paramsTuple?: []; params?: {} }
    'registration.forgot': { paramsTuple?: []; params?: {} }
    'registration.show_reset': { paramsTuple?: []; params?: {} }
    'registration.reset': { paramsTuple?: []; params?: {} }
    'registration.verify_email': { paramsTuple?: []; params?: {} }
    'pat_introspection': { paramsTuple?: []; params?: {} }
    'account_orgs.show_accept_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'account_orgs.accept_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'account_session.show': { paramsTuple?: []; params?: {} }
    'account_session.login': { paramsTuple?: []; params?: {} }
    'account_session.logout': { paramsTuple?: []; params?: {} }
    'account_security.confirm_email': { paramsTuple?: []; params?: {} }
    'account_tokens.index': { paramsTuple?: []; params?: {} }
    'account_tokens.store': { paramsTuple?: []; params?: {} }
    'account_tokens.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_security.index': { paramsTuple?: []; params?: {} }
    'account_security.change_password': { paramsTuple?: []; params?: {} }
    'account_security.change_email': { paramsTuple?: []; params?: {} }
    'account_security.cancel_email_change': { paramsTuple?: []; params?: {} }
    'account_security.update_profile': { paramsTuple?: []; params?: {} }
    'account_security.export_data': { paramsTuple?: []; params?: {} }
    'account_security.delete_account': { paramsTuple?: []; params?: {} }
    'account_security.revoke_trusted_devices': { paramsTuple?: []; params?: {} }
    'account_apps.index': { paramsTuple?: []; params?: {} }
    'account_apps.revoke': { paramsTuple: [ParamValue]; params: {'clientId': ParamValue} }
    'account_mfa.index': { paramsTuple?: []; params?: {} }
    'account_mfa.enroll': { paramsTuple?: []; params?: {} }
    'account_mfa.confirm': { paramsTuple?: []; params?: {} }
    'account_mfa.disable': { paramsTuple?: []; params?: {} }
    'account_mfa.passkey_register_options': { paramsTuple?: []; params?: {} }
    'account_mfa.passkey_register_verify': { paramsTuple?: []; params?: {} }
    'account_mfa.passkey_remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_confirm.show': { paramsTuple?: []; params?: {} }
    'account_orgs.index': { paramsTuple?: []; params?: {} }
    'account_orgs.store': { paramsTuple?: []; params?: {} }
    'account_orgs.deactivate': { paramsTuple?: []; params?: {} }
    'account_orgs.activate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_orgs.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_orgs.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_orgs.remove_member': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'accountId': ParamValue} }
    'account_orgs.revoke_invitation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'invId': ParamValue} }
    'account_orgs.list_json': { paramsTuple?: []; params?: {} }
    'account_orgs.list_invitations_json': { paramsTuple?: []; params?: {} }
    'account_orgs.show_json': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_api.me': { paramsTuple?: []; params?: {} }
    'account_api.security_overview': { paramsTuple?: []; params?: {} }
    'account_api.update_profile': { paramsTuple?: []; params?: {} }
    'account_api.change_password': { paramsTuple?: []; params?: {} }
    'account_api.cancel_email_change': { paramsTuple?: []; params?: {} }
    'account_api.request_email_change': { paramsTuple?: []; params?: {} }
    'account_api.list_sessions': { paramsTuple?: []; params?: {} }
    'account_api.revoke_other_sessions': { paramsTuple?: []; params?: {} }
    'account_api.revoke_all_sessions': { paramsTuple?: []; params?: {} }
    'account_api.revoke_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_api.list_apps': { paramsTuple?: []; params?: {} }
    'account_api.revoke_app': { paramsTuple: [ParamValue]; params: {'clientId': ParamValue} }
    'account_api.mfa_status': { paramsTuple?: []; params?: {} }
    'account_api.get_login_methods': { paramsTuple?: []; params?: {} }
    'account_api.update_login_methods': { paramsTuple?: []; params?: {} }
    'account_api.list_passkeys': { paramsTuple?: []; params?: {} }
    'account_api.remove_passkey': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_api.list_tokens': { paramsTuple?: []; params?: {} }
    'account_api.create_token': { paramsTuple?: []; params?: {} }
    'account_api.revoke_token': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_api.list_orgs': { paramsTuple?: []; params?: {} }
    'account_api.list_org_invitations': { paramsTuple?: []; params?: {} }
    'account_api.show_org': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'authkit_console_assets': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'console_overview': { paramsTuple?: []; params?: {} }
    'console_users.index': { paramsTuple?: []; params?: {} }
    'console_users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_users.store': { paramsTuple?: []; params?: {} }
    'console_users.update_roles': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_users.disable': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_users.enable': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_users.reset_password': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_sessions.index': { paramsTuple?: []; params?: {} }
    'console_sessions.revoke_all': { paramsTuple?: []; params?: {} }
    'console_sessions.user_sessions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_sessions.user_revoke_sessions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_clients.index': { paramsTuple?: []; params?: {} }
    'console_clients.store': { paramsTuple?: []; params?: {} }
    'console_clients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_clients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_clients.regenerate_secret': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_roles.index': { paramsTuple?: []; params?: {} }
    'console_roles.store': { paramsTuple?: []; params?: {} }
    'console_roles.update': { paramsTuple: [ParamValue]; params: {'name': ParamValue} }
    'console_roles.destroy': { paramsTuple: [ParamValue]; params: {'name': ParamValue} }
    'console_orgs.index': { paramsTuple?: []; params?: {} }
    'console_orgs.store': { paramsTuple?: []; params?: {} }
    'console_orgs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_orgs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_orgs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_orgs.add_member': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_orgs.update_member_role': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'accountId': ParamValue} }
    'console_orgs.remove_member': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'accountId': ParamValue} }
    'console_orgs.create_invitation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_orgs.revoke_invitation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'invitationId': ParamValue} }
    'console_audit.index': { paramsTuple?: []; params?: {} }
    'console_settings.index': { paramsTuple?: []; params?: {} }
    'console_settings.upsert': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'console_settings.destroy': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'console_keys.status': { paramsTuple?: []; params?: {} }
    'console_keys.rotate': { paramsTuple?: []; params?: {} }
    'console_impersonation': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'authkit_console_root': { paramsTuple?: []; params?: {} }
    'authkit_console_shell': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'api_users.index': { paramsTuple?: []; params?: {} }
    'api_users.store': { paramsTuple?: []; params?: {} }
    'api_users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.disable': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.enable': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.reset_password': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.sessions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.revoke_sessions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_clients.index': { paramsTuple?: []; params?: {} }
    'api_clients.store': { paramsTuple?: []; params?: {} }
    'api_clients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_clients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_clients.regenerate_secret': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_clients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.index': { paramsTuple?: []; params?: {} }
    'api_orgs.store': { paramsTuple?: []; params?: {} }
    'api_orgs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.add_member': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.remove_member': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'accountId': ParamValue} }
    'api_orgs.update_member_role': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'accountId': ParamValue} }
    'api_orgs.create_invitation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.revoke_invitation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'invitationId': ParamValue} }
    'api_misc.audit': { paramsTuple?: []; params?: {} }
    'api_misc.stats': { paramsTuple?: []; params?: {} }
    'api_misc.verify': { paramsTuple?: []; params?: {} }
    'api_settings.index': { paramsTuple?: []; params?: {} }
    'api_settings.show': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'api_settings.upsert': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'api_settings.destroy': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'api_keys.status': { paramsTuple?: []; params?: {} }
    'api_keys.rotate': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.callback': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'documents.index': { paramsTuple?: []; params?: {} }
    'documents.store': { paramsTuple?: []; params?: {} }
    'documents.file': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'telescope_ui.entries': { paramsTuple?: []; params?: {} }
    'telescope_ui.entry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'telescope_ui.trace': { paramsTuple: [ParamValue]; params: {'traceId': ParamValue} }
    'telescope_ui.stats': { paramsTuple?: []; params?: {} }
    'telescope_ui.retention': { paramsTuple?: []; params?: {} }
    'telescope_ui.profiles_status': { paramsTuple?: []; params?: {} }
    'telescope_ui.profiles': { paramsTuple?: []; params?: {} }
    'telescope_ui.profile': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'telescope_ui.schedules_live': { paramsTuple?: []; params?: {} }
    'telescope_ui.queues_live': { paramsTuple?: []; params?: {} }
    'telescope_ui.queues_live_job': { paramsTuple: [ParamValue,ParamValue]; params: {'queue': ParamValue,'id': ParamValue} }
    'telescope_ui.metrics_stats': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_timeseries': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_traces': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_screens': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_waterfall': { paramsTuple: [ParamValue]; params: {'traceId': ParamValue} }
    'telescope_ui.metrics_n_plus_one': { paramsTuple: [ParamValue]; params: {'traceId': ParamValue} }
    'telescope_ui.metrics_pulse': { paramsTuple?: []; params?: {} }
    'telescope_ui.stream': { paramsTuple?: []; params?: {} }
    'telescope_ui.meta': { paramsTuple?: []; params?: {} }
    'media.dashboard.me': { paramsTuple?: []; params?: {} }
    'media.dashboard.topology': { paramsTuple?: []; params?: {} }
    'media.dashboard.disks': { paramsTuple?: []; params?: {} }
    'media.dashboard.objects': { paramsTuple?: []; params?: {} }
    'media.dashboard.object': { paramsTuple?: []; params?: {} }
    'media.dashboard.object.raw': { paramsTuple?: []; params?: {} }
    'media.dashboard.object.insights': { paramsTuple?: []; params?: {} }
    'media.dashboard.uploads': { paramsTuple?: []; params?: {} }
    'media.dashboard.uploads.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'media.dashboard.collections': { paramsTuple?: []; params?: {} }
    'media.dashboard.collections.summary': { paramsTuple?: []; params?: {} }
    'media.dashboard.media_record': { paramsTuple?: []; params?: {} }
    'media.dashboard.index': { paramsTuple?: []; params?: {} }
    'media.dashboard.assets': { paramsTuple: [ParamValue]; params: {'file': ParamValue} }
    'authkit.assets.webauthn': { paramsTuple?: []; params?: {} }
    'authkit.assets.logout': { paramsTuple?: []; params?: {} }
    'authkit.assets.passkeyAutofill': { paramsTuple?: []; params?: {} }
    'authkit.assets.passkeyButton': { paramsTuple?: []; params?: {} }
    'authkit.assets.passkeyRegister': { paramsTuple?: []; params?: {} }
    'authkit.assets.webauthnConfirm': { paramsTuple?: []; params?: {} }
    'authkit.assets.submitLock': { paramsTuple?: []; params?: {} }
    'authkit.oidc.wildcard': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'authkit.oidc.root': { paramsTuple?: []; params?: {} }
    'interaction.show': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.magic_link_consume': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.switch_identifier': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.otp_unlock': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'registration.show_signup': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'registration.show_forgot': { paramsTuple?: []; params?: {} }
    'registration.show_reset': { paramsTuple?: []; params?: {} }
    'registration.verify_email': { paramsTuple?: []; params?: {} }
    'account_orgs.show_accept_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'account_session.show': { paramsTuple?: []; params?: {} }
    'account_security.confirm_email': { paramsTuple?: []; params?: {} }
    'account_tokens.index': { paramsTuple?: []; params?: {} }
    'account_security.index': { paramsTuple?: []; params?: {} }
    'account_security.export_data': { paramsTuple?: []; params?: {} }
    'account_apps.index': { paramsTuple?: []; params?: {} }
    'account_mfa.index': { paramsTuple?: []; params?: {} }
    'account_confirm.show': { paramsTuple?: []; params?: {} }
    'account_orgs.index': { paramsTuple?: []; params?: {} }
    'account_orgs.list_json': { paramsTuple?: []; params?: {} }
    'account_orgs.list_invitations_json': { paramsTuple?: []; params?: {} }
    'account_orgs.show_json': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_api.me': { paramsTuple?: []; params?: {} }
    'account_api.security_overview': { paramsTuple?: []; params?: {} }
    'account_api.list_sessions': { paramsTuple?: []; params?: {} }
    'account_api.list_apps': { paramsTuple?: []; params?: {} }
    'account_api.mfa_status': { paramsTuple?: []; params?: {} }
    'account_api.get_login_methods': { paramsTuple?: []; params?: {} }
    'account_api.list_passkeys': { paramsTuple?: []; params?: {} }
    'account_api.list_tokens': { paramsTuple?: []; params?: {} }
    'account_api.list_orgs': { paramsTuple?: []; params?: {} }
    'account_api.list_org_invitations': { paramsTuple?: []; params?: {} }
    'account_api.show_org': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'authkit_console_assets': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'console_overview': { paramsTuple?: []; params?: {} }
    'console_users.index': { paramsTuple?: []; params?: {} }
    'console_users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_sessions.index': { paramsTuple?: []; params?: {} }
    'console_sessions.user_sessions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_clients.index': { paramsTuple?: []; params?: {} }
    'console_roles.index': { paramsTuple?: []; params?: {} }
    'console_orgs.index': { paramsTuple?: []; params?: {} }
    'console_orgs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_audit.index': { paramsTuple?: []; params?: {} }
    'console_settings.index': { paramsTuple?: []; params?: {} }
    'console_keys.status': { paramsTuple?: []; params?: {} }
    'console_impersonation': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'authkit_console_root': { paramsTuple?: []; params?: {} }
    'authkit_console_shell': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'api_users.index': { paramsTuple?: []; params?: {} }
    'api_users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.sessions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_clients.index': { paramsTuple?: []; params?: {} }
    'api_clients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.index': { paramsTuple?: []; params?: {} }
    'api_orgs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_misc.audit': { paramsTuple?: []; params?: {} }
    'api_misc.stats': { paramsTuple?: []; params?: {} }
    'api_settings.index': { paramsTuple?: []; params?: {} }
    'api_settings.show': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'api_keys.status': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.callback': { paramsTuple?: []; params?: {} }
    'documents.index': { paramsTuple?: []; params?: {} }
    'documents.file': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'telescope_ui.entries': { paramsTuple?: []; params?: {} }
    'telescope_ui.entry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'telescope_ui.trace': { paramsTuple: [ParamValue]; params: {'traceId': ParamValue} }
    'telescope_ui.stats': { paramsTuple?: []; params?: {} }
    'telescope_ui.retention': { paramsTuple?: []; params?: {} }
    'telescope_ui.profiles_status': { paramsTuple?: []; params?: {} }
    'telescope_ui.profiles': { paramsTuple?: []; params?: {} }
    'telescope_ui.profile': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'telescope_ui.schedules_live': { paramsTuple?: []; params?: {} }
    'telescope_ui.queues_live': { paramsTuple?: []; params?: {} }
    'telescope_ui.queues_live_job': { paramsTuple: [ParamValue,ParamValue]; params: {'queue': ParamValue,'id': ParamValue} }
    'telescope_ui.metrics_stats': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_timeseries': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_traces': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_screens': { paramsTuple?: []; params?: {} }
    'telescope_ui.metrics_waterfall': { paramsTuple: [ParamValue]; params: {'traceId': ParamValue} }
    'telescope_ui.metrics_n_plus_one': { paramsTuple: [ParamValue]; params: {'traceId': ParamValue} }
    'telescope_ui.metrics_pulse': { paramsTuple?: []; params?: {} }
    'telescope_ui.stream': { paramsTuple?: []; params?: {} }
    'telescope_ui.meta': { paramsTuple?: []; params?: {} }
    'media.dashboard.me': { paramsTuple?: []; params?: {} }
    'media.dashboard.topology': { paramsTuple?: []; params?: {} }
    'media.dashboard.disks': { paramsTuple?: []; params?: {} }
    'media.dashboard.objects': { paramsTuple?: []; params?: {} }
    'media.dashboard.object': { paramsTuple?: []; params?: {} }
    'media.dashboard.object.raw': { paramsTuple?: []; params?: {} }
    'media.dashboard.object.insights': { paramsTuple?: []; params?: {} }
    'media.dashboard.uploads': { paramsTuple?: []; params?: {} }
    'media.dashboard.uploads.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'media.dashboard.collections': { paramsTuple?: []; params?: {} }
    'media.dashboard.collections.summary': { paramsTuple?: []; params?: {} }
    'media.dashboard.media_record': { paramsTuple?: []; params?: {} }
    'media.dashboard.index': { paramsTuple?: []; params?: {} }
    'media.dashboard.assets': { paramsTuple: [ParamValue]; params: {'file': ParamValue} }
    'authkit.assets.webauthn': { paramsTuple?: []; params?: {} }
    'authkit.assets.logout': { paramsTuple?: []; params?: {} }
    'authkit.assets.passkeyAutofill': { paramsTuple?: []; params?: {} }
    'authkit.assets.passkeyButton': { paramsTuple?: []; params?: {} }
    'authkit.assets.passkeyRegister': { paramsTuple?: []; params?: {} }
    'authkit.assets.webauthnConfirm': { paramsTuple?: []; params?: {} }
    'authkit.assets.submitLock': { paramsTuple?: []; params?: {} }
    'authkit.oidc.wildcard': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'authkit.oidc.root': { paramsTuple?: []; params?: {} }
    'interaction.show': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.magic_link_consume': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.switch_identifier': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.otp_unlock': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'registration.show_signup': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'registration.show_forgot': { paramsTuple?: []; params?: {} }
    'registration.show_reset': { paramsTuple?: []; params?: {} }
    'registration.verify_email': { paramsTuple?: []; params?: {} }
    'account_orgs.show_accept_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'account_session.show': { paramsTuple?: []; params?: {} }
    'account_security.confirm_email': { paramsTuple?: []; params?: {} }
    'account_tokens.index': { paramsTuple?: []; params?: {} }
    'account_security.index': { paramsTuple?: []; params?: {} }
    'account_security.export_data': { paramsTuple?: []; params?: {} }
    'account_apps.index': { paramsTuple?: []; params?: {} }
    'account_mfa.index': { paramsTuple?: []; params?: {} }
    'account_confirm.show': { paramsTuple?: []; params?: {} }
    'account_orgs.index': { paramsTuple?: []; params?: {} }
    'account_orgs.list_json': { paramsTuple?: []; params?: {} }
    'account_orgs.list_invitations_json': { paramsTuple?: []; params?: {} }
    'account_orgs.show_json': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_api.me': { paramsTuple?: []; params?: {} }
    'account_api.security_overview': { paramsTuple?: []; params?: {} }
    'account_api.list_sessions': { paramsTuple?: []; params?: {} }
    'account_api.list_apps': { paramsTuple?: []; params?: {} }
    'account_api.mfa_status': { paramsTuple?: []; params?: {} }
    'account_api.get_login_methods': { paramsTuple?: []; params?: {} }
    'account_api.list_passkeys': { paramsTuple?: []; params?: {} }
    'account_api.list_tokens': { paramsTuple?: []; params?: {} }
    'account_api.list_orgs': { paramsTuple?: []; params?: {} }
    'account_api.list_org_invitations': { paramsTuple?: []; params?: {} }
    'account_api.show_org': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'authkit_console_assets': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'console_overview': { paramsTuple?: []; params?: {} }
    'console_users.index': { paramsTuple?: []; params?: {} }
    'console_users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_sessions.index': { paramsTuple?: []; params?: {} }
    'console_sessions.user_sessions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_clients.index': { paramsTuple?: []; params?: {} }
    'console_roles.index': { paramsTuple?: []; params?: {} }
    'console_orgs.index': { paramsTuple?: []; params?: {} }
    'console_orgs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_audit.index': { paramsTuple?: []; params?: {} }
    'console_settings.index': { paramsTuple?: []; params?: {} }
    'console_keys.status': { paramsTuple?: []; params?: {} }
    'console_impersonation': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'authkit_console_root': { paramsTuple?: []; params?: {} }
    'authkit_console_shell': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'api_users.index': { paramsTuple?: []; params?: {} }
    'api_users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.sessions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_clients.index': { paramsTuple?: []; params?: {} }
    'api_clients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.index': { paramsTuple?: []; params?: {} }
    'api_orgs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_misc.audit': { paramsTuple?: []; params?: {} }
    'api_misc.stats': { paramsTuple?: []; params?: {} }
    'api_settings.index': { paramsTuple?: []; params?: {} }
    'api_settings.show': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'api_keys.status': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.callback': { paramsTuple?: []; params?: {} }
    'documents.index': { paramsTuple?: []; params?: {} }
    'documents.file': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'telescope_ui.replay': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'telescope_ui.diagnose': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'telescope_ui.profiles_arm': { paramsTuple?: []; params?: {} }
    'telescope_ui.queues_live_retry': { paramsTuple: [ParamValue,ParamValue]; params: {'queue': ParamValue,'id': ParamValue} }
    'telescope_ui.queues_live_enqueue': { paramsTuple: [ParamValue]; params: {'queue': ParamValue} }
    'media.dashboard.login': { paramsTuple?: []; params?: {} }
    'media.dashboard.session': { paramsTuple?: []; params?: {} }
    'media.dashboard.logout': { paramsTuple?: []; params?: {} }
    'media.dashboard.object.upload': { paramsTuple?: []; params?: {} }
    'media.dashboard.uploads.abort': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'media.dashboard.media_record.delete': { paramsTuple?: []; params?: {} }
    'media.dashboard.copy': { paramsTuple?: []; params?: {} }
    'media.dashboard.move': { paramsTuple?: []; params?: {} }
    'media.dashboard.delete': { paramsTuple?: []; params?: {} }
    'media.dashboard.folder.create': { paramsTuple?: []; params?: {} }
    'media.dashboard.folder.delete': { paramsTuple?: []; params?: {} }
    'media.dashboard.folder.copy': { paramsTuple?: []; params?: {} }
    'media.dashboard.folder.move': { paramsTuple?: []; params?: {} }
    'authkit.oidc.wildcard': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'authkit.oidc.root': { paramsTuple?: []; params?: {} }
    'interaction.identifier': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.login': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.mfa_verify': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.change_expired_password': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.passkey_options': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.passkey_verify': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.magic_link_request': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.otp_verify': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'interaction.consent': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'registration.signup': { paramsTuple: [ParamValue]; params: {'uid': ParamValue} }
    'registration.forgot': { paramsTuple?: []; params?: {} }
    'registration.reset': { paramsTuple?: []; params?: {} }
    'pat_introspection': { paramsTuple?: []; params?: {} }
    'account_orgs.accept_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'account_session.login': { paramsTuple?: []; params?: {} }
    'account_session.logout': { paramsTuple?: []; params?: {} }
    'account_tokens.store': { paramsTuple?: []; params?: {} }
    'account_tokens.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_security.change_password': { paramsTuple?: []; params?: {} }
    'account_security.change_email': { paramsTuple?: []; params?: {} }
    'account_security.cancel_email_change': { paramsTuple?: []; params?: {} }
    'account_security.update_profile': { paramsTuple?: []; params?: {} }
    'account_security.delete_account': { paramsTuple?: []; params?: {} }
    'account_security.revoke_trusted_devices': { paramsTuple?: []; params?: {} }
    'account_apps.revoke': { paramsTuple: [ParamValue]; params: {'clientId': ParamValue} }
    'account_mfa.enroll': { paramsTuple?: []; params?: {} }
    'account_mfa.confirm': { paramsTuple?: []; params?: {} }
    'account_mfa.disable': { paramsTuple?: []; params?: {} }
    'account_mfa.passkey_register_options': { paramsTuple?: []; params?: {} }
    'account_mfa.passkey_register_verify': { paramsTuple?: []; params?: {} }
    'account_mfa.passkey_remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_orgs.store': { paramsTuple?: []; params?: {} }
    'account_orgs.deactivate': { paramsTuple?: []; params?: {} }
    'account_orgs.activate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_orgs.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_orgs.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_orgs.remove_member': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'accountId': ParamValue} }
    'account_orgs.revoke_invitation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'invId': ParamValue} }
    'account_api.change_password': { paramsTuple?: []; params?: {} }
    'account_api.cancel_email_change': { paramsTuple?: []; params?: {} }
    'account_api.request_email_change': { paramsTuple?: []; params?: {} }
    'account_api.revoke_other_sessions': { paramsTuple?: []; params?: {} }
    'account_api.revoke_all_sessions': { paramsTuple?: []; params?: {} }
    'account_api.create_token': { paramsTuple?: []; params?: {} }
    'console_users.store': { paramsTuple?: []; params?: {} }
    'console_users.disable': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_users.enable': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_users.reset_password': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_sessions.revoke_all': { paramsTuple?: []; params?: {} }
    'console_sessions.user_revoke_sessions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_clients.store': { paramsTuple?: []; params?: {} }
    'console_clients.regenerate_secret': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_roles.store': { paramsTuple?: []; params?: {} }
    'console_orgs.store': { paramsTuple?: []; params?: {} }
    'console_orgs.add_member': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_orgs.create_invitation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_keys.rotate': { paramsTuple?: []; params?: {} }
    'api_users.store': { paramsTuple?: []; params?: {} }
    'api_users.disable': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.enable': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.reset_password': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_users.revoke_sessions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_clients.store': { paramsTuple?: []; params?: {} }
    'api_clients.regenerate_secret': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.store': { paramsTuple?: []; params?: {} }
    'api_orgs.add_member': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.create_invitation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_misc.verify': { paramsTuple?: []; params?: {} }
    'api_keys.rotate': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'documents.store': { paramsTuple?: []; params?: {} }
  }
  OPTIONS: {
    'authkit.oidc.wildcard': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'authkit.oidc.root': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'authkit.oidc.wildcard': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'authkit.oidc.root': { paramsTuple?: []; params?: {} }
    'account_api.update_login_methods': { paramsTuple?: []; params?: {} }
    'console_settings.upsert': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'api_settings.upsert': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
  }
  PATCH: {
    'authkit.oidc.wildcard': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'authkit.oidc.root': { paramsTuple?: []; params?: {} }
    'account_api.update_profile': { paramsTuple?: []; params?: {} }
    'console_users.update_roles': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_clients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_roles.update': { paramsTuple: [ParamValue]; params: {'name': ParamValue} }
    'console_orgs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_orgs.update_member_role': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'accountId': ParamValue} }
    'api_users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_clients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.update_member_role': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'accountId': ParamValue} }
  }
  DELETE: {
    'authkit.oidc.wildcard': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'authkit.oidc.root': { paramsTuple?: []; params?: {} }
    'account_api.revoke_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_api.revoke_app': { paramsTuple: [ParamValue]; params: {'clientId': ParamValue} }
    'account_api.remove_passkey': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_api.revoke_token': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_clients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_roles.destroy': { paramsTuple: [ParamValue]; params: {'name': ParamValue} }
    'console_orgs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'console_orgs.remove_member': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'accountId': ParamValue} }
    'console_orgs.revoke_invitation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'invitationId': ParamValue} }
    'console_settings.destroy': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'api_users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_clients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_orgs.remove_member': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'accountId': ParamValue} }
    'api_orgs.revoke_invitation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'invitationId': ParamValue} }
    'api_settings.destroy': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}