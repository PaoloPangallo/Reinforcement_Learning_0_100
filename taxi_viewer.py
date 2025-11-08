# notebook/taxi_viewer.py
import numpy as np
import json
import os

# --- CONFIG ---
NPZ_PATH = "notebook/qtable_taxi.npz"
TRAJ_PATH = "notebook/trajectory.json"
OUT_PATH = "data/taxi_v3_results.json"


# --- FUNZIONE DI DECODE STATO TAXI ---
def decode_state(s):
    out = [s % 4]
    s //= 4  # dest 0..3
    out.append(s % 5)
    s //= 5  # passenger 0..4 (4=on taxi)
    out.append(s % 5)
    s //= 5  # taxi_col
    out.append(s)  # taxi_row
    taxi_row, taxi_col, pass_loc, dest = list(reversed(out))
    return taxi_row, taxi_col, pass_loc, dest


# --- CARICA I DATI ---
qdata = np.load(NPZ_PATH, allow_pickle=True)
Q = qdata["Q"]
rewards = qdata["rewards"].tolist()

if os.path.exists(TRAJ_PATH):
    with open(TRAJ_PATH) as f:
        trajectory = json.load(f)
else:
    trajectory = []

# --- COSTRUISCI LA POLICY ---
policy = []
for s in range(Q.shape[0]):
    tr, tc, pass_loc, dest = decode_state(s)
    best_action = int(np.argmax(Q[s]))
    value = float(np.max(Q[s]))
    policy.append({
        "state": s,
        "row": tr,
        "col": tc,
        "passenger": int(pass_loc),
        "dest": int(dest),
        "best_action": best_action,
        "value": value
    })

# --- SALVA EXPORT JSON ---
export = {
    "metadata": {
        "env": "Taxi-v3",
        "states": Q.shape[0],
        "actions": Q.shape[1],
        "avg_reward_last_100": float(np.mean(rewards[-100:]))
    },
    "policy": policy,
    "rewards": rewards,
    "trajectory": trajectory
}

os.makedirs("data", exist_ok=True)
with open(OUT_PATH, "w") as f:
    json.dump(export, f, indent=2)

print(f"✅ File salvato in {OUT_PATH}")
