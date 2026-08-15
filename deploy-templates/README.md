# Deploy templates

## github-deploy.yml

GitHub App, через который v0 пушит в репозиторий, не имеет права `workflows`,
поэтому файл не может быть добавлен в `.github/workflows/` автоматически.

**Как включить push-деплой (одно действие):**

1. Скопируйте файл в workflows:

   ```bash
   cp deploy-templates/github-deploy.yml .github/workflows/deploy.yml
   git add .github/workflows/deploy.yml
   git commit -m "ci: add deploy workflow"
   git push
   ```

   (или создайте файл через веб-интерфейс GitHub: Add file → Create new file →
   `.github/workflows/deploy.yml` — вставьте содержимое).

2. Добавьте секреты в GitHub (Settings → Secrets and variables → Actions):
   - `DEPLOY_SSH_HOST` — хост сервера
   - `DEPLOY_SSH_USER` — SSH-пользователь
   - `DEPLOY_SSH_KEY` — приватный SSH-ключ
   - `DEPLOY_PATH` — путь к репозиторию на сервере

**Альтернатива без GitHub Actions** — cron на сервере (не требует секретов в GitHub):

```cron
*/2 * * * * /path/to/repo/scripts/auto-deploy.sh >> /var/log/bastur-deploy.log 2>&1
```

`scripts/auto-deploy.sh` сам сравнивает SHA с origin/main, пересобирает,
перезапускает pm2 без даунтайма и откатывается при провале health-check.
