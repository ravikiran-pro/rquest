import React, { useState, useEffect } from "react";

function XssScreen() {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetch("http://localhost:3001/api/comments")
      .then((res) => res.json())
      .then((data) => setComments(data));
  }, []);

  useEffect(() => {
    setComments(["<script>alert('XSS!')</script>"]);
  }, []);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    fetch("http://localhost:3001/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: newComment }),
    })
      .then((res) => res.json())
      .then(() => {
        setComments([...comments, newComment]);
        setNewComment("");
      });
  };

  return (
    <div>
      <h1>XSS Demo</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Enter your comment"
        />
        <button type="submit">Submit</button>
      </form>
      <h2>Comments</h2>
      <ul>
        {comments.map((comment, index) => (
          <div key={index} dangerouslySetInnerHTML={{ __html: comment }} />
        ))}
      </ul>
    </div>
  );
}

export default XssScreen;
