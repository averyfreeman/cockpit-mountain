# src/pull-backup/*.sh har driftit isär från nspawn-vault igen

Skriven 2026-10-16 av Claude i en `nspawn-vault`-session, som en briefing
inför en ny Claude Code-session här i `nspawn-cockpit`-repot. Ingen kod är
ändrad i det här repot ännu.

## Bakgrund

`PULL-BACKUP-SCRIPT-PACKAGING.md` (det här repot) beskriver hur
`src/pull-backup/*.sh` paketeras statiskt i `cockpit-nspawn.spec`s
`%install`/`%files` till `/usr/local/lib/nspawn-pull/` sedan v1.0.0-72
(2026-08-03) - löst just för att slippa manuell `scp` och den drift det
annars orsakar. Paketeringsmekanismen fungerar fortfarande: bekräftat
live idag (`rpm -qf /usr/local/lib/nspawn-pull/dispatch.sh` på en riktig
källserver, `vilhelmina-csrv.vpn.fhd.se`, gav
`cockpit-nspawn-1.0.0-76.el9.noarch` - filen ägs verkligen av RPM:et, inte
en lös kopia).

**Problemet nu är ett annat**: mekanismen funkar, men själva
`src/pull-backup/*.sh`-filerna i det här repot har inte synkats om sedan
`nspawn-vault/source-host/` fick ett nytt skript
(`list-capabilities.sh`, tillagt 2026-10-04, för att återställa Linux
file capabilities/`setcap` efter en pull - se `nspawn-vault`s
`pull-backup-threat-model.md` och `CLAUDE.md` för detaljer om varför).
Ingen i den här repots historik har gått tillbaka och synkat om efter det.

## Konkret, bekräftad avvikelse (diff körd 2026-10-16)

- `snapshot-db.sh`, `pre-snapshot.sh`, `restore-after-backup.sh`:
  byte-identiska med `nspawn-vault/source-host/` - inget att göra där.
- `dispatch.sh`: saknar exakt whitelist-posten för `list-capabilities`:
  ```diff
  -        ;;
  +        ;;
  +    "list-capabilities "*)
  +        name="${cmd#list-capabilities }"
  +        [[ "$name" =~ $NAME_RE ]] || { echo "dispatch.sh: rejected container name: '$name'" >&2; exit 1; }
  +        exec "$BIN_DIR/list-capabilities.sh" "$name"
  ```
- `list-capabilities.sh`: **finns inte alls** i `src/pull-backup/` här.

## Verklig konsekvens, sett live idag

`vilhelmina-csrv.vpn.fhd.se` (kör `cockpit-nspawn-1.0.0-76.el9`, alltså
den föråldrade vendorade kopian) loggar på varje pull:

```
VARNING: vilhelmina-csrv.vpn.fhd.se känner inte igen 'list-capabilities' än
(source-host/dispatch.sh behöver uppdateras där) - hoppar över
capability-återställning för denna pull
```

Inte ett pull-fel i sig (`nspawn-vault/engine/pull.sh`s
`run_remote_optional()`-mönster degraderar snällt) - men capability-
återställningen (se `nspawn-vault`s `project_rsync_capabilities_gap`-arbete,
2026-10-04) är helt inaktiv på varje host som bara har den vendorade RPM-
kopian och inte en manuellt omsynkad `/usr/local/lib/nspawn-pull/`.

## Vad som behöver göras

1. Kopiera `nspawn-vault/source-host/list-capabilities.sh` till
   `src/pull-backup/list-capabilities.sh` i det här repot.
2. Synka om `src/pull-backup/dispatch.sh` från
   `nspawn-vault/source-host/dispatch.sh` (bara whitelist-posten ovan
   saknas, resten är redan identiskt).
3. Lägg till `list-capabilities.sh` i `cockpit-nspawn.spec`s `%install`/
   `%files` bredvid de andra fyra.
4. Bumpa version, bygg, släpp en ny `cockpit-nspawn`-release.
5. **Glöm inte RPMWorks-gotchan från `PULL-BACKUP-SCRIPT-PACKAGING.md`**:
   RPMWorks bygger inte från det här repots `.spec`-fil direkt - projekt-id
   4 har sin egen `build_config.spec_template`-kopia som måste synkas
   separat via `PUT /api/projects/4/spec`, och `pre_fetch_script` måste
   fortfarande bädda in de uppdaterade `src/pull-backup/*.sh`-filerna i
   tarbollen. Samma mönster som redan dokumenterat där - inget nytt att
   lösa, bara att inte glömma igen.

## Öppen fråga värd att ta ställning till

Det här är nu **andra gången** `src/pull-backup/*.sh` tappar synk mot
`nspawn-vault/source-host/` efter att den första drift-buggen (juli/aug
2026) ledde till den statiska RPM-paketeringen. Paketeringen löste "varje
källserver får senaste versionen automatiskt via `dnf update`" - men inte
"någon kommer ihåg att synka om *det här repots egen vendorade kopia* när
`nspawn-vault` ändrar sig". Värt att fundera på om det behövs en
lättviktig påminnelse/checklist för det (t.ex. en rad i `nspawn-vault`s
egen `CLAUDE.md` eller release-process som pekar hit), snarare än att lita
på att nästa Claude-session råkar upptäcka det live igen som denna gång.

## Relevanta filer

- `nspawn-vault/source-host/list-capabilities.sh` - det nya skriptet, saknas här
- `nspawn-vault/source-host/dispatch.sh` - kanoniska whitelisten (facit)
- `nspawn-vault/pull-backup-threat-model.md` sektion om capabilities/`setcap`
- `src/pull-backup/dispatch.sh` (det här repot) - den vendorade kopian som behöver synkas
- `cockpit-nspawn.spec` - där `%files` behöver den nya filen
- `PULL-BACKUP-SCRIPT-PACKAGING.md` (det här repot) - bakgrunden till
  varför paketeringsmekanismen finns, inklusive RPMWorks-gotchan
