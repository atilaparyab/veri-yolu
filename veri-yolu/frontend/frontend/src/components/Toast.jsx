import React from "react";

const Toast = ({ message, show }) => {
  if (!show) return null;
  return (
    <div className="fixed bottom-8 right-8 bg-blue-700 text-white px-6 py-3 rounded shadow-lg z-50 animate-fadeIn">
      {message}
    </div>
  );
};

export default Toast;
