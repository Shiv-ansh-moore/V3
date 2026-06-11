  select vault.create_secret(
    'http://host.docker.internal:54321',
    'supabase_project_url'
  );

  select vault.create_secret(
    'dev-notification-secret',
    'notification_webhook_secret'
  );