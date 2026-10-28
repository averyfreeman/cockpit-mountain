export function spawnBackend(args: string[]) {
  const cockpit = window.cockpit;

  return cockpit.spawn(
    [
      "/usr/bin/python3",
      "/usr/share/cockpit/sudo-manager/backend/sudo-manager.py",
      ...args,
    ],
    { superuser: "require" }
  );
}
