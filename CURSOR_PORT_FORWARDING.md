# Cursor Port Forwarding - Täpsed juhised

## Kuidas port forwarding Cursor'is töötab

### Automaatne port forwarding

**Cursor teeb seda AUTOMAATSELT!**

Kui server käivitub portil 3000, siis Cursor:

1. **Tuvastab porta** - näeb, et port 3000 on kasutuses
2. **Forwardib automaatselt** - loob tunnel'i
3. **Näitab linki** - terminali alumises paremas nurgas

### Kuidas leida port forwarding link

#### Meetod 1: Terminali alumine parem nurk

1. Vaata terminali **alumist paremat nurka**
2. Näed porti 3000 kõrval:
   - Linki (nt `http://localhost:3000`)
   - Või ikooni (globe/chain ikoon)
3. **Kliki sellele** - brauser avatakse automaatselt!

#### Meetod 2: "Ports" tab

1. Ava vasakul küljel **"Ports"** tab
   - Kui ei näe, siis kliki "..." menüüst
   - Või otsi "Ports" Cursor'i otsingust
2. Näed listi forwarditud portidest
3. Otsi porti **3000**
4. Kliki **"Open in Browser"** või kopeeri link

#### Meetod 3: Käsitsi forwardimine

1. Ava "Ports" tab
2. Kliki **"Forward a Port"** või "+" nuppu
3. Sisesta: `3000`
4. Kliki "Open in Browser"

### Kui port forwarding ei tööta

1. **Kontrolli Cursor'i seadeid:**
   - Settings → Otsi "Port Forwarding"
   - Veendu, et automaatne forwarding on sisse lülitatud

2. **Taaskäivita Cursor:**
   - Mõnikord vajab taaskäivitust

3. **Kontrolli, kas server töötab:**
   ```bash
   curl http://127.0.0.1:3000
   ```

### Märkused

- Port forwarding on **automaatne** Cursor'is
- Link peaks ilmuma terminali **alumises paremas nurgas**
- Kui linki ei näe, kasuta "Ports" tab'i

## Kiire lahendus

**Lihtsalt:**
1. Vaata terminali **alumist paremat nurka**
2. Kliki porti 3000 kõrval olevale linkile
3. Leht avatakse brauseris!
