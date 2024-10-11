import React, { useState, useEffect } from "react";
import { openDB } from "idb";
import "./App.css";

const DB_NAME = "TodoApp";
const TODO_STORE = "todos";
const CHUNK_STORE = "fileChunks";
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(TODO_STORE, { keyPath: "id" });
    db.createObjectStore(CHUNK_STORE, { keyPath: "id" });
  },
});

function IndexedDBApp() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadTodos();
  }, []);

  async function loadTodos() {
    const db = await dbPromise;
    const storedTodos = await db.getAll(TODO_STORE);
    setTodos(storedTodos);
  }

  async function saveTodo(todo) {
    const db = await dbPromise;
    await db.put(TODO_STORE, todo);
    await loadTodos();
  }

  async function deleteTodo(id) {
    const db = await dbPromise;
    const todo = await db.get(TODO_STORE, id);
    if (todo.media && todo.media.chunkIds) {
      for (const chunkId of todo.media.chunkIds) {
        await db.delete(CHUNK_STORE, chunkId);
      }
    }
    await db.delete(TODO_STORE, id);
    await loadTodos();
  }

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleAddTodo = async () => {
    if (inputValue.trim() !== "") {
      const newTodo = { id: Date.now(), text: inputValue, media: null };

      if (selectedFile) {
        const fileId = Date.now();
        const chunkIds = await uploadLargeFile(selectedFile, fileId);
        newTodo.media = {
          type: selectedFile.type,
          name: selectedFile.name,
          size: selectedFile.size,
          chunkIds: chunkIds,
        };
      }

      await saveTodo(newTodo);
      setInputValue("");
      setSelectedFile(null);
      setUploadProgress(0);
    }
  };

  const uploadLargeFile = async (file, fileId) => {
    const db = await dbPromise;
    const chunkIds = [];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const chunkId = `${fileId}_${i}`;

      await db.put(CHUNK_STORE, { id: chunkId, data: chunk });
      chunkIds.push(chunkId);

      setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
    }

    return chunkIds;
  };

  const handleDeleteTodo = async (id) => {
    await deleteTodo(id);
  };

  const renderMedia = (media) => {
    if (!media) return null;

    if (media.type.startsWith("image/")) {
      return (
        <img
          src={URL.createObjectURL(new Blob([media.data]))}
          alt="Todo attachment"
          className="todo-media"
        />
      );
    } else if (media.type.startsWith("audio/")) {
      return (
        <audio
          src={URL.createObjectURL(new Blob([media.data]))}
          controls
          className="todo-media"
        />
      );
    } else if (
      media.type.startsWith("video/") ||
      media.type === "video/x-matroska"
    ) {
      return (
        <video
          src={URL.createObjectURL(new Blob([media.data]))}
          controls
          className="todo-media"
        />
      );
    }
    return (
      <p>
        File: {media.name} ({(media.size / 1024 / 1024).toFixed(2)} MB)
      </p>
    );
  };

  return (
    <div className="App">
      <h1>IndexedDB Todo App</h1>
      <div className="todo-input">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter a new todo"
        />
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/*,audio/*,video/*,.mkv"
        />
        <button onClick={handleAddTodo}>Add Todo</button>
      </div>
      {uploadProgress > 0 && <progress value={uploadProgress} max="100" />}
      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id}>
            <div className="todo-content">
              <p>{todo.text}</p>
              <div className="media">{renderMedia(todo.media)}</div>
            </div>
            <button onClick={() => handleDeleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default IndexedDBApp;
