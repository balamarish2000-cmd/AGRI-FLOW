from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Map center_id -> list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, centre_id: str):
        await websocket.accept()
        if centre_id not in self.active_connections:
            self.active_connections[centre_id] = []
        self.active_connections[centre_id].append(websocket)

    def disconnect(self, websocket: WebSocket, centre_id: str):
        if centre_id in self.active_connections:
            if websocket in self.active_connections[centre_id]:
                self.active_connections[centre_id].remove(websocket)

    async def broadcast_queue_update(self, centre_id: str, data: dict):
        if centre_id in self.active_connections:
            for connection in self.active_connections[centre_id]:
                try:
                    await connection.send_json(data)
                except Exception:
                    pass

manager = ConnectionManager()
