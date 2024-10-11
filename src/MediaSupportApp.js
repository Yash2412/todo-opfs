import React, { useState, useEffect } from "react";
import "./App.css";

function MediaSupportApp() {
  const [todos, setTodos] = useState(
    JSON.parse(localStorage.getItem("todos")) || []
  );
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem("todos")) || [];
    setTodos(storedTodos);
  }, []);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleAddTodo = () => {
    if (inputValue.trim() !== "") {
      const newTodo = { id: Date.now(), text: inputValue, media: null };

      if (selectedFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newTodo.media = {
            type: selectedFile.type,
            data: reader.result,
          };
          setTodos([...todos, newTodo]);
          setInputValue("");
          setSelectedFile(null);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setTodos([...todos, newTodo]);
        setInputValue("");
        setSelectedFile(null);
      }
    }
  };

  const handleDeleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const renderMedia = (media) => {
    if (!media) return null;

    if (media.type.startsWith("image/")) {
      return (
        <img src={media.data} alt="Todo attachment" className="todo-media" />
      );
    } else if (media.type.startsWith("audio/")) {
      return <audio src={media.data} controls className="todo-media" />;
    } else if (
      media.type.startsWith("video/") ||
      media.type === "video/x-matroska"
    ) {
      return <video src={media.data} controls className="todo-media" />;
    }
    return <p>Unsupported media type</p>;
  };

  return (
    <div className="App">
      <h1>Media-Supported Todo App</h1>
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

export default MediaSupportApp;
