from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    """
    Gère les connexions WebSocket actives mappées par task_id.
    Permet aux tâches de fond de broadcaster des mises à jour en temps réel.
    """
    def __init__(self):
        # Map task_id -> List[WebSocket] (Supporte plusieurs onglets sur la même tâche)
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, task_id: str):
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = []
        self.active_connections[task_id].append(websocket)
        print(f"[WS] Client connected to task {task_id}", flush=True)

    def disconnect(self, websocket: WebSocket, task_id: str):
        if task_id in self.active_connections:
            if websocket in self.active_connections[task_id]:
                try:
                    self.active_connections[task_id].remove(websocket)
                except ValueError:
                    pass # Gère la condition de course si une autre coroutine l'a déjà retiré
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]
        print(f"[WS] Client disconnected from task {task_id}", flush=True)

    async def broadcast(self, task_id: str, message: str, status: str = "PROCESSING", data: dict = None):
        """Envoie un message JSON à tous les clients écoutant cette tâche."""
        if task_id in self.active_connections:
            payload = {"task_id": task_id, "status": status, "message": message, "data": data}
            # On itère sur une copie pour éviter les erreurs de modification concurrente
            for connection in self.active_connections[task_id][:]:
                try:
                    await connection.send_json(payload)
                except Exception:
                    # Si le socket est mort, on le nettoie
                    self.disconnect(connection, task_id)

manager = ConnectionManager()