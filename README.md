# Reinforcement Learning Lab   
Un laboratorio completo di Reinforcement Learning con implementazioni moderne, visualizzazioni interattive e analisi degli algoritmi più usati nella letteratura.

##  Obiettivo del progetto
Questo repository raccoglie **tutti gli esperimenti RL**, le implementazioni, i viewer interattivi e le analisi comparative sviluppate durante il mio percorso di studio e sperimentazione.  
L’obiettivo è creare un ambiente **didattico, riproducibile e visivo**, che permetta di capire davvero come gli agenti imparano nel tempo.

---

#  Contenuti Principali
- Implementazioni *from scratch* di:
  - **Q-Learning**
  - **DQN**
  - **Double DQN**
  - **Dueling DQN**
  - **Prioritized Experience Replay (PER)**
  - **PPO**
  - **TD3**
  - **SAC**
- Visualizzatori interattivi per:
  - **BipedalWalker TD3 Viewer**
  - **LunarLander Viewer**
  - **Snake PPO Viewer**
- Raccolta automatica di:
  - Video MP4 dei checkpoint
  - JSON delle traiettorie
  - CSV delle metriche
  - Grafici andamento reward
- Studio teorico-pratico di:
  - On-policy vs Off-policy
  - Soft Actor-Critic temperature annealing
  - TD3 policy smoothing
  - RL stability, reward shaping e tuning
  - Confronto fra algoritmi moderni (TD3, SAC, PPO)
  - Limiti e instabilità note
- Preparazione all’integrazione futura con **DreamerV3** e modelli world-model-based.

---

# 🧩 Struttura del Progetto

experiments/
│
├── bipedal_td3/
│ ├── metrics/ # Traiettorie JSON per ogni episodio
│ ├── models/ # Checkpoint .pth
│ ├── videos/ # Video degli episodi registrati
│ └── plots/ # Grafici reward
│
├── lunarlander_dqn/
│ ├── metrics/
│ ├── models/
│ └── videos/
│
├── snake_ppo/
│ ├── logs/
│ ├── models/
│ └── viewer/
│
viewer/
│ ├── walker/ # Viewer Bipedal TD3
│ ├── lunarlander/ # Viewer LunarLander
│ └── snake/ # Viewer Snake PPO
│
notebooks/
│ ├── bipedal_td3_training.ipynb
│ ├── sac_vs_td3.ipynb
│ ├── ppo_snake.ipynb
│ └── qlearning_foundations.ipynb


---

# 🧠 Algoritmi Implementati

## 🔷 Q-Learning & DQN Family
Implementazioni *from scratch* con:
- Replay Buffer
- Target network
- ε-greedy scheduling
- Soft updates (τ)
- Dueling architecture
- PER (Prioritized Replay α/β annealing)

## 🔶 PPO
- Clipped surrogate objective  
- Advantage GAE(λ)  
- Entropy bonus  
- Multi-batch rollout con normalizzazione  

Usato per il progetto **Snake PPO** (viewer incluso).

## 🔷 TD3 (Twin Delayed Deep Deterministic Policy Gradient)
Implementazione con:
- Policy delay
- Target policy smoothing
- Clipped double Q-learning
- Gaussian exploration decay
- Training stabile su BipedalWalker-v3

Include viewer interattivo con:
- Traiettorie passo-passo
- Posizione del walker
- Costo azioni
- Reward cumulativo

## 🔶 SAC (Soft Actor-Critic)
Implementazione con:
- Entropy temperature learnable (α)
- Soft Q update
- Stochastic policy Gaussian
- Reparametrization trick
- Replay buffer condiviso

---

# 🎥 Viewer RL Interattivi (Flask)

## **BipedalWalker – TD3 Viewer**
- Selezione run + episodio  
- Riproduzione frame-by-frame  
- Scrolling del mondo  
- Reward cumulativo  
- Marker del traguardo  

## **LunarLander – DQN Viewer**
- Animazione atterraggio  
- Lettura dei checkpoint  
- Reward ad ogni step  

## **Snake PPO Viewer**
- Rendering griglia  
- Stato PPO (policy, value)  
- Step e punteggi  

---

#  Logging, Analisi e Metriche

Ogni esperimento salva automaticamente:
- `trajectory_ep_XXX.json`  
- `episode_reward.csv`  
- `losses.csv`  
- Video `.mp4`  
- Grafici della curva dei reward  

Con un runner centralizzato per registrare i checkpoint:

```bash
python record_learning_progress.py --algo td3 --env BipedalWalker-v3 🔍 Analisi Comparativa degli Algoritmi
On-Policy (PPO)

Stabile

Facilissimo da far convergere
− Richiede molti campioni
− Adatto ad ambienti stabili

Off-Policy (TD3, SAC)

Molto sample-efficient

Performance migliori

Più flessibile
− Tuning più delicato
− Richiede più memoria/computazione

Per BipedalWalker

TD3 → eccellente e semplice da stabilizzare

SAC → molto potente ma più sensibile

DreamerV3 (futura integrazione)

Potenziale superiore nei continui

Training più complesso e pesante (JAX/XLA)

🚀 Come Avviare i Viewer
⚙️ Installazione
pip install -r requirements.txt

▶️ Avvio Flask Viewer
flask --app viewer/walker/walker_app.py run

▶️ Avvio Snake PPO Viewer
flask --app viewer/snake/snake_app.py run



📄 Licenza

MIT License.

⭐ Credits

Progetto sviluppato come laboratorio personale di Reinforcement Learning, con l’obiettivo di unire teoria, codice e visualizzazioni interattive.
