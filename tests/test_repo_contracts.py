import json
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


class RepoContractsTest(unittest.TestCase):
    def test_required_paths_exist(self) -> None:
        required = [
            ROOT / "AGENTS.md",
            ROOT / "CLAUDE.md",
            ROOT / "CONSTITUTION.md",
            ROOT / "README.md",
            ROOT / ".jm-adk.json",
            ROOT / "session-state.template.json",
            ROOT / "profiles" / "README.md",
            ROOT / "profiles" / "capabilities" / "README.md",
            ROOT / "profiles" / "capabilities" / "capability-manifest.json",
            ROOT / "profiles" / "codex" / "README.md",
            ROOT / "profiles" / "codex" / "config.template.toml",
            ROOT / "profiles" / "claude" / "README.md",
            ROOT / "profiles" / "claude" / "settings.template.json",
            ROOT / "profiles" / "claude" / "settings.local.template.json",
            ROOT / "profiles" / "desktop" / "README.md",
            ROOT / "profiles" / "desktop" / "claude_desktop_config.template.json",
            ROOT / "contracts" / "README.md",
            ROOT / "contracts" / "shared-sync-allowlist.json",
            ROOT / "scripts" / "README.md",
            ROOT / "scripts" / "check-capabilities.ps1",
            ROOT / "scripts" / "check-capabilities.sh",
            ROOT / "scripts" / "doctor.ps1",
            ROOT / "scripts" / "doctor.sh",
            ROOT / "scripts" / "prepare-platform-remote.ps1",
            ROOT / "scripts" / "prepare-platform-remote.sh",
            ROOT / "scripts" / "check-enterprise-sso.ps1",
            ROOT / "scripts" / "check-oneroster-readiness.ps1",
            ROOT / "scripts" / "check-notifications-readiness.ps1",
            ROOT / "scripts" / "check-community-readiness.ps1",
            ROOT / "scripts" / "check-cutover-readiness.ps1",
            ROOT / "scripts" / "smoke-m1-live-no-stripe.ps1",
            ROOT / "scripts" / "smoke-pedagogy-risk-live.ps1",
            ROOT / "scripts" / "smoke-teacher-reporting-live.ps1",
            ROOT / "scripts" / "smoke-dsar-dedicated.ps1",
            ROOT / "specs" / "README.md",
            ROOT / "specs" / "campus-platform-v3" / "README.md",
            ROOT / "specs" / "campus-platform-v3" / "01-spec.md",
            ROOT / "specs" / "campus-platform-v3" / "02-technical-plan.md",
            ROOT / "specs" / "campus-platform-v3" / "03-checklists.md",
            ROOT / "specs" / "campus-platform-v3" / "04-bdd.md",
            ROOT / "specs" / "campus-platform-v3" / "05-task-breakdown.md",
            ROOT / "specs" / "campus-platform-v3" / "06-analysis.md",
            ROOT / "tests" / "README.md",
            ROOT / "campus-platform" / "README.md",
            ROOT / "campus-platform" / "RELEASE-NO-STRIPE.md",
            ROOT / "campus-platform" / "README-DEPLOY.md",
            ROOT / "campus-platform" / ".env.example",
            ROOT / "campus-platform" / ".env.production.example",
            ROOT / "campus-platform" / "package.json",
            ROOT / "campus-platform" / "lighthouserc.cjs",
            ROOT / "campus-platform" / "scripts" / "run-a11y.mjs",
            ROOT / "campus-platform" / "scripts" / "run-lhci.mjs",
            ROOT / "campus-platform" / "scripts" / "lhci-puppeteer.cjs",
            ROOT / "campus-platform" / "src" / "lib" / "web-vitals-rum.ts",
            ROOT / "campus-platform" / "supabase" / "README.md",
            ROOT / "campus-platform" / "supabase" / "config.toml",
            ROOT / "campus-platform" / "supabase" / ".env.functions.example",
            ROOT
            / "campus-platform"
            / "supabase"
            / "migrations"
            / "20260425035000_platform_v3_web_vitals_rum.sql",
            ROOT
            / "campus-platform"
            / "supabase"
            / "migrations"
            / "20260425131710_platform_v3_student_risk_security_invoker.sql",
            ROOT
            / "campus-platform"
            / "supabase"
            / "migrations"
            / "20260425134314_platform_v3_teacher_reporting_realtime.sql",
            ROOT
            / "campus-platform"
            / "supabase"
            / "functions"
            / "rum-web-vitals"
            / "index.ts",
            ROOT / "campus-platform" / "supabase" / "sso" / "README.md",
            ROOT
            / "campus-platform"
            / "supabase"
            / "sso"
            / "attribute-mapping.enterprise.example.json",
            ROOT / "campus-platform" / "supabase" / "oneroster" / "README.md",
            ROOT
            / "campus-platform"
            / "supabase"
            / "oneroster"
            / "manifest.enterprise.example.json",
            ROOT / "campus-platform" / "supabase" / "notifications" / "README.md",
            ROOT
            / "campus-platform"
            / "supabase"
            / "notifications"
            / "live-channel-secrets.example.env",
            ROOT / "campus-platform" / "supabase" / "community" / "README.md",
            ROOT
            / "campus-platform"
            / "supabase"
            / "community"
            / "manifest.enterprise.example.json",
            ROOT
            / "campus-platform"
            / "supabase"
            / "community"
            / "lti-platform-secrets.example.env",
            ROOT / "campus-platform" / "supabase" / "dsar" / "README.md",
            ROOT / "campus-platform" / "src" / "README.md",
            ROOT / "campus-platform" / "tests" / "README.md",
            ROOT / "campus-v2" / "README.md",
            ROOT / "campus-v2" / "README-DEPLOY.md",
            ROOT / "tools" / "README.md",
            ROOT / "workspace" / "README.md",
        ]
        for path in required:
            self.assertTrue(path.exists(), f"missing required path: {path}")

    def test_manifest_declares_codex_canonical(self) -> None:
        manifest = json.loads(
            (ROOT / "profiles" / "capabilities" / "capability-manifest.json").read_text()
        )
        self.assertEqual(manifest["canonicalEnvironment"], "codex")
        self.assertEqual(manifest["primaryApp"], "campus-platform")
        self.assertEqual(manifest["primarySupabaseArea"], "campus-platform/supabase")
        self.assertIn("campus-v2", manifest["legacyApps"])
        self.assertIn("campus-v2", manifest["backupApps"])
        self.assertEqual(
            manifest["supportedEnvironments"]["codex"]["role"], "canonical"
        )
        self.assertEqual(
            manifest["supportedEnvironments"]["claude-desktop"]["role"],
            "supported-secondary",
        )
        self.assertTrue(manifest["capabilities"]["supportsDoctorScript"])
        self.assertTrue(manifest["capabilities"]["supportsCampusBuild"])
        self.assertTrue(manifest["capabilities"]["supportsCampusPlatformBuild"])
        self.assertTrue(manifest["capabilities"]["supportsLegacyCampusBuild"])
        self.assertTrue(manifest["capabilities"]["supportsVestigialCampusBackup"])

    def test_constitution_declares_campus_platform_active(self) -> None:
        text = (ROOT / "CONSTITUTION.md").read_text()
        self.assertIn("`campus-platform/` is the active product surface", text)
        self.assertIn("`campus-v2/` is a previous version", text)
        self.assertNotIn("`campus-v2/` is the product surface", text)

    def test_no_stripe_release_excludes_t009(self) -> None:
        text = (ROOT / "campus-platform" / "RELEASE-NO-STRIPE.md").read_text()
        self.assertIn("T-009", text)
        self.assertIn("NO-GO para cobro real", text)
        self.assertIn("checkout_intent=0", text)

    def test_codex_template_has_expected_integrations(self) -> None:
        config_text = (ROOT / "profiles" / "codex" / "config.template.toml").read_text()
        self.assertIn('[mcp_servers.playwright]', config_text)
        self.assertIn('[plugins."github@openai-curated"]', config_text)

    def test_desktop_template_has_playwright(self) -> None:
        template = json.loads(
            (ROOT / "profiles" / "desktop" / "claude_desktop_config.template.json").read_text()
        )
        self.assertEqual(sorted(template["mcpServers"].keys()), ["playwright"])

    def test_allowlist_and_denylist_match_repo_boundaries(self) -> None:
        data = json.loads((ROOT / "contracts" / "shared-sync-allowlist.json").read_text())
        self.assertIn("AGENTS.md", data["allowlist"])
        self.assertIn("profiles/**", data["allowlist"])
        self.assertIn("specs/**", data["allowlist"])
        self.assertIn("campus-platform/**", data["allowlist"])
        self.assertIn("campus-v2/**", data["allowlist"])
        self.assertIn("workspace/**", data["denylist"])
        self.assertIn("tools/jm-adk/**", data["denylist"])
        self.assertIn("mao-sdd/**", data["denylist"])

    def test_session_state_template_has_recovery_fields(self) -> None:
        data = json.loads((ROOT / "session-state.template.json").read_text())
        self.assertIn("active_workspace", data)
        self.assertIn("current_focus", data)
        self.assertIn("pending_decisions", data)
        self.assertIn("last_validation", data)

    def test_top_level_operational_dirs_have_readme(self) -> None:
        for folder in [
            "campus-platform",
            "campus-v2",
            "tools",
            "workspace",
            "profiles",
            "contracts",
            "scripts",
            "specs",
            "tests",
        ]:
            self.assertTrue(
                (ROOT / folder / "README.md").exists(),
                f"missing README for {folder}",
            )

    def test_gitignore_keeps_local_state_ignored_but_repo_contracts_visible(self) -> None:
        text = (ROOT / ".gitignore").read_text()
        self.assertIn("workspace/*", text)
        self.assertIn("!workspace/README.md", text)
        self.assertIn("tools/*", text)
        self.assertIn("!tools/README.md", text)
        self.assertIn("campus-platform/node_modules/", text)
        self.assertIn("!campus-platform/.env.example", text)
        self.assertIn("!campus-platform/.env.production.example", text)
        self.assertIn("session-state.json", text)
        self.assertNotIn("AGENTS.md", text)


if __name__ == "__main__":
    unittest.main()
