import express from "express";
import crypto from "crypto";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const RENTBOX_CALLBACK_URL = process.env.RENTBOX_CALLBACK_URL || "http://localhost:3000/api/webhooks/locker";
const RENTBOX_HMAC_SECRET = process.env.RENTBOX_HMAC_SECRET || "dev-secret-123";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "dev-token-abc";

function signBody(body: any) {
  const raw = JSON.stringify(body);
  return crypto.createHmac("sha256", RENTBOX_HMAC_SECRET).update(raw).digest("hex");
}

app.post("/v1/lockers/:lockerId/compartments/:number/open", async (req, res) => {
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${GATEWAY_TOKEN}`) {
      console.log(`[GATEWAY] 401 Unauthorized. Got: ${auth}`);
      return res.status(401).json({ accepted: false });
  }

  const { lockerId, number } = req.params;
  const { correlation_id } = req.body;

  console.log(`[GATEWAY] Open Request: Locker ${lockerId}, Door ${number}, CorrID ${correlation_id}`);

  // Simulate result
  const success = true;

  // Sync Response
  res.json({ accepted: true });

  // Async Webhook
  setTimeout(async () => {
      const payload = {
        event_id: `evt_${Date.now()}`,
        event_type: "locker.open_result",
        occurred_at: new Date().toISOString(),
        data: {
          locker_id: lockerId,
          compartment_number: Number(number),
          correlation_id,
          result: success ? "success" : "fail",
          error_code: success ? null : "LOCK_TIMEOUT",
          message: success ? "OK" : "No ack"
        }
      };

      const signature = signBody(payload);
      console.log(`[GATEWAY] Sending webhook to ${RENTBOX_CALLBACK_URL}`);
      
      try {
          const cbRes = await fetch(RENTBOX_CALLBACK_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Gateway-Signature": signature
            },
            body: JSON.stringify(payload)
          });
          console.log(`[GATEWAY] Webhook Response: ${cbRes.status}`);
      } catch(e) {
          console.error("[GATEWAY] Webhook failed", e);
      }
  }, 2000); // 2s delay to simulate hardware interaction
});

app.get("/v1/lockers/:lockerId/status", async (req, res) => {
  res.json({
    locker_id: req.params.lockerId,
    online: true,
    compartments: [{ number: 1, door_state: "closed", lock_state: "locked" }],
    reported_at: new Date().toISOString()
  });
});

app.listen(8080, () => console.log("Gateway running on :8080"));
