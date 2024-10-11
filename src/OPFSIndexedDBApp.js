import React, { useState, useEffect, useCallback } from "react";
import { openDB } from "idb";
import "./App.css";

const DB_NAME = "OPFSTodoApp";
const TODO_STORE = "todos";

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(TODO_STORE, { keyPath: "id" });
  },
});

function MediaRenderer({ media, renderMedia }) {
  const [renderedMedia, setRenderedMedia] = useState(null);

  useEffect(() => {
    let isMounted = true;
    renderMedia(media).then((result) => {
      if (isMounted) {
        setRenderedMedia(result);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [media, renderMedia]);

  return renderedMedia;
}

function OPFSIndexedDBApp() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [root, setRoot] = useState(null);

  useEffect(() => {
    async function initializeOPFS() {
      if ("storage" in navigator && "getDirectory" in navigator.storage) {
        const opfsRoot = await navigator.storage.getDirectory();
        setRoot(opfsRoot);
      } else {
        console.error(
          "Origin Private File System is not supported in this browser."
        );
      }
    }

    initializeOPFS();
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
    if (todo.media) {
      await deleteFile(todo.media.name);
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
        const fileName = `${Date.now()}_${selectedFile.name}`;
        await saveFile(fileName, selectedFile);
        newTodo.media = {
          type: selectedFile.type,
          name: fileName,
          size: selectedFile.size,
        };
      }

      await saveTodo(newTodo);
      setInputValue("");
      setSelectedFile(null);
    }
  };

  const saveFile = async (fileName, file) => {
    if (!root) return;

    const newHandle = await root.getFileHandle(fileName, { create: true });
    const writable = await newHandle.createWritable();
    await writable.write(file);
    await writable.close();
  };

  const deleteFile = async (fileName) => {
    if (!root) return;

    try {
      await root.removeEntry(fileName);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleDeleteTodo = async (id) => {
    await deleteTodo(id);
  };

  const renderMedia = useCallback(
    async (media) => {
      if (!media || !root) return null;

      try {
        const fileHandle = await root.getFileHandle(media.name);
        const file = await fileHandle.getFile();
        const url = URL.createObjectURL(file);

        if (media.type.startsWith("image/")) {
          return <img src={url} alt="Todo attachment" className="todo-media" />;
        } else if (media.type.startsWith("audio/")) {
          return <audio src={url} controls className="todo-media" muted />;
        } else if (
          media.type.startsWith("video/") ||
          media.type === "video/x-matroska"
        ) {
          return <video src={url} controls className="todo-media" muted />;
        }

        return (
          <p>
            File: {media.name} ({(media.size / 1024 / 1024).toFixed(2)} MB){" "}
            <a href={url} download={media.name}>
              Download
            </a>
          </p>
        );
      } catch (error) {
        console.error("Error rendering media:", error);
        return <p>Error loading media</p>;
      }
    },
    [root]
  );

  return (
    <div className="App">
      <h1>OPFS IndexedDB Todo App</h1>
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
        <button disabled={!inputValue} onClick={handleAddTodo}>
          Add Todo
        </button>
      </div>
      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id}>
            <div className="todo-content">
              <p>{todo.text}</p>
              <div className="media">
                {todo.media && (
                  <MediaRenderer media={todo.media} renderMedia={renderMedia} />
                )}
              </div>
            </div>
            <button onClick={() => handleDeleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default OPFSIndexedDBApp;
