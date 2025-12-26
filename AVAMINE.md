# Kuidas leht avada

## Probleem: "null on kättesaamatu"

See tähendab, et brauser ei saa ühendust serveriga.

## Lahendused

### 1. Kontrolli, kas server töötab
```bash
curl http://127.0.0.1:3000
```

Kui näed HTML-i, siis server töötab.

### 2. Proovi erinevaid aadresse brauseris

- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `http://0.0.0.0:3000`

### 3. Kontrolli firewall'i

```bash
# Kontrolli, kas port on avatud
netstat -tuln | grep 3000
```

### 4. Taaskäivita server

```bash
cd /workspace/apps/web
pkill -9 -f "next"
rm -rf .next
pnpm dev
```

### 5. Proovi teist porti

```bash
PORT=3002 pnpm dev
```

Siis ava: `http://localhost:3002`

## Märkused

- Server peaks kuulama kõiki interface'e (0.0.0.0)
- Kui töötad remote serveris, võib olla vaja SSH tunnel'i
- Kontrolli, et brauser ei blokeeri localhost'i
