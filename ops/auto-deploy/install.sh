#!/usr/bin/env bash
# Устанавливает systemd-таймер авто-деплоя. Запуск: bash ops/auto-deploy/install.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

chmod +x "$DIR/auto-deploy.sh"
cp "$DIR/bastur-auto-deploy.service" /etc/systemd/system/
cp "$DIR/bastur-auto-deploy.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now bastur-auto-deploy.timer

echo "Авто-деплой установлен."
echo "Статус таймера:   systemctl status bastur-auto-deploy.timer"
echo "Логи деплоев:     journalctl -u bastur-auto-deploy -f"
echo "Отключить:        systemctl disable --now bastur-auto-deploy.timer"
systemctl list-timers bastur-auto-deploy.timer --no-pager | head -3
