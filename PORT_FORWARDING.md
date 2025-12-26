# Port Forwarding - Remote Serveri jaoks

## Probleem
Kui töötad remote serveris (nt Cursor workspace), brauser ei pääse otse `localhost:3000`-le.

## Lahendus: Port Forwarding

### VS Code / Cursor
1. Ava "Ports" tab (VS Code/Cursor)
2. Kliki "Forward a Port"
3. Sisesta: `3000`
4. Ava: `http://localhost:3000` (nüüd peaks töötama!)

### Või SSH tunnel
```bash
ssh -L 3000:localhost:3000 user@server
```

Siis ava brauseris: `http://localhost:3000`

## Märkused

- Server töötab ja vastab HTTP 200-ga
- Port 3000 on avatud (0.0.0.0:3000)
- Probleem on brauseri ja serveri vahelises ühenduses

## Kiire test

```bash
curl http://127.0.0.1:3000
```

Kui näed HTML-i, siis server töötab õigesti!
