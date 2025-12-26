# Probleemi lahendus

## Probleem
Brauser ütleb "null on kättesaamatu" - ei pääse lehele.

## Lahendused (proovi järjekorras)

### 1. Port Forwarding Cursor'is (KÕIGE LIHTSAM)

**Cursor teeb seda AUTOMAATSELT!**

1. Vaata terminali alumist paremat nurka
2. Näed porti 3000 kõrval linki või ikooni
3. Kliki sellele - see avab brauseris

**VÕI:**

1. Ava Cursor'is "Ports" tab (vasakul küljel)
2. Otsi porti 3000
3. Kliki "Open in Browser" või kopeeri link

### 2. Käsitsi port forwarding

Kui automaatne ei tööta:

```bash
# Terminalis:
# Cursor peaks automaatselt forwardima, aga kui ei, siis:
```

Cursor'is peaks olema "Ports" paneel, kus saad forwardida porti 3000.

### 3. Testi, kas server töötab

```bash
curl http://127.0.0.1:3000
```

Kui näed HTML-i, siis server töötab õigesti!

### 4. Proovi erinevaid aadresse

Brauseris proovi:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://0.0.0.0:3000`

### 5. Kontrolli Cursor'i seadeid

1. Ava Cursor Settings
2. Otsi "Port Forwarding" või "Ports"
3. Veendu, et automaatne forwarding on sisse lülitatud

## Kiire lahendus

**Kõige lihtsam viis:**

1. Terminali alumises paremas nurgas kliki porti 3000 kõrval olevale linkile
2. See peaks automaatselt avama brauseris!

## Märkused

- Server TÖÖTAB (HTTP 200)
- Port 3000 on AVATUD
- Probleem on brauseri ja serveri vahelises ühenduses
- Cursor peaks automaatselt forwardima porta

## Kui ikka ei tööta

1. Taaskäivita Cursor
2. Taaskäivita server: `pkill -9 -f next && cd /workspace/apps/web && pnpm dev`
3. Kontrolli Cursor'i "Ports" tab'i
