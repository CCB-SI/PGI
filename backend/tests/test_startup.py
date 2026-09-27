COUNT_USERS_AFTER_BOOT = (
    "import gestaodecomunicados.main as app_main\n"
    "db = app_main.SessionLocal()\n"
    "print('usuarios:', db.query(app_main.all_models.User).count())\n"
)


def test_backend_startup_creates_no_user(boot_backend):
    result = boot_backend(COUNT_USERS_AFTER_BOOT)

    assert result.returncode == 0, result.stderr
    assert "usuarios: 0" in result.stdout


def test_backend_startup_without_admin_points_to_the_command(boot_backend):
    result = boot_backend()

    assert result.returncode == 0, result.stderr
    assert "gestaodecomunicados.contas criar-admin" in result.stdout
