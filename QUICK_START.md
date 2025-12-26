# Kiire käivitamine

## Probleemid ja lahendused

### Leht ei avane

1. **Kontrolli, kas dependencies on installitud:**
   ```bash
   pnpm install
   ```

2. **Kontrolli, kas .env fail on olemas:**
   ```bash
   cp .env.example .env
   ```

3. **Käivita Docker:**
   ```bash
   pnpm db:up
   ```

4. **Genereeri Prisma client:**
   ```bash
   pnpm db:generate
   ```

5. **Käivita migratsioonid:**
   ```bash
   pnpm db:migrate
   ```

6. **Lae demo andmed:**
   ```bash
   pnpm demo:load
   ```

7. **Käivita dev serverid:**
   ```bash
   pnpm dev
   ```

### Või kasuta first-run:
```bash
pnpm first-run
```

### Kontrolli porte:
- Web: http://localhost:3000
- API: http://localhost:3001

### Kui ikka ei tööta:

1. Kontrolli, kas portid on vabad:
   ```bash
   lsof -i :3000
   lsof -i :3001
   ```

2. Kontrolli Docker:
   ```bash
   docker ps
   ```

3. Vaata logisid:
   ```bash
   docker-compose logs
   ```
