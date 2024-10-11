import React, { useState, useEffect } from "react";
import { openDB } from "idb";
import "./App.css";

const DB_NAME = "LargeFileTodoApp";
const TODO_STORE = "todos";

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(TODO_STORE, { keyPath: "id" });
  },
});

function LargeFileIndexedDBApp() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

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
        const fileData = await readFileAsArrayBuffer(selectedFile);
        newTodo.media = {
          type: selectedFile.type,
          name: selectedFile.name,
          size: selectedFile.size,
          data: fileData,
        };
      }

      await saveTodo(newTodo);
      setInputValue("");
      setSelectedFile(null);
    }
  };

  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleDeleteTodo = async (id) => {
    await deleteTodo(id);
  };

  const renderMedia = (media) => {
    if (!media) return null;

    const blob = new Blob([media.data], { type: media.type });
    const url = URL.createObjectURL(blob);

    if (media.type.startsWith("image/")) {
      return <img src={url} alt="Todo attachment" className="todo-media" />;
    } else if (media.type.startsWith("audio/")) {
      return <audio src={url} controls className="todo-media" />;
    } else if (
      media.type.startsWith("video/") ||
      media.type === "video/x-matroska"
    ) {
      return <video src={url} controls className="todo-media" />;
    }

    return (
      <p>
        File: {media.name} ({(media.size / 1024 / 1024).toFixed(2)} MB){" "}
        <a href={url} download={media.name}>
          Download
        </a>
      </p>
    );
  };

  return (
    <div className="App">
      <h1>Large File IndexedDB Todo App</h1>
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

export default LargeFileIndexedDBApp;
