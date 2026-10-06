# Third-party licenses

The e研宝 plugin source and its own icons are licensed under [MIT](LICENSE).
The npm package also contains the following separately licensed material.

## Academic Research Skills

**Based on Academic Research Skills by Cheng-I Wu.**

- Copyright (c) 2026 Cheng-I Wu.
- Source: <https://github.com/Imbad0202/academic-research-skills>.
- Version: v3.23.0, commit `6ab4b03bf70a118a1b3ee7f3263ed9f19031061b`.
- Files: `assets/academic-research-skills/**`.
- License: **CC-BY-NC-4.0**, for non-commercial use, with attribution.
- Full terms: [upstream LICENSE](assets/academic-research-skills/LICENSE).
- Author notice: [NOTICE.md](assets/academic-research-skills/NOTICE.md).
- Citation: [CITATION.cff](assets/academic-research-skills/CITATION.cff).

We redistribute selected runtime directories and root documentation, retaining
their original bytes and relative paths. The included-file list and SHA-256
hashes are in `assets/academic-research-skills.manifest.json`. Development CI,
root tests/tools, other platform ports and symlink aliases are omitted.
Evaluation datasets are retained for the skills' calibration resources;
upstream development checks may still require the full upstream checkout.
The four skills' methodology, templates, shared resources and scripts are included.

Only `deep-research`, `academic-paper`, `academic-paper-reviewer` and
`academic-pipeline` are registered with DeepSeek Harness. Bundled Claude Code
manifests, hooks and commands are reference resources and are not activated by
this plugin. Python/Pandoc and other external programs are not bundled.

The upstream contents remain under their own license and are not covered by this
plugin's MIT license. Keep the attribution, copyright, license and disclaimers
when redistributing them. This integration is independent and does not imply
endorsement by the upstream author. See the upstream LICENSE for its warranty
disclaimer and the complete conditions.
