#!/bin/bash
# Avab lehe brauseris

echo "🌐 Avan lehe brauseris..."

# Proovi erinevaid viise
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 2>/dev/null &
elif command -v open &> /dev/null; then
    open http://localhost:3000 2>/dev/null &
elif command -v start &> /dev/null; then
    start http://localhost:3000 2>/dev/null &
else
    echo "Brauserit ei saanud automaatselt avada."
    echo "Palun ava käsitsi: http://localhost:3000"
fi

echo ""
echo "✅ Leht peaks avanema brauseris!"
echo "   Kui ei avane, proovi: http://127.0.0.1:3000"
