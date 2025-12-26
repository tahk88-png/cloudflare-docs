# Kuidas leht avada - LÕPLIK JUHT

## ✅ Server töötab!

Server on käivitatud ja vastab HTTP 200-ga.

## 🌐 Kuidas avada brauseris

### Variant 1: Cursor automaatne port forwarding (SOOVITATUD)

1. **Vaata terminali alumist paremat nurka**
   - Näed porti 3000 kõrval linki või ikooni
   - Kliki sellele - see avab brauseris automaatselt!

2. **VÕI ava "Ports" tab**
   - Vasakul küljel otsi "Ports" paneeli
   - Otsi porti 3000
   - Kliki "Open in Browser" või kopeeri link

### Variant 2: Käsitsi avamine

Kui automaatne ei tööta:

1. **Kopeeri see link:**
   ```
   http://localhost:3000
   ```

2. **Kleepi brauseri aadressiribale**

3. **VÕI proovi:**
   ```
   http://127.0.0.1:3000
   ```

### Variant 3: SSH tunnel (kui remote server)

Kui töötad remote serveris ja port forwarding ei tööta:

```bash
ssh -L 3000:localhost:3000 user@server
```

Siis ava brauseris: `http://localhost:3000`

## 🔍 Kontrolli, kas server töötab

```bash
curl http://127.0.0.1:3000
```

Kui näed HTML-i, siis server töötab õigesti!

## ❓ Kui ikka ei avane

1. **Kontrolli Cursor'i seadeid:**
   - Settings → Otsi "Port Forwarding"
   - Veendu, et automaatne forwarding on sisse lülitatud

2. **Taaskäivita server:**
   ```bash
   pkill -9 -f next
   cd /workspace/apps/web
   pnpm dev
   ```

3. **Kontrolli logisid:**
   ```bash
   tail -f /tmp/web-fixed.log
   ```

## 📊 Praegune staatus

- ✅ Server töötab
- ✅ Port 3000 kuulab
- ✅ HTTP vastab 200 OK
- ⚠️ Vaja port forwarding'ut brauseri jaoks

## 💡 Nõuanne

**Cursor peaks automaatselt forwardima porta 3000!**

Vaata lihtsalt terminali alumist paremat nurka - seal peaks olema link või ikoon, millele klikkimine avab brauseris.
