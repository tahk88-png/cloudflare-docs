# Kuidas käivitada

## Probleem: Leht ei avane

Kui leht ei avane, järgne neid samme:

### 1. Peata kõik serverid
```bash
pkill -9 -f "next"
pkill -9 -f "nest"
```

### 2. Kustuta cache
```bash
cd /workspace/apps/web
rm -rf .next
```

### 3. Kontrolli dependencies
```bash
cd /workspace
pnpm install
```

### 4. Käivita server
```bash
cd /workspace/apps/web
PORT=3000 pnpm dev
```

### 5. Ava brauseris
http://localhost:3000

## Kui ikka ei tööta

1. Kontrolli logisid:
   ```bash
   tail -f /tmp/web-clean.log
   ```

2. Kontrolli, kas port on vaba:
   ```bash
   lsof -i :3000
   ```

3. Proovi teist porti:
   ```bash
   PORT=3002 pnpm dev
   ```

## Märkused

- Server võib võtta 10-20 sekundit käivitumiseks
- Kui näed "Ready" logis, siis server töötab
- Kui näed "Error", vaata täpsemalt logisid
