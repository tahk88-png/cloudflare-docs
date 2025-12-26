#!/bin/bash
cd /workspace/apps/web
pkill -9 -f "next dev" 2>/dev/null
rm -rf .next 2>/dev/null
PORT=3000 HOSTNAME=0.0.0.0 pnpm dev
