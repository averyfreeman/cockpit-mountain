# Workspace project index

Cockpit Mountain keeps the original Cockpit modules independently packaged
inside one pnpm workspace. A shared lockfile and catalog reduce duplicate
dependency resolution while each module keeps its own build, tests, and distro
metadata.

Run `pnpm run list:projects` to print the current package names and paths.
`cockpit-navigator` is a static module without a Node package manifest, so pnpm
does not list it.

| Project | Workspace path | Build/check entrypoint |
| --- | --- | --- |
| Cockpit core | `cockpit/` | Autotools build: `cd cockpit && ./autogen.sh && make`; frontend static check: `pnpm --dir cockpit run lint` |
| Doas Janitor | `plugins/Cockpit-Doas-Janitor/` | `pnpm --filter cockpit-sudo-manager run build` |
| Nameserver Daemon | `plugins/Cockpit-Nameserver-Daemon/` | `pnpm --filter cockpit-dns-bind run build` |
| Backblaze B2 Backup | `plugins/cockpit-backblaze-b2-backup/` | `pnpm --filter backblaze-b2 run build` |
| Benchmark | `plugins/cockpit-benchmark/benchmark/` | Package scripts in the module directory |
| Cloudflared | `plugins/cockpit-cloudflared/` | `pnpm --filter cloudflared run build` |
| Download Weighstation | `plugins/cockpit-download-weighstation/` | `pnpm --filter cockpit-download-superstation run build` |
| File Sharing | `plugins/cockpit-file-sharing/file-sharing/` | `pnpm --filter file-sharing run build` |
| Headscale | `plugins/cockpit-headscale/` | `pnpm --filter headscale run build` |
| Machines | `plugins/cockpit-machines/` | `pnpm --filter machines run build` |
| Navigator | `plugins/cockpit-navigator/` | `make` in the module directory |
| Podman | `plugins/cockpit-podman/` | `pnpm --filter podman run build` |
| Podman Docker Compose | `plugins/cockpit-podman-docker-compose/` | `pnpm --filter cockpit-compose run build` |
| Sensors | `plugins/cockpit-sensors/` | `pnpm --filter sensors run build` |
| Tailscale | `plugins/cockpit-tailscale/` | `pnpm --filter tailscale run build` |
| Tailscaled | `plugins/cockpit-tailscaled/` | `pnpm --dir plugins/cockpit-tailscaled run build` |
| Tawny Port Floorboard | `plugins/cockpit-tawny-port-floorboard/` | `pnpm --filter cockpit-port-forward run build` |
| Manifest Destiny's Child | `plugins/manifest-destinys-child/` | Package scripts in the module directory |
| Rustdesk Pilot | `plugins/rustdesk-pilot/` | Package scripts in the module directory |
| Rusty Coathanger | `plugins/rusty-coathanger/` | Package scripts in the module directory |
| Smarmy Spelunker | `plugins/smarmy-spelunker/` | Package scripts in the module directory |
| Systemd Cocktainer | `plugins/systemd-cocktainer/` | `pnpm --filter cockpit-nspawn run build` |
| Ubuntu Cockpit Perineum | `plugins/ubuntu-cockpit-perineum/` | `pnpm --filter cockpit-package-manager run build` |
| ZZ Top | `plugins/zz-top/` | `pnpm --filter ctop run build` |
| Cockpit Starter Kit example | `examples/cockpit-starter-lessons/` | `pnpm --filter starter-kit run build` |
| Houston Common vendor workspace | `vendor/houston-common/` | Built by `pnpm run build` before first-party modules |

Three projects could not be forked directly through GitHub, so they are maintained
as independent account repositories and mirrored under `plugins/` for the workspace.
Their upstream attribution remains in each module's README and package metadata:
[Backblaze B2](https://github.com/averyfreeman/cockpit-backblaze-b2-backup),
[Docker Compose](https://github.com/averyfreeman/cockpit-podman-docker-compose), and
[Sensors](https://github.com/averyfreeman/cockpit-sensors).
