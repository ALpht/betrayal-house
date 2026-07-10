# Save Load Contract

所有新增 State 必須符合：

serialize()
deserialize()

---

允許：

- primitive
- object
- array

禁止：

- DOM
- EventBus
- Socket
- Renderer

---

任何新增系統需回答：

1. Save 時保存什麼？
2. Load 時恢復什麼？
3. Multiplayer 時同步什麼？
